import type { MarginAssumptions } from "../types";
import type { Order } from "../types/order";

/** Derive cohort period / calendar bucket from an ISO-8601 instant (UTC Gregorian month). */
export function utcMonthKeyFromIso(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) {
    throw new RangeError(`Invalid ISO date string: "${iso}"`);
  }
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) {
    throw new RangeError(`Invalid YYYY-MM key: "${monthKey}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid month in YYYY-MM: "${monthKey}"`);
  }
  return { year, month };
}

export function calendarMonthIndex(year: number, month1to12: number): number {
  return year * 12 + month1to12 - 1;
}

export function calendarMonthIndexFromKey(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey);
  return calendarMonthIndex(year, month);
}

/** Stable next/previous calendar month as `YYYY-MM` (UTC math). */
export function addMonthsToMonthKey(monthKey: string, deltaMonths: number): string {
  const base = calendarMonthIndexFromKey(monthKey) + deltaMonths;
  const y = Math.floor(base / 12);
  const m0 = base % 12;
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

export function monthsBetweenMonthKeys(fromMonthKey: string, toMonthKey: string): number {
  return calendarMonthIndexFromKey(toMonthKey) - calendarMonthIndexFromKey(fromMonthKey);
}

/** Merchandise net revenue for an order (no UI rounding). Floored — negative nets treated as zero. */
export function netOrderRevenue(order: Order): number {
  return Math.max(0, order.grossRevenue - order.discounts - order.refunds);
}

/**
 * Contribution dollars for an order: explicit `contributionMargin` when set, else
 * `netOrderRevenue × netRevenueMultiplier × contributionMarginPct` when margin supplied.
 */
export function orderContribution(order: Order, margin?: MarginAssumptions): number {
  if (order.contributionMargin != null && Number.isFinite(order.contributionMargin)) {
    return Math.max(0, order.contributionMargin);
  }
  if (margin) {
    const mult = margin.netRevenueMultiplier ?? 1;
    return Math.max(0, netOrderRevenue(order) * mult * margin.contributionMarginPct);
  }
  return 0;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}
