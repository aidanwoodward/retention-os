import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDemoRetentionOSDataset } from "../data-source/demo-source";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import { buildDashboardPresentationViewModelFromDataset } from "./dashboard-presentation-view-model";

function datasetWithoutSpend(base: RetentionOSDataset): RetentionOSDataset {
  return { ...base, marketingSpend: [] };
}

describe("buildDashboardPresentationViewModelFromDataset", () => {
  it("selects revenue-durability-snapshot via Matrix on demo fixture", () => {
    const vm = buildDashboardPresentationViewModelFromDataset(buildDemoRetentionOSDataset());
    assert.ok(vm.dashboardSignal);
    assert.equal(vm.dashboardSignal!.id, "revenue-durability-snapshot");
    assert.ok(vm.signalProvenance);
    assert.equal(vm.signalProvenance!.signalId, "revenue-durability-snapshot");
  });

  it("aligns posture observation with metric durability status", () => {
    const vm = buildDashboardPresentationViewModelFromDataset(buildDemoRetentionOSDataset());
    const postureObs = vm.dashboardSignal!.observations.find((o) => o.unit === "posture");
    assert.ok(postureObs);
    assert.equal(postureObs!.value, vm.metric.durability.status);
    assert.equal(postureObs!.value, vm.metric.hero.posture);
  });

  it("includes at least two evidence metrics when population exists", () => {
    const vm = buildDashboardPresentationViewModelFromDataset(buildDemoRetentionOSDataset());
    assert.ok(vm.evidenceMetrics.length >= 2);
    assert.ok(vm.evidenceMetrics.length <= 4);
    assert.ok(vm.evidenceMetrics.every((m) => m.value !== "Locked"));
  });

  it("omits acquisition CAC evidence when spend is locked", () => {
    const base = buildDemoRetentionOSDataset();
    const vm = buildDashboardPresentationViewModelFromDataset(datasetWithoutSpend(base));
    assert.equal(vm.metric.acquisition.lockedMissingSpend, true);
    const ids = vm.evidenceMetrics.map((m) => m.id);
    assert.ok(!ids.includes("ltv_cac"));
    assert.ok(!ids.includes("payback"));
  });

  it("returns null dashboard Signal when customer population is zero", () => {
    const dataset: RetentionOSDataset = {
      customers: [],
      orders: [],
      products: [],
      meta: {
        sourceType: "demo",
        sourceLabel: "empty",
        isDemo: true,
        isUploaded: false,
        customerCount: 0,
        orderCount: 0,
        productCount: 0,
        lineItemCount: 0,
      },
    };
    const vm = buildDashboardPresentationViewModelFromDataset(dataset);
    assert.equal(vm.dashboardSignal, null);
    assert.equal(vm.signalProvenance, null);
    assert.equal(vm.hasPopulation, false);
    assert.deepEqual(vm.evidenceMetrics, []);
  });

  it("exposes reporting scope and freshness labels", () => {
    const vm = buildDashboardPresentationViewModelFromDataset(buildDemoRetentionOSDataset());
    assert.equal(vm.reportingMeta.reportingScopeLabel, "All order history");
    assert.match(vm.reportingMeta.freshnessLabel, /Data through/);
  });
});
