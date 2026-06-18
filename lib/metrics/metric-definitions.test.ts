import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_METRIC_IDS,
  REVENUE_METRIC_IDS,
  METRIC_DEFINITIONS,
  collectMetricDefinitionCopy,
  formatMetricDefinitionTooltip,
  getMetricDefinition,
} from "./metric-definitions";

/** Unicode punctuation/symbols disallowed in founder-facing tooltip copy. */
const FORBIDDEN_COPY_CHARS = /[\u2014\u2013\u201c\u201d\u2018\u2019\u2192\u2265\u2212\u00d7\u00f7]/;

describe("metric-definitions", () => {
  it("defines every MetricId in METRIC_DEFINITIONS", () => {
    assert.equal(Object.keys(METRIC_DEFINITIONS).length, ALL_METRIC_IDS.length);
    for (const id of ALL_METRIC_IDS) {
      assert.ok(METRIC_DEFINITIONS[id], `missing definition for ${id}`);
      assert.equal(METRIC_DEFINITIONS[id]!.id, id);
    }
  });

  it("requires name, meaning, and retentionOsBasis on every definition", () => {
    for (const id of ALL_METRIC_IDS) {
      const def = getMetricDefinition(id);
      assert.ok(def.name.trim().length > 0, `${id} name`);
      assert.ok(def.meaning.trim().length > 0, `${id} meaning`);
      assert.ok(def.retentionOsBasis.trim().length > 0, `${id} retentionOsBasis`);
    }
  });

  it("requires Shopify alignment on revenue-related IDs", () => {
    for (const id of REVENUE_METRIC_IDS) {
      const def = getMetricDefinition(id);
      assert.ok(def.shopifyDefinition?.trim().length, `${id} shopifyDefinition`);
      assert.ok(def.shopifySourceUrls?.length, `${id} shopifySourceUrls`);
      for (const url of def.shopifySourceUrls ?? []) {
        assert.match(url, /^https:\/\/help\.shopify\.com\//, `${id} source url`);
      }
    }
  });

  it("uses ASCII-friendly punctuation in definition copy", () => {
    for (const id of ALL_METRIC_IDS) {
      for (const text of collectMetricDefinitionCopy(getMetricDefinition(id))) {
        assert.doesNotMatch(text, FORBIDDEN_COPY_CHARS, `${id}: "${text}"`);
      }
    }
  });

  it("definition copy and tooltip bodies do not end with a full stop", () => {
    for (const id of ALL_METRIC_IDS) {
      const def = getMetricDefinition(id);
      for (const text of collectMetricDefinitionCopy(def)) {
        assert.ok(!text.trim().endsWith("."), `${id} copy trailing period: "${text}"`);
      }
      for (const section of formatMetricDefinitionTooltip(def)) {
        assert.ok(!section.body.trim().endsWith("."), `${id} tooltip ${section.label} trailing period`);
      }
      for (const quality of ["actual", "estimated", "partial", "unavailable"] as const) {
        for (const section of formatMetricDefinitionTooltip(def, quality)) {
          if (section.label === "Data quality") {
            assert.ok(!section.body.trim().endsWith("."), `${id} data quality trailing period`);
          }
        }
      }
    }
  });

  it("formatMetricDefinitionTooltip emits sections in expected order", () => {
    const def = getMetricDefinition("net_revenue");
    const sections = formatMetricDefinitionTooltip(def);
    assert.equal(sections[0]?.label, "Meaning");
    assert.equal(sections[1]?.label, "Shopify");
    assert.equal(sections[2]?.label, "RetentionOS");
    assert.ok(sections.some((s) => s.label === "Caveat"));
  });

  it("formatMetricDefinitionTooltip applies data quality override", () => {
    const def = getMetricDefinition("blended_cac");
    const sections = formatMetricDefinitionTooltip(def, "estimated");
    const dq = sections.find((s) => s.label === "Data quality");
    assert.ok(dq);
    assert.match(dq!.body, /assumption/i);
  });

  it("revenue_durability_posture explains posture not numeric score", () => {
    const def = getMetricDefinition("revenue_durability_posture");
    const combined = [def.meaning, def.retentionOsBasis, def.caveat ?? ""].join(" ");
    assert.match(combined, /Healthy|Mixed|Watch/i);
    assert.match(def.caveat ?? "", /not a numeric/i);
  });

  it("getMetricDefinition throws for unknown id", () => {
    assert.throws(() => getMetricDefinition("unknown" as never), /Unknown metric id/);
  });
});
