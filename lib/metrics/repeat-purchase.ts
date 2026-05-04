import type { Customer } from "../types";
import type { Order } from "../types/order";
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
    if (!counts.has(o.customerId)) {
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
  return orders.filter((o) => o.customerId === customerId).sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
}

/**
 * Classic first→second reorder funnel. Windowed KPI uses discrete calendar-day difference
 * `(second − first)` in milliseconds / MS_PER_DAY, compared to `withinDays` inclusive-style boundary.
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
