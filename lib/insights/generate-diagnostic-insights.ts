import { getDemoDataset } from "../demo";
import type { Customer, LTVPoint, MarginAssumptions } from "../types";
import type { Order } from "../types/order";
import type { Insight } from "../types/insight";
import {
  calculateCohorts,
  calculateFirstToSecondOrderConversion,
  calculateLTVByCohort,
  calculateRepeatPurchaseRate,
  calculateRetentionByCohort,
  safeDivide,
} from "../metrics";
import type { CohortSummary } from "../metrics/cohorts";
import type { DiagnosticInsightsInput, RecentOffsetLtvComparison } from "./context";
import { RECENT_QUALITY_MIN_BASELINE_COHORTS, RECENT_QUALITY_MIN_TOTAL_COHORTS } from "./thresholds";
import {
  evaluateRevenueDurabilityStatus,
  insightContributionVsNetRevenueLtv,
  insightCohortLtvSpread,
  insightFirstToSecondWithin90Days,
  insightRecentCohortQuality,
  insightRepeatPurchaseHealth,
  insightRetentionTiming,
  insightRevenueDurabilitySnapshot,
} from "./rules";

/** Full scalar envelope plus offset-aligned cohort slice used for maturity-safe recent vs baseline pacing. */
export interface DiagnosticInsightsBundle extends DiagnosticInsightsInput {
  readonly recentOffsetLtvComparison: RecentOffsetLtvComparison | null;
}

function groupLtvCurveByCohort(points: readonly LTVPoint[]): Map<string, LTVPoint[]> {
  const map = new Map<string, LTVPoint[]>();
  for (const p of points) {
    const list = map.get(p.cohortKey);
    if (list) list.push(p);
    else map.set(p.cohortKey, [p]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.offset - b.offset);
  }
  return map;
}

function terminalPoint(curve: readonly LTVPoint[]): LTVPoint | null {
  if (curve.length === 0) return null;
  return curve[curve.length - 1] ?? null;
}

interface TerminalRollupRow {
  cohortPeriod: string;
  terminalNetRevenueLtv: number;
}

function pickBest(rows: readonly TerminalRollupRow[]): TerminalRollupRow | null {
  if (rows.length === 0) return null;
  return rows.reduce<TerminalRollupRow>((best, r) => {
    if (r.terminalNetRevenueLtv > best.terminalNetRevenueLtv) return r;
    if (r.terminalNetRevenueLtv === best.terminalNetRevenueLtv && r.cohortPeriod.localeCompare(best.cohortPeriod) > 0) {
      return r;
    }
    return best;
  }, rows[0]!);
}

function pickWeakestDistinct(rows: readonly TerminalRollupRow[]): TerminalRollupRow | null {
  if (rows.length < 2) return null;
  const uniq = new Set(rows.map((row) => row.terminalNetRevenueLtv));
  if (uniq.size < 2) return null;
  return rows.reduce<TerminalRollupRow>((w, r) => {
    if (r.terminalNetRevenueLtv < w.terminalNetRevenueLtv) return r;
    if (r.terminalNetRevenueLtv === w.terminalNetRevenueLtv && r.cohortPeriod.localeCompare(w.cohortPeriod) < 0) {
      return r;
    }
    return w;
  }, rows[0]!);
}

function averageActiveRateAcrossCohorts(
  retention: ReturnType<typeof calculateRetentionByCohort>,
  offset: number,
): number | null {
  let sum = 0;
  let n = 0;
  for (const row of retention) {
    const p = row.points.find((pt) => pt.offset === offset);
    if (p) {
      sum += p.retentionRate;
      n += 1;
    }
  }
  return n === 0 ? null : safeDivide(sum, n);
}

function sortedCohortPeriods(rows: readonly CohortSummary[]): string[] {
  return [...rows].map((r) => r.cohortPeriod).sort((a, b) => a.localeCompare(b));
}

/** Compare recent acquisition cohorts to older ones at the first shared observable Month +offset LTV ladder slice. */
function buildRecentOffsetComparison(
  cohortSummaries: readonly CohortSummary[],
  curvesByCohort: ReadonlyMap<string, LTVPoint[]>,
): RecentOffsetLtvComparison | null {
  const periods = sortedCohortPeriods(cohortSummaries);
  if (periods.length < RECENT_QUALITY_MIN_TOTAL_COHORTS) return null;

  const recentLabels = periods.slice(-2);
  const baselineCandidateLabels = periods.slice(0, -2);
  if (baselineCandidateLabels.length < RECENT_QUALITY_MIN_BASELINE_COHORTS) return null;

  for (const offset of [3, 2, 1] as const) {
    const recentVals: number[] = [];
    for (const label of recentLabels) {
      const pt = curvesByCohort.get(label)?.find((x) => x.offset === offset);
      if (pt) recentVals.push(pt.cumulativeAvgGrossRevenue);
    }
    const baselineVals: number[] = [];
    for (const label of baselineCandidateLabels) {
      const pt = curvesByCohort.get(label)?.find((x) => x.offset === offset);
      if (pt) baselineVals.push(pt.cumulativeAvgGrossRevenue);
    }
    if (recentVals.length >= 1 && baselineVals.length >= RECENT_QUALITY_MIN_BASELINE_COHORTS) {
      return {
        recentAvgLtvAtOffset: recentVals.reduce((a, b) => a + b, 0) / recentVals.length,
        baselineAvgLtvAtOffset: baselineVals.reduce((a, b) => a + b, 0) / baselineVals.length,
        offsetUsed: offset,
        recentCohortLabels: recentLabels,
        baselineCohortCount: baselineVals.length,
      };
    }
  }

  return null;
}

function buildBundleCore(
  cohortSummaries: readonly CohortSummary[],
  retentionSeries: ReturnType<typeof calculateRetentionByCohort>,
  repeat: ReturnType<typeof calculateRepeatPurchaseRate>,
  f2: ReturnType<typeof calculateFirstToSecondOrderConversion>,
  curvesByCohort: ReadonlyMap<string, LTVPoint[]>,
): Omit<DiagnosticInsightsBundle, "recentOffsetLtvComparison"> {
  const terminals: TerminalRollupRow[] = [];
  const terminalContribution: number[] = [];

  for (const cohort of cohortSummaries) {
    const tail = terminalPoint(curvesByCohort.get(cohort.cohortPeriod) ?? []);
    if (!tail) continue;
    terminals.push({
      cohortPeriod: cohort.cohortPeriod,
      terminalNetRevenueLtv: tail.cumulativeAvgGrossRevenue,
    });
    if (tail.cumulativeAvgContribution != null) {
      terminalContribution.push(tail.cumulativeAvgContribution);
    }
  }

  const bestPick = pickBest(terminals);
  const weakestPick = pickWeakestDistinct(terminals);
  const bestTerminalNetRevenueLtvCohort = bestPick
    ? { cohortPeriod: bestPick.cohortPeriod, terminalNetRevenueLtv: bestPick.terminalNetRevenueLtv }
    : null;
  let weakestTerminalNetRevenueLtvCohort = weakestPick
    ? { cohortPeriod: weakestPick.cohortPeriod, terminalNetRevenueLtv: weakestPick.terminalNetRevenueLtv }
    : null;
  if (
    bestTerminalNetRevenueLtvCohort &&
    weakestTerminalNetRevenueLtvCohort &&
    bestTerminalNetRevenueLtvCohort.cohortPeriod === weakestTerminalNetRevenueLtvCohort.cohortPeriod
  ) {
    weakestTerminalNetRevenueLtvCohort = null;
  }

  let terminalNetRevenueSpreadUsd: number | null = null;
  if (bestTerminalNetRevenueLtvCohort && weakestTerminalNetRevenueLtvCohort) {
    terminalNetRevenueSpreadUsd =
      bestTerminalNetRevenueLtvCohort.terminalNetRevenueLtv - weakestTerminalNetRevenueLtvCohort.terminalNetRevenueLtv;
  }

  const avgTerminalNetRevenueLtvAcrossCohorts =
    terminals.length === 0 ? null : terminals.reduce((s, x) => s + x.terminalNetRevenueLtv, 0) / terminals.length;
  const avgTerminalContributionLtvAcrossCohorts =
    terminalContribution.length === 0
      ? null
      : terminalContribution.reduce((a, b) => a + b, 0) / terminalContribution.length;

  return {
    cohortCount: cohortSummaries.length,
    totalCustomers: repeat.totalCustomers,
    repeatCustomers: repeat.repeatCustomers,
    repeatPurchaseRate: repeat.repeatPurchaseRate,
    firstToSecondWithin90DaysRate: f2.conversionRateWithinWindow,
    averageDaysToSecondOrderAmongRepeaters: f2.averageDaysToSecondOrder,
    firstToSecondMedianDaysAmongRepeaters: f2.medianDaysToSecondOrder,
    retentionAverages: {
      m1: averageActiveRateAcrossCohorts(retentionSeries, 1),
      m2: averageActiveRateAcrossCohorts(retentionSeries, 2),
      m3: averageActiveRateAcrossCohorts(retentionSeries, 3),
    },
    bestTerminalNetRevenueLtvCohort,
    weakestTerminalNetRevenueLtvCohort,
    terminalNetRevenueSpreadUsd,
    avgTerminalNetRevenueLtvAcrossCohorts,
    avgTerminalContributionLtvAcrossCohorts,
  };
}

/**
 * Full diagnostic bundle — metrics-derived scalars plus optional Month +offset LTV pacing comparison arms.
 */
export function buildDiagnosticInsightsBundle(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions?: MarginAssumptions,
): DiagnosticInsightsBundle {
  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retentionSeries = calculateRetentionByCohort(customers, orders);
  const repeat = calculateRepeatPurchaseRate(customers, orders);
  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);
  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);
  const curvesByCohort = groupLtvCurveByCohort(ltvPoints);

  const recentOffsetLtvComparison = buildRecentOffsetComparison(cohortSummaries, curvesByCohort);
  const core = buildBundleCore(cohortSummaries, retentionSeries, repeat, f2, curvesByCohort);

  return { ...core, recentOffsetLtvComparison };
}

/** Scalar envelope only (no recent-offset comparison — cheaper if curves are unavailable). */
export function buildDiagnosticInsightsInput(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions?: MarginAssumptions,
): DiagnosticInsightsInput {
  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retentionSeries = calculateRetentionByCohort(customers, orders);
  const repeat = calculateRepeatPurchaseRate(customers, orders);
  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);
  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);
  const curvesByCohort = groupLtvCurveByCohort(ltvPoints);
  return buildBundleCore(cohortSummaries, retentionSeries, repeat, f2, curvesByCohort);
}

/**
 * Deterministic diagnostic insights from the scalar envelope.
 * @param recentOffsetLtvComparison — pass `null` when offset-aligned maturity checks are unavailable.
 */
export function generateDiagnosticInsights(
  input: DiagnosticInsightsInput,
  recentOffsetLtvComparison: RecentOffsetLtvComparison | null = null,
): Insight[] {
  const durabilityInputs = {
    repeatPurchaseRate: input.repeatPurchaseRate,
    firstToSecond90Rate: input.firstToSecondWithin90DaysRate,
    avgMonthPlus1ActiveRate: input.retentionAverages.m1,
    spreadUsdLike: input.terminalNetRevenueSpreadUsd,
  };

  const status = evaluateRevenueDurabilityStatus(durabilityInputs);

  const ordered: Insight[] = [
    insightRepeatPurchaseHealth(input),
    insightFirstToSecondWithin90Days(input),
    insightRetentionTiming(input),
    insightCohortLtvSpread(input),
  ];

  const contribution = insightContributionVsNetRevenueLtv(input);
  if (contribution) {
    ordered.push(contribution);
  }

  const recent = insightRecentCohortQuality(recentOffsetLtvComparison);
  if (recent) {
    ordered.push(recent);
  }

  ordered.push(insightRevenueDurabilitySnapshot(status));

  return ordered;
}

/** Metrics → bundle → insights in one pure pipeline. */
export function generateDiagnosticInsightsFromMetrics(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions?: MarginAssumptions,
): Insight[] {
  const bundle = buildDiagnosticInsightsBundle(customers, orders, marginAssumptions);
  const { recentOffsetLtvComparison, ...input } = bundle;
  return generateDiagnosticInsights(input, recentOffsetLtvComparison);
}

/** Canonical demo dataset path (same stack as metric pages). */
export function generateDemoDiagnosticInsights(seed?: number): Insight[] {
  const ds = getDemoDataset(seed);
  return generateDiagnosticInsightsFromMetrics(ds.customers, ds.orders, ds.marginAssumptions);
}
