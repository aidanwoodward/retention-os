import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ALL_METRIC_IDS, METRIC_DEFINITIONS } from "./metric-definitions";
import {
  CONTRACTED_METRIC_IDS,
  METRIC_CONTRACT_INDEX,
  getMetricContractIndexEntry,
  isContractedMetricId,
  type ContractedMetricId,
} from "./metric-contract-index";

describe("metric-contract-index", () => {
  it("covers exactly 21 contracted MetricIds", () => {
    assert.equal(CONTRACTED_METRIC_IDS.length, 21);
    assert.equal(Object.keys(METRIC_CONTRACT_INDEX).length, 21);
  });

  it("indexes every contracted id with required linkage fields", () => {
    for (const id of CONTRACTED_METRIC_IDS) {
      const entry = getMetricContractIndexEntry(id);
      assert.equal(entry.id, id);
      assert.ok(entry.docAnchor.includes("METRIC_CONTRACTS.md#"), `${id} docAnchor`);
      assert.ok(entry.docAnchor.endsWith(id) || entry.docAnchor.includes(`#${id}`), `${id} anchor slug`);
      assert.ok(entry.engineEntrypoints.length > 0, `${id} engineEntrypoints`);
      // Empty viewModelBuilders / uiRoutes are valid when the metric is engine-only (current wiring).
      assert.ok(Array.isArray(entry.viewModelBuilders), `${id} viewModelBuilders`);
      assert.ok(Array.isArray(entry.uiRoutes), `${id} uiRoutes`);
      assert.ok(entry.existingTests.length > 0, `${id} existingTests`);
      for (const route of entry.uiRoutes) {
        assert.ok(route.startsWith("/"), `${id} route ${route}`);
      }
    }
  });

  it("keeps cohort_revenue_contribution unwired to VMs and routes until 6B", () => {
    const entry = getMetricContractIndexEntry("cohort_revenue_contribution");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
  });

  it("keeps cohort_revenue_retention unwired to VMs and routes until 6B", () => {
    const entry = getMetricContractIndexEntry("cohort_revenue_retention");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
  });

  it("keeps new_returning_mix unwired to VMs and routes until 6B", () => {
    const entry = getMetricContractIndexEntry("new_returning_mix");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
  });

  it("excludes aov from the contracted set while keeping it in ALL_METRIC_IDS", () => {
    assert.ok(ALL_METRIC_IDS.includes("aov"));
    assert.equal(isContractedMetricId("aov"), false);
    assert.ok(!(CONTRACTED_METRIC_IDS as readonly string[]).includes("aov"));
  });

  it("does not claim coverage of ALL_METRIC_IDS", () => {
    const contracted = new Set<string>(CONTRACTED_METRIC_IDS);
    const all = new Set<string>(ALL_METRIC_IDS);
    assert.ok(contracted.size < all.size);
    for (const id of CONTRACTED_METRIC_IDS) {
      assert.ok(all.has(id), `${id} should remain a MetricId`);
      assert.ok(METRIC_DEFINITIONS[id], `${id} needs a tooltip definition`);
    }
  });

  it("keeps index keys identical to CONTRACTED_METRIC_IDS", () => {
    const keys = Object.keys(METRIC_CONTRACT_INDEX).sort() as ContractedMetricId[];
    const expected = [...CONTRACTED_METRIC_IDS].sort();
    assert.deepEqual(keys, expected);
  });
});
