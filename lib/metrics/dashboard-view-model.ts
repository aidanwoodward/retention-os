import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import type { LTVPoint } from "../types";
import { calculateCohorts, type CohortSummary } from "./cohorts";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { calculateRetentionByCohort } from "./retention";
import { calculateLTVByCohort } from "./ltv";
import {
  evaluateRevenueDurabilityStatus,
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  REPEAT_PURCHASE_HEALTHY,
  REPEAT_PURCHASE_WATCH,
  type RevenueDurabilityStatus,
} from "./revenue-durability-status";
import { netOrderRevenue, orderContribution, safeDivide } from "./utils";

export type { RevenueDurabilityStatus };

export interface DashboardSummaryView {
  totalCustomers: number;
  totalOrders: number;
  totalNetRevenue: number;
  totalContribution: number | null;
  cohortCount: number;
  largestCohort: { cohortPeriod: string; cohortSize: number } | null;
  allTimeRepeatPurchaseRate: number;
  firstToSecondWithin90DaysRate: number;
  averageDaysToSecondOrder: number | null;
  averageMonthPlus1ActiveRate: number | null;
  averageMonthPlus2ActiveRate: number | null;
  averageMonthPlus3ActiveRate: number | null;
  avgTerminalNetRevenueLtvAcrossCohorts: number | null;
  avgTerminalContributionLtvAcrossCohorts: number | null;
  bestNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
  weakestNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
}

export interface RevenueDurabilitySnapshotView {
  status: RevenueDurabilityStatus;
  /** Transparency: rule-of-thumb inputs used for the plain-English snapshot (no composite score yet). */
  methodologyNotes: readonly string[];
}

export interface DashboardExecutiveViewModel {
  summary: DashboardSummaryView;
  durability: RevenueDurabilitySnapshotView;
  /** Deterministic bullets for the MVP executive screen. */
  observations: readonly string[];
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

function summarizeLargestCohort(rows: readonly CohortSummary[]): { cohortPeriod: string; cohortSize: number } | null {
  if (rows.length === 0) return null;
  return rows.reduce(
    (best, row) =>
      row.cohortSize > best.cohortSize ||
      (row.cohortSize === best.cohortSize && row.cohortPeriod.localeCompare(best.cohortPeriod) > 0)
        ? row
        : best,
    rows[0]!,
  );
}

function computeDurability(
  repeat: number,
  f290: number,
  m1: number | null,
  weakest: { cohortPeriod: string; terminalNetRevenueLtv: number } | null,
  best: { cohortPeriod: string; terminalNetRevenueLtv: number } | null,
): RevenueDurabilitySnapshotView {
  const methodologyNotes = [
    "Snapshot uses MVP fraction thresholds only (portfolio repeat ≥2 orders; first→second ≤90 calendar days vs first order).",
    "Month +1 active rate is cohort calendar-month repurchase breadth — not interchangeable with journey first→second timing.",
    "LTV cohort spread compares terminal staircase net revenue LTV only (discounts/refunds removed from merchandise revenue).",
  ] as const;

  let spreadUsdLike: number | null = null;
  if (weakest != null && best != null && weakest.cohortPeriod !== best.cohortPeriod) {
    spreadUsdLike = best.terminalNetRevenueLtv - weakest.terminalNetRevenueLtv;
  }

  const status = evaluateRevenueDurabilityStatus({
    repeatPurchaseRate: repeat,
    firstToSecond90Rate: f290,
    avgMonthPlus1ActiveRate: m1,
    spreadUsdLike,
  });

  return { status, methodologyNotes };
}

function buildObservations(s: DashboardSummaryView): readonly string[] {
  const obs: string[] = [];

  if (s.allTimeRepeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY) {
    obs.push(
      `Portfolio repeat is solid for this demo: about ${(s.allTimeRepeatPurchaseRate * 100).toFixed(1)}% of customers have reached a second qualifying order.`,
    );
  } else if (s.allTimeRepeatPurchaseRate < REPEAT_PURCHASE_WATCH) {
    obs.push(
      `Repeat depth looks thin: fewer than roughly three in ten customers show two or more orders in the demo slice — revisit repurchase journeys before leaning on cohort LTV ceilings.`,
    );
  } else {
    obs.push(
      `Portfolio repeat (~${(s.allTimeRepeatPurchaseRate * 100).toFixed(1)}%) sits in a mid band — tighten post-first-order paths to move the funnel.`,
    );
  }

  if (s.firstToSecondWithin90DaysRate >= FIRST_TO_SECOND_90_HEALTHY) {
    obs.push(
      `Early reordering discipline is comparatively strong — about ${(s.firstToSecondWithin90DaysRate * 100).toFixed(1)}% convert to a second order within ninety days of the first.`,
    );
  } else if (s.firstToSecondWithin90DaysRate < FIRST_TO_SECOND_90_WATCH) {
    obs.push(
      `First-to-second inside ninety days (~${(s.firstToSecondWithin90DaysRate * 100).toFixed(1)}%) is sluggish; expect calendar Month +N active rates to behave differently — they track any order activity in cohort month offsets.`,
    );
  } else {
    obs.push(
      `First-to-second within ninety days (~${(s.firstToSecondWithin90DaysRate * 100).toFixed(1)}%) is workable but uneven — pair with cohort LTV dispersion checks before allocating acquisition budget.`,
    );
  }

  if (s.weakestNetRevenueLtvCohort && s.bestNetRevenueLtvCohort) {
    const gap =
      s.bestNetRevenueLtvCohort.terminalNetRevenueLtv - s.weakestNetRevenueLtvCohort.terminalNetRevenueLtv;
    obs.push(
      `Cohort heterogeneity matters: strongest terminal net revenue LTV is ${s.bestNetRevenueLtvCohort.cohortPeriod} vs weakest ${s.weakestNetRevenueLtvCohort.cohortPeriod} — roughly a $${gap.toFixed(0)} average gap at the staircase tail in this fixture.`,
    );
  } else {
    obs.push(
      `Cohort dispersion is muted in this fixture (flat or single-cohort edge case) — use the cohort table drilldown once live data exposes spread.`,
    );
  }

  if (s.avgTerminalContributionLtvAcrossCohorts != null && s.avgTerminalNetRevenueLtvAcrossCohorts != null) {
    const pct = safeDivide(s.avgTerminalContributionLtvAcrossCohorts, s.avgTerminalNetRevenueLtvAcrossCohorts);
    obs.push(
      `Contribution LTV rests near ${(pct * 100).toFixed(0)}% of terminal net revenue LTV on average here — materially lower than top-line ladders because modeled contribution applies margin assumptions.`,
    );
  }

  if (s.averageDaysToSecondOrder != null) {
    obs.push(
      `Among customers who reach a second order, the demo shows ~${Math.round(s.averageDaysToSecondOrder)} average calendar days between first and second purchases — interpret separately from Month +N calendar-month activity.`,
    );
  }

  return obs.slice(0, 5);
}

export function buildDashboardExecutiveViewModelFromDataset(dataset: RetentionOSDataset): DashboardExecutiveViewModel {
  const { customers, orders, marginAssumptions } = dataset;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retentionSeries = calculateRetentionByCohort(customers, orders);
  const repeat = calculateRepeatPurchaseRate(customers, orders);
  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);

  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);
  const curvesByCohort = groupLtvCurveByCohort(ltvPoints);

  const terminals: TerminalRollupRow[] = [];
  const terminalContribution: number[] = [];
  let totalContributionSum = 0;
  for (const o of orders) {
    totalContributionSum += orderContribution(o, marginAssumptions);
  }
  const totalContributionPresentation = marginAssumptions ? totalContributionSum : null;

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
  const bestNetRevenueLtvCohort = bestPick
    ? { cohortPeriod: bestPick.cohortPeriod, terminalNetRevenueLtv: bestPick.terminalNetRevenueLtv }
    : null;
  let weakestNetRevenueLtvCohort = weakestPick
    ? { cohortPeriod: weakestPick.cohortPeriod, terminalNetRevenueLtv: weakestPick.terminalNetRevenueLtv }
    : null;
  if (
    bestNetRevenueLtvCohort &&
    weakestNetRevenueLtvCohort &&
    bestNetRevenueLtvCohort.cohortPeriod === weakestNetRevenueLtvCohort.cohortPeriod
  ) {
    weakestNetRevenueLtvCohort = null;
  }

  const totalNetRevenue = orders.reduce((sum, o) => sum + netOrderRevenue(o), 0);
  const avgTerminalNetRevenueLtvAcrossCohorts =
    terminals.length === 0 ? null : terminals.reduce((s, x) => s + x.terminalNetRevenueLtv, 0) / terminals.length;
  const avgTerminalContributionLtvAcrossCohorts =
    terminalContribution.length === 0 ? null : terminalContribution.reduce((a, b) => a + b, 0) / terminalContribution.length;

  const summary: DashboardSummaryView = {
    totalCustomers: customers.length,
    totalOrders: orders.length,
    totalNetRevenue,
    totalContribution: totalContributionPresentation,
    cohortCount: cohortSummaries.length,
    largestCohort: summarizeLargestCohort(cohortSummaries),
    allTimeRepeatPurchaseRate: repeat.repeatPurchaseRate,
    firstToSecondWithin90DaysRate: f2.conversionRateWithinWindow,
    averageDaysToSecondOrder: f2.averageDaysToSecondOrder,
    averageMonthPlus1ActiveRate: averageActiveRateAcrossCohorts(retentionSeries, 1),
    averageMonthPlus2ActiveRate: averageActiveRateAcrossCohorts(retentionSeries, 2),
    averageMonthPlus3ActiveRate: averageActiveRateAcrossCohorts(retentionSeries, 3),
    avgTerminalNetRevenueLtvAcrossCohorts,
    avgTerminalContributionLtvAcrossCohorts,
    bestNetRevenueLtvCohort,
    weakestNetRevenueLtvCohort,
  };

  const durability = computeDurability(
    summary.allTimeRepeatPurchaseRate,
    summary.firstToSecondWithin90DaysRate,
    summary.averageMonthPlus1ActiveRate,
    summary.weakestNetRevenueLtvCohort,
    summary.bestNetRevenueLtvCohort,
  );

  const observations = buildObservations(summary);

  return { summary, durability, observations };
}

export function buildDashboardExecutiveViewModel(seed?: number): DashboardExecutiveViewModel {
  return buildDashboardExecutiveViewModelFromDataset(buildDemoRetentionOSDataset(seed));
}
