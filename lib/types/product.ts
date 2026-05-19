export type ProductId = string;

/**
 * Merchandising master used for attribution and cohort rollups sourced from Shopify or imports.
 *
 * No inventory or vendor modeling for MVP — just stable identity and labeling for customer-quality slicing.
 */
export interface Product {
  id: ProductId;
  handle?: string;
  title: string;
  sku?: string;
}
