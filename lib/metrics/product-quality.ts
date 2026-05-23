/**
 * Product-level customer quality — first-product segmentation (Sprint 4F).
 *
 * Answers: which entry products create valuable, repeat, profitable customers?
 * Customer quality framing — not product sales volume.
 */

import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import type { Product } from "../types/product";
import type { MarginAssumptions } from "../types/scenario";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { netOrderRevenue, orderContribution, safeDivide } from "./utils";

/** Minimum segment size before qualitySignal can be strong/watch/weak. */
export const MIN_CUSTOMERS_FOR_SIGNAL = 5;

/** Absolute rate delta vs portfolio for strong/weak classification. */
export const MATERIAL_DELTA = 0.1;

/** Absolute drag-rate delta above portfolio for weak classification. */
export const HIGH_DRAG = 0.15;

export type ProductQualitySignal = "strong" | "watch" | "weak" | "insufficient_data";

export interface FirstProductQualityRow {
  readonly productId: string;
  readonly productTitle?: string;
  readonly sku?: string;
  readonly customerCount: number;
  readonly repeatCustomerCount: number;
  readonly repeatPurchaseRate: number;
  readonly firstToSecondCustomerCount: number;
  readonly firstToSecondRate: number;
  readonly firstToSecondWithinWindowCount: number;
  readonly firstToSecondWithinWindowRate: number;
  readonly thirdPurchaseCustomerCount: number;
  readonly thirdPurchaseRate: number;
  readonly avgOrdersPerCustomer: number;
  readonly avgRevenueLtv: number;
  readonly avgContributionLtv: number | null;
  readonly totalNetRevenue: number;
  readonly totalContribution: number;
  readonly avgDiscountDollars: number;
  readonly avgRefundDollars: number;
  readonly discountDragRate: number;
  readonly refundDragRate: number;
  readonly contributionGapPerCustomer: number | null;
  readonly qualitySignal: ProductQualitySignal;
}

export interface FirstProductCustomerQualityResult {
  readonly rows: readonly FirstProductQualityRow[];
  readonly unassignedCustomerCount: number;
  readonly totalCustomers: number;
  readonly productCount: number;
  readonly groupsWithEnoughCustomers: number;
  readonly strongestProduct: string | null;
  readonly weakestProduct: string | null;
  readonly hasLineItemCoverage: boolean;
  readonly hasContributionCoverage: boolean;
  readonly withinDays: number;
  readonly warnings: readonly string[];
}

export interface CalculateFirstProductCustomerQualityOptions {
  readonly withinDays?: number;
}

interface PortfolioBaselines {
  readonly repeatRate: number;
  readonly firstToSecondWithinWindowRate: number;
  readonly avgRevenueLtv: number;
  readonly discountDragRate: number;
  readonly refundDragRate: number;
}

interface CustomerEconomics {
  readonly orderCount: number;
  readonly netRevenue: number;
  readonly contribution: number;
  readonly discountDollars: number;
  readonly refundDollars: number;
}

function sortedOrdersForCustomer(customerId: string, orders: readonly Order[]): Order[] {
  return orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => {
      if (a.orderedAt < b.orderedAt) return -1;
      if (a.orderedAt > b.orderedAt) return 1;
      return a.id.localeCompare(b.id, "en");
    });
}

/** First line on chronological first order — matches import normalise-orders semantics. */
export function deriveFirstProductIdForCustomer(
  customerId: string,
  orders: readonly Order[],
): string | undefined {
  const list = sortedOrdersForCustomer(customerId, orders);
  if (list.length === 0) return undefined;
  const firstLine = list[0]!.lineItems[0];
  const pid = firstLine?.productId?.trim();
  return pid && pid.length > 0 ? pid : undefined;
}

function ordersHaveLineItemProductIds(orders: readonly Order[]): boolean {
  for (const o of orders) {
    for (const li of o.lineItems) {
      const pid = li.productId?.trim();
      if (pid && pid.length > 0) return true;
    }
  }
  return false;
}

function hasContributionCoverage(
  orders: readonly Order[],
  marginAssumptions?: MarginAssumptions,
): boolean {
  if (marginAssumptions != null) return true;
  for (const o of orders) {
    if (o.contributionMargin != null && Number.isFinite(o.contributionMargin)) {
      return true;
    }
  }
  return false;
}

function computeCustomerEconomics(
  customerId: string,
  orders: readonly Order[],
  marginAssumptions: MarginAssumptions | undefined,
  includeContribution: boolean,
): CustomerEconomics {
  const list = sortedOrdersForCustomer(customerId, orders);
  let netRevenue = 0;
  let contribution = 0;
  let discountDollars = 0;
  let refundDollars = 0;

  for (const o of list) {
    netRevenue += netOrderRevenue(o);
    discountDollars += o.discounts;
    refundDollars += o.refunds;
    if (includeContribution) {
      contribution += orderContribution(o, marginAssumptions);
    }
  }

  return {
    orderCount: list.length,
    netRevenue,
    contribution,
    discountDollars,
    refundDollars,
  };
}

function segmentDragRates(
  segmentCustomerIds: readonly string[],
  orders: readonly Order[],
): { discountDragRate: number; refundDragRate: number } {
  let gross = 0;
  let discounts = 0;
  let refunds = 0;
  const idSet = new Set(segmentCustomerIds);

  for (const o of orders) {
    if (!idSet.has(o.customerId)) continue;
    gross += o.grossRevenue;
    discounts += o.discounts;
    refunds += o.refunds;
  }

  return {
    discountDragRate: safeDivide(discounts, gross),
    refundDragRate: safeDivide(refunds, gross),
  };
}

function computePortfolioBaselines(
  assignedCustomers: readonly Customer[],
  firstProductByCustomer: ReadonlyMap<string, string>,
  orders: readonly Order[],
  withinDays: number,
  includeContribution: boolean,
  marginAssumptions: MarginAssumptions | undefined,
): PortfolioBaselines {
  const assigned = assignedCustomers.filter((c) => firstProductByCustomer.has(c.id));
  if (assigned.length === 0) {
    return {
      repeatRate: 0,
      firstToSecondWithinWindowRate: 0,
      avgRevenueLtv: 0,
      discountDragRate: 0,
      refundDragRate: 0,
    };
  }

  const repeat = calculateRepeatPurchaseRate(assigned, orders);
  const f2s = calculateFirstToSecondOrderConversion(assigned, orders, withinDays);

  let totalNet = 0;
  for (const c of assigned) {
    const econ = computeCustomerEconomics(c.id, orders, marginAssumptions, includeContribution);
    totalNet += econ.netRevenue;
  }

  const assignedIds = assigned.map((c) => c.id);
  const drag = segmentDragRates(assignedIds, orders);

  return {
    repeatRate: repeat.repeatPurchaseRate,
    firstToSecondWithinWindowRate: f2s.conversionRateWithinWindow,
    avgRevenueLtv: safeDivide(totalNet, assigned.length),
    discountDragRate: drag.discountDragRate,
    refundDragRate: drag.refundDragRate,
  };
}

function classifyQualitySignal(
  row: Pick<
    FirstProductQualityRow,
    | "customerCount"
    | "repeatPurchaseRate"
    | "firstToSecondWithinWindowRate"
    | "avgRevenueLtv"
    | "discountDragRate"
    | "refundDragRate"
  >,
  portfolio: PortfolioBaselines,
): ProductQualitySignal {
  if (row.customerCount < MIN_CUSTOMERS_FOR_SIGNAL) {
    return "insufficient_data";
  }

  const strongCandidate =
    row.repeatPurchaseRate >= portfolio.repeatRate + MATERIAL_DELTA &&
    row.firstToSecondWithinWindowRate >= portfolio.firstToSecondWithinWindowRate + MATERIAL_DELTA &&
    row.avgRevenueLtv >= portfolio.avgRevenueLtv * (1 + MATERIAL_DELTA);

  const weakByRepeatAndLtv =
    row.repeatPurchaseRate <= portfolio.repeatRate - MATERIAL_DELTA &&
    row.avgRevenueLtv <= portfolio.avgRevenueLtv * (1 - MATERIAL_DELTA);

  const weakByDrag =
    row.discountDragRate >= portfolio.discountDragRate + HIGH_DRAG ||
    row.refundDragRate >= portfolio.refundDragRate + HIGH_DRAG;

  const weakCandidate = weakByRepeatAndLtv || weakByDrag;

  if (strongCandidate && !weakCandidate) return "strong";
  if (weakCandidate && !strongCandidate) return "weak";
  return "watch";
}

function rankScore(row: FirstProductQualityRow, portfolioAvgRevenueLtv: number): number {
  return (
    row.repeatPurchaseRate +
    row.firstToSecondWithinWindowRate +
    safeDivide(row.avgRevenueLtv, portfolioAvgRevenueLtv)
  );
}

function buildProductCatalog(products: readonly Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const p of products) {
    map.set(p.id, p);
  }
  return map;
}

function emptyResult(withinDays: number, warnings: string[]): FirstProductCustomerQualityResult {
  return {
    rows: [],
    unassignedCustomerCount: 0,
    totalCustomers: 0,
    productCount: 0,
    groupsWithEnoughCustomers: 0,
    strongestProduct: null,
    weakestProduct: null,
    hasLineItemCoverage: false,
    hasContributionCoverage: false,
    withinDays,
    warnings,
  };
}

/**
 * Segment customers by first-purchased product and compute quality metrics per segment.
 */
export function calculateFirstProductCustomerQuality(
  customers: readonly Customer[],
  orders: readonly Order[],
  products: readonly Product[],
  marginAssumptions?: MarginAssumptions,
  options?: CalculateFirstProductCustomerQualityOptions,
): FirstProductCustomerQualityResult {
  const withinDays = options?.withinDays ?? 90;
  const warnings: string[] = [];
  const totalCustomers = customers.length;

  if (totalCustomers === 0) {
    return emptyResult(withinDays, warnings);
  }

  const hasLineItemCoverage = ordersHaveLineItemProductIds(orders);
  const includeContribution = hasContributionCoverage(orders, marginAssumptions);

  if (!hasLineItemCoverage) {
    warnings.push("Product quality unavailable: no line items with product_id in the dataset.");
    return {
      ...emptyResult(withinDays, warnings),
      unassignedCustomerCount: totalCustomers,
      totalCustomers,
    };
  }

  warnings.push(
    "First product is the first line item on the customer's chronological first order.",
  );
  warnings.push(
    "Discount and refund drag are order-level totals attributed by first product — not line-level SKU return rates.",
  );

  const firstProductByCustomer = new Map<string, string>();
  let unassignedCustomerCount = 0;

  for (const c of customers) {
    const pid = deriveFirstProductIdForCustomer(c.id, orders);
    if (pid) {
      firstProductByCustomer.set(c.id, pid);
    } else {
      unassignedCustomerCount += 1;
    }
  }

  if (unassignedCustomerCount > 0) {
    const pct = safeDivide(unassignedCustomerCount, totalCustomers) * 100;
    warnings.push(
      `${unassignedCustomerCount} customer(s) (${pct.toFixed(1)}%) have no identifiable first product and are excluded from product rows.`,
    );
  }

  const segments = new Map<string, Customer[]>();
  for (const c of customers) {
    const pid = firstProductByCustomer.get(c.id);
    if (!pid) continue;
    const list = segments.get(pid);
    if (list) {
      list.push(c);
    } else {
      segments.set(pid, [c]);
    }
  }

  const productCatalog = buildProductCatalog(products);
  const portfolio = computePortfolioBaselines(
    customers,
    firstProductByCustomer,
    orders,
    withinDays,
    includeContribution,
    marginAssumptions,
  );

  const draftRows: FirstProductQualityRow[] = [];

  for (const [productId, segmentCustomers] of segments) {
    const customerCount = segmentCustomers.length;
    const segmentIds = segmentCustomers.map((c) => c.id);

    const repeat = calculateRepeatPurchaseRate(segmentCustomers, orders);
    const f2s = calculateFirstToSecondOrderConversion(segmentCustomers, orders, withinDays);

    let thirdPurchaseCustomerCount = 0;
    let totalNetRevenue = 0;
    let totalContribution = 0;
    let totalDiscountDollars = 0;
    let totalRefundDollars = 0;
    let totalOrderCount = 0;

    for (const c of segmentCustomers) {
      const econ = computeCustomerEconomics(c.id, orders, marginAssumptions, includeContribution);
      totalNetRevenue += econ.netRevenue;
      totalContribution += econ.contribution;
      totalDiscountDollars += econ.discountDollars;
      totalRefundDollars += econ.refundDollars;
      totalOrderCount += econ.orderCount;
      if (econ.orderCount >= 3) {
        thirdPurchaseCustomerCount += 1;
      }
    }

    const drag = segmentDragRates(segmentIds, orders);
    const avgRevenueLtv = safeDivide(totalNetRevenue, customerCount);
    const avgContributionLtv = includeContribution
      ? safeDivide(totalContribution, customerCount)
      : null;

    const catalogEntry = productCatalog.get(productId);

    const rowWithoutSignal: Omit<FirstProductQualityRow, "qualitySignal"> = {
      productId,
      productTitle: catalogEntry?.title,
      sku: catalogEntry?.sku,
      customerCount,
      repeatCustomerCount: repeat.repeatCustomers,
      repeatPurchaseRate: repeat.repeatPurchaseRate,
      firstToSecondCustomerCount: f2s.customersWithSecondOrder,
      firstToSecondRate: f2s.conversionRate,
      firstToSecondWithinWindowCount: f2s.customersWithSecondOrderWithinWindow,
      firstToSecondWithinWindowRate: f2s.conversionRateWithinWindow,
      thirdPurchaseCustomerCount,
      thirdPurchaseRate: safeDivide(thirdPurchaseCustomerCount, customerCount),
      avgOrdersPerCustomer: safeDivide(totalOrderCount, customerCount),
      avgRevenueLtv,
      avgContributionLtv,
      totalNetRevenue,
      totalContribution,
      avgDiscountDollars: safeDivide(totalDiscountDollars, customerCount),
      avgRefundDollars: safeDivide(totalRefundDollars, customerCount),
      discountDragRate: drag.discountDragRate,
      refundDragRate: drag.refundDragRate,
      contributionGapPerCustomer:
        avgContributionLtv != null ? avgRevenueLtv - avgContributionLtv : null,
    };

    draftRows.push({
      ...rowWithoutSignal,
      qualitySignal: classifyQualitySignal(rowWithoutSignal, portfolio),
    });
  }

  draftRows.sort((a, b) => {
    if (b.customerCount !== a.customerCount) {
      return b.customerCount - a.customerCount;
    }
    return a.productId.localeCompare(b.productId, "en");
  });

  const groupsWithEnoughCustomers = draftRows.filter(
    (r) => r.qualitySignal !== "insufficient_data",
  ).length;

  const insufficientCount = draftRows.filter(
    (r) => r.qualitySignal === "insufficient_data",
  ).length;
  if (insufficientCount > 0) {
    warnings.push(
      `${insufficientCount} product segment(s) have fewer than ${MIN_CUSTOMERS_FOR_SIGNAL} customers and are labelled insufficient_data.`,
    );
  }

  if (!includeContribution) {
    warnings.push(
      "Contribution LTV is unavailable without imported contribution_margin or margin assumptions.",
    );
  }

  const rankable = draftRows.filter((r) => r.qualitySignal !== "insufficient_data");
  let strongestProduct: string | null = null;
  let weakestProduct: string | null = null;

  if (rankable.length > 0) {
    const sorted = [...rankable].sort((a, b) => {
      const scoreDiff = rankScore(b, portfolio.avgRevenueLtv) - rankScore(a, portfolio.avgRevenueLtv);
      if (scoreDiff !== 0) return scoreDiff;
      if (b.customerCount !== a.customerCount) return b.customerCount - a.customerCount;
      return a.productId.localeCompare(b.productId, "en");
    });
    strongestProduct = sorted[0]!.productId;
    weakestProduct = sorted[sorted.length - 1]!.productId;
  }

  return {
    rows: draftRows,
    unassignedCustomerCount,
    totalCustomers,
    productCount: draftRows.length,
    groupsWithEnoughCustomers,
    strongestProduct,
    weakestProduct,
    hasLineItemCoverage,
    hasContributionCoverage: includeContribution,
    withinDays,
    warnings,
  };
}

export function calculateFirstProductCustomerQualityFromDataset(
  dataset: RetentionOSDataset,
  options?: CalculateFirstProductCustomerQualityOptions,
): FirstProductCustomerQualityResult {
  return calculateFirstProductCustomerQuality(
    dataset.customers,
    dataset.orders,
    dataset.products,
    dataset.marginAssumptions,
    options,
  );
}
