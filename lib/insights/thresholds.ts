/**
 * MVP heuristic thresholds for diagnostic rules.
 * Durability vote thresholds live in `/lib/metrics/revenue-durability-status` (re-exported below).
 */

export {
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  LTV_COHORT_SPREAD_MATERIAL_USD,
  MONTH_PLUS_1_ACTIVE_HEALTHY,
  MONTH_PLUS_1_ACTIVE_WATCH,
  REPEAT_PURCHASE_HEALTHY,
  REPEAT_PURCHASE_WATCH,
} from "../metrics/revenue-durability-status";

/** Relative uplift to treat Month +N as visibly above Month +1 (timing narrative). */
export const RETENTION_MONTH_RELATIVE_NOTE = 0.02;

/** Recent vs mature: minimum cohorts needed before speaking to cohort quality drift. */
export const RECENT_QUALITY_MIN_TOTAL_COHORTS = 5;
/** Minimum older cohorts in baseline arm for a comparison headline. */
export const RECENT_QUALITY_MIN_BASELINE_COHORTS = 2;

/** Minimum relative gap recent vs baseline (at shared offset) before a warning headline. */
export const RECENT_TERMINAL_GAP_WARN = 0.08;
