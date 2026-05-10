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
