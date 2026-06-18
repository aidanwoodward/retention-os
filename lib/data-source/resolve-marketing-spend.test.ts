import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RetentionOSDataset } from "./dataset-types";
import { getDatasetSummary } from "./dataset-helpers";
import { resolveMarketingSpendForUploadedDataset } from "./marketing-spend-session";

function uploadedDataset(orders: RetentionOSDataset["orders"]): RetentionOSDataset {
  return {
    customers: [{ id: "c1", firstOrderAt: "2024-01-01T00:00:00.000Z" }],
    orders,
    products: [],
    meta: {
      sourceType: "uploaded_csv",
      sourceLabel: "Test upload",
      isDemo: false,
      isUploaded: true,
      customerCount: 1,
      orderCount: orders.length,
      productCount: 0,
      lineItemCount: 0,
    },
  };
}

describe("resolveMarketingSpendForUploadedDataset", () => {
  const orders = [
    {
      id: "o1",
      customerId: "c1",
      orderedAt: "2024-01-15T12:00:00.000Z",
      grossRevenue: 10000,
      discounts: 0,
      refunds: 0,
      lineItems: [],
    },
  ];

  it("uses CSV rows when present (overrides assumption)", () => {
    const base = uploadedDataset(orders);
    const resolved = resolveMarketingSpendForUploadedDataset(
      base,
      [{ month: "2024-01", channel: "meta", spend: 999 }],
      { marketingSpendPctOfNetRevenue: 0.5 },
    );
    assert.equal(resolved.marketingSpend?.[0]?.spend, 999);
    assert.equal(resolved.marketingSpendAssumptions, undefined);
    assert.equal(getDatasetSummary(resolved).marketingSpendSource, "actual_csv");
  });

  it("synthesizes from assumption when no CSV", () => {
    const base = uploadedDataset(orders);
    const resolved = resolveMarketingSpendForUploadedDataset(base, null, { marketingSpendPctOfNetRevenue: 0.2 });
    assert.equal(resolved.marketingSpend?.[0]?.spend, 2000);
    assert.deepEqual(resolved.marketingSpendAssumptions, { marketingSpendPctOfNetRevenue: 0.2 });
    assert.equal(getDatasetSummary(resolved).marketingSpendSource, "assumption");
  });

  it("does not apply assumption to demo datasets", () => {
    const demo: RetentionOSDataset = {
      ...uploadedDataset(orders),
      meta: { ...uploadedDataset(orders).meta, isDemo: true, isUploaded: false, sourceType: "demo" },
    };
    const resolved = resolveMarketingSpendForUploadedDataset(demo, null, { marketingSpendPctOfNetRevenue: 0.2 });
    assert.equal(resolved.marketingSpend, undefined);
  });
});
