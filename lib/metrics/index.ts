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
  buildCohortsPageViewModelFromDataset,
  type CohortMonthTableRowView,
  type CohortsPageSummaryView,
  type CohortsPageViewModel,
} from "./cohort-view-model";

export {
  buildCohortMatrixFromDataset,
  type BuildCohortMatrixOptions,
  type CohortMatrixCell,
  type CohortMatrixCellFormattedType,
  type CohortMatrixGrain,
  type CohortMatrixMetricKind,
  type CohortMatrixModel,
  type CohortMatrixRow,
} from "./cohort-matrix";

export {
  runDemoMetricSanityCheck,
  type DemoMetricSanityCheckResult,
} from "./demo-sanity-check";

export {
  buildDataPageViewModel,
  buildDataPageViewModelFromDataset,
  type DataPageViewModel,
  type DataSourceMode,
} from "./data-view-model";

export {
  buildDashboardExecutiveViewModel,
  buildDashboardExecutiveViewModelFromDataset,
  type DashboardExecutiveViewModel,
  type DashboardSummaryView,
  type RevenueDurabilitySnapshotView,
  type RevenueDurabilityStatus,
} from "./dashboard-view-model";

export {
  buildLTVPageViewModel,
  buildLTVPageViewModelFromDataset,
  type LTVPageSummaryView,
  type LTVPageViewModel,
  type LTVCohortTableRowView,
} from "./ltv-view-model";

export {
  buildRetentionPageViewModel,
  buildRetentionPageViewModelFromDataset,
  type RetentionCohortTableRowView,
  type RetentionPageSummaryView,
  type RetentionPageViewModel,
} from "./retention-view-model";

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
