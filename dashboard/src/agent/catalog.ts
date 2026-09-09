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
    memo?: string,
    overrideAmountCents?: number
  ): VendorQuote {
    const defaultUnitPrice = overrideAmountCents !== undefined && overrideAmountCents > 0
      ? overrideAmountCents
      : 45000;

    const matchedItem = SUPPLIER_CATALOG.find((i) => i.id === itemId);
    const item = matchedItem
      ? {
          ...matchedItem,
          vendor: vendor || matchedItem.vendor,
          unitPriceCents: overrideAmountCents !== undefined && overrideAmountCents > 0
            ? overrideAmountCents
            : matchedItem.unitPriceCents,
        }
      : {
          id: itemId,
          vendor: vendor,
          name: `${vendor} Infrastructure Item`,
          unitPriceCents: defaultUnitPrice,
          category: "Custom",
          inStock: true,
          description: `Directly quoted procurement line item for ${vendor}`,
        };

    const totalAmountCents = overrideAmountCents !== undefined && overrideAmountCents > 0
      ? overrideAmountCents
      : item.unitPriceCents * quantity;

    const vendorClean = vendor || item.vendor;
    const vendorPrefix = vendorClean.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "VND";
    const quoteId = `QUOTE-${vendorPrefix}-${Date.now().toString().slice(-6)}`;
    const nonce = crypto.randomBytes(16).toString("hex");

    // Vendor cryptographic signature over quote terms
    const signaturePayload = `${quoteId}:${vendorClean}:${totalAmountCents}:${nonce}`;
    const vendorSignature = `sig_${crypto.createHash("sha256").update(signaturePayload).digest("hex").slice(0, 32)}`;

    return {
      quoteId,
      vendor: vendorClean,
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
