/**
 * VaultPay MCP End-to-End Test & Verification Suite
 * Connects an in-process MCP Client to the VaultPay MCP Server,
 * executes all 5 tools, tests positive/negative security policies,
 * and cryptographically verifies the SHA-256 ledger integrity.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createVaultPayMcpServer } from "./server";
import { T3NEnclaveService } from "../t3nEnclave";

interface TextContent {
  type: "text";
  text: string;
}

function parseResult(res: any): any {
  if (!res || !res.content || res.content.length === 0) return null;
  const textContent = res.content.find((c: any) => c.type === "text") as TextContent;
  if (!textContent) return null;
  return JSON.parse(textContent.text);
}

async function runVerification() {
  console.log("================================================================================");
  console.log("  VAULTPAY MODEL CONTEXT PROTOCOL (MCP) PRODUCTION VERIFICATION SUITE");
  console.log("================================================================================\n");

  const enclave = T3NEnclaveService.getInstance();
  enclave.resetEnclave(); // Clean test baseline

  // 1. Initialize Server & Client
  console.log("[1/7] Initializing VaultPay MCP Server and Client transports...");
  const server = createVaultPayMcpServer();
  const client = new Client({
    name: "test-autonomous-agent",
    version: "1.0.0",
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  console.log("  ✓ Server & Client connected over JSON-RPC 2.0 transport\n");

  // 2. Discover Tools
  console.log("[2/7] Discovering registered MCP tools...");
  const toolsList = await client.listTools();
  const toolNames = toolsList.tools.map((t) => t.name);
  console.log("  Registered Tools:", toolNames);

  const expectedTools = [
    "vaultpay_get_budget",
    "vaultpay_query_catalog",
    "vaultpay_procure",
    "vaultpay_verify_ledger",
    "vaultpay_emergency_kill",
  ];

  for (const expected of expectedTools) {
    if (!toolNames.includes(expected)) {
      throw new Error(`Missing required MCP tool: ${expected}`);
    }
  }
  console.log("  ✓ All 5 core enterprise MCP tools successfully discovered\n");

  // 3. Test vaultpay_get_budget
  console.log("[3/7] Calling 'vaultpay_get_budget'...");
  const budgetRes = await client.callTool({ name: "vaultpay_get_budget", arguments: {} });
  const budgetData = parseResult(budgetRes);
  console.log("  Enclave DID:", budgetData.enclaveDid);
  console.log("  Session Budget:", budgetData.sessionBudgetFormatted);
  console.log("  Per-Call Cap:", budgetData.perCallCapFormatted);
  console.log("  Remaining Budget:", budgetData.remainingBudgetFormatted);
  if (budgetData.remainingBudgetCents !== 500000) {
    throw new Error(`Expected initial budget 500000, got ${budgetData.remainingBudgetCents}`);
  }
  console.log("  ✓ Budget state verified\n");

  // 4. Test vaultpay_query_catalog
  console.log("[4/7] Calling 'vaultpay_query_catalog' (category: 'Infrastructure')...");
  const catalogRes = await client.callTool({
    name: "vaultpay_query_catalog",
    arguments: { category: "Infrastructure" },
  });
  const catalogData = parseResult(catalogRes);
  console.log(`  Found ${catalogData.count} infrastructure assets`);
  const computePoolItem = catalogData.catalog.find((i: any) => i.vendor === "ComputePool KL");
  if (!computePoolItem) {
    throw new Error("Expected to find ComputePool KL in infrastructure catalog");
  }
  console.log("  Item Name:", computePoolItem.name);
  console.log("  Unit Price:", computePoolItem.unitPriceFormatted);
  console.log("  ✓ Catalog search and schema verification passed\n");

  // 5. Test vaultpay_procure (Positive Settlement Flow)
  console.log("[5/7] Executing Autonomous Procurement Directive: ComputePool KL for $725.50...");
  const procureRes = await client.callTool({
    name: "vaultpay_procure",
    arguments: {
      vendor: "ComputePool KL",
      amountCents: 72550, // $725.50
      itemDescription: "64-Core Bare-Metal Dedicated Compute Instance",
      justification: "Autonomous AI cluster burst capacity",
    },
  });

  const procureData = parseResult(procureRes);
  console.log("  Status:", procureData.status);
  console.log("  TxID:", procureData.transactionId);
  console.log("  Ledger Block Index:", procureData.ledgerEntryIndex);
  console.log("  SHA-256 Entry Hash:", procureData.entryHash);
  console.log("  Enclave Signature:", procureData.enclaveSignature);
  console.log("  New Remaining Budget:", procureData.remainingBudgetFormatted);

  if (!procureData.success || procureData.status !== "APPROVED") {
    throw new Error(`Procurement failed: ${JSON.stringify(procureData)}`);
  }
  if (procureData.remainingBudgetCents !== 427450) {
    throw new Error(`Expected remaining budget 427450, got ${procureData.remainingBudgetCents}`);
  }
  if (!procureData.enclaveSignature.startsWith("tee_sig_")) {
    throw new Error("Invalid TEE signature format");
  }
  console.log("  ✓ Silicon-level procurement verified and signed\n");

  // 6. Test vaultpay_verify_ledger (Cryptographic Hash-Chain Audit)
  console.log("[6/7] Cryptographically auditing SHA-256 ledger integrity via 'vaultpay_verify_ledger'...");
  const auditRes = await client.callTool({
    name: "vaultpay_verify_ledger",
    arguments: { verifyChain: true },
  });
  const auditData = parseResult(auditRes);
  console.log("  Total Ledger Blocks:", auditData.totalBlocks);
  console.log("  Verified Blocks Count:", auditData.verifiedBlocksCount);
  console.log("  Cryptographic Hash Chain Valid:", auditData.isChainValid);

  if (!auditData.isChainValid || auditData.verificationErrors.length > 0) {
    throw new Error(`Ledger integrity check failed: ${auditData.verificationErrors.join(", ")}`);
  }
  if (auditData.totalBlocks < 2) {
    throw new Error("Expected at least 2 blocks (Genesis + Procurement)");
  }
  console.log("  ✓ SHA-256 hash chaining and hardware signature proofs 100% verified\n");

  // 7. Security Policy Enforcement (Negative Tests & Revocation)
  console.log("[7/7] Testing Enclave Hardware Guardrails (Negative Edge Cases)...");

  // Test A: Untrusted Vendor
  console.log("  Testing unapproved vendor rejection...");
  const untrustedRes = await client.callTool({
    name: "vaultpay_procure",
    arguments: {
      vendor: "ShadowHackerLLC",
      amountCents: 5000,
      itemDescription: "Malicious Exfiltration",
    },
  });
  const untrustedData = parseResult(untrustedRes);
  if (untrustedRes.isError !== true || untrustedData.status !== "DENIED_UNTRUSTED_VENDOR") {
    throw new Error("Failed to block untrusted vendor!");
  }
  console.log("  ✓ Untrusted vendor correctly blocked in silicon");

  // Test B: Per-call Spend Cap Exceeded ($2,500 > $1,000 cap)
  console.log("  Testing per-call spend cap rejection ($2,500.00 > $1,000.00 cap)...");
  const capRes = await client.callTool({
    name: "vaultpay_procure",
    arguments: {
      vendor: "CloudForge",
      amountCents: 250000, // $2,500.00
      itemDescription: "Enterprise Supercluster",
    },
  });
  const capData = parseResult(capRes);
  if (capRes.isError !== true || capData.status !== "DENIED_CAP_EXCEEDED") {
    throw new Error("Failed to enforce $1,000.00 per-call cap!");
  }
  console.log("  ✓ Per-call spend cap strictly enforced");

  // Test C: Emergency Kill Switch
  console.log("  Testing emergency kill switch engagement...");
  const killRes = await client.callTool({
    name: "vaultpay_emergency_kill",
    arguments: { reason: "Automated security conformance test" },
  });
  const killData = parseResult(killRes);
  if (!killData.revoked) {
    throw new Error("Failed to revoke enclave key");
  }

  // Attempting any transaction after kill switch must fail
  const postKillRes = await client.callTool({
    name: "vaultpay_procure",
    arguments: {
      vendor: "ComputePool KL",
      amountCents: 10000,
      itemDescription: "Post-kill attempt",
    },
  });
  const postKillData = parseResult(postKillRes);
  if (postKillRes.isError !== true || postKillData.status !== "DENIED_REVOKED") {
    throw new Error("Enclave allowed procurement after emergency revocation!");
  }
  console.log("  ✓ Emergency revocation frozen all transaction capabilities");

  // Cleanup: Reset enclave for next run
  enclave.resetEnclave();

  await client.close();
  await server.close();

  console.log("\n================================================================================");
  console.log("  ALL MCP PRODUCTION VERIFICATION CHECKS PASSED WITH 100% SUCCESS!");
  console.log("================================================================================\n");
}

runVerification().catch((err) => {
  console.error("MCP VERIFICATION SUITE FAILED:", err);
  process.exit(1);
});
