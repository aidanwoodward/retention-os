/**
 * MVP combined order + line-item CSV contract (Sprint 3A).
 *
 * One row per **line item** (Shopify-style exports). Order-level fields repeat on each line; they must
 * be **consistent** within the same `order_id` or the import fails with a structured error.
 *
 * Not a live upload flow — this documents the canonical column contract for normalisation only.
 */

/** Canonical header row (case-insensitive match in `parseCombinedOrderCsvText`). */
export const COMBINED_ORDER_CSV_COLUMNS = [
  "order_id",
  "customer_id",
  "ordered_at",
  "gross_revenue",
  "discounts",
  "refunds",
  "contribution_margin",
  "channel",
  "product_id",
  "product_name",
  "sku",
  "quantity",
  "unit_price",
  "line_total",
] as const;

export type CombinedOrderCsvColumn = (typeof COMBINED_ORDER_CSV_COLUMNS)[number];

/** Minimum required columns for a valid header (optional columns may be omitted from file). */
export const COMBINED_ORDER_CSV_REQUIRED_COLUMNS: readonly CombinedOrderCsvColumn[] = [
  "order_id",
  "customer_id",
  "ordered_at",
  "gross_revenue",
  "discounts",
  "refunds",
  "product_id",
  "product_name",
  "quantity",
  "unit_price",
  "line_total",
];

/** Human-readable field notes for JSDoc / tooling. */
export const COMBINED_ORDER_CSV_FIELD_HELP: Readonly<Record<CombinedOrderCsvColumn, string>> = {
  order_id: "Stable order identifier; duplicated across line rows for the same checkout.",
  customer_id: "Stable shopper key — ties line items to Customer rollups.",
  ordered_at:
    "Order timestamp (ISO 8601 preferred; parser accepts strings Date can parse). UTC recommended.",
  gross_revenue: "Order-level pre-tax gross (same value on every line for that order_id).",
  discounts: "Order-wide discounts as a positive dollar amount (not negative).",
  refunds: "Order-wide refunds as a positive dollar amount (not negative).",
  contribution_margin: "Optional order-level contribution dollars (same on every line if present).",
  channel: "Optional order-level channel label (same on every line if present).",
  product_id: "Merchandise identifier for this line.",
  product_name: "Display name for the product on this line.",
  sku: "Optional SKU / external variant code.",
  quantity: "Line quantity — must be non-negative.",
  unit_price: "Unit price before line-level allocation (non-negative).",
  line_total: "Extended line total (non-negative).",
};
