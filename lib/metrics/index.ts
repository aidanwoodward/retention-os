/** Pure metric engine over canonical customer/order collections — UTC calendar months and fractional rates. */

export {
  utcMonthKeyFromIso,
  netOrderRevenue,
  orderContribution,
  parseMonthKey,
  addMonthsToMonthKey,
  monthsBetweenMonthKeys,
  median,
  safeDivide,
  calendarMonthIndexFromKey,
} from "./utils";

export { calculateCohorts, type CohortSummary } from "./cohorts";

export {
  calculateRetentionByCohort,
  type RetentionByCohortSeries,
  type CalculateRetentionOptions,
} from "./retention";

export {
  calculateRepeatPurchaseRate,
  calculateFirstToSecondOrderConversion,
  type RepeatPurchaseRateResult,
  type FirstToSecondConversionResult,
} from "./repeat-purchase";

export { calculateLTVByCohort, type CalculateLTVOptions } from "./ltv";

export {
  buildCohortsPageViewModel,
  type CohortMonthTableRowView,
  type CohortsPageSummaryView,
  type CohortsPageViewModel,
} from "./cohort-view-model";

export {
  runDemoMetricSanityCheck,
  type DemoMetricSanityCheckResult,
} from "./demo-sanity-check";

/**
 * Example wiring (not executed here):
 *
 * ```
 * import { getDemoDataset } from "@/lib/demo";
 * import { calculateCohorts, calculateLTVByCohort } from "@/lib/metrics";
 *
 * const { customers, orders, marginAssumptions } = getDemoDataset();
 * const cohortTable = calculateCohorts(customers, orders, marginAssumptions);
 * const staircases = calculateLTVByCohort(customers, orders, marginAssumptions);
 * ```
 */
