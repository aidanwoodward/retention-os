import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import { buildRetentionPageViewModelFromDataset } from "./retention-view-model";

describe("buildRetentionPageViewModelFromDataset", () => {
  it("uses completed-only Month+N summary averages", () => {
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
        sourceLabel: "retention-vm-partial-m1",
        isDemo: true,
        isUploaded: false,
        customerCount: 4,
        orderCount: 7,
        productCount: 0,
        lineItemCount: 0,
        lastOrderAt: "2025-02-10T12:00:00.000Z",
      },
    };

    const vm = buildRetentionPageViewModelFromDataset(dataset);
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, 1);
    assert.equal(vm.summary.averageMonthPlus2ActiveRate, null);
    assert.equal(vm.summary.averageMonthPlus3ActiveRate, null);
    // Raw cohort rows still emit provisional Jan M+1 for matrix (not maturity-styled here).
    const jan = vm.cohortRows.find((r) => r.cohortPeriod === "2025-01");
    assert.equal(jan?.monthPlus1ActiveRate, 0.5);
  });

  it("returns null averages when no orders", () => {
    const vm = buildRetentionPageViewModelFromDataset({
      customers: [{ id: "c1", firstOrderAt: "2025-01-01T00:00:00.000Z" }],
      orders: [],
      products: [],
      meta: {
        sourceType: "demo",
        sourceLabel: "empty",
        isDemo: true,
        isUploaded: false,
        customerCount: 1,
        orderCount: 0,
        productCount: 0,
        lineItemCount: 0,
      },
    });
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, null);
  });
});
