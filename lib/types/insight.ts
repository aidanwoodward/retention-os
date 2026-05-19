export type InsightSeverity = "info" | "warning" | "critical";

/**
 * Deterministic diagnostic card linking evidence to recommended commercial action.
 *
 * `metricRefs` should point to stable metric IDs (e.g. `repeat.second_order_rate`) for UI deep links and tests.
 */
export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  evidence: string;
  recommendedAction?: string;
  metricRefs: string[];
  /** 0–1 qualitative confidence for rules-based systems before model-assisted polish. */
  confidence?: number;
}
