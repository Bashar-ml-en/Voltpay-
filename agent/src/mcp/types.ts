import { z } from "zod";

/**
 * Zod Schemas for VaultPay MCP Tools
 */

export const GetBudgetInputSchema = z.object({
  refresh: z.boolean().optional().describe("Optional flag to force reload state from disk storage"),
});

export const QueryCatalogInputSchema = z.object({
  query: z.string().optional().describe("Free-text query to search supplier name, item name, or category"),
  category: z.enum(["all", "Cloud Compute", "API Services", "Infrastructure", "Custom"]).optional().describe("Filter by infrastructure asset category"),
  maxPriceCents: z.number().int().positive().optional().describe("Maximum unit price in US cents (e.g. 100000 for $1,000.00)"),
});

export const ProcureInputSchema = z.object({
  vendor: z.string().min(1).describe("Approved vendor name (e.g. 'ComputePool KL', 'CloudForge', 'DataStream AI', 'Xendit')"),
  amountCents: z.number().int().positive().describe("Total procurement settlement amount in US cents (e.g. 72550 for $725.50). Must not exceed $1,000.00 per-call cap."),
  itemDescription: z.string().min(1).describe("Description of the compute/API infrastructure asset being procured"),
  invoiceId: z.string().optional().describe("Quote or invoice identifier. If omitted, an autonomous unique invoice ID is generated."),
  justification: z.string().optional().describe("Business justification or task context from the autonomous agent"),
});

export const VerifyLedgerInputSchema = z.object({
  limit: z.number().int().positive().max(100).optional().describe("Maximum number of recent ledger blocks to return (default 10)"),
  verifyChain: z.boolean().optional().describe("Whether to cryptographically verify SHA-256 hash chaining and signatures (default true)"),
});

export const EmergencyKillInputSchema = z.object({
  reason: z.string().min(1).describe("Security justification for revoking the agent's enclave execution key"),
});

export type GetBudgetInput = z.infer<typeof GetBudgetInputSchema>;
export type QueryCatalogInput = z.infer<typeof QueryCatalogInputSchema>;
export type ProcureInput = z.infer<typeof ProcureInputSchema>;
export type VerifyLedgerInput = z.infer<typeof VerifyLedgerInputSchema>;
export type EmergencyKillInput = z.infer<typeof EmergencyKillInputSchema>;
