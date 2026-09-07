/**
 * VaultPay Type Definitions
 */

export interface VerifiableCredential {
  issuer: string;
  subjectDid: string;
  issuanceDate: string;
  expirationDate: string;
  claims: {
    role: string;
    department: string;
    spendTierCents: number;
    isAuthorizedBuyer: boolean;
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    jws: string;
  };
}

export interface CatalogItem {
  id: string;
  vendor: string;
  name: string;
  unitPriceCents: number;
  category: string;
  inStock: boolean;
  description: string;
}

export interface VendorQuote {
  quoteId: string;
  vendor: string;
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  totalAmountCents: number;
  currency: string;
  nonce: string;
  vendorSignature: string;
  memo?: string;
}

export type LedgerStatus =
  | "Approved"
  | "BlockedUntrustedVendor"
  | "BlockedCapExceeded"
  | "BlockedBudgetExceeded"
  | "BlockedDuplicateInvoice"
  | "BlockedRevoked";

export interface LedgerEntry {
  index: number;
  timestampMs: number;
  vendor: string;
  amountCents: number;
  invoiceId: string;
  status: LedgerStatus;
  reason: string;
  prevHash: string;
  entryHash: string;
  enclaveSignature: string;
}

export interface TEEPolicyStatus {
  enclaveDid: string;
  allowlist: string[];
  perCallCapCents: number;
  sessionBudgetCents: number;
  remainingBudgetCents: number;
  isRevoked: boolean;
  totalTransactions: number;
  ledger: LedgerEntry[];
}

export interface PayVendorResult {
  success: boolean;
  transactionId?: string;
  status: string;
  message: string;
  ledgerEntryIndex: number;
  entryHash: string;
  enclaveSignature: string;
  remainingBudgetCents: number;
}

export interface AgentStep {
  phase: "AUTHENTICATION" | "DISCOVERY" | "NEGOTIATION" | "ENCLAVE_EXECUTION" | "SETTLEMENT";
  thought: string;
  toolCall?: {
    name: string;
    args: Record<string, any>;
  };
  toolResult?: any;
  constitutionalGuardCheck?: {
    guardName: string;
    passed: boolean;
    reason: string;
  };
}

export interface AgentResponse {
  finalReply: string;
  steps: AgentStep[];
  enclaveResult?: PayVendorResult;
}
