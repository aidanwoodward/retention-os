import { getDemoDataset } from "../demo";
import type { LTVPoint } from "../types";
import { calculateCohorts, type CohortSummary } from "./cohorts";
import { calculateRepeatPurchaseRate } from "./repeat-purchase";
import { calculateLTVByCohort } from "./ltv";

export interface LTVPageSummaryView {
  totalCohorts: number;
  totalCustomers: number;
  /** Mean of each cohort's terminal staircase net revenue LTV (`cumulativeAvgGrossRevenue` in engine). */
  avgTerminalNetRevenueLtvAcrossCohorts: number | null;
  /** Mean terminal contribution LTV among cohorts with contribution through terminal horizon. */
  avgTerminalContributionLtvAcrossCohorts: number | null;
  bestNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
  /**
   * Cohort with the lowest terminal net revenue LTV when there are ≥2 cohorts and terminals are not all equal.
   * Null when not meaningful (same cohort as best after tie handling, flat ladder, etc.).
   */
  weakestNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
  /** Customers with ≥2 orders / all customers (fraction). */
  repeatPurchaseRate: number;
}

export interface LTVCohortTableRowView {
  cohortPeriod: string;
  cohortSize: number;
  netRevenueLtvMonth0: number | null;
  netRevenueLtvMonth1: number | null;
  netRevenueLtvMonth2: number | null;
  netRevenueLtvMonth3: number | null;
  terminalNetRevenueLtv: number | null;
  terminalContributionLtv: number | null;
  contributionLtvMonth0: number | null;
  contributionLtvMonth1: number | null;
  contributionLtvMonth2: number | null;
  contributionLtvMonth3: number | null;
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

interface TerminalRollupRow {
  cohortPeriod: string;
  terminalNetRevenueLtv: number;
}

function pickBest(rows: readonly TerminalRollupRow[]): TerminalRollupRow | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce<TerminalRollupRow>((best, r) => {
    if (r.terminalNetRevenueLtv > best.terminalNetRevenueLtv) {
      return r;
    }
    if (r.terminalNetRevenueLtv === best.terminalNetRevenueLtv && r.cohortPeriod.localeCompare(best.cohortPeriod) > 0) {
      return r;
    }
    return best;
  }, rows[0]!);
}

function pickWeakestDistinct(rows: readonly TerminalRollupRow[]): TerminalRollupRow | null {
  if (rows.length < 2) {
    return null;
  }
  const uniq = new Set(rows.map((r) => r.terminalNetRevenueLtv));
  if (uniq.size < 2) {
    return null;
  }
  return rows.reduce<TerminalRollupRow>((w, r) => {
    if (r.terminalNetRevenueLtv < w.terminalNetRevenueLtv) {
      return r;
    }
    if (r.terminalNetRevenueLtv === w.terminalNetRevenueLtv && r.cohortPeriod.localeCompare(w.cohortPeriod) < 0) {
      return r;
    }
    return w;
  }, rows[0]!);
}

function buildCohortRows(
  cohortSummaries: readonly CohortSummary[],
  curvesByCohort: ReadonlyMap<string, LTVPoint[]>,
): LTVCohortTableRowView[] {
  return cohortSummaries.map((cohort) => {
    const curve = curvesByCohort.get(cohort.cohortPeriod) ?? [];
    const p0 = curve.find((p) => p.offset === 0) ?? null;
    const p1 = curve.find((p) => p.offset === 1) ?? null;
    const p2 = curve.find((p) => p.offset === 2) ?? null;
    const p3 = curve.find((p) => p.offset === 3) ?? null;
    const tail = terminalPoint(curve);

    return {
      cohortPeriod: cohort.cohortPeriod,
      cohortSize: cohort.cohortSize,
      netRevenueLtvMonth0: p0 ? p0.cumulativeAvgGrossRevenue : null,
      netRevenueLtvMonth1: p1 ? p1.cumulativeAvgGrossRevenue : null,
      netRevenueLtvMonth2: p2 ? p2.cumulativeAvgGrossRevenue : null,
      netRevenueLtvMonth3: p3 ? p3.cumulativeAvgGrossRevenue : null,
      terminalNetRevenueLtv: tail ? tail.cumulativeAvgGrossRevenue : null,
      terminalContributionLtv: tail?.cumulativeAvgContribution ?? null,
      contributionLtvMonth0: p0?.cumulativeAvgContribution ?? null,
      contributionLtvMonth1: p1?.cumulativeAvgContribution ?? null,
      contributionLtvMonth2: p2?.cumulativeAvgContribution ?? null,
      contributionLtvMonth3: p3?.cumulativeAvgContribution ?? null,
    };
  });
}

/** Adapter: canonical demo + `/lib/metrics` → `/ltv` presentation props (currency unformatted numbers). */
export function buildLTVPageViewModel(seed?: number): LTVPageViewModel {
  const ds = getDemoDataset(seed);
  const { customers, orders, marginAssumptions } = ds;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const repeat = calculateRepeatPurchaseRate(customers, orders);

  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);

  const curvesByCohort = groupLtvCurveByCohort(ltvPoints);

  const terminals: TerminalRollupRow[] = [];
  const terminalContribution: number[] = [];

  for (const cohort of cohortSummaries) {
    const tail = terminalPoint(curvesByCohort.get(cohort.cohortPeriod) ?? []);
    if (!tail) {
      continue;
    }
    terminals.push({
      cohortPeriod: cohort.cohortPeriod,
      terminalNetRevenueLtv: tail.cumulativeAvgGrossRevenue,
    });
    if (tail.cumulativeAvgContribution != null) {
      terminalContribution.push(tail.cumulativeAvgContribution);
    }
  }

  const avgTerminalNetRevenueLtvAcrossCohorts =
    terminals.length === 0 ? null : terminals.reduce((s, x) => s + x.terminalNetRevenueLtv, 0) / terminals.length;

  const avgTerminalContributionLtvAcrossCohorts =
    terminalContribution.length === 0 ? null : terminalContribution.reduce((a, b) => a + b, 0) / terminalContribution.length;

  const bestPick = pickBest(terminals);
  const weakestPickRaw = pickWeakestDistinct(terminals);

  const bestNetRevenueLtvCohort = bestPick
    ? { cohortPeriod: bestPick.cohortPeriod, terminalNetRevenueLtv: bestPick.terminalNetRevenueLtv }
    : null;
  let weakestNetRevenueLtvCohort = weakestPickRaw
    ? { cohortPeriod: weakestPickRaw.cohortPeriod, terminalNetRevenueLtv: weakestPickRaw.terminalNetRevenueLtv }
    : null;

  if (
    bestNetRevenueLtvCohort &&
    weakestNetRevenueLtvCohort &&
    bestNetRevenueLtvCohort.cohortPeriod === weakestNetRevenueLtvCohort.cohortPeriod
  ) {
    weakestNetRevenueLtvCohort = null;
  }

  const cohortRows = buildCohortRows(cohortSummaries, curvesByCohort);

  return {
    summary: {
      totalCohorts: cohortSummaries.length,
      totalCustomers: customers.length,
      avgTerminalNetRevenueLtvAcrossCohorts,
      avgTerminalContributionLtvAcrossCohorts,
      bestNetRevenueLtvCohort,
      weakestNetRevenueLtvCohort,
      repeatPurchaseRate: repeat.repeatPurchaseRate,
    },
    cohortRows,
  };
}
