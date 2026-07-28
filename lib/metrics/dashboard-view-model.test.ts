import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDemoRetentionOSDataset } from "../data-source/demo-source";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import { MVP_NAV } from "../mvp/cohesion";
import { buildDashboardExecutiveViewModelFromDataset } from "./dashboard-view-model";

const MVP_ROUTE_HREFS = new Set(MVP_NAV.map((n) => n.href));

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

  it("unlocks acquisition with partial completeness when spend is assumption-based", () => {
    const base = buildDemoRetentionOSDataset();
    const ordersWithoutImportedContrib = base.orders.map((o) => ({
      ...o,
      contributionMargin: undefined,
    }));
    const uploadedLike = {
      ...base,
      marketingSpend: undefined,
      marketingSpendAssumptions: { marketingSpendPctOfNetRevenue: 0.2 as const },
      orders: ordersWithoutImportedContrib,
      meta: {
        ...base.meta,
        sourceType: "uploaded_csv" as const,
        isUploaded: true,
        isDemo: false,
        sourceLabel: "Uploaded test",
      },
    };
    const withSpend = {
      ...uploadedLike,
      marketingSpend: [{ month: "2024-01", spend: 2000 }],
    };
    const vm = buildDashboardExecutiveViewModelFromDataset(withSpend);

    assert.equal(vm.acquisition.lockedMissingSpend, false);
    assert.equal(vm.acquisition.spendIsEstimated, true);
    const spendRow = vm.dataCompleteness.rows.find((r) => r.id === "marketing_spend");
    assert.equal(spendRow?.status, "partial");
    assert.match(spendRow?.detail ?? "", /Estimated/);
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

  it("builds command-centre hero structure on demo fixture", () => {
    const vm = buildDashboardExecutiveViewModelFromDataset(buildDemoRetentionOSDataset());

    assert.equal(vm.hero.posture, vm.durability.status);
    assert.equal(vm.hero.signals.length, 4);
    assert.ok(vm.hero.whyBullets.length >= 2 && vm.hero.whyBullets.length <= 3);
    assert.ok(MVP_ROUTE_HREFS.has(vm.hero.investigate.href));
    assert.ok(vm.hero.biggestLeak.label.length > 0);
    assert.ok(vm.hero.biggestLeak.detail.length > 0);
    assert.ok(vm.hero.strongestProof.label.length > 0);
    assert.ok(vm.hero.strongestProof.detail.length > 0);
    assert.equal(
      vm.hero.signals.map((s) => s.id).join(","),
      "repeat,acquisition,payback,product",
    );
  });

  it("locks hero acquisition tile and routes to data when spend is missing", () => {
    const base = buildDemoRetentionOSDataset();
    const vm = buildDashboardExecutiveViewModelFromDataset(datasetWithoutSpend(base));

    const acquisitionTile = vm.hero.signals.find((s) => s.id === "acquisition");
    assert.equal(acquisitionTile?.tone, "locked");
    assert.equal(acquisitionTile?.value, "Locked");
    assert.equal(vm.hero.investigate.href, "/data");
    assert.match(vm.hero.biggestLeak.detail, /marketing spend|locked/i);
  });

  it("reflects missing line items in hero product tile and leak copy", () => {
    const base = buildDemoRetentionOSDataset();
    const vm = buildDashboardExecutiveViewModelFromDataset(datasetWithoutLineItems(base));

    const productTile = vm.hero.signals.find((s) => s.id === "product");
    assert.ok(productTile?.tone === "locked" || productTile?.value === "Insufficient data");
    assert.match(
      `${vm.hero.biggestLeak.detail} ${productTile?.sub ?? ""}`,
      /line item|product_id|locked|first-product/i,
    );
  });

  it("excludes partial Month+1 from the executive average (completed-only)", () => {
    // Dec cohort M+1 (Jan) complete at mid-Feb → rate 1.
    // Jan cohort M+1 (Feb) still partial at mid-Feb → provisional 0.5 if included.
    const dataset: RetentionOSDataset = {
      customers: [
        { id: "d1", firstOrderAt: "2024-12-05T12:00:00.000Z" },
        { id: "d2", firstOrderAt: "2024-12-10T12:00:00.000Z" },
        { id: "j1", firstOrderAt: "2025-01-05T12:00:00.000Z" },
        { id: "j2", firstOrderAt: "2025-01-08T12:00:00.000Z" },
      ],
      orders: [
        {
          id: "o1",
          customerId: "d1",
          orderedAt: "2024-12-05T12:00:00.000Z",
          grossRevenue: 100,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o2",
          customerId: "d2",
          orderedAt: "2024-12-10T12:00:00.000Z",
          grossRevenue: 100,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o3",
          customerId: "d1",
          orderedAt: "2025-01-10T12:00:00.000Z",
          grossRevenue: 50,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o3b",
          customerId: "d2",
          orderedAt: "2025-01-12T12:00:00.000Z",
          grossRevenue: 50,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o4",
          customerId: "j1",
          orderedAt: "2025-01-05T12:00:00.000Z",
          grossRevenue: 80,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o5",
          customerId: "j2",
          orderedAt: "2025-01-08T12:00:00.000Z",
          grossRevenue: 80,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o6",
          customerId: "j1",
          orderedAt: "2025-02-10T12:00:00.000Z",
          grossRevenue: 40,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
      ],
      products: [],
      meta: {
        sourceType: "demo",
        sourceLabel: "partial-m1-fixture",
        isDemo: true,
        isUploaded: false,
        customerCount: 4,
        orderCount: 7,
        productCount: 0,
        lineItemCount: 0,
        firstOrderAt: "2024-12-05T12:00:00.000Z",
        lastOrderAt: "2025-02-10T12:00:00.000Z",
      },
    };

    const vm = buildDashboardExecutiveViewModelFromDataset(dataset);
    // Completed-only uses Dec only → 1. Point-presence would be (1 + 0.5) / 2 = 0.75.
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, 1);
  });

  it("returns null Month+N averages when no orders (no inferred asOf)", () => {
    const dataset: RetentionOSDataset = {
      customers: [{ id: "c1", firstOrderAt: "2025-01-01T00:00:00.000Z" }],
      orders: [],
      products: [],
      meta: {
        sourceType: "demo",
        sourceLabel: "empty-orders",
        isDemo: true,
        isUploaded: false,
        customerCount: 1,
        orderCount: 0,
        productCount: 0,
        lineItemCount: 0,
      },
    };
    const vm = buildDashboardExecutiveViewModelFromDataset(dataset);
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, null);
    assert.equal(vm.summary.averageMonthPlus2ActiveRate, null);
    assert.equal(vm.summary.averageMonthPlus3ActiveRate, null);
  });

  it("partial low Month+1 cannot worsen posture versus completed-only mean", () => {
    // Mature Dec cohort: strong M+1 = 1.0. Immature Jan: M+1 provisional 0.
    // Point-presence mean would be 0.5 (mid). Completed-only mean is 1.0 (healthy vote).
    const dataset: RetentionOSDataset = {
      customers: [
        { id: "d1", firstOrderAt: "2024-12-01T12:00:00.000Z" },
        { id: "j1", firstOrderAt: "2025-01-01T12:00:00.000Z" },
      ],
      orders: [
        {
          id: "o1",
          customerId: "d1",
          orderedAt: "2024-12-01T12:00:00.000Z",
          grossRevenue: 100,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o2",
          customerId: "d1",
          orderedAt: "2025-01-15T12:00:00.000Z",
          grossRevenue: 100,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o3",
          customerId: "j1",
          orderedAt: "2025-01-01T12:00:00.000Z",
          grossRevenue: 100,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
        {
          id: "o4",
          customerId: "j1",
          orderedAt: "2025-02-10T12:00:00.000Z",
          grossRevenue: 10,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
      ],
      products: [],
      marketingSpend: [
        { month: "2024-12", spend: 10 },
        { month: "2025-01", spend: 10 },
      ],
      meta: {
        sourceType: "demo",
        sourceLabel: "posture-partial-low",
        isDemo: true,
        isUploaded: false,
        customerCount: 2,
        orderCount: 4,
        productCount: 0,
        lineItemCount: 0,
        lastOrderAt: "2025-02-10T12:00:00.000Z",
      },
    };

    const vm = buildDashboardExecutiveViewModelFromDataset(dataset);
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, 1);
    // With M+1 = 1 (healthy vote) and small portfolio, posture must not be Watch solely from partial 0.
    assert.notEqual(vm.durability.status, "Watch");
  });
});
