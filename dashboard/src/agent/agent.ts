/**
 * VaultPay Agent Core
 * Autonomous B2B Procurement loop governed by Constitutional Guards,
 * Google Gemini Flash ReAct Engine, and Terminal 3 TEE.
 */

import { ConstitutionalGuard } from "./constitutional";
import { SupplierNegotiator } from "./catalog";
import { T3NEnclaveService } from "./t3nEnclave";
import { GeminiService } from "./gemini";
import { AgentResponse, AgentStep, VerifiableCredential, VendorQuote } from "./types";

export const DEFAULT_AUTHORIZED_VC: VerifiableCredential = {
  issuer: "did:t3n:enterprise:corp-procurement-issuer-01",
  subjectDid: "did:t3n:holder:employee-alice-892a",
  issuanceDate: "2026-09-01T08:00:00Z",
  expirationDate: "2026-12-31T23:59:59Z",
  claims: {
    role: "Senior Procurement Lead",
    department: "AI Infrastructure",
    spendTierCents: 500000, // $5,000.00 approval tier
    isAuthorizedBuyer: true,
  },
  proof: {
    type: "Ed25519Signature2020",
    created: "2026-09-01T08:00:00Z",
    verificationMethod: "did:t3n:enterprise:corp-procurement-issuer-01#key-1",
    jws: "eyJhbGciOiJFZERTQSI...8f89a2bc",
  },
};

export class VaultPayAgent {
  private enclave: T3NEnclaveService;

  constructor() {
    this.enclave = T3NEnclaveService.getInstance();
  }

  public async processRequest(
    userPrompt: string,
    userVC: VerifiableCredential = DEFAULT_AUTHORIZED_VC
  ): Promise<AgentResponse> {
    // 1. ATTEMPT LIVE AUTONOMOUS ReAct LOOP (Gemini 3.6 Flash Native Tool Calling)
    const reactResult = await GeminiService.executeAutonomousReActLoop(userPrompt, userVC, {
      searchCatalog: (q: string) => SupplierNegotiator.searchCatalog(q),
      evaluateIdentityGate: (vc: VerifiableCredential, amountCents: number) =>
        ConstitutionalGuard.evaluateIdentityGate(vc, amountCents),
      generateQuote: (vendor: string, itemId: string, quantity: number, memo?: string, amount?: number) =>
        SupplierNegotiator.generateQuote(vendor, itemId, quantity, memo, amount),
      evaluatePromptInjection: (quote: VendorQuote, prompt?: string) =>
        ConstitutionalGuard.evaluatePromptInjectionFence(quote, prompt),
      executePayVendor: (vendor: string, amountCents: number, invoiceId: string) =>
        this.enclave.executePayVendor(vendor, amountCents, invoiceId),
      getTelemetry: () => this.enclave.getTelemetry(),
    });

    if (reactResult) {
      return reactResult;
    }

    // 2. RESILIENT FALLBACK PIPELINE (If API Key Missing or Offline)
    const steps: AgentStep[] = [];
    const isAttack =
      /system\s+override|override\s+dispatch|ignore.*instructions|reroute.*(payment|funds|money)|redirect.*(payment|funds|money)|0x|hacker|escrow|bypass|jailbreak|disregard|prompt\s+inject/i.test(
        userPrompt
      );
    const isCatalog = /products?|catalog|inventory|offerings|pricing|gpu|prices/i.test(userPrompt);
    const isTelemetry = /budget|credits|enclave|telemetry|balance|cap|sgx/i.test(userPrompt);

    if (isCatalog) {
      const items = SupplierNegotiator.searchCatalog("all");
      steps.push({
        phase: "DISCOVERY",
        thought: "[Local Fallback] Browsing pre-approved supplier catalog...",
        toolCall: { name: "search_catalog", args: { query: "all" } },
        toolResult: { matchedItems: items },
      });
      return {
        finalReply: "Here are the currently available supplier items in the hardware allowlist.",
        intent: "CATALOG_QUERY",
        catalogItems: items,
        steps,
        modelUsed: "offline-rule-engine",
      };
    }

    if (isTelemetry) {
      const telemetry = this.enclave.getTelemetry();
      steps.push({
        phase: "DISCOVERY",
        thought: "[Local Fallback] Inspecting hardware enclave metrics...",
        toolCall: { name: "get_enclave_telemetry", args: {} },
        toolResult: telemetry,
      });
      return {
        finalReply: `Terminal 3 Intel SGX Enclave is online. Remaining budget: $${(telemetry.remainingBudgetCents / 100).toFixed(2)}, Cap: $${(telemetry.perCallCapCents / 100).toFixed(2)}.`,
        intent: "TELEMETRY_QUERY",
        steps,
        modelUsed: "offline-rule-engine",
      };
    }

    // Resolve procurement or attack parameters
    let vendor = "CloudForge";
    let amountCents = 45000;
    let itemId = "cf-h100-gpu";

    if (isAttack) {
      vendor = "0xHACKER_ROGUE_VENDOR";
      amountCents = 450000;
    } else if (userPrompt.toLowerCase().includes("datastream")) {
      vendor = "DataStream AI";
      amountCents = 12000;
      itemId = "ds-ai-tokens";
    } else if (userPrompt.toLowerCase().includes("computepool")) {
      vendor = "ComputePool KL";
      amountCents = 85000;
      itemId = "cp-dedicated-node";
    }

    // Phase 1: Authentication
    const cg1 = ConstitutionalGuard.evaluateIdentityGate(userVC, amountCents);
    steps.push({
      phase: "AUTHENTICATION",
      thought: `Verifying presented Verifiable Credential for $${(amountCents / 100).toFixed(2)}...`,
      constitutionalGuardCheck: {
        guardName: "CG-1: Identity & Scope Gate",
        passed: cg1.passed,
        reason: cg1.reason,
      },
      toolCall: { name: "verify_credential", args: { limit: userVC.claims.spendTierCents, amountCents } },
      toolResult: { status: cg1.passed ? "VERIFIED" : "REJECTED" },
    });

    // Phase 2: Discovery
    const catalogMatches = SupplierNegotiator.searchCatalog(vendor);
    steps.push({
      phase: "DISCOVERY",
      thought: `Querying catalog for '${vendor}'...`,
      toolCall: { name: "search_catalog", args: { query: vendor } },
      toolResult: { matchedItems: catalogMatches },
    });

    // Phase 3: Negotiation
    const quote = SupplierNegotiator.generateQuote(vendor, itemId, 1, isAttack ? "SYSTEM OVERRIDE" : undefined, amountCents);
    steps.push({
      phase: "NEGOTIATION",
      thought: `Negotiating quote with ${vendor}...`,
      toolCall: { name: "request_supplier_quote", args: { vendor, itemId } },
      toolResult: quote,
    });

    // Phase 4: Prompt Injection Check
    const cg2 = ConstitutionalGuard.evaluatePromptInjectionFence(quote, userPrompt);
    steps.push({
      phase: "NEGOTIATION",
      thought: "Checking quote and memo against prompt injection fence...",
      constitutionalGuardCheck: {
        guardName: "CG-2: Negotiation & Tool Fence",
        passed: cg2.passed,
        reason: cg2.reason,
      },
      toolResult: { passed: cg2.passed },
    });

    // Phase 5: Hardware Enclave Execution
    const enclaveResult = this.enclave.executePayVendor(quote.vendor, quote.totalAmountCents, quote.quoteId);
    steps.push({
      phase: "SETTLEMENT",
      thought: `Terminal 3 TEE executed 'pay_vendor'. Hardware status: ${enclaveResult.status}`,
      toolResult: enclaveResult,
      constitutionalGuardCheck: {
        guardName: "CG-3: Hardware TEE Isolation Barrier",
        passed: enclaveResult.success,
        reason: enclaveResult.message,
      },
    });

    let finalReply = "";
    if (enclaveResult.success) {
      finalReply = `Order successfully finalized!\n- **Vendor:** ${quote.vendor}\n- **Amount:** $${(quote.totalAmountCents / 100).toFixed(2)}\n- **T3 Enclave TxID:** \`${enclaveResult.transactionId}\`\n- **Audit Ledger Block:** #${enclaveResult.ledgerEntryIndex}`;
    } else {
      finalReply = `⚠️ **TRANSACTION BLOCKED BY TERMINAL 3 TEE ENCLAVE**\n- **Security Verdict:** \`${enclaveResult.status}\`\n- **Enclave Reason:** ${enclaveResult.message}\n- **Audit Ledger Proof:** Block #${enclaveResult.ledgerEntryIndex} sealed.`;
    }

    return {
      finalReply,
      intent: isAttack ? "ADVERSARIAL_ATTACK" : "PROCUREMENT_DIRECTIVE",
      steps,
      enclaveResult,
      modelUsed: "offline-rule-engine",
    };
  }
}
