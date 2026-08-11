import { MVP_NAV } from "../mvp/cohesion";
import type { Insight, InsightSeverity } from "../types/insight";
import type { RevenueDurabilityStatus } from "./context";
import type { InsightsPageViewModel } from "./insights-view-model";

/** Display labels aligned with Golden Reference inbox presentation. */
export const INSIGHT_SEVERITY_LABEL: Record<InsightSeverity, string> = {
  critical: "Critical",
  warning: "Needs attention",
  info: "Informational",
};

/** Fixed display order for severity count pills (not list order). */
export const INSIGHT_SEVERITY_ORDER: readonly InsightSeverity[] = ["critical", "warning", "info"];

const ROUTE_LABEL_BY_HREF = new Map<string, string>(MVP_NAV.map((item) => [item.href, item.label]));

/** Presentation-only CTA label from destination route. */
export function resolveInsightDestinationLabel(route: string): string {
  const known = ROUTE_LABEL_BY_HREF.get(route);
  if (known) return known;
  const segment = route.replace(/^\//, "").split("/")[0];
  if (!segment) return route;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function countInsightsBySeverity(insights: readonly Insight[]): Record<InsightSeverity, number> {
  const counts: Record<InsightSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const insight of insights) {
    counts[insight.severity] += 1;
  }
  return counts;
}

export interface InsightsInboxPresentation {
  readonly durabilityStatus: RevenueDurabilityStatus;
  readonly durabilityNotes: readonly string[];
  readonly methodologyNotes: readonly string[];
  readonly severityCounts: Record<InsightSeverity, number>;
  /** Canonical insights — same references as the source view model. */
  readonly items: readonly Insight[];
}

/** Thin display mapper. Does not mutate insights or derive commercial conclusions. */
export function mapInsightsInboxPresentation(vm: InsightsPageViewModel): InsightsInboxPresentation {
  return {
    durabilityStatus: vm.durabilityStatus,
    durabilityNotes: vm.durabilityTransparencyNotes,
    methodologyNotes: vm.insightsEngineMethodologyNotes,
    severityCounts: countInsightsBySeverity(vm.insights),
    items: vm.insights,
  };
}
