export type {
  DiagnosticDurabilityInputs,
  DiagnosticInsightsInput,
  RecentOffsetLtvComparison,
  RevenueDurabilityStatus,
} from "./context";

export type {
  Insight,
  InsightDestination,
  InsightObservation,
  InsightObservationUnit,
  InsightSeverity,
  InsightSufficiency,
} from "../types/insight";

export {
  RECENT_QUALITY_MIN_BASELINE_COHORTS,
  RECENT_QUALITY_MIN_TOTAL_COHORTS,
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  LTV_COHORT_SPREAD_MATERIAL_USD,
  MONTH_PLUS_1_ACTIVE_HEALTHY,
  MONTH_PLUS_1_ACTIVE_WATCH,
  REPEAT_PURCHASE_HEALTHY,
  REPEAT_PURCHASE_WATCH,
  RETENTION_MONTH_RELATIVE_NOTE,
} from "./thresholds";

export { evaluateRevenueDurabilityStatus, methodologyNotesSnapshot } from "./rules";

export {
  buildDiagnosticInsightsBundle,
  buildDiagnosticInsightsInput,
  finalizeInsights,
  generateDiagnosticInsights,
  generateDiagnosticInsightsFromMetrics,
  generateDemoDiagnosticInsights,
  type DiagnosticInsightsBundle,
} from "./generate-diagnostic-insights";

export {
  buildInsightsPageViewModel,
  buildInsightsPageViewModelFromDataset,
  type InsightsPageViewModel,
} from "./insights-view-model";
