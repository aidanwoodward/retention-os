/**
 * Wraps `getDemoDataset()` in `RetentionOSDataset` with demo source metadata.
 * Does not modify `getDemoDataset()` or `/lib/demo` builders.
 */

import { DEMO_BRAND_NAME, getDemoDataset } from "../demo";
import type { RetentionOSDataset, RetentionOSSourceMetadata } from "./dataset-types";
import { countLineItems, inferOrderWindowFromOrders } from "./dataset-helpers";

/**
 * Build the canonical demo command-centre dataset in the shared abstraction shape.
 * @param seed Optional Mulberry-style seed — forwarded to `getDemoDataset(seed)`.
 */
export function buildDemoRetentionOSDataset(seed?: number): RetentionOSDataset {
  const demo = getDemoDataset(seed);
  const lineItemCount = countLineItems(demo.orders);
  const window = inferOrderWindowFromOrders(demo.orders);

  const meta: RetentionOSSourceMetadata = {
    sourceType: "demo",
    sourceLabel: `Demo dataset — ${DEMO_BRAND_NAME}`,
    isDemo: true,
    isUploaded: false,
    firstOrderAt: window.firstOrderAt,
    lastOrderAt: window.lastOrderAt,
    customerCount: demo.customers.length,
    orderCount: demo.orders.length,
    productCount: demo.products.length,
    lineItemCount,
  };

  return {
    customers: demo.customers,
    orders: demo.orders,
    products: demo.products,
    marketingSpend: demo.marketingSpend,
    marginAssumptions: demo.marginAssumptions,
    meta,
  };
}
