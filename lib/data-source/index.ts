/**
 * Command-centre dataset source abstraction (Sprint 3D).
 *
 * `RetentionOSDataset` is the common contract for `getDemoDataset()`-backed fixtures and uploaded CSV,
 * before routes switch sources or persistence lands.
 */

export type {
  RetentionOSDataset,
  RetentionOSDatasetSummary,
  RetentionOSSourceMetadata,
  RetentionOSSourceType,
  RetentionOSUploadFormat,
  MarketingSpendSource,
} from "./dataset-types";

export {
  assertDatasetUsableForMetrics,
  countLineItems,
  getDatasetSummary,
  hasContributionMarginCoverage,
  inferOrderWindowFromOrders,
} from "./dataset-helpers";

export { buildDemoRetentionOSDataset } from "./demo-source";

export {
  buildImportedRetentionOSDataset,
  type BuildImportedRetentionOSDatasetOptions,
  type ImportedDatasetBuildFailure,
  type ImportedDatasetBuildResult,
  type ImportedDatasetBuildSuccess,
} from "./imported-source";

/** Prefer lifecycle coordinator for writes/clears; low-level save/clear remain for tests/legacy. */
export {
  clearUploadedRetentionOSDataset,
  clearUploadedRetentionOSDatasetBlobOnly,
  getUploadedDatasetSessionSummary,
  loadUploadedRetentionOSDataset,
  saveUploadedRetentionOSDataset,
} from "./browser-session";

export {
  ACTIVE_SOURCE_CONTROL_KEY,
  ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION,
  buildControlFromUploadedDataset,
  buildDemoActiveSourceControl,
  loadActiveSourceControl,
  parseActiveSourceControlLoad,
  resetActiveSourceControlToDemo,
  saveActiveSourceControl,
  type ActiveSourceControlLoadResult,
  type ActiveSourceControlRecord,
  type ActiveSourceIntent,
} from "./active-source-control";

export {
  activateOrReplaceUploadedDataset,
  clearAllUploadedSessionOverlays,
  clearAllUploadedSessionState,
  clearOrphanUploadedSessionWhenDemoControl,
  deleteUploadedDatasetAndUseDemo,
  ensureDemoControlRecord,
  refreshUploadedDataset,
  syncActiveSourceControlFromUploadedDataset,
  useDemoDataset,
  type ActivateUploadedDatasetResult,
} from "./dataset-lifecycle";

export {
  applyUploadedSessionMarginAssumptions,
  clearUploadedMarginAssumptions,
  getUploadedMarginAssumptionsSummary,
  loadUploadedMarginAssumptions,
  saveUploadedMarginAssumptions,
  validateUploadedMarginAssumptions,
  type UploadedMarginAssumptionsSummary,
} from "./margin-session";

export {
  applyUploadedSessionMarketingSpend,
  clearUploadedMarketingSpend,
  getMarketingSpendForAcquisitionPreview,
  getUploadedMarketingSpendSessionSummary,
  loadUploadedMarketingSpend,
  normaliseMarketingSpendForSession,
  resolveMarketingSpendForUploadedDataset,
  saveUploadedMarketingSpend,
  type UploadedMarketingSpendSessionSummary,
} from "./marketing-spend-session";

export {
  clearUploadedMarketingSpendAssumption,
  getUploadedMarketingSpendAssumptionSummary,
  loadUploadedMarketingSpendAssumption,
  saveUploadedMarketingSpendAssumption,
  validateUploadedMarketingSpendAssumptions,
  type UploadedMarketingSpendAssumptionSummary,
} from "./marketing-spend-assumption-session";

export { synthesizeMarketingSpendFromAssumption } from "./synthesize-marketing-spend-assumption";

export {
  buildDemoCommandCentreSelection,
  buildPendingCommandCentreSelection,
  resolveCommandCentreDatasetSource,
  resolveCommandCentreSelectionFromState,
  frameSourceFromSelection,
  type CommandCentreDatasetSelection,
  type CommandCentreSourceStatus,
} from "./client-selected-source";
