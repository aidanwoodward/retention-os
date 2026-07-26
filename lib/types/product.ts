export type ProductId = string;

/**
 * Merchandising master used for attribution and cohort rollups sourced from Shopify or imports.
 *
 * No inventory modeling for MVP — stable identity and labeling for customer-quality slicing.
 */
export interface Product {
  id: ProductId;
  handle?: string;
  title: string;
  sku?: string;
  /** Brand / vendor label when present (Shopify Product.vendor or line vendor). */
  vendor?: string;
  /** True when the catalogue product was missing/deleted at ingest; order-time title/SKU may still exist. */
  isDeletedOrMissing?: boolean;
}
