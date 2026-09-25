/**
 * VaultPay Model Context Protocol (MCP) Server
 * Exposes Terminal 3 Intel SGX Enclave-guarded financial procurement tools,
 * resources, and prompts to autonomous AI agents (Claude, Cursor, Antigravity, CrewAI, AutoGPT).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as crypto from "crypto";
import { T3NEnclaveService } from "../t3nEnclave";
import { SUPPLIER_CATALOG, SupplierNegotiator } from "../catalog";
import {
  GetBudgetInputSchema,
  QueryCatalogInputSchema,
  ProcureInputSchema,
  VerifyLedgerInputSchema,
  EmergencyKillInputSchema,
} from "./types";

export function createVaultPayMcpServer(): McpServer {
  const enclave = T3NEnclaveService.getInstance();

  const server = new McpServer({
    name: "vaultpay-mcp-server",
    version: "1.0.0",
  });

  // ==========================================
  // TOOL 1: vaultpay_get_budget
  // ==========================================
  server.tool(
    "vaultpay_get_budget",
    "Query real-time hardware-enforced financial parameters, remaining session allowance, per-transaction ceiling, and Intel SGX Enclave Attestation DID.",
    GetBudgetInputSchema.shape,
    async () => {
      const telemetry = enclave.getTelemetry();
      const payload = {
        enclaveDid: telemetry.enclaveDid,
        networkMode: telemetry.networkMode,
        isRevoked: telemetry.isRevoked,
        sessionBudgetCents: telemetry.sessionBudgetCents,
        sessionBudgetFormatted: `$${(telemetry.sessionBudgetCents / 100).toFixed(2)}`,
        remainingBudgetCents: telemetry.remainingBudgetCents,
        remainingBudgetFormatted: `$${(telemetry.remainingBudgetCents / 100).toFixed(2)}`,
        spentBudgetCents: telemetry.sessionBudgetCents - telemetry.remainingBudgetCents,
        spentBudgetFormatted: `$${((telemetry.sessionBudgetCents - telemetry.remainingBudgetCents) / 100).toFixed(2)}`,
        perCallCapCents: telemetry.perCallCapCents,
        perCallCapFormatted: `$${(telemetry.perCallCapCents / 100).toFixed(2)}`,
        totalTransactions: telemetry.totalTransactions,
        allowlist: telemetry.allowlist,
        t3nCredits: telemetry.t3nCredits,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 2: vaultpay_query_catalog
  // ==========================================
  server.tool(
    "vaultpay_query_catalog",
    "Search pre-approved enterprise supplier registry and infrastructure assets (ComputePool KL, CloudForge, DataStream AI, Xendit) with pricing, specifications, and SLA metrics.",
    QueryCatalogInputSchema.shape,
    async (args) => {
      let items = SUPPLIER_CATALOG;

      if (args.query) {
        items = SupplierNegotiator.searchCatalog(args.query);
      }

      if (args.category && args.category !== "all") {
        items = items.filter((item) => item.category.toLowerCase() === args.category?.toLowerCase());
      }

      if (args.maxPriceCents !== undefined) {
        items = items.filter((item) => item.unitPriceCents <= (args.maxPriceCents as number));
      }

      const formatted = items.map((item) => ({
        id: item.id,
        vendor: item.vendor,
        name: item.name,
        category: item.category,
        unitPriceCents: item.unitPriceCents,
        unitPriceFormatted: `$${(item.unitPriceCents / 100).toFixed(2)}`,
        inStock: item.inStock,
        description: item.description,
        exceedsPerCallCap: item.unitPriceCents > 100000,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: formatted.length, catalog: formatted }, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 3: vaultpay_procure
  // ==========================================
  server.tool(
    "vaultpay_procure",
    "Autonomously authorize and settle an enterprise procurement transaction inside the Intel SGX hardware enclave. Verifies vendor allowlist, validates caps, deducts budget, creates a tamper-evident SHA-256 ledger block, and triggers the settlement rail.",
    ProcureInputSchema.shape,
    async (args) => {
      const invoiceId =
        args.invoiceId ||
        `INV-AUTO-${args.vendor.replace(/\s+/g, "").slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const result = enclave.executePayVendor(args.vendor, args.amountCents, invoiceId);

      const responsePayload = {
        success: result.success,
        status: result.status,
        message: result.message,
        transactionId: result.transactionId || null,
        ledgerEntryIndex: result.ledgerEntryIndex,
        entryHash: result.entryHash,
        enclaveSignature: result.enclaveSignature,
        amountCents: args.amountCents,
        amountFormatted: `$${(args.amountCents / 100).toFixed(2)}`,
        vendor: args.vendor,
        invoiceId,
        itemDescription: args.itemDescription,
        justification: args.justification || "Autonomous agent operational procurement",
        remainingBudgetCents: result.remainingBudgetCents,
        remainingBudgetFormatted: `$${(result.remainingBudgetCents / 100).toFixed(2)}`,
        rail: "Xendit B2B Virtual Settlement Rail",
        attestationProof: {
          enclaveDid: enclave.enclaveDid,
          sig: result.enclaveSignature,
          ledgerHash: result.entryHash,
        },
      };

      return {
        isError: !result.success,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(responsePayload, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 4: vaultpay_verify_ledger
  // ==========================================
  server.tool(
    "vaultpay_verify_ledger",
    "Cryptographically inspect and verify the integrity of the VaultPay SHA-256 audit ledger. Confirms hash chain consistency from Genesis Block #0 to the latest block.",
    VerifyLedgerInputSchema.shape,
    async (args) => {
      const rawLedger = enclave.getRawLedger(); // index 0 is Genesis
      const verifyChain = args.verifyChain !== false;
      let isChainValid = true;
      const errors: string[] = [];

      if (verifyChain && rawLedger.length > 0) {
        for (let i = 0; i < rawLedger.length; i++) {
          const block = rawLedger[i];

          // 1. Verify prevHash link
          if (i > 0) {
            const prevBlock = rawLedger[i - 1];
            if (block.prevHash !== prevBlock.entryHash) {
              isChainValid = false;
              errors.push(`Block #${block.index} prevHash mismatch: expected ${prevBlock.entryHash}, got ${block.prevHash}`);
            }
          } else {
            // Genesis block
            const expectedGenesisPrev = "0000000000000000000000000000000000000000000000000000000000000000";
            if (block.prevHash !== expectedGenesisPrev) {
              isChainValid = false;
              errors.push(`Genesis Block #0 prevHash is corrupted`);
            }
          }

          // 2. Recompute entryHash
          const payload = `${block.index}:${block.timestampMs}:${block.vendor}:${block.amountCents}:${block.invoiceId}:${block.status}:${block.prevHash}`;
          const computedHash = crypto.createHash("sha256").update(payload).digest("hex");
          if (computedHash !== block.entryHash) {
            isChainValid = false;
            errors.push(`Block #${block.index} entryHash mismatch: expected ${computedHash}, got ${block.entryHash}`);
          }

          // 3. Verify enclave signature format
          const expectedSig =
            "tee_sig_" +
            crypto
              .createHash("sha256")
              .update(block.entryHash + enclave.enclaveDid)
              .digest("hex")
              .slice(0, 32);

          if (block.enclaveSignature !== expectedSig) {
            isChainValid = false;
            errors.push(`Block #${block.index} enclave signature verification failed`);
          }
        }
      }

      const limit = args.limit || 10;
      const displayBlocks = [...rawLedger].reverse().slice(0, limit);

      const payload = {
        isChainValid,
        totalBlocks: rawLedger.length,
        verifiedBlocksCount: rawLedger.length,
        verificationErrors: errors,
        latestBlocks: displayBlocks.map((b) => ({
          index: b.index,
          timestamp: new Date(b.timestampMs).toISOString(),
          vendor: b.vendor,
          amountFormatted: `$${(b.amountCents / 100).toFixed(2)}`,
          invoiceId: b.invoiceId,
          status: b.status,
          reason: b.reason,
          entryHash: b.entryHash,
          prevHash: b.prevHash,
          enclaveSignature: b.enclaveSignature,
        })),
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // TOOL 5: vaultpay_emergency_kill
  // ==========================================
  server.tool(
    "vaultpay_emergency_kill",
    "Silicon-level emergency kill switch. Instantly revokes the enclave signing key and halts all future autonomous settlements.",
    EmergencyKillInputSchema.shape,
    async (args) => {
      const result = enclave.emergencyRevoke();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                revoked: result.isRevoked,
                reason: args.reason,
                timestamp: new Date().toISOString(),
                status: "ENCLAVE_SIGNING_KEYS_FROZEN",
                message: "Emergency kill switch engaged. All autonomous procurement halted at the hardware layer.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ==========================================
  // RESOURCES
  // ==========================================
  server.resource(
    "enclave-status",
    "vaultpay://enclave/status",
    async (uri) => {
      const telemetry = enclave.getTelemetry();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(telemetry, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    "ledger-latest",
    "vaultpay://ledger/latest",
    async (uri) => {
      const rawLedger = enclave.getRawLedger();
      const latestBlock = rawLedger.length > 0 ? rawLedger[rawLedger.length - 1] : null;
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(latestBlock, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    "catalog-suppliers",
    "vaultpay://catalog/suppliers",
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(SUPPLIER_CATALOG, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // PROMPTS
  // ==========================================
  server.prompt(
    "procure_compute_node",
    "Interactive workflow guiding an autonomous agent to safely procure compute infrastructure under TEE guardrails.",
    async () => {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `You are an autonomous operations agent with access to the VaultPay Model Context Protocol (MCP) Server.
Your goal is to inspect available infrastructure, check your remaining hardware-enforced budget, and execute a procurement transaction within the $1,000.00 per-call cap.

Step 1: Call 'vaultpay_get_budget' to confirm your spending parameters.
Step 2: Call 'vaultpay_query_catalog' with category 'Infrastructure' or 'Cloud Compute' to find an approved vendor (e.g., ComputePool KL).
Step 3: Call 'vaultpay_procure' with the vendor name, amount in cents, and item description.
Step 4: Verify the signed enclave receipt (TxID and Block Index) and return the attestation proof.`,
            },
          },
        ],
      };
    }
  );

  return server;
}
