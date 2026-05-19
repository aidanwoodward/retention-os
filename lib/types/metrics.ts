import type { ChannelKey } from "./marketing";

/** Cumulative customer economics at a horizon along a cohort-age axis. */
export interface LTVPoint {
  cohortKey: string;
  offset: number;
  /** Average cumulative gross revenue per originating cohort customer — classic LTV staircase. */
  cumulativeAvgGrossRevenue: number;
  /** Average cumulative contribution dollars per cohort customer when margins are modeled. */
  cumulativeAvgContribution?: number;
}

/**
 * Blended or channel-specific acquisition cost for a time bucket.
 *
 * CAC = eligible spend / attributable net-new customers — definition chosen at calculation time (not encoded here).
 */
export interface CACPoint {
  month: string;
  channel?: ChannelKey;
  /** Fully loaded acquisition cost per net new shopper for this slice. */
  cac: number;
  spend?: number;
  acquiredCustomers?: number;
}

/** Recovery profile vs acquisition spend — central to underwriting channel bets. */
export interface PaybackPoint {
  cohortKey?: string;
  offset?: number;
  /** Months until cumulative contribution per shopper meets or beats the originating CAC baseline. Null when not achieved inside modeled horizon. */
  monthsToPayback: number | null;
  cumulativeContribution?: number;
  /** Optional ratio of cumulative contribution vs CAC for quick charting without recomputing. */
  recoveryVsCac?: number;
}

/** Point-in-time executive rollup — snapshot inputs for dashboards, durability scoring, scenarios. */
export interface MetricSnapshot {
  capturedAt: string;
  totalCustomers?: number;
  grossRevenueLtm?: number;
  blendedLtv?: number;
  blendedCac?: number;
  /** Unitless multiple — numerator/denominator definition lives in calculator. */
  ltvCac?: number;
  /** Simple months-to-recover heuristic using contribution stream vs CAC. */
  avgPaybackMonths?: number | null;
  contributionMarginPct?: number;
}

/** Discrete sub-scores informing a composite headline about revenue predictability vs cohort quality. */
export interface RevenueDurabilityComponent {
  key: string;
  label: string;
  /** Normalized 0–100 sub-score; weighting lives outside this struct. */
  score: number;
}

/**
 * Composite index summarizing how sustainable top-line is given retention, repeat, concentration, and payback.
 *
 * Higher scores imply more recurring, predictable demand rather than one-and-done acquisition spikes.
 */
export interface RevenueDurabilityScore {
  composite: number;
  components: RevenueDurabilityComponent[];
  notes?: string;
}
