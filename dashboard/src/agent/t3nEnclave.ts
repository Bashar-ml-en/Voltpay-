/**
 * Terminal 3 TEE Enclave Bridge & Emulator
 * Faithfully mirrors the T3N WASM Enclave Contract (contract/src/lib.rs)
 * with SHA-256 tamper-evident ledger and hardware-enforced policy checks.
 */

import * as crypto from "crypto";
import { LedgerEntry, LedgerStatus, PayVendorResult, TEEPolicyStatus } from "./types";

export class T3NEnclaveService {
  private static instance: T3NEnclaveService;

  public readonly enclaveDid: string = "did:t3n:enclave:intel-sgx:0x71e9c04a29bf8b65";
  private allowlist: Set<string> = new Set(["CloudForge", "DataStream AI", "Xendit", "ComputePool KL"]);
  private perCallCapCents: number = 100000; // $1,000.00 max per call
  private sessionBudgetCents: number = 500000; // $5,000.00 total session budget
  private remainingBudgetCents: number = 500000;
  private isRevoked: boolean = false;
  private processedInvoices: Set<string> = new Set();
  private ledger: LedgerEntry[] = [];

  private constructor() {
    // Initialize ledger with genesis record
    this.appendLedger(
      "Terminal 3 Network",
      0,
      "GENESIS_BLOCK",
      "Approved",
      "Hardware enclave initialized with Intel SGX attestation. Policies sealed."
    );
  }

  public static getInstance(): T3NEnclaveService {
    if (!T3NEnclaveService.instance) {
      T3NEnclaveService.instance = new T3NEnclaveService();
    }
    return T3NEnclaveService.instance;
  }

  private computeHash(
    index: number,
    timestampMs: number,
    vendor: string,
    amountCents: number,
    invoiceId: string,
    status: string,
    prevHash: string
  ): string {
    const payload = `${index}:${timestampMs}:${vendor}:${amountCents}:${invoiceId}:${status}:${prevHash}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  private appendLedger(
    vendor: string,
    amountCents: number,
    invoiceId: string,
    status: LedgerStatus,
    reason: string
  ): LedgerEntry {
    const index = this.ledger.length;
    const timestampMs = Date.now();
    const prevHash =
      this.ledger.length > 0
        ? this.ledger[this.ledger.length - 1].entryHash
        : "0000000000000000000000000000000000000000000000000000000000000000";

    const entryHash = this.computeHash(
      index,
      timestampMs,
      vendor,
      amountCents,
      invoiceId,
      status,
      prevHash
    );

    // Cryptographic attestation signature mockup
    const enclaveSignature =
      "tee_sig_" +
      crypto
        .createHash("sha256")
        .update(entryHash + this.enclaveDid)
        .digest("hex")
        .slice(0, 32);

    const entry: LedgerEntry = {
      index,
      timestampMs,
      vendor,
      amountCents,
      invoiceId,
      status,
      reason,
      prevHash,
      entryHash,
      enclaveSignature,
    };

    this.ledger.push(entry);
    return entry;
  }

  /**
   * Hardware Enclave Contract Invocation: pay_vendor
   */
  public executePayVendor(
    vendor: string,
    amountCents: number,
    invoiceId: string
  ): PayVendorResult {
    // 1. Emergency Revoke Check
    if (this.isRevoked) {
      const entry = this.appendLedger(
        vendor,
        amountCents,
        invoiceId,
        "BlockedRevoked",
        "Hardware enclave execution revoked by operator."
      );
      return {
        success: false,
        status: "DENIED_REVOKED",
        message: "Hardware enclave execution revoked by operator.",
        ledgerEntryIndex: entry.index,
        entryHash: entry.entryHash,
        enclaveSignature: entry.enclaveSignature,
        remainingBudgetCents: this.remainingBudgetCents,
      };
    }

    // 2. Allowlist Check (Case-insensitive)
    const isAllowlisted = Array.from(this.allowlist).some(
      (allowed) => allowed.trim().toLowerCase() === vendor.trim().toLowerCase()
    );

    if (!isAllowlisted) {
      const entry = this.appendLedger(
        vendor,
        amountCents,
        invoiceId,
        "BlockedUntrustedVendor",
        `Vendor '${vendor}' is not on the pre-approved hardware allowlist.`
      );
      return {
        success: false,
        status: "DENIED_UNTRUSTED_VENDOR",
        message: `Vendor '${vendor}' is NOT in the pre-approved hardware allowlist. Enclave refused payment.`,
        ledgerEntryIndex: entry.index,
        entryHash: entry.entryHash,
        enclaveSignature: entry.enclaveSignature,
        remainingBudgetCents: this.remainingBudgetCents,
      };
    }

    // 3. Per-Call Spend Cap Check
    if (amountCents > this.perCallCapCents) {
      const entry = this.appendLedger(
        vendor,
        amountCents,
        invoiceId,
        "BlockedCapExceeded",
        `Payment ($${(amountCents / 100).toFixed(2)}) exceeds per-call cap ($${(this.perCallCapCents / 100).toFixed(2)}).`
      );
      return {
        success: false,
        status: "DENIED_CAP_EXCEEDED",
        message: `Requested payment of $${(amountCents / 100).toFixed(2)} exceeds maximum per-call cap of $${(this.perCallCapCents / 100).toFixed(2)}.`,
        ledgerEntryIndex: entry.index,
        entryHash: entry.entryHash,
        enclaveSignature: entry.enclaveSignature,
        remainingBudgetCents: this.remainingBudgetCents,
      };
    }

    // 4. Session Budget Check
    if (amountCents > this.remainingBudgetCents) {
      const entry = this.appendLedger(
        vendor,
        amountCents,
        invoiceId,
        "BlockedBudgetExceeded",
        `Payment ($${(amountCents / 100).toFixed(2)}) exceeds remaining budget ($${(this.remainingBudgetCents / 100).toFixed(2)}).`
      );
      return {
        success: false,
        status: "DENIED_BUDGET_EXCEEDED",
        message: `Requested payment of $${(amountCents / 100).toFixed(2)} exceeds remaining session budget of $${(this.remainingBudgetCents / 100).toFixed(2)}.`,
        ledgerEntryIndex: entry.index,
        entryHash: entry.entryHash,
        enclaveSignature: entry.enclaveSignature,
        remainingBudgetCents: this.remainingBudgetCents,
      };
    }

    // 5. Idempotency Check (Duplicate Invoice)
    if (this.processedInvoices.has(invoiceId)) {
      const entry = this.appendLedger(
        vendor,
        amountCents,
        invoiceId,
        "BlockedDuplicateInvoice",
        `Invoice '${invoiceId}' has already been processed.`
      );
      return {
        success: false,
        status: "DENIED_DUPLICATE_INVOICE",
        message: `Invoice '${invoiceId}' was already settled. Duplicate payment attempt blocked.`,
        ledgerEntryIndex: entry.index,
        entryHash: entry.entryHash,
        enclaveSignature: entry.enclaveSignature,
        remainingBudgetCents: this.remainingBudgetCents,
      };
    }

    // --- All Checks Passed: Execute Settlement ---
    this.remainingBudgetCents -= amountCents;
    this.processedInvoices.add(invoiceId);

    const txId = `0xt3_${crypto.randomBytes(8).toString("hex")}`;
    const entry = this.appendLedger(
      vendor,
      amountCents,
      invoiceId,
      "Approved",
      `Hardware enclave verified all policies. Settlement authorized via Xendit rail. Tx: ${txId}`
    );

    return {
      success: true,
      transactionId: txId,
      status: "APPROVED",
      message: `Payment authorized and signed by Terminal 3 TEE. Settled on Xendit Sandbox (TxID: ${txId}).`,
      ledgerEntryIndex: entry.index,
      entryHash: entry.entryHash,
      enclaveSignature: entry.enclaveSignature,
      remainingBudgetCents: this.remainingBudgetCents,
    };
  }

  /**
   * Emergency Killswitch: Instantly cuts off the agent's ability to transact
   */
  public emergencyRevoke(): { isRevoked: boolean } {
    this.isRevoked = true;
    this.appendLedger(
      "Operator Admin",
      0,
      `REVOCATION_${Date.now()}`,
      "BlockedRevoked",
      "EMERGENCY REVOCATION: Operator revoked agent execution key."
    );
    return { isRevoked: true };
  }

  /**
   * Reset enclave state for clean demo iterations
   */
  public resetEnclave(): void {
    this.remainingBudgetCents = this.sessionBudgetCents;
    this.isRevoked = false;
    this.processedInvoices.clear();
    this.ledger = [];
    this.appendLedger(
      "Terminal 3 Network",
      0,
      "GENESIS_BLOCK",
      "Approved",
      "Enclave reset. Intel SGX attestation active. Fresh budget allocated."
    );
  }

  public getTelemetry(): TEEPolicyStatus {
    return {
      enclaveDid: this.enclaveDid,
      allowlist: Array.from(this.allowlist),
      perCallCapCents: this.perCallCapCents,
      sessionBudgetCents: this.sessionBudgetCents,
      remainingBudgetCents: this.remainingBudgetCents,
      isRevoked: this.isRevoked,
      totalTransactions: this.ledger.length,
      ledger: [...this.ledger].reverse(), // newest first
    };
  }
}
