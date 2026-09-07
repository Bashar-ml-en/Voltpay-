//! VaultPay Tamper-Evident Ledger
//! Immutable, cryptographically chained audit log maintained inside Terminal 3 TEE.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LedgerStatus {
    Approved,
    BlockedUntrustedVendor,
    BlockedCapExceeded,
    BlockedBudgetExceeded,
    BlockedDuplicateInvoice,
    BlockedRevoked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntry {
    pub index: u64,
    pub timestamp_ms: u64,
    pub vendor: String,
    pub amount_cents: u64,
    pub invoice_id: String,
    pub status: LedgerStatus,
    pub reason: String,
    pub prev_hash: String,
    pub entry_hash: String,
    pub enclave_signature: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TamperEvidentLedger {
    pub entries: Vec<LedgerEntry>,
}

impl TamperEvidentLedger {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    /// Computes the SHA-256 hash of entry fields combined with the previous hash
    fn compute_hash(
        index: u64,
        timestamp_ms: u64,
        vendor: &str,
        amount_cents: u64,
        invoice_id: &str,
        status_str: &str,
        prev_hash: &str,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(index.to_be_bytes());
        hasher.update(timestamp_ms.to_be_bytes());
        hasher.update(vendor.as_bytes());
        hasher.update(amount_cents.to_be_bytes());
        hasher.update(invoice_id.as_bytes());
        hasher.update(status_str.as_bytes());
        hasher.update(prev_hash.as_bytes());
        hex::encode(hasher.finalize())
    }

    pub fn append(
        &mut self,
        timestamp_ms: u64,
        vendor: String,
        amount_cents: u64,
        invoice_id: String,
        status: LedgerStatus,
        reason: String,
        enclave_did: &str,
    ) -> LedgerEntry {
        let index = self.entries.len() as u64;
        let prev_hash = self
            .entries
            .last()
            .map(|e| e.entry_hash.clone())
            .unwrap_or_else(|| "0000000000000000000000000000000000000000000000000000000000000000".to_string());

        let status_str = format!("{:?}", status);
        let entry_hash = Self::compute_hash(
            index,
            timestamp_ms,
            &vendor,
            amount_cents,
            &invoice_id,
            &status_str,
            &prev_hash,
        );

        // Hardware enclave attestation signature mockup (SHA256 of entry_hash + enclave_did)
        let mut sig_hasher = Sha256::new();
        sig_hasher.update(entry_hash.as_bytes());
        sig_hasher.update(enclave_did.as_bytes());
        let enclave_signature = format!("tee_sig_{}", hex::encode(sig_hasher.finalize())[..32].to_string());

        let entry = LedgerEntry {
            index,
            timestamp_ms,
            vendor,
            amount_cents,
            invoice_id,
            status,
            reason,
            prev_hash,
            entry_hash,
            enclave_signature,
        };

        self.entries.push(entry.clone());
        entry
    }

    /// Verifies the cryptographic continuity of the entire ledger chain
    pub fn verify_chain_integrity(&self) -> bool {
        let mut expected_prev_hash = "0000000000000000000000000000000000000000000000000000000000000000".to_string();

        for entry in &self.entries {
            if entry.prev_hash != expected_prev_hash {
                return false;
            }
            let status_str = format!("{:?}", entry.status);
            let calculated_hash = Self::compute_hash(
                entry.index,
                entry.timestamp_ms,
                &entry.vendor,
                entry.amount_cents,
                &entry.invoice_id,
                &status_str,
                &entry.prev_hash,
            );
            if calculated_hash != entry.entry_hash {
                return false;
            }
            expected_prev_hash = entry.entry_hash.clone();
        }
        true
    }
}
