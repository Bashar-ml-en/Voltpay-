//! VaultPay Terminal 3 TEE Enclave Contract
//! Main Entry point for guarded autonomous spending.

pub mod ledger;
pub mod policy;

use ledger::{LedgerStatus, TamperEvidentLedger};
use policy::{PolicyViolation, SpendPolicy};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayVendorInput {
    pub vendor: String,
    pub amount_cents: u64,
    pub invoice_id: String,
    pub item_description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayVendorOutput {
    pub success: bool,
    pub transaction_id: Option<String>,
    pub status: String,
    pub message: String,
    pub ledger_entry_index: u64,
    pub entry_hash: String,
    pub enclave_signature: String,
    pub remaining_budget_cents: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnclaveState {
    pub enclave_did: String,
    pub policy: SpendPolicy,
    pub ledger: TamperEvidentLedger,
    pub sealed_relay_secret: String,
}

// Global in-enclave state protected by hardware isolation
static ENCLAVE_STATE: Mutex<Option<EnclaveState>> = Mutex::new(None);

pub fn initialize_enclave(
    enclave_did: String,
    allowlist: Vec<String>,
    per_call_cap_cents: u64,
    session_budget_cents: u64,
    sealed_relay_secret: String,
) {
    let mut lock = ENCLAVE_STATE.lock().unwrap();
    *lock = Some(EnclaveState {
        enclave_did,
        policy: SpendPolicy::new(allowlist, per_call_cap_cents, session_budget_cents),
        ledger: TamperEvidentLedger::new(),
        sealed_relay_secret,
    });
}

/// Core function invoked by Terminal 3 ADK: `executeAndDecode("pay_vendor", input)`
pub fn execute_pay_vendor(input_json: &str, timestamp_ms: u64) -> String {
    let mut lock = ENCLAVE_STATE.lock().unwrap();
    let state = match lock.as_mut() {
        Some(s) => s,
        None => {
            return serde_json::to_string(&PayVendorOutput {
                success: false,
                transaction_id: None,
                status: "ERR_ENCLAVE_NOT_INITIALIZED".to_string(),
                message: "Hardware enclave has not been initialized".to_string(),
                ledger_entry_index: 0,
                entry_hash: "".to_string(),
                enclave_signature: "".to_string(),
                remaining_budget_cents: 0,
            })
            .unwrap();
        }
    };

    let input: PayVendorInput = match serde_json::from_str(input_json) {
        Ok(inp) => inp,
        Err(e) => {
            return serde_json::to_string(&PayVendorOutput {
                success: false,
                transaction_id: None,
                status: "ERR_INVALID_PAYLOAD".to_string(),
                message: format!("Payload deserialization failed: {}", e),
                ledger_entry_index: 0,
                entry_hash: "".to_string(),
                enclave_signature: "".to_string(),
                remaining_budget_cents: state.policy.remaining_budget_cents,
            })
            .unwrap();
        }
    };

    // 1. Evaluate Hardware Enclave Policies
    match state.policy.evaluate_payment(&input.vendor, input.amount_cents, &input.invoice_id) {
        Ok(()) => {
            // Hardware checks passed!
            // Deduct budget & record invoice in state
            state.policy.record_settlement(input.amount_cents, &input.invoice_id);

            // Record into Tamper-Evident Ledger
            let tx_id = format!("0xt3_{}", &input.invoice_id);
            let entry = state.ledger.append(
                timestamp_ms,
                input.vendor,
                input.amount_cents,
                input.invoice_id,
                LedgerStatus::Approved,
                "Hardware enclave verification passed. Settlement approved.".to_string(),
                &state.enclave_did,
            );

            serde_json::to_string(&PayVendorOutput {
                success: true,
                transaction_id: Some(tx_id),
                status: "APPROVED".to_string(),
                message: "Payment successfully authorized and sealed by hardware TEE.".to_string(),
                ledger_entry_index: entry.index,
                entry_hash: entry.entry_hash,
                enclave_signature: entry.enclave_signature,
                remaining_budget_cents: state.policy.remaining_budget_cents,
            })
            .unwrap()
        }
        Err(violation) => {
            let (status, reason, ledger_status) = match violation {
                PolicyViolation::EnclaveRevoked => (
                    "DENIED_REVOKED",
                    "Operator has revoked agent execution privileges.".to_string(),
                    LedgerStatus::BlockedRevoked,
                ),
                PolicyViolation::VendorNotAllowlisted { vendor } => (
                    "DENIED_UNTRUSTED_VENDOR",
                    format!("Vendor '{}' is NOT present in the authorized allowlist.", vendor),
                    LedgerStatus::BlockedUntrustedVendor,
                ),
                PolicyViolation::PerCallCapExceeded { requested_cents, cap_cents } => (
                    "DENIED_CAP_EXCEEDED",
                    format!(
                        "Requested payment (${:.2}) exceeds maximum per-call cap (${:.2}).",
                        requested_cents as f64 / 100.0,
                        cap_cents as f64 / 100.0
                    ),
                    LedgerStatus::BlockedCapExceeded,
                ),
                PolicyViolation::InsufficientBudget { requested_cents, remaining_cents } => (
                    "DENIED_BUDGET_EXCEEDED",
                    format!(
                        "Requested payment (${:.2}) exceeds remaining session budget (${:.2}).",
                        requested_cents as f64 / 100.0,
                        remaining_cents as f64 / 100.0
                    ),
                    LedgerStatus::BlockedBudgetExceeded,
                ),
                PolicyViolation::DuplicateInvoice { invoice_id } => (
                    "DENIED_DUPLICATE_INVOICE",
                    format!("Invoice ID '{}' has already been settled (Idempotency violation).", invoice_id),
                    LedgerStatus::BlockedDuplicateInvoice,
                ),
            };

            // Even blocked attempts are permanently recorded in the tamper-evident ledger
            let entry = state.ledger.append(
                timestamp_ms,
                input.vendor,
                input.amount_cents,
                input.invoice_id,
                ledger_status,
                reason.clone(),
                &state.enclave_did,
            );

            serde_json::to_string(&PayVendorOutput {
                success: false,
                transaction_id: None,
                status: status.to_string(),
                message: reason,
                ledger_entry_index: entry.index,
                entry_hash: entry.entry_hash,
                enclave_signature: entry.enclave_signature,
                remaining_budget_cents: state.policy.remaining_budget_cents,
            })
            .unwrap()
        }
    }
}
