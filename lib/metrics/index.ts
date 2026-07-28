/** Pure metric engine over canonical customer/order collections — UTC calendar months and fractional rates. */

export {
  ALL_METRIC_IDS,
  REVENUE_METRIC_IDS,
  METRIC_DEFINITIONS,
  SHOPIFY_HELP,
  formatMetricDefinitionTooltip,
  getMetricDefinition,
  type MetricDataQuality,
  type MetricDefinition,
  type MetricId,
  type MetricTooltipSection,
} from "./metric-definitions";

export {
  CONTRACTED_METRIC_IDS,
  METRIC_CONTRACT_INDEX,
  getMetricContractIndexEntry,
  isContractedMetricId,
  type ContractedMetricId,
  type MetricContractIndexEntry,
} from "./metric-contract-index";

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
  calculateCohortRevenueContribution,
  type CohortRevenueContributionResidualKind,
  type CohortRevenueContributionResult,
  type CohortRevenueContributionRow,
} from "./cohort-revenue-contribution";

export {
  calculateCohortRevenueRetention,
  type CohortRevenueRetentionCell,
  type CohortRevenueRetentionCohortRow,
  type CohortRevenueRetentionResult,
} from "./cohort-revenue-retention";

export {
  calculateNewReturningMix,
  type NewReturningMixResult,
} from "./new-returning";

export {
  calculateRetentionByCohort,
  type RetentionByCohortSeries,
  type CalculateRetentionOptions,
} from "./retention";

export {
  calculateRepeatPurchaseRate,
  calculateFirstToSecondOrderConversion,
  computeRepeatPurchaseApiMetrics,
  type RepeatPurchaseRateResult,
  type FirstToSecondConversionResult,
  type RepeatPurchaseBreakdownRow,
  type RepeatPurchaseApiDerived,
} from "./repeat-purchase";

export { calculateLTVByCohort, type CalculateLTVOptions } from "./ltv";

export {
  buildAcquisitionPreviewFromDataset,
  calculateBlendedCAC,
  calculateCACByMonth,
  calculateLtvToCac,
  calculatePaybackPeriod,
  cacMapFromRows,
  type AcquisitionPreviewModel,
  type BlendedCacResult,
  type CacByMonthResult,
  type CacByMonthRow,
  type LtvCacResult,
  type LtvCacRow,
  type PaybackPreviewResult,
  type PaybackPreviewRow,
} from "./acquisition";

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
  type DashboardCommandCentreHeroView,
  type DashboardExecutiveViewModel,
  type DashboardHeroSignalTileView,
  type DashboardSummaryView,
  type RevenueDurabilitySnapshotView,
  type RevenueDurabilityStatus,
} from "./dashboard-view-model";

export {
  buildDashboardDataCompletenessView,
  buildSpineObservationBullets,
  mapDashboardAcquisitionExecutive,
  mapDashboardProductQualityExecutive,
  type DashboardAcquisitionExecutiveView,
  type DashboardDataCompletenessRow,
  type DashboardDataCompletenessView,
  type DashboardProductHighlightView,
  type DashboardProductQualityExecutiveView,
  type DataCompletenessStatus,
  type PaybackExecutiveStatus,
  type ProductQualityExecutiveState,
} from "./dashboard-executive-spine";

export {
  evaluateRevenueDurabilityStatus,
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  LTV_COHORT_SPREAD_MATERIAL_USD,
  MONTH_PLUS_1_ACTIVE_HEALTHY,
  MONTH_PLUS_1_ACTIVE_WATCH,
  REPEAT_PURCHASE_HEALTHY,
  REPEAT_PURCHASE_WATCH,
  type RevenueDurabilityStatusInputs,
} from "./revenue-durability-status";

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

export {
  buildAcquisitionPageViewModelFromDataset,
  type AcquisitionPageSummaryView,
  type AcquisitionPageViewModel,
} from "./acquisition-view-model";

export {
  calculateFirstProductCustomerQuality,
  calculateFirstProductCustomerQualityFromDataset,
  deriveFirstProductIdForCustomer,
  MIN_CUSTOMERS_FOR_SIGNAL,
  MATERIAL_DELTA,
  HIGH_DRAG,
  type CalculateFirstProductCustomerQualityOptions,
  type FirstProductCustomerQualityResult,
  type FirstProductQualityRow,
  type ProductQualitySignal,
} from "./product-quality";

export {
  buildProductsPageViewModel,
  buildProductsPageViewModelFromDataset,
  FIRST_PRODUCT_ATTRIBUTION_CAVEAT,
  type FirstProductTableRowView,
  type ProductsPageSummaryView,
  type ProductsPageViewModel,
} from "./product-quality-view-model";

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
