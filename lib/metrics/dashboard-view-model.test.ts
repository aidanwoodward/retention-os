import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDemoRetentionOSDataset } from "../data-source/demo-source";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import { buildDashboardExecutiveViewModelFromDataset } from "./dashboard-view-model";

function datasetWithoutSpend(base: RetentionOSDataset): RetentionOSDataset {
  return { ...base, marketingSpend: [] };
}

function datasetWithoutLineItems(base: RetentionOSDataset): RetentionOSDataset {
  return {
    ...base,
    orders: base.orders.map((o) => ({ ...o, lineItems: [] })),
  };
}

describe("buildDashboardExecutiveViewModelFromDataset", () => {
  it("includes unlocked acquisition and product quality on demo fixture", () => {
    const vm = buildDashboardExecutiveViewModelFromDataset(buildDemoRetentionOSDataset());

    assert.equal(vm.acquisition.lockedMissingSpend, false);
    assert.ok(vm.acquisition.blendedCac != null && vm.acquisition.blendedCac > 0);
    assert.ok(vm.acquisition.revenueLtvToCac != null && vm.acquisition.revenueLtvToCac > 0);
    assert.equal(vm.productQuality.state, "ready");
    assert.ok(vm.productQuality.strongest != null);
    assert.ok(vm.productQuality.weakest != null);

    const spendRow = vm.dataCompleteness.rows.find((r) => r.id === "marketing_spend");
    assert.equal(spendRow?.status, "unlocked");

    const marginRow = vm.dataCompleteness.rows.find((r) => r.id === "margin_contribution");
    assert.equal(marginRow?.status, "unlocked");
    assert.match(marginRow?.detail ?? "", /Imported order-level contribution_margin/);
  });

  it("marks margin partial when only assumptions apply", () => {
    const base = buildDemoRetentionOSDataset();
    const ordersWithoutImportedContrib = base.orders.map((o) => ({
      ...o,
      contributionMargin: undefined,
    }));
    const vm = buildDashboardExecutiveViewModelFromDataset({
      ...base,
      orders: ordersWithoutImportedContrib,
    });

    const marginRow = vm.dataCompleteness.rows.find((r) => r.id === "margin_contribution");
    assert.equal(marginRow?.status, "partial");
    assert.match(marginRow?.detail ?? "", /Assumption-based/);
  });

  it("locks acquisition when marketing spend is absent", () => {
    const base = buildDemoRetentionOSDataset();
    const vm = buildDashboardExecutiveViewModelFromDataset(datasetWithoutSpend(base));

    assert.equal(vm.acquisition.lockedMissingSpend, true);
    assert.equal(vm.acquisition.blendedCac, null);
    assert.equal(vm.acquisition.revenueLtvToCac, null);
    assert.equal(vm.acquisition.paybackStatus, "locked_no_spend");

    const spendRow = vm.dataCompleteness.rows.find((r) => r.id === "marketing_spend");
    assert.equal(spendRow?.status, "locked");
  });

  it("shows insufficient product quality when line items are missing", () => {
    const base = buildDemoRetentionOSDataset();
    const vm = buildDashboardExecutiveViewModelFromDataset(datasetWithoutLineItems(base));

    assert.equal(vm.productQuality.state, "locked_no_line_items");
    assert.equal(vm.productQuality.strongest, null);
    assert.equal(vm.productQuality.weakest, null);

    const pqRow = vm.dataCompleteness.rows.find((r) => r.id === "product_quality");
    assert.equal(pqRow?.status, "locked");
  });

  it("adds spine observation bullets without exceeding cap", () => {
    const vm = buildDashboardExecutiveViewModelFromDataset(buildDemoRetentionOSDataset());
    assert.ok(vm.observations.length <= 6);
    assert.ok(vm.observations.some((o) => o.includes("Acquisition economics") || o.includes("Entry-product")));
  });
});
