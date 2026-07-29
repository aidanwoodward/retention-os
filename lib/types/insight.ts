import type { ContractedMetricId } from "../metrics/metric-contract-index";

export type InsightSeverity = "info" | "warning" | "critical";

export type InsightSufficiency = "sufficient" | "limited";

export type InsightObservationUnit = "ratio" | "usd" | "days" | "count" | "posture";

export interface InsightObservation {
  readonly value: number | string | null;
  readonly comparisonValue?: number | string | null;
  readonly unit: InsightObservationUnit;
  readonly eligibleCount?: number;
  readonly affectedCount?: number;
}

export interface InsightDestination {
  readonly route: string;
}

/**
 * Deterministic diagnostic card (RetentionOS Signal) linking structured evidence
 * to an optional recommended commercial investigation.
 *
 * `metricRefs` must be contracted MetricIds (parent metrics). Comparison detail
 * belongs in `observations`, not invented submetric ids.
 */
export interface Insight {
  readonly id: string;
  readonly severity: InsightSeverity;
  readonly title: string;
  readonly evidence: string;
  readonly recommendedAction?: string;
  readonly metricRefs: readonly ContractedMetricId[];
  readonly observations: readonly InsightObservation[];
  readonly sufficiency: InsightSufficiency;
  readonly caveats: readonly string[];
  readonly destination: InsightDestination;

  /**
   * @deprecated
   * No longer emitted by the canonical insight engine.
   * Retained temporarily for existing UI compatibility until a later UI sprint.
   */
  readonly confidence?: number;
}
