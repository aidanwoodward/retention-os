import {
  getMonthlyCohortMaturityStatus,
  inferConservativeAsOfDateFromDataset,
  isCompletedMaturityOffsetAvailable,
  type MaturityStatus,
} from "../analysis-context";
import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import type { LTVPoint } from "../types";
import { averageCompletedCohortLtvAtOffset } from "./completed-cohort-ltv";
import { averageCompletedCohortRetentionAtOffset } from "./completed-cohort-retention";
import { calculateCohorts } from "./cohorts";
import { calculateLTVByCohort } from "./ltv";
import { calculateRetentionByCohort, type RetentionByCohortSeries } from "./retention";

export type { MaturityStatus };

export interface CohortsPageSummaryView {
  /** Unweighted mean of completed cohort Month +1 active rates (fraction); null when none complete. */
  avgCompletedMonthPlus1ActiveRate: number | null;
  /** Unweighted mean of completed cohort Month +3 cumulative Revenue LTV; null when none complete. */
  avgCompletedMonthPlus3RevenueLtv: number | null;
  /** Cohorts with a completed Month +3 observation. */
  completedMonthPlus3CohortCount: number;
  totalCohortCount: number;
  /** Latest order instant used for maturity; null when dataset has no orders. */
  asOfDate: string | null;
}

export interface CohortMonthTableRowView {
  cohortPeriod: string;
  cohortSize: number;
  /** Same-offset Month +1 active rate (fraction). */
  monthPlus1ActiveRate: number | null;
  /** Same-offset Month +3 active rate (fraction). */
  monthPlus3ActiveRate: number | null;
  /** Same-offset Month +1 cumulative Revenue LTV per customer. */
  monthPlus1RevenueLtv: number | null;
  /** Same-offset Month +3 cumulative Revenue LTV per customer. */
  monthPlus3RevenueLtv: number | null;
  monthPlus1ActiveMaturity: MaturityStatus | null;
  monthPlus3ActiveMaturity: MaturityStatus | null;
  monthPlus1RevenueLtvMaturity: MaturityStatus | null;
  monthPlus3RevenueLtvMaturity: MaturityStatus | null;
  /** Legacy terminal fields — preserved for contract compatibility; not rendered on `/cohorts`. */
  totalOrders: number;
  netRevenue: number;
  contribution: number;
  latestAvgNetRevenueLtv: number;
  latestAvgContributionLtv: number | null;
  /** @deprecated Use monthPlus1ActiveRate — preserved for compatibility. */
  nextMonthActiveRate: number | null;
  /** @deprecated Preserved for compatibility. */
  monthPlusTwoActiveRate: number | null;
  /** @deprecated Use monthPlus3ActiveRate — preserved for compatibility. */
  monthPlusThreeActiveRate: number | null;
}

export interface CohortsPageViewModel {
  summary: CohortsPageSummaryView;
  cohortRows: CohortMonthTableRowView[];
}

function groupLtvCurveByCohort(points: readonly LTVPoint[]): Map<string, LTVPoint[]> {
  const map = new Map<string, LTVPoint[]>();
  for (const p of points) {
    const list = map.get(p.cohortKey);
    if (list) {
      list.push(p);
    } else {
      map.set(p.cohortKey, [p]);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.offset - b.offset);
  }
  return map;
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

function retentionRateAtOffset(
  series: readonly RetentionByCohortSeries[],
  cohortPeriod: string,
  offset: number,
): number | null {
  const row = series.find((s) => s.cohortPeriod === cohortPeriod);
  if (!row) {
    return null;
  }
  const p = row.points.find((pt) => pt.offset === offset);
  return p ? p.retentionRate : null;
}

function ltvRevenueAtOffset(
  curvesByCohort: ReadonlyMap<string, LTVPoint[]>,
  cohortPeriod: string,
  offset: number,
): number | null {
  const point = (curvesByCohort.get(cohortPeriod) ?? []).find((p) => p.offset === offset);
  return point ? point.cumulativeAvgGrossRevenue : null;
}

function maturityAtOffset(
  cohortPeriod: string,
  offset: number,
  asOfDate: string | null,
): MaturityStatus | null {
  if (asOfDate == null) {
    return null;
  }
  return getMonthlyCohortMaturityStatus(cohortPeriod, offset, asOfDate);
}

function countCompletedCohortsAtOffset(
  cohortPeriods: readonly string[],
  offset: number,
  asOfDate: string,
): number {
  let count = 0;
  for (const period of cohortPeriods) {
    if (isCompletedMaturityOffsetAvailable(period, offset, asOfDate)) {
      count += 1;
    }
  }
  return count;
}

/** Adapter from command-centre dataset + metric engines → `/cohorts` presentation props. */
export function buildCohortsPageViewModelFromDataset(dataset: RetentionOSDataset): CohortsPageViewModel {
  const { customers, orders, marginAssumptions } = dataset;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retention = calculateRetentionByCohort(customers, orders);
  const ltvCurve = calculateLTVByCohort(customers, orders, marginAssumptions);
  const curvesByCohort = groupLtvCurveByCohort(ltvCurve);
  const ltvTail = terminalLtvByCohort(ltvCurve);
  const asOfDate = inferConservativeAsOfDateFromDataset(dataset);
  const cohortPeriods = cohortSummaries.map((c) => c.cohortPeriod);

  const cohortRows: CohortMonthTableRowView[] = cohortSummaries.map((cohort) => {
    const lt = ltvTail.get(cohort.cohortPeriod);
    const m1Active = retentionRateAtOffset(retention, cohort.cohortPeriod, 1);
    const m3Active = retentionRateAtOffset(retention, cohort.cohortPeriod, 3);
    return {
      cohortPeriod: cohort.cohortPeriod,
      cohortSize: cohort.cohortSize,
      monthPlus1ActiveRate: m1Active,
      monthPlus3ActiveRate: m3Active,
      monthPlus1RevenueLtv: ltvRevenueAtOffset(curvesByCohort, cohort.cohortPeriod, 1),
      monthPlus3RevenueLtv: ltvRevenueAtOffset(curvesByCohort, cohort.cohortPeriod, 3),
      monthPlus1ActiveMaturity: maturityAtOffset(cohort.cohortPeriod, 1, asOfDate),
      monthPlus3ActiveMaturity: maturityAtOffset(cohort.cohortPeriod, 3, asOfDate),
      monthPlus1RevenueLtvMaturity: maturityAtOffset(cohort.cohortPeriod, 1, asOfDate),
      monthPlus3RevenueLtvMaturity: maturityAtOffset(cohort.cohortPeriod, 3, asOfDate),
      totalOrders: cohort.totalOrders,
      netRevenue: cohort.netRevenue,
      contribution: cohort.contribution,
      latestAvgNetRevenueLtv: lt?.avgNetRevenueLtv ?? 0,
      latestAvgContributionLtv: lt?.avgContributionLtv ?? null,
      nextMonthActiveRate: m1Active,
      monthPlusTwoActiveRate: retentionRateAtOffset(retention, cohort.cohortPeriod, 2),
      monthPlusThreeActiveRate: m3Active,
    };
  });

  return {
    summary: {
      avgCompletedMonthPlus1ActiveRate:
        asOfDate == null ? null : averageCompletedCohortRetentionAtOffset(retention, 1, asOfDate),
      avgCompletedMonthPlus3RevenueLtv:
        asOfDate == null
          ? null
          : averageCompletedCohortLtvAtOffset(cohortPeriods, curvesByCohort, 3, asOfDate, "revenue"),
      completedMonthPlus3CohortCount:
        asOfDate == null ? 0 : countCompletedCohortsAtOffset(cohortPeriods, 3, asOfDate),
      totalCohortCount: cohortSummaries.length,
      asOfDate,
    },
    cohortRows,
  };
}

export function buildCohortsPageViewModel(seed?: number): CohortsPageViewModel {
  return buildCohortsPageViewModelFromDataset(buildDemoRetentionOSDataset(seed));
}
