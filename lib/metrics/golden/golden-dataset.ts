/**
 * Sprint 5U-C golden RetentionOSDataset — small, deterministic, hand-auditable.
 *
 * Expected outputs live in GOLDEN_EXPECTED_RESULTS.md / golden-expected.ts.
 * Do not regenerate expected values from this fixture via production calculators.
 */

import type { RetentionOSDataset } from "../../data-source/dataset-types";
import type { Customer } from "../../types/customer";
import type { MarketingSpend } from "../../types/marketing";
import type { Order, OrderLineItem } from "../../types/order";
import type { Product } from "../../types/product";
import type { MarginAssumptions } from "../../types/scenario";

export const GOLDEN_MARGIN_ASSUMPTIONS: MarginAssumptions = {
  contributionMarginPct: 0.4,
  netRevenueMultiplier: 1,
};

function line(
  id: string,
  productId: string,
  title: string,
  lineTotal: number,
): OrderLineItem {
  return {
    id,
    productId,
    title,
    quantity: 1,
    unitPrice: lineTotal,
    lineTotal,
  };
}

function order(
  id: string,
  customerId: string,
  orderedAt: string,
  grossRevenue: number,
  discounts: number,
  refunds: number,
  lineItems: OrderLineItem[],
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue,
    discounts,
    refunds,
    lineItems,
  };
}

const GOLDEN_CUSTOMERS: readonly Customer[] = [
  { id: "c1", firstOrderAt: "2024-12-05T12:00:00.000Z" },
  { id: "c2", firstOrderAt: "2024-12-15T12:00:00.000Z" },
  { id: "c3", firstOrderAt: "2024-12-20T12:00:00.000Z" },
  { id: "c4", firstOrderAt: "2025-01-05T12:00:00.000Z" },
  { id: "c5", firstOrderAt: "2025-01-10T12:00:00.000Z" },
  { id: "c6", firstOrderAt: "2025-01-12T12:00:00.000Z" },
];

const GOLDEN_PRODUCTS: readonly Product[] = [
  { id: "prod_a", title: "Serum A" },
  { id: "prod_b", title: "Oil B" },
];

const GOLDEN_ORDERS: readonly Order[] = [
  order("o1", "c1", "2024-12-05T12:00:00.000Z", 100, 10, 0, [
    line("li_o1_a", "prod_a", "Serum A", 100),
  ]),
  order("o2", "c1", "2025-01-10T12:00:00.000Z", 80, 0, 0, [
    line("li_o2_a", "prod_a", "Serum A", 80),
  ]),
  order("o3", "c2", "2024-12-15T12:00:00.000Z", 120, 20, 0, [
    line("li_o3_b", "prod_b", "Oil B", 120),
  ]),
  order("o4", "c2", "2025-04-20T12:00:00.000Z", 50, 0, 0, [
    line("li_o4_b", "prod_b", "Oil B", 50),
  ]),
  order("o5", "c3", "2024-12-20T12:00:00.000Z", 200, 0, 50, [
    line("li_o5_a", "prod_a", "Serum A", 200),
  ]),
  order("o6", "c4", "2025-01-05T12:00:00.000Z", 100, 0, 0, [
    line("li_o6_a", "prod_a", "Serum A", 100),
  ]),
  order("o7", "c4", "2025-01-25T12:00:00.000Z", 100, 0, 0, [
    line("li_o7_a", "prod_a", "Serum A", 100),
  ]),
  order("o8", "c5", "2025-01-10T12:00:00.000Z", 60, 10, 0, [
    line("li_o8_b", "prod_b", "Oil B", 60),
  ]),
  order("o9", "c6", "2025-01-12T12:00:00.000Z", 80, 0, 0, [
    line("li_o9_a", "prod_a", "Serum A", 80),
  ]),
  order("o10", "c6", "2025-02-15T12:00:00.000Z", 40, 0, 0, [
    line("li_o10_a", "prod_a", "Serum A", 40),
  ]),
];

const GOLDEN_MARKETING_SPEND: readonly MarketingSpend[] = [
  { month: "2024-12", spend: 150 },
  { month: "2025-01", spend: 180 },
];

function countLineItems(orders: readonly Order[]): number {
  let n = 0;
  for (const o of orders) n += o.lineItems.length;
  return n;
}

/** Primary golden dataset used by reconciliation tests. */
export function buildGoldenRetentionOSDataset(): RetentionOSDataset {
  return {
    customers: GOLDEN_CUSTOMERS,
    orders: GOLDEN_ORDERS,
    products: GOLDEN_PRODUCTS,
    marketingSpend: GOLDEN_MARKETING_SPEND,
    marginAssumptions: GOLDEN_MARGIN_ASSUMPTIONS,
    meta: {
      sourceType: "demo",
      sourceLabel: "Sprint 5U-C golden fixture",
      isDemo: true,
      isUploaded: false,
      firstOrderAt: "2024-12-05T12:00:00.000Z",
      lastOrderAt: "2025-04-20T12:00:00.000Z",
      customerCount: GOLDEN_CUSTOMERS.length,
      orderCount: GOLDEN_ORDERS.length,
      productCount: GOLDEN_PRODUCTS.length,
      lineItemCount: countLineItems(GOLDEN_ORDERS),
    },
  };
}

/** Clone with margin assumptions removed (contribution / payback unavailable). */
export function goldenWithoutMarginAssumptions(dataset: RetentionOSDataset): RetentionOSDataset {
  const { marginAssumptions: _removed, ...rest } = dataset;
  return rest;
}

/** Clone with marketing spend removed (CAC unavailable — not zero). */
export function goldenWithoutMarketingSpend(dataset: RetentionOSDataset): RetentionOSDataset {
  const { marketingSpend: _removed, ...rest } = dataset;
  return rest;
}

/** Clone with line items stripped (product quality locked). */
export function goldenWithoutLineItems(dataset: RetentionOSDataset): RetentionOSDataset {
  const orders = dataset.orders.map((o) => ({ ...o, lineItems: [] as OrderLineItem[] }));
  return {
    ...dataset,
    orders,
    meta: {
      ...dataset.meta,
      lineItemCount: 0,
    },
  };
}
