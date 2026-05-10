/**
 * Structured inputs for deterministic diagnostic insights (metric engine → rules).
 * Kept separate from generators to avoid circular imports with `rules.ts`.
 */

export type RevenueDurabilityStatus = "Healthy" | "Mixed" | "Watch";

/** Subset of economics passed into the same durability vote heuristic as the dashboard adapter. */
export interface DiagnosticDurabilityInputs {
  repeatPurchaseRate: number;
  firstToSecond90Rate: number;
  avgMonthPlus1ActiveRate: number | null;
  /** Null when spread is not meaningful (single cohort / flat). */
  spreadUsdLike: number | null;
}

export interface RecentOffsetLtvComparison {
  recentAvgLtvAtOffset: number;
  baselineAvgLtvAtOffset: number;
  offsetUsed: number;
  recentCohortLabels: readonly string[];
  baselineCohortCount: number;
}

/** Pre-computed scalar facts derived from `/lib/metrics` outputs. */
export interface DiagnosticInsightsInput {
  cohortCount: number;
  totalCustomers: number;
  repeatCustomers: number;
  repeatPurchaseRate: number;
  firstToSecondWithin90DaysRate: number;
  averageDaysToSecondOrderAmongRepeaters: number | null;
  firstToSecondMedianDaysAmongRepeaters: number | null;
  retentionAverages: {
    m1: number | null;
    m2: number | null;
    m3: number | null;
  };
  bestTerminalNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
  weakestTerminalNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
  terminalNetRevenueSpreadUsd: number | null;
  avgTerminalNetRevenueLtvAcrossCohorts: number | null;
  avgTerminalContributionLtvAcrossCohorts: number | null;
}
