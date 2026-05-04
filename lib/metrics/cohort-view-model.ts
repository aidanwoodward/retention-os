import { getDemoDataset } from "../demo";
import type { LTVPoint } from "../types";
import { calculateCohorts, type CohortSummary } from "./cohorts";
import { calculateLTVByCohort } from "./ltv";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { calculateRetentionByCohort } from "./retention";

export interface CohortsPageSummaryView {
  cohortCount: number;
  totalCustomers: number;
  largestCohort: { cohortPeriod: string; cohortSize: number };
  aggregateNetRevenue: number;
  repeatPurchaseRate: number;
  firstToSecondWithin90DaysRate: number;
}

export interface CohortMonthTableRowView {
  cohortPeriod: string;
  cohortSize: number;
  totalOrders: number;
  netRevenue: number;
  contribution: number;
  latestAvgNetRevenueLtv: number;
  latestAvgContributionLtv: number | null;
  /** Month +1 active rate — share of cohort with ≥1 order in calendar month immediately after acquisition month (fraction). */
  nextMonthActiveRate: number | null;
  /** Offset +2 (fraction). Null when not enough calendar history. */
  monthPlusTwoActiveRate: number | null;
  /** Offset +3 (fraction). Null when not enough calendar history. */
  monthPlusThreeActiveRate: number | null;
}

export interface CohortsPageViewModel {
  summary: CohortsPageSummaryView;
  cohortRows: CohortMonthTableRowView[];
}

function terminalLtvByCohort(points: readonly LTVPoint[]): Map<
  string,
  { avgNetRevenueLtv: number; avgContributionLtv: number | null }
> {
  const by = new Map<string, LTVPoint[]>();
  for (const p of points) {
    const list = by.get(p.cohortKey);
    if (list) {
      list.push(p);
    } else {
      by.set(p.cohortKey, [p]);
    }
  }
  const out = new Map<string, { avgNetRevenueLtv: number; avgContributionLtv: number | null }>();
  for (const [key, curve] of by) {
    const sorted = [...curve].sort((a, b) => a.offset - b.offset);
    const tail = sorted[sorted.length - 1];
    if (!tail) {
      continue;
    }
    out.set(key, {
      avgNetRevenueLtv: tail.cumulativeAvgGrossRevenue,
      avgContributionLtv: tail.cumulativeAvgContribution ?? null,
    });
  }
  return out;
}

function retentionFraction(
  cohortPeriod: string,
  offset: number,
  seriesList: ReturnType<typeof calculateRetentionByCohort>,
): number | null {
  const row = seriesList.find((s) => s.cohortPeriod === cohortPeriod);
  if (!row) {
    return null;
  }
  const p = row.points.find((pt) => pt.offset === offset);
  return p ? p.retentionRate : null;
}

function summarizeLargest(summaryRows: readonly CohortSummary[]): { cohortPeriod: string; cohortSize: number } {
  return summaryRows.reduce(
    (best, row) => (row.cohortSize >= best.cohortSize ? row : best),
    summaryRows[0]!,
  );
}

/** Thin adapter from canonical demo + metric engine outputs to `/cohorts` presentation props (numeric only). */
export function buildCohortsPageViewModel(seed?: number): CohortsPageViewModel {
  const ds = getDemoDataset(seed);
  const { customers, orders, marginAssumptions } = ds;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retention = calculateRetentionByCohort(customers, orders);
  const repeatResult = calculateRepeatPurchaseRate(customers, orders);
  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);
  const ltvCurve = calculateLTVByCohort(customers, orders, marginAssumptions);

  const ltvTail = terminalLtvByCohort(ltvCurve);

  const cohortRows: CohortMonthTableRowView[] = cohortSummaries.map((cohort) => {
    const lt = ltvTail.get(cohort.cohortPeriod);
    return {
      cohortPeriod: cohort.cohortPeriod,
      cohortSize: cohort.cohortSize,
      totalOrders: cohort.totalOrders,
      netRevenue: cohort.netRevenue,
      contribution: cohort.contribution,
      latestAvgNetRevenueLtv: lt?.avgNetRevenueLtv ?? 0,
      latestAvgContributionLtv: lt?.avgContributionLtv ?? null,
      nextMonthActiveRate: retentionFraction(cohort.cohortPeriod, 1, retention),
      monthPlusTwoActiveRate: retentionFraction(cohort.cohortPeriod, 2, retention),
      monthPlusThreeActiveRate: retentionFraction(cohort.cohortPeriod, 3, retention),
    };
  });

  const largestRaw = cohortSummaries.length > 0 ? summarizeLargest(cohortSummaries) : null;
  const largest = largestRaw
    ? { cohortPeriod: largestRaw.cohortPeriod, cohortSize: largestRaw.cohortSize }
    : { cohortPeriod: "—", cohortSize: 0 };

  return {
    summary: {
      cohortCount: cohortSummaries.length,
      totalCustomers: customers.length,
      largestCohort: largest,
      aggregateNetRevenue: cohortSummaries.reduce((sum, row) => sum + row.netRevenue, 0),
      repeatPurchaseRate: repeatResult.repeatPurchaseRate,
      firstToSecondWithin90DaysRate: f2.conversionRateWithinWindow,
    },
    cohortRows,
  };
}
