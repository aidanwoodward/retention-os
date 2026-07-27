import type { CustomerId } from "./customer";

export type OrderId = string;
export type OrderLineItemId = string;

/** One sellable unit on an order — links order revenue to merchandise for product-level economics. */
export interface OrderLineItem {
  id: OrderLineItemId;
  productId?: string;
  variantId?: string;
  sku?: string;
  title?: string;
  quantity: number;
  /**
   * Line-level gross merchandise value before allocating order-wide discounts/refunds.
   * When unknown, callers may derive from `(grossRevenue / lineItems.length)` fallbacks outside this layer.
   */
  unitPrice?: number;
  lineTotal?: number;
}

/**
 * Canonical purchase event for retention and revenue sequencing.
 *
 * `grossRevenue` should reflect pre-tax, top-line order value commonly used with Shopify `total_price`
 * semantics; deductions are explicit for elasticity and reconciliation.
 *
 * `customerId` is `null` for valid orders with no identifiable Shopify customer (guest / unidentified).
 * CSV import paths continue to produce non-null customer ids.
 */
export interface Order {
  id: OrderId;
  customerId: CustomerId | null;
  /** Order placement timestamp (ISO 8601) — aligns customers on a unified timeline with spend. */
  orderedAt: string;
  /** Pre-refund/top-line monetary value for cohort revenue totals and durability trends. */
  grossRevenue: number;
  /** Order-wide discounts aggregated from price rules, codes, scripts, etc. (positive number as dollars-off). */
  discounts: number;
  /** Returned/tender-reversed monetary amount for the order. */
  refunds: number;
  /**
   * Dollars retained after merchandise COGS and variable selling costs modeled in MarginAssumptions.
   * When absent, downstream metrics approximate from revenue × margin knobs.
   */
  contributionMargin?: number;
  /** Channel label for repeat traffic or attributable order tagging (distinct from customer's acquisitionChannel). */
  channel?: string;
  lineItems: OrderLineItem[];
}

/** True when the order has an identifiable customer id (not guest / unidentified). */
export function isIdentifiedOrder(order: Order): order is Order & { customerId: CustomerId } {
  return order.customerId != null;
}
