/**
 * MVP heuristic thresholds for diagnostic rules — aligned with
 * `/lib/metrics/dashboard-view-model` durability votes (explicit duplication to keep
 * the insights layer independent of dashboard adapters).
 */

/** Fraction: portfolio share with ≥2 orders. */
export const REPEAT_PURCHASE_WATCH = 0.28;
export const REPEAT_PURCHASE_HEALTHY = 0.37;

/** Fraction: first-to-second within 90 calendar days vs all customers. */
export const FIRST_TO_SECOND_90_WATCH = 0.24;
export const FIRST_TO_SECOND_90_HEALTHY = 0.31;

/** Fraction: mean cohort Month +1 active rate across cohorts that have offset +1 data. */
export const MONTH_PLUS_1_ACTIVE_WATCH = 0.065;
export const MONTH_PLUS_1_ACTIVE_HEALTHY = 0.092;

/** USD: strongest minus weakest cohort terminal net revenue LTV (material dispersion). */
export const LTV_COHORT_SPREAD_MATERIAL_USD = 52;

/** Relative uplift to treat Month +N as visibly above Month +1 (timing narrative). */
export const RETENTION_MONTH_RELATIVE_NOTE = 0.02;

/** Recent vs mature: minimum cohorts needed before speaking to cohort quality drift. */
export const RECENT_QUALITY_MIN_TOTAL_COHORTS = 5;
/** Minimum older cohorts in baseline arm for a comparison headline. */
export const RECENT_QUALITY_MIN_BASELINE_COHORTS = 2;

/** Minimum relative gap recent vs baseline (at shared offset) before a warning headline. */
export const RECENT_TERMINAL_GAP_WARN = 0.08;
