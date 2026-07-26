import type { Customer } from "../types";
import { isIdentifiedOrder, type Order } from "../types/order";
import { median, safeDivide } from "./utils";

export interface RepeatPurchaseRateResult {
  totalCustomers: number;
  repeatCustomers: number;
  /** Fraction in [0, 1]; customers with ≥2 qualifying orders divided by population. */
  repeatPurchaseRate: number;
}

function ordersPerCustomer(customers: readonly Customer[], orders: readonly Order[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of customers) {
    counts.set(c.id, 0);
  }
  for (const o of orders) {
    if (!isIdentifiedOrder(o) || !counts.has(o.customerId)) {
      continue;
    }
    counts.set(o.customerId, (counts.get(o.customerId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Portfolio repeat rate: shoppers with ≥2 orders over the supplied order history.
 */
export function calculateRepeatPurchaseRate(
  customers: readonly Customer[],
  orders: readonly Order[],
): RepeatPurchaseRateResult {
  const totalCustomers = customers.length;
  if (totalCustomers === 0) {
    return { totalCustomers: 0, repeatCustomers: 0, repeatPurchaseRate: 0 };
  }

  const counts = ordersPerCustomer(customers, orders);
  let repeatCustomers = 0;
  for (const c of customers) {
    if ((counts.get(c.id) ?? 0) >= 2) {
      repeatCustomers += 1;
    }
  }

  return {
    totalCustomers,
    repeatCustomers,
    repeatPurchaseRate: safeDivide(repeatCustomers, totalCustomers),
  };
}

export interface FirstToSecondConversionResult {
  totalCustomers: number;
  customersWithSecondOrder: number;
  /** Unwindowed: share of customers who ever reach a second order (fraction [0, 1]). */
  conversionRate: number;
  /** Mean calendar days from first to second order (null if no second orders). */
  averageDaysToSecondOrder: number | null;
  /** Median calendar days from first to second order (null if no second orders). */
  medianDaysToSecondOrder: number | null;
  /** Second order within `withinDays` of first order’s timestamp. */
  withinDays: number;
  customersWithSecondOrderWithinWindow: number;
  /** Windowed first→second conversion: within-window successes / total customers (fraction [0, 1]). */
  conversionRateWithinWindow: number;
}

const MS_PER_DAY = 86_400_000;

function sortedOrdersForCustomer(customerId: string, orders: readonly Order[]): Order[] {
  return orders
    .filter((o) => isIdentifiedOrder(o) && o.customerId === customerId)
    .sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
}

/**
 * Classic first→second reorder funnel. Windowed KPI uses discrete calendar-day difference
 * `(second − first)` in milliseconds / MS_PER_DAY, compared to `withinDays` inclusive-style boundary.
 * Uses the same per-customer order sequence as portfolio repeat counts (via shared `orders` rows).
 */
export function calculateFirstToSecondOrderConversion(
  customers: readonly Customer[],
  orders: readonly Order[],
  withinDays: number = 90,
): FirstToSecondConversionResult {
  const totalCustomers = customers.length;
  if (totalCustomers === 0) {
    return {
      totalCustomers: 0,
      customersWithSecondOrder: 0,
      conversionRate: 0,
      averageDaysToSecondOrder: null,
      medianDaysToSecondOrder: null,
      withinDays,
      customersWithSecondOrderWithinWindow: 0,
      conversionRateWithinWindow: 0,
    };
  }

  const gaps: number[] = [];
  let customersWithSecondOrder = 0;
  let customersWithSecondOrderWithinWindow = 0;

  for (const c of customers) {
    const list = sortedOrdersForCustomer(c.id, orders);
    if (list.length < 2) {
      continue;
    }
    customersWithSecondOrder += 1;

    const t0 = Date.parse(list[0]!.orderedAt);
    const t1 = Date.parse(list[1]!.orderedAt);
    if (Number.isNaN(t0) || Number.isNaN(t1)) {
      continue;
    }
    const days = (t1 - t0) / MS_PER_DAY;
    gaps.push(days);

    if (days >= 0 && days <= withinDays) {
      customersWithSecondOrderWithinWindow += 1;
    }
  }

  const sum = gaps.reduce((a, b) => a + b, 0);

  return {
    totalCustomers,
    customersWithSecondOrder,
    conversionRate: safeDivide(customersWithSecondOrder, totalCustomers),
    averageDaysToSecondOrder: gaps.length === 0 ? null : sum / gaps.length,
    medianDaysToSecondOrder: median(gaps),
    withinDays,
    customersWithSecondOrderWithinWindow,
    conversionRateWithinWindow: safeDivide(customersWithSecondOrderWithinWindow, totalCustomers),
  };
}

/**
 * Rows for the repeat-purchase purchase ladder API (`/api/metrics/repeat-purchases`).
 * Cumulative: level N = share of the full customer population with ≥ N qualifying orders.
 */
export interface RepeatPurchaseBreakdownRow {
  purchaseCount: number;
  purchaseCountLabel: string;
  customersReaching: number;
  percentOfOriginal: number;
  dropOffVsPrevious: number | null;
}

/** Top-line KPIs derived alongside {@link RepeatPurchaseBreakdownRow} — matches legacy API field names. */
export interface RepeatPurchaseApiDerived {
  purchaseBreakdown: RepeatPurchaseBreakdownRow[];
  totalCustomers: number;
  /** Percentage 0–100, aligned with {@link calculateRepeatPurchaseRate}. */
  secondPurchaseRate: number;
  medianPurchases: number;
  /** Percentage 0–100 of customers with ≥3 qualifying orders. */
  customersWith3PlusPurchases: number;
  medianPurchasesFor5Plus: number | null;
}

/** Legacy API parity: after sorting counts ascending, element at `floor(n/2)`; for even `n`, differs from statistical median. */
function medianPurchaseCountLegacy(sortedAscending: readonly number[]): number {
  if (sortedAscending.length === 0) return 0;
  return sortedAscending[Math.floor(sortedAscending.length / 2)]!;
}

/**
 * Shared ladder + KPI math for the HTTP repeat-purchases API and the metric engine.
 * Uses the same order counting as {@link calculateRepeatPurchaseRate} and {@link calculateFirstToSecondOrderConversion}.
 *
 * `secondPurchaseRate` is taken from `calculateRepeatPurchaseRate` × 100 so portfolio repeat stays a single source of truth.
 */
export function computeRepeatPurchaseApiMetrics(
  customers: readonly Customer[],
  orders: readonly Order[],
): RepeatPurchaseApiDerived {
  const totalCustomers = customers.length;
  if (totalCustomers === 0) {
    return {
      purchaseBreakdown: [],
      totalCustomers: 0,
      secondPurchaseRate: 0,
      medianPurchases: 0,
      customersWith3PlusPurchases: 0,
      medianPurchasesFor5Plus: null,
    };
  }

  const counts = ordersPerCustomer(customers, orders);
  const purchaseDistribution: number[] = [];
  const customersReaching = new Map<number, number>();
  for (let n = 1; n <= 5; n++) {
    customersReaching.set(n, 0);
  }

  for (const c of customers) {
    const purchaseCount = counts.get(c.id) ?? 0;
    if (purchaseCount > 0) {
      purchaseDistribution.push(purchaseCount);
      for (let n = 1; n <= 5; n++) {
        if (purchaseCount >= n) {
          customersReaching.set(n, (customersReaching.get(n) ?? 0) + 1);
        }
      }
    }
  }

  const breakdown: RepeatPurchaseBreakdownRow[] = [];
  let previousPercent = 100;
  for (let n = 1; n <= 5; n++) {
    const count = customersReaching.get(n) ?? 0;
    const percent = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0;
    const dropOff = n > 1 ? previousPercent - percent : null;
    breakdown.push({
      purchaseCount: n,
      purchaseCountLabel: n === 5 ? "5+" : String(n),
      customersReaching: count,
      percentOfOriginal: percent,
      dropOffVsPrevious: dropOff,
    });
    previousPercent = percent;
  }

  const repeatBlock = calculateRepeatPurchaseRate(customers, orders);
  const secondPurchaseRate = repeatBlock.repeatPurchaseRate * 100;

  let threePlus = 0;
  for (const c of customers) {
    if ((counts.get(c.id) ?? 0) >= 3) {
      threePlus += 1;
    }
  }
  const customersWith3PlusPurchases = (threePlus / totalCustomers) * 100;

  const sortedForMedians = [...purchaseDistribution].sort((a, b) => a - b);
  const medianPurchases = medianPurchaseCountLegacy(sortedForMedians);
  const fivePlusPurchases = sortedForMedians.filter((p) => p >= 5);
  const medianPurchasesFor5Plus =
    fivePlusPurchases.length > 0
      ? fivePlusPurchases[Math.floor(fivePlusPurchases.length / 2)]!
      : null;

  return {
    purchaseBreakdown: breakdown,
    totalCustomers,
    secondPurchaseRate,
    customersWith3PlusPurchases,
    medianPurchases,
    medianPurchasesFor5Plus,
  };
}
