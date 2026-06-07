/**
 * Shopify Admin Orders CSV export header contract (Sprint 4I-B).
 *
 * @see docs/RETENTIONOS_SHOPIFY_CSV_CONTRACT.md
 */

/** Shopify headers required for adapter import (exact spelling; match is case-insensitive). */
export const SHOPIFY_ORDERS_REQUIRED_HEADERS = [
  "Email",
  "Created at",
  "Discount Amount",
  "Refunded Amount",
  "Lineitem quantity",
  "Lineitem name",
  "Lineitem price",
] as const;

/** At least one of these must appear in the header row. */
export const SHOPIFY_ORDERS_ORDER_ID_HEADERS = ["Id", "Name"] as const;

/** Optional Shopify header — when absent, product_id falls back to normalised line name. */
export const SHOPIFY_ORDERS_OPTIONAL_SKU_HEADER = "Lineitem SKU" as const;

/** Optional — triggers informational warning when present; never used for revenue. */
export const SHOPIFY_ORDERS_TOTAL_HEADER = "Total" as const;

export const SHOPIFY_ORDERS_OPTIONAL_SOURCE_HEADER = "Source" as const;

export type ShopifyOrdersRequiredHeader = (typeof SHOPIFY_ORDERS_REQUIRED_HEADERS)[number];
