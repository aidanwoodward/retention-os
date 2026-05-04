/**
 * A first-order anchored customer group (classic acquisition cohort matrix row).
 *
 * `cohortPeriod` intentionally stays a string slice (usually `YYYY-MM` or ISO month start) until the engine chooses graining.
 */
export interface Cohort {
  cohortPeriod: string;
  cohortSize: number;
  /** Optional stable key when cohorts are composites (e.g. channel × month). Mirrors `cohortPeriod` otherwise. */
  cohortKey?: string;
}

/** A single observation on how a cohort survives or repeats over relative time. */
export interface RetentionPoint {
  cohortKey: string;
  /** Months (or ordinal periods such as ISO weeks — document at call site) after the cohort anchor. */
  offset: number;
  /** Alive/repeat rate for the cohort slice at this offset (fraction 0–1 for computations). */
  retentionRate: number;
  /** Optional numerator before dividing by cohort size — supports SQL/view reuse. */
  activeCustomers?: number;
  revenueInPeriod?: number;
}
