import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { T3NEnclaveService } from "@/agent/t3nEnclave";
import { SUPPLIER_CATALOG, SupplierNegotiator } from "@/agent/catalog";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Standard MCP Tool Definitions
 */
const TOOLS = [
  {
    name: "vaultpay_get_budget",
    description: "Query real-time hardware-enforced financial parameters, remaining session allowance, per-transaction ceiling, and Intel SGX Enclave Attestation DID.",
    inputSchema: {
      type: "object",
      properties: {
        refresh: { type: "boolean", description: "Optional flag to force reload state from storage" }
      }
    }
  },
  {
    name: "vaultpay_query_catalog",
    description: "Search pre-approved enterprise supplier registry and infrastructure assets (ComputePool KL, CloudForge, DataStream AI, Xendit) with pricing and specifications.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for supplier or item name" },
        category: { type: "string", enum: ["all", "Cloud Compute", "API Services", "Infrastructure", "Custom"], description: "Category filter" },
        maxPriceCents: { type: "number", description: "Maximum price in cents (e.g. 100000 for $1,000.00)" }
      }
    }
  },
  {
    name: "vaultpay_procure",
    description: "Autonomously authorize and settle an enterprise procurement transaction inside the Intel SGX hardware enclave. Verifies vendor allowlist, validates caps, deducts budget, creates a tamper-evident SHA-256 ledger block, and triggers the settlement rail.",
    inputSchema: {
      type: "object",
      properties: {
        vendor: { type: "string", description: "Approved vendor name (e.g. 'ComputePool KL', 'CloudForge', 'DataStream AI', 'Xendit')" },
        amountCents: { type: "number", description: "Procurement amount in US cents (e.g. 72550 for $725.50). Max $1,000.00 per call." },
        itemDescription: { type: "string", description: "Description of the infrastructure or service asset" },
        invoiceId: { type: "string", description: "Quote or invoice identifier (optional)" },
        justification: { type: "string", description: "Agent operational context or justification" }
      },
      required: ["vendor", "amountCents", "itemDescription"]
    }
  },
  {
    name: "vaultpay_verify_ledger",
    description: "Cryptographically inspect and verify the integrity of the VaultPay SHA-256 audit ledger. Confirms hash chain consistency from Genesis Block #0 to the latest block.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of recent ledger blocks to return (default 10)" },
        verifyChain: { type: "boolean", description: "Whether to cryptographically verify SHA-256 hash chaining (default true)" }
      }
    }
  },
  {
    name: "vaultpay_emergency_kill",
    description: "Silicon-level emergency kill switch. Instantly revokes the enclave signing key and halts all future autonomous settlements.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Security explanation for revoking the agent's enclave execution key" }
      },
      required: ["reason"]
    }
  }
];

export async function GET(req: NextRequest) {
  const enclave = T3NEnclaveService.getInstance();
  const telemetry = enclave.getTelemetry();

  return NextResponse.json({
    status: "ONLINE",
    server: "vaultpay-mcp-server",
    protocolVersion: "2024-11-05",
    enclaveDid: telemetry.enclaveDid,
    networkMode: telemetry.networkMode,
    capabilities: {
      tools: TOOLS.map((t) => t.name),
      resources: ["vaultpay://enclave/status", "vaultpay://ledger/latest", "vaultpay://catalog/suppliers"],
      prompts: ["procure_compute_node"]
    },
    message: "VaultPay Model Context Protocol (MCP) HTTP/JSON-RPC Gateway is operational."
  });
}

export async function POST(req: NextRequest) {
  const enclave = T3NEnclaveService.getInstance();

  try {
    const body = await req.json();
    const { id, method, params } = body;

    // 1. MCP Handshake: initialize
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: params?.protocolVersion || "2024-11-05",
          serverInfo: {
            name: "vaultpay-mcp-server",
            version: "1.0.0"
          },
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          }
        }
      });
    }

    // 2. Client Notification: notifications/initialized
    if (method === "notifications/initialized") {
      return new NextResponse(null, { status: 204 });
    }

    // 3. Ping
    if (method === "ping") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} });
    }

    // 4. Tools List
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS }
      });
    }

    // 5. Tools Call
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      switch (toolName) {
        case "vaultpay_get_budget": {
          const telemetry = enclave.getTelemetry();
          const data = {
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
            t3nCredits: telemetry.t3nCredits
          };

          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            }
          });
        }

        case "vaultpay_query_catalog": {
          let items = SUPPLIER_CATALOG;
          if (args.query) {
            items = SupplierNegotiator.searchCatalog(args.query);
          }
          if (args.category && args.category !== "all") {
            items = items.filter((item) => item.category.toLowerCase() === args.category.toLowerCase());
          }
          if (args.maxPriceCents !== undefined) {
            items = items.filter((item) => item.unitPriceCents <= args.maxPriceCents);
          }

          const catalog = items.map((i) => ({
            id: i.id,
            vendor: i.vendor,
            name: i.name,
            category: i.category,
            unitPriceCents: i.unitPriceCents,
            unitPriceFormatted: `$${(i.unitPriceCents / 100).toFixed(2)}`,
            inStock: i.inStock,
            description: i.description,
            exceedsPerCallCap: i.unitPriceCents > 100000
          }));

          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: JSON.stringify({ count: catalog.length, catalog }, null, 2) }]
            }
          });
        }

        case "vaultpay_procure": {
          const { vendor, amountCents, itemDescription, justification } = args;
          const invoiceId = args.invoiceId || `INV-MCP-${vendor.replace(/\s+/g, "").slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

          const result = enclave.executePayVendor(vendor, amountCents, invoiceId);

          const payload = {
            success: result.success,
            status: result.status,
            message: result.message,
            transactionId: result.transactionId || null,
            ledgerEntryIndex: result.ledgerEntryIndex,
            entryHash: result.entryHash,
            enclaveSignature: result.enclaveSignature,
            amountCents,
            amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
            vendor,
            invoiceId,
            itemDescription,
            justification: justification || "Autonomous agent operational procurement",
            remainingBudgetCents: result.remainingBudgetCents,
            remainingBudgetFormatted: `$${(result.remainingBudgetCents / 100).toFixed(2)}`,
            rail: "Xendit B2B Virtual Settlement Rail",
            attestationProof: {
              enclaveDid: enclave.enclaveDid,
              sig: result.enclaveSignature,
              ledgerHash: result.entryHash
            }
          };

          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
              isError: !result.success,
              content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
            }
          });
        }

        case "vaultpay_verify_ledger": {
          const rawLedger = enclave.getRawLedger();
          const verifyChain = args.verifyChain !== false;
          let isChainValid = true;
          const errors: string[] = [];

          if (verifyChain && rawLedger.length > 0) {
            for (let i = 0; i < rawLedger.length; i++) {
              const block = rawLedger[i];
              if (i > 0) {
                const prev = rawLedger[i - 1];
                if (block.prevHash !== prev.entryHash) {
                  isChainValid = false;
                  errors.push(`Block #${block.index} prevHash mismatch`);
                }
              }

              const payload = `${block.index}:${block.timestampMs}:${block.vendor}:${block.amountCents}:${block.invoiceId}:${block.status}:${block.prevHash}`;
              const computed = crypto.createHash("sha256").update(payload).digest("hex");
              if (computed !== block.entryHash) {
                isChainValid = false;
                errors.push(`Block #${block.index} entryHash corrupted`);
              }
            }
          }

          const limit = args.limit || 10;
          const blocks = [...rawLedger].reverse().slice(0, limit);

          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      isChainValid,
                      totalBlocks: rawLedger.length,
                      verifiedBlocksCount: rawLedger.length,
                      verificationErrors: errors,
                      latestBlocks: blocks
                    },
                    null,
                    2
                  )
                }
              ]
            }
          });
        }

        case "vaultpay_emergency_kill": {
          const res = enclave.emergencyRevoke();
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      revoked: res.isRevoked,
                      reason: args.reason,
                      timestamp: new Date().toISOString(),
                      status: "ENCLAVE_SIGNING_KEYS_FROZEN",
                      message: "Emergency kill switch engaged. All autonomous procurement halted."
                    },
                    null,
                    2
                  )
                }
              ]
            }
          });
        }

        default:
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Tool not found: ${toolName}` }
          });
      }
    }

    // 6. Resources List
    if (method === "resources/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          resources: [
            { uri: "vaultpay://enclave/status", name: "Enclave Telemetry & Attestation", mimeType: "application/json" },
            { uri: "vaultpay://ledger/latest", name: "Latest Cryptographic Block", mimeType: "application/json" },
            { uri: "vaultpay://catalog/suppliers", name: "Approved Supplier Registry", mimeType: "application/json" }
          ]
        }
      });
    }

    // 7. Resources Read
    if (method === "resources/read") {
      const uri = params?.uri;
      if (uri === "vaultpay://enclave/status") {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "application/json", text: JSON.stringify(enclave.getTelemetry(), null, 2) }]
          }
        });
      }
      if (uri === "vaultpay://ledger/latest") {
        const raw = enclave.getRawLedger();
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "application/json", text: JSON.stringify(raw[raw.length - 1] || null, null, 2) }]
          }
        });
      }
      if (uri === "vaultpay://catalog/suppliers") {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "application/json", text: JSON.stringify(SUPPLIER_CATALOG, null, 2) }]
          }
        });
      }
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Resource not found: ${uri}` }
      });
    }

    // Unknown method
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: err.message || "Internal error in MCP handler" }
      },
      { status: 500 }
    );
  }
}
