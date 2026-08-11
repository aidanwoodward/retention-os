import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInsightsPageViewModel } from "./insights-view-model";
import type { Insight } from "../types/insight";
import type { InsightsPageViewModel } from "./insights-view-model";
import {
  INSIGHT_SEVERITY_LABEL,
  countInsightsBySeverity,
  mapInsightsInboxPresentation,
  resolveInsightDestinationLabel,
} from "./insights-presentation";

function sampleInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "sample-signal",
    severity: "info",
    title: "Sample",
    evidence: "Evidence text",
    metricRefs: ["repeat_purchase_rate"],
    observations: [{ value: 0.4, unit: "ratio", eligibleCount: 100 }],
    sufficiency: "sufficient",
    caveats: [],
    destination: { route: "/retention" },
    ...overrides,
  };
}

function emptyVm(insights: readonly Insight[] = []): InsightsPageViewModel {
  return {
    durabilityStatus: "Mixed",
    durabilityTransparencyNotes: ["note-a"],
    insightsEngineMethodologyNotes: ["method-a"],
    insights,
  };
}

describe("countInsightsBySeverity", () => {
  it("aggregates counts that sum to item length", () => {
    const insights = [
      sampleInsight({ id: "a", severity: "critical" }),
      sampleInsight({ id: "b", severity: "warning" }),
      sampleInsight({ id: "c", severity: "info" }),
      sampleInsight({ id: "d", severity: "info" }),
    ];
    const counts = countInsightsBySeverity(insights);
    assert.equal(counts.critical, 1);
    assert.equal(counts.warning, 1);
    assert.equal(counts.info, 2);
    assert.equal(counts.critical + counts.warning + counts.info, insights.length);
  });

  it("returns zero counts for an empty list", () => {
    const counts = countInsightsBySeverity([]);
    assert.deepEqual(counts, { critical: 0, warning: 0, info: 0 });
  });
});

describe("mapInsightsInboxPresentation", () => {
  it("passes canonical Insight objects through unchanged", () => {
    const vm = buildInsightsPageViewModel();
    const presentation = mapInsightsInboxPresentation(vm);
    assert.equal(presentation.items, vm.insights);
    assert.equal(presentation.durabilityStatus, vm.durabilityStatus);
    assert.deepEqual(presentation.durabilityNotes, vm.durabilityTransparencyNotes);
    assert.deepEqual(presentation.methodologyNotes, vm.insightsEngineMethodologyNotes);
  });

  it("maps limited sufficiency and missing recommendedAction without mutation", () => {
    const limited = sampleInsight({
      id: "limited-signal",
      sufficiency: "limited",
      recommendedAction: undefined,
      caveats: ["Partial window"],
    });
    const vm = emptyVm([limited]);
    const presentation = mapInsightsInboxPresentation(vm);
    assert.equal(presentation.items[0], limited);
    assert.equal(presentation.items[0]?.sufficiency, "limited");
    assert.equal(presentation.items[0]?.recommendedAction, undefined);
    assert.deepEqual(presentation.items[0]?.caveats, ["Partial window"]);
  });
});

describe("presentation labels", () => {
  it("maps severity enums to Golden-aligned display labels", () => {
    assert.equal(INSIGHT_SEVERITY_LABEL.critical, "Critical");
    assert.equal(INSIGHT_SEVERITY_LABEL.warning, "Needs attention");
    assert.equal(INSIGHT_SEVERITY_LABEL.info, "Informational");
  });

  it("resolves known destination routes from MVP navigation labels", () => {
    assert.equal(resolveInsightDestinationLabel("/retention"), "Retention");
    assert.equal(resolveInsightDestinationLabel("/ltv"), "LTV");
    assert.equal(resolveInsightDestinationLabel("/dashboard"), "Dashboard");
  });

  it("falls back safely for unknown destination routes", () => {
    assert.equal(resolveInsightDestinationLabel("/unknown-route"), "Unknown-route");
  });
});
