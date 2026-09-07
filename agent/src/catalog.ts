/**
 * VaultPay Supplier Catalog & Multi-Agent Negotiation Service
 */

import * as crypto from "crypto";
import { CatalogItem, VendorQuote } from "./types";

export const SUPPLIER_CATALOG: CatalogItem[] = [
  {
    id: "cf-h100-gpu",
    vendor: "CloudForge",
    name: "CloudForge H100 GPU Cluster (100 Compute Hours)",
    unitPriceCents: 45000, // $450.00
    category: "Cloud Compute",
    inStock: true,
    description: "High-performance AI training compute cluster in Kuala Lumpur datacenter.",
  },
  {
    id: "ds-ai-tokens",
    vendor: "DataStream AI",
    name: "DataStream AI Embedding & Inference Pipeline (10M Tokens)",
    unitPriceCents: 12000, // $120.00
    category: "API Services",
    inStock: true,
    description: "Enterprise low-latency semantic search and inference API credits.",
  },
  {
    id: "cp-dedicated-node",
    vendor: "ComputePool KL",
    name: "ComputePool KL Dedicated Bare-Metal Node (Weekly)",
    unitPriceCents: 85000, // $850.00
    category: "Infrastructure",
    inStock: true,
    description: "Single-tenant isolated server with high-throughput NVMe storage.",
  },
  {
    id: "enterprise-supercluster",
    vendor: "CloudForge",
    name: "CloudForge Enterprise Supercluster (Monthly Reserve)",
    unitPriceCents: 250000, // $2,500.00 - Exceeds $1,000 per-call cap!
    category: "Cloud Compute",
    inStock: true,
    description: "Dedicated 8x H100 node reservation. Requires executive override.",
  },
];

export class SupplierNegotiator {
  public static searchCatalog(query: string): CatalogItem[] {
    const q = query.toLowerCase();
    return SUPPLIER_CATALOG.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }

  public static generateQuote(
    vendor: string,
    itemId: string,
    quantity: number,
    memo?: string
  ): VendorQuote {
    const item = SUPPLIER_CATALOG.find((i) => i.id === itemId) || {
      id: itemId,
      vendor: vendor,
      name: `Custom Item (${itemId})`,
      unitPriceCents: 45000,
      category: "Custom",
      inStock: true,
      description: "Custom negotiated item",
    };

    const totalAmountCents = item.unitPriceCents * quantity;
    const quoteId = `QUOTE-${vendor.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const nonce = crypto.randomBytes(16).toString("hex");

    // Vendor cryptographic signature over quote terms
    const signaturePayload = `${quoteId}:${vendor}:${totalAmountCents}:${nonce}`;
    const vendorSignature = `sig_${crypto.createHash("sha256").update(signaturePayload).digest("hex").slice(0, 32)}`;

    return {
      quoteId,
      vendor: item.vendor || vendor,
      items: [
        {
          itemId: item.id,
          name: item.name,
          quantity,
          unitPriceCents: item.unitPriceCents,
        },
      ],
      totalAmountCents,
      currency: "USD",
      nonce,
      vendorSignature,
      memo,
    };
  }
}
