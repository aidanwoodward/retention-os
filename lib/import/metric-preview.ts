/**
 * Runs imported canonical shapes through `/lib/metrics` for **preview only** (no persistence, no demo swap).
 *
 * Does not pass `MarginAssumptions` — contribution LTV comes only from explicit `Order.contributionMargin`,
 * matching the “no invented margin” rule for CSV onboarding.
 */

import type { Customer, Order, Product } from "../types";
import type { LTVPoint } from "../types/metrics";
import {
  calculateCohorts,
  calculateFirstToSecondOrderConversion,
  calculateLTVByCohort,
  calculateRepeatPurchaseRate,
  calculateRetentionByCohort,
  safeDivide,
  type RetentionByCohortSeries,
} from "../metrics";

export interface ImportedCsvMetricPreview {
  readonly customerCount: number;
  readonly orderCount: number;
  readonly productCount: number;
  readonly cohortCount: number;
  readonly firstCohort: string | null;
  readonly lastCohort: string | null;
  /** Portfolio repeat rate [0, 1]. */
  readonly totalRepeatPurchaseRate: number;
  /** First → second within 90 days, over all customers (engine definition). */
  readonly firstToSecondWithin90DaysRate: number;
  readonly averageDaysToSecondOrder: number | null;
  readonly medianDaysToSecondOrder: number | null;
  /** Mean cohort Month +1 active rate across cohorts that have offset 1. */
  readonly averageMonth1ActiveRate: number | null;
  readonly averageMonth2ActiveRate: number | null;
  readonly averageMonth3ActiveRate: number | null;
  /** Mean terminal-step average cumulative **net** revenue LTV across cohort staircases. */
  readonly latestAverageNetRevenueLTV: number;
  readonly contributionLTVAvailable: boolean;
  readonly latestAverageContributionLTV: number | null;
  /** Operator-facing caveats (sample size, partial margins, missing offsets). */
  readonly warnings: readonly string[];
}

function averageRetentionAtOffset(series: readonly RetentionByCohortSeries[], offset: number): number | null {
  const rates: number[] = [];
  for (const s of series) {
    const p = s.points.find((pt) => pt.offset === offset);
    if (p) rates.push(p.retentionRate);
  }
  if (rates.length === 0) return null;
  return safeDivide(rates.reduce((a, b) => a + b, 0), rates.length);
}

function averageTerminalLtv(
  points: readonly LTVPoint[],
  pick: (p: LTVPoint) => number | undefined,
): number {
  if (points.length === 0) return 0;
  const byKey = new Map<string, LTVPoint>();
  for (const p of points) {
    const cur = byKey.get(p.cohortKey);
    if (!cur || p.offset > cur.offset) {
      byKey.set(p.cohortKey, p);
    }
  }
  const vals: number[] = [];
  for (const p of byKey.values()) {
    const v = pick(p);
    if (v != null && Number.isFinite(v)) vals.push(v);
  }
  if (vals.length === 0) return 0;
  return safeDivide(vals.reduce((a, b) => a + b, 0), vals.length);
}

function everyOrderHasContributionMargin(orders: readonly Order[]): boolean {
  if (orders.length === 0) return false;
  return orders.every((o) => o.contributionMargin != null && Number.isFinite(o.contributionMargin));
}

/**
 * Build a compact rollup for the Data page CSV preview. Uses the same calculators as the command centre,
 * without `MarginAssumptions` (contribution must already sit on orders).
 */
export function buildImportedCsvMetricPreview(
  customers: readonly Customer[],
  orders: readonly Order[],
  products: readonly Product[],
): ImportedCsvMetricPreview {
  const warnings: string[] = [];

  const customerCount = customers.length;
  const orderCount = orders.length;
  const productCount = products.length;

  if (customerCount === 0 || orderCount === 0) {
    return {
      customerCount,
      orderCount,
      productCount,
      cohortCount: 0,
      firstCohort: null,
      lastCohort: null,
      totalRepeatPurchaseRate: 0,
      firstToSecondWithin90DaysRate: 0,
      averageDaysToSecondOrder: null,
      medianDaysToSecondOrder: null,
      averageMonth1ActiveRate: null,
      averageMonth2ActiveRate: null,
      averageMonth3ActiveRate: null,
      latestAverageNetRevenueLTV: 0,
      contributionLTVAvailable: false,
      latestAverageContributionLTV: null,
      warnings: ["No customers or orders to run the metric engine on."],
    };
  }

  if (customerCount < 5) {
    warnings.push("Fewer than five customers — treat portfolio metrics as directional only.");
  }
  if (orderCount < 10) {
    warnings.push("Fewer than ten orders — treat repeat and LTV summaries as directional only.");
  }

  const hasAnyMargin = orders.some((o) => o.contributionMargin != null && Number.isFinite(o.contributionMargin));
  const fullMargin = everyOrderHasContributionMargin(orders);
  if (hasAnyMargin && !fullMargin) {
    warnings.push(
      "Some orders lack order-level contribution_margin — contribution LTV is omitted until every order carries it (no demo margin assumptions are applied here).",
    );
  }
  if (!hasAnyMargin) {
    warnings.push(
      "Contribution LTV unavailable — include contribution_margin on order rows or configure margin assumptions in a future step.",
    );
  }

  const cohortSummaries = calculateCohorts(customers, orders);
  const cohortCount = cohortSummaries.length;
  const firstCohort = cohortSummaries[0]?.cohortPeriod ?? null;
  const lastCohort = cohortSummaries[cohortSummaries.length - 1]?.cohortPeriod ?? null;

  const repeat = calculateRepeatPurchaseRate(customers, orders);
  const firstSecond = calculateFirstToSecondOrderConversion(customers, orders, 90);
  const retentionSeries = calculateRetentionByCohort(customers, orders);

  const ltvPoints = calculateLTVByCohort(customers, orders, undefined);
  const latestAverageNetRevenueLTV = averageTerminalLtv(ltvPoints, (p) => p.cumulativeAvgGrossRevenue);

  const contributionLTVAvailable = fullMargin;
  const latestAverageContributionLTV = contributionLTVAvailable
    ? averageTerminalLtv(ltvPoints, (p) => p.cumulativeAvgContribution)
    : null;

  const m1 = averageRetentionAtOffset(retentionSeries, 1);
  const m2 = averageRetentionAtOffset(retentionSeries, 2);
  const m3 = averageRetentionAtOffset(retentionSeries, 3);
  const missingOffsets: string[] = [];
  if (m1 === null) missingOffsets.push("+1");
  if (m2 === null) missingOffsets.push("+2");
  if (m3 === null) missingOffsets.push("+3");
  if (missingOffsets.length > 0) {
    warnings.push(
      `Month ${missingOffsets.join(", ")} active averages are unavailable — cohorts may be too young or the order window is short.`,
    );
  }

  return {
    customerCount,
    orderCount,
    productCount,
    cohortCount,
    firstCohort,
    lastCohort,
    totalRepeatPurchaseRate: repeat.repeatPurchaseRate,
    firstToSecondWithin90DaysRate: firstSecond.conversionRateWithinWindow,
    averageDaysToSecondOrder: firstSecond.averageDaysToSecondOrder,
    medianDaysToSecondOrder: firstSecond.medianDaysToSecondOrder,
    averageMonth1ActiveRate: m1,
    averageMonth2ActiveRate: m2,
    averageMonth3ActiveRate: m3,
    latestAverageNetRevenueLTV,
    contributionLTVAvailable,
    latestAverageContributionLTV,
    warnings,
  };
}
