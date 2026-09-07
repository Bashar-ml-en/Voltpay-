//! VaultPay Enclave Policy Engine
//! Hardware-enforced guardrails running inside Terminal 3 TEE.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpendPolicy {
    /// Approved vendor identifiers / recipient addresses
    pub allowlist: Vec<String>,
    /// Maximum allowed spend per individual transaction in cents (e.g., 100000 = $1,000.00)
    pub per_call_cap_cents: u64,
    /// Maximum allowed spend for entire agent session in cents (e.g., 500000 = $5,000.00)
    pub session_budget_cents: u64,
    /// Current remaining budget in cents
    pub remaining_budget_cents: u64,
    /// Emergency revocation status (killswitch)
    pub is_revoked: bool,
    /// Processed invoice hashes/IDs to prevent replay or double-spending
    pub processed_invoices: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PolicyViolation {
    EnclaveRevoked,
    VendorNotAllowlisted { vendor: String },
    PerCallCapExceeded { requested_cents: u64, cap_cents: u64 },
    InsufficientBudget { requested_cents: u64, remaining_cents: u64 },
    DuplicateInvoice { invoice_id: String },
}

impl SpendPolicy {
    pub fn new(
        allowlist: Vec<String>,
        per_call_cap_cents: u64,
        session_budget_cents: u64,
    ) -> Self {
        Self {
            allowlist,
            per_call_cap_cents,
            session_budget_cents,
            remaining_budget_cents: session_budget_cents,
            is_revoked: false,
            processed_invoices: Vec::new(),
        }
    }

    /// Evaluates all hardware guardrails inside the TEE before touching payment keys.
    pub fn evaluate_payment(
        &self,
        vendor: &str,
        amount_cents: u64,
        invoice_id: &str,
    ) -> Result<(), PolicyViolation> {
        // 1. Hardware Killswitch Check
        if self.is_revoked {
            return Err(PolicyViolation::EnclaveRevoked);
        }

        // 2. Vendor Allowlist Check
        let vendor_clean = vendor.trim().to_lowercase();
        let is_allowed = self
            .allowlist
            .iter()
            .any(|allowed| allowed.trim().to_lowercase() == vendor_clean);

        if !is_allowed {
            return Err(PolicyViolation::VendorNotAllowlisted {
                vendor: vendor.to_string(),
            });
        }

        // 3. Per-Call Spending Cap Check
        if amount_cents > self.per_call_cap_cents {
            return Err(PolicyViolation::PerCallCapExceeded {
                requested_cents: amount_cents,
                cap_cents: self.per_call_cap_cents,
            });
        }

        // 4. Session Budget Check
        if amount_cents > self.remaining_budget_cents {
            return Err(PolicyViolation::InsufficientBudget {
                requested_cents: amount_cents,
                remaining_cents: self.remaining_budget_cents,
            });
        }

        // 5. Idempotency (Replay Attack Prevention)
        if self.processed_invoices.iter().any(|id| id == invoice_id) {
            return Err(PolicyViolation::DuplicateInvoice {
                invoice_id: invoice_id.to_string(),
            });
        }

        Ok(())
    }

    /// Deducts budget and marks invoice as processed upon successful settlement
    pub fn record_settlement(&mut self, amount_cents: u64, invoice_id: &str) {
        self.remaining_budget_cents = self
            .remaining_budget_cents
            .saturating_sub(amount_cents);
        self.processed_invoices.push(invoice_id.to_string());
    }

    /// Immediate emergency revocation
    pub fn revoke(&mut self) {
        self.is_revoked = true;
    }
}
