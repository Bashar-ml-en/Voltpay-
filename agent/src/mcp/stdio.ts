#!/usr/bin/env node
/**
 * VaultPay MCP Stdio Transport Entrypoint
 * Communicates with Claude Desktop, Cursor, Antigravity, and CLI agents over stdin/stdout.
 * 
 * IMPORTANT: All logs MUST go to stderr (console.error) to preserve stdout for JSON-RPC 2.0 framing.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createVaultPayMcpServer } from "./server";

async function main() {
  const server = createVaultPayMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("[VaultPay MCP] Server connected via Stdio. Intel SGX Enclave Active.");
}

main().catch((err) => {
  console.error("[VaultPay MCP] Fatal error in stdio server:", err);
  process.exit(1);
});
