/**
 * Provenance trust-metadata contract (Sprint 6A-PROVENANCE).
 *
 * Pure composition of existing source, analysis-context, metric-contract, and
 * caller-supplied facts. Not a lineage engine, recalculation layer, or UI.
 */

import type { AnalysisPeriod, MaturityStatus } from "../analysis-context/types";
import type {
  MarketingSpendSource,
  RetentionOSSourceType,
  RetentionOSUploadFormat,
} from "../data-source/dataset-types";
import type { ContractedMetricId } from "../metrics/metric-contract-index";

/** Source identity reused from RetentionOSSourceMetadata (demo | uploaded_csv only). */
export type ProvenanceSourceIdentity = {
  readonly sourceType: RetentionOSSourceType;
  readonly uploadFormat?: RetentionOSUploadFormat;
  readonly sourceLabel: string;
  readonly isDemo: boolean;
  readonly isUploaded: boolean;
};

/**
 * Reporting scope reused from AnalysisContext semantics.
 * Omit `reportingPeriod` for canonical all-history / unbounded selection.
 */
export type ProvenanceReportingScope = {
  readonly reportingPeriod?: AnalysisPeriod;
  readonly asOfDate: string;
};

/** Pass-through population counts only — never recalculated or zero-filled here. */
export type ProvenancePopulation = {
  readonly eligibleCustomerCount?: number;
  readonly reportingOrderCount?: number;
  readonly identifiableReportingOrderCount?: number;
  readonly guestReportingOrderCount?: number;
  /** Metric-specific eligible count when the caller already computed it. */
  readonly metricEligibleCount?: number;
};

/**
 * Canonical assumption values/source already present on dataset/context.
 * Provenance does not own, default, or derive these values.
 */
export type ProvenanceAssumptions = {
  readonly contributionMarginPct?: number;
  readonly netRevenueMultiplier?: number;
  readonly marketingSpendPctOfNetRevenue?: number;
  readonly marketingSpendSource?: MarketingSpendSource;
};

/** Pass-through maturity facts from analysis-context helpers. */
export type ProvenanceMaturity = {
  readonly status?: MaturityStatus;
  readonly completedOffsetsOnly?: boolean;
};

/**
 * Methodology reference into canonical metric registries.
 * Short copy comes from metric-definitions; docAnchor from contract index.
 */
export type ProvenanceMethodology = {
  readonly metricId: ContractedMetricId;
  readonly docAnchor: string;
  readonly meaning: string;
  readonly retentionOsBasis: string;
  readonly caveat?: string;
};

export type MetricProvenance = {
  readonly metricId: ContractedMetricId;
  readonly methodology: ProvenanceMethodology;
  readonly source: ProvenanceSourceIdentity;
  readonly reportingScope: ProvenanceReportingScope;
  readonly population?: ProvenancePopulation;
  readonly assumptions?: ProvenanceAssumptions;
  readonly maturity?: ProvenanceMaturity;
  /** Metric/definition methodology caveats only — not Insight.caveats. */
  readonly caveats: readonly string[];
};

/**
 * Composition around an existing Insight. Does not duplicate observations,
 * sufficiency, Signal caveats, evidence, destination, or severity.
 */
export type SignalProvenance = {
  readonly signalId: string;
  readonly metrics: readonly MetricProvenance[];
  readonly source: ProvenanceSourceIdentity;
  readonly reportingScope: ProvenanceReportingScope;
};

export type MetricProvenanceInput = {
  readonly metricId: string;
  readonly source: ProvenanceSourceIdentity;
  readonly reportingScope: ProvenanceReportingScope;
  readonly population?: ProvenancePopulation;
  readonly assumptions?: ProvenanceAssumptions;
  readonly maturity?: ProvenanceMaturity;
  /** Optional extra methodology caveats (not Signal caveats). */
  readonly caveats?: readonly string[];
};

/**
 * Input composes around an Insight-shaped identity without copying observations,
 * sufficiency, caveats, evidence, destination, or severity.
 */
export type SignalProvenanceInput = {
  readonly signal: {
    readonly id: string;
    readonly metricRefs: readonly string[];
  };
  readonly source: ProvenanceSourceIdentity;
  readonly reportingScope: ProvenanceReportingScope;
  readonly population?: ProvenancePopulation;
  readonly assumptions?: ProvenanceAssumptions;
  readonly maturity?: ProvenanceMaturity;
};
