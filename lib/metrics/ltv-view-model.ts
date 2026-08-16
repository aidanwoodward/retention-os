import {
  getMonthlyCohortMaturityStatus,
  inferConservativeAsOfDateFromDataset,
  type MaturityStatus,
} from "../analysis-context";
import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import type { LTVPoint } from "../types";
import type { MarginAssumptions } from "../types/scenario";
import { isIdentifiedOrder, type Order } from "../types/order";
import type { MetricDataQuality } from "./metric-definitions";
import { averageCompletedCohortLtvAtOffset } from "./completed-cohort-ltv";
import { calculateCohorts, type CohortSummary } from "./cohorts";
import { calculateLTVByCohort } from "./ltv";

export type { MaturityStatus };

/** How contribution dollars enter the canonical LTV staircase for this dataset. */
export type LtvContributionSourcePath =
  | "order_level"
  | "margin_assumption"
  | "mixed"
  | "partial_order_level"
  | "none";

export interface LTVPageSummaryView {
  /** Unweighted mean of completed-cohort Month +1 cumulative net revenue LTV. */
  avgCompletedMonthPlus1NetRevenueLtv: number | null;
  /** Unweighted mean of completed-cohort Month +1 cumulative contribution LTV. */
  avgCompletedMonthPlus1ContributionLtv: number | null;
  /** Unweighted mean of completed-cohort Month +3 cumulative net revenue LTV. */
  avgCompletedMonthPlus3NetRevenueLtv: number | null;
  /** Unweighted mean of completed-cohort Month +3 cumulative contribution LTV. */
  avgCompletedMonthPlus3ContributionLtv: number | null;
  contributionSourcePath: LtvContributionSourcePath;
  contributionDataQuality: MetricDataQuality;
}

export interface LTVCohortTableRowView {
  cohortPeriod: string;
  cohortSize: number;
  netRevenueLtvMonth0: number | null;
  netRevenueLtvMonth1: number | null;
  netRevenueLtvMonth2: number | null;
  netRevenueLtvMonth3: number | null;
  latestObservedNetRevenueLtv: number | null;
  contributionLtvMonth0: number | null;
  contributionLtvMonth1: number | null;
  contributionLtvMonth2: number | null;
  contributionLtvMonth3: number | null;
  latestObservedContributionLtv: number | null;
  /** Calendar Month+N offset of the latest observed staircase point for this cohort. */
  latestObservedOffset: number | null;
  monthPlus0Maturity: MaturityStatus | null;
  monthPlus1Maturity: MaturityStatus | null;
  monthPlus2Maturity: MaturityStatus | null;
  monthPlus3Maturity: MaturityStatus | null;
  latestObservedMaturity: MaturityStatus | null;
}

export interface LTVPageViewModel {
  summary: LTVPageSummaryView;
  cohortRows: LTVCohortTableRowView[];
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

function terminalPoint(curve: readonly LTVPoint[]): LTVPoint | null {
  if (curve.length === 0) {
    return null;
  }
  return curve[curve.length - 1] ?? null;
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

function pointAtOffset(curve: readonly LTVPoint[], offset: number): LTVPoint | null {
  return curve.find((p) => p.offset === offset) ?? null;
}

interface RelevantOrderContributionCoverage {
  totalRelevantOrders: number;
  withFiniteOrderLevel: number;
  withoutFiniteOrderLevel: number;
}

function scanRelevantOrderContributionCoverage(
  customers: readonly { id: string }[],
  orders: readonly Order[],
): RelevantOrderContributionCoverage {
  const knownIds = new Set(customers.map((c) => c.id));
  let totalRelevantOrders = 0;
  let withFiniteOrderLevel = 0;

  for (const order of orders) {
    if (!isIdentifiedOrder(order) || !knownIds.has(order.customerId)) {
      continue;
    }
    totalRelevantOrders += 1;
    if (order.contributionMargin != null && Number.isFinite(order.contributionMargin)) {
      withFiniteOrderLevel += 1;
    }
  }

  return {
    totalRelevantOrders,
    withFiniteOrderLevel,
    withoutFiniteOrderLevel: totalRelevantOrders - withFiniteOrderLevel,
  };
}

/**
 * Mirrors `calculateLTVByCohort` includeContribution gating — presentation must not
 * claim an active contribution path when the engine omits cumulativeAvgContribution.
 */
function hasCanonicalContributionOutput(
  marginAssumptions: MarginAssumptions | undefined,
  ltvPoints: readonly LTVPoint[],
): boolean {
  if (marginAssumptions != null) {
    return true;
  }
  return ltvPoints.some((p) => p.cumulativeAvgContribution != null);
}

function classifyContributionSourcePath(
  dataset: RetentionOSDataset,
  ltvPoints: readonly LTVPoint[],
): LtvContributionSourcePath {
  const { customers, orders, marginAssumptions } = dataset;

  if (!hasCanonicalContributionOutput(marginAssumptions, ltvPoints)) {
    return "none";
  }

  const coverage = scanRelevantOrderContributionCoverage(customers, orders);
  const hasMarginAssumption = marginAssumptions != null;

  if (coverage.totalRelevantOrders === 0) {
    return hasMarginAssumption ? "margin_assumption" : "none";
  }

  const allHaveOrderLevel = coverage.withFiniteOrderLevel === coverage.totalRelevantOrders;
  const noneHaveOrderLevel = coverage.withFiniteOrderLevel === 0;

  if (allHaveOrderLevel) {
    return "order_level";
  }
  if (noneHaveOrderLevel && hasMarginAssumption) {
    return "margin_assumption";
  }
  if (coverage.withFiniteOrderLevel > 0 && coverage.withoutFiniteOrderLevel > 0 && hasMarginAssumption) {
    return "mixed";
  }
  if (coverage.withFiniteOrderLevel > 0 && coverage.withoutFiniteOrderLevel > 0) {
    return "partial_order_level";
  }

  return "none";
}

function contributionDataQualityForPath(path: LtvContributionSourcePath): MetricDataQuality {
  if (path === "none") {
    return "unavailable";
  }
  return "partial";
}

function buildCohortRows(
  cohortSummaries: readonly CohortSummary[],
  curvesByCohort: ReadonlyMap<string, LTVPoint[]>,
  asOfDate: string | null,
): LTVCohortTableRowView[] {
  return cohortSummaries.map((cohort) => {
    const curve = curvesByCohort.get(cohort.cohortPeriod) ?? [];
    const p0 = pointAtOffset(curve, 0);
    const p1 = pointAtOffset(curve, 1);
    const p2 = pointAtOffset(curve, 2);
    const p3 = pointAtOffset(curve, 3);
    const tail = terminalPoint(curve);
    const latestOffset = tail?.offset ?? null;

    return {
      cohortPeriod: cohort.cohortPeriod,
      cohortSize: cohort.cohortSize,
      netRevenueLtvMonth0: p0 ? p0.cumulativeAvgGrossRevenue : null,
      netRevenueLtvMonth1: p1 ? p1.cumulativeAvgGrossRevenue : null,
      netRevenueLtvMonth2: p2 ? p2.cumulativeAvgGrossRevenue : null,
      netRevenueLtvMonth3: p3 ? p3.cumulativeAvgGrossRevenue : null,
      latestObservedNetRevenueLtv: tail ? tail.cumulativeAvgGrossRevenue : null,
      contributionLtvMonth0: p0?.cumulativeAvgContribution ?? null,
      contributionLtvMonth1: p1?.cumulativeAvgContribution ?? null,
      contributionLtvMonth2: p2?.cumulativeAvgContribution ?? null,
      contributionLtvMonth3: p3?.cumulativeAvgContribution ?? null,
      latestObservedContributionLtv: tail?.cumulativeAvgContribution ?? null,
      latestObservedOffset: latestOffset,
      monthPlus0Maturity: maturityAtOffset(cohort.cohortPeriod, 0, asOfDate),
      monthPlus1Maturity: maturityAtOffset(cohort.cohortPeriod, 1, asOfDate),
      monthPlus2Maturity: maturityAtOffset(cohort.cohortPeriod, 2, asOfDate),
      monthPlus3Maturity: maturityAtOffset(cohort.cohortPeriod, 3, asOfDate),
      latestObservedMaturity:
        latestOffset == null ? null : maturityAtOffset(cohort.cohortPeriod, latestOffset, asOfDate),
    };
  });
}

/** Adapter: command-centre dataset + `/lib/metrics` → `/ltv` presentation props (currency unformatted numbers). */
export function buildLTVPageViewModelFromDataset(dataset: RetentionOSDataset): LTVPageViewModel {
  const { customers, orders, marginAssumptions } = dataset;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);
  const curvesByCohort = groupLtvCurveByCohort(ltvPoints);
  const asOfDate = inferConservativeAsOfDateFromDataset(dataset);
  const contributionSourcePath = classifyContributionSourcePath(dataset, ltvPoints);
  const cohortPeriods = cohortSummaries.map((c) => c.cohortPeriod);

  return {
    summary: {
      avgCompletedMonthPlus1NetRevenueLtv:
        asOfDate == null
          ? null
          : averageCompletedCohortLtvAtOffset(cohortPeriods, curvesByCohort, 1, asOfDate, "revenue"),
      avgCompletedMonthPlus1ContributionLtv:
        asOfDate == null
          ? null
          : averageCompletedCohortLtvAtOffset(cohortPeriods, curvesByCohort, 1, asOfDate, "contribution"),
      avgCompletedMonthPlus3NetRevenueLtv:
        asOfDate == null
          ? null
          : averageCompletedCohortLtvAtOffset(cohortPeriods, curvesByCohort, 3, asOfDate, "revenue"),
      avgCompletedMonthPlus3ContributionLtv:
        asOfDate == null
          ? null
          : averageCompletedCohortLtvAtOffset(cohortPeriods, curvesByCohort, 3, asOfDate, "contribution"),
      contributionSourcePath,
      contributionDataQuality: contributionDataQualityForPath(contributionSourcePath),
    },
    cohortRows: buildCohortRows(cohortSummaries, curvesByCohort, asOfDate),
  };
}

export function buildLTVPageViewModel(seed?: number): LTVPageViewModel {
  return buildLTVPageViewModelFromDataset(buildDemoRetentionOSDataset(seed));
}
