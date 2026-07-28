import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildImportedCsvMetricPreview } from "./metric-preview";
import { buildGoldenRetentionOSDataset } from "../metrics/golden/golden-dataset";
import type { Customer } from "../types";
import type { Order } from "../types/order";

function order(
  id: string,
  customerId: string,
  orderedAt: string,
  grossRevenue = 100,
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue,
    discounts: 0,
    refunds: 0,
    lineItems: [],
  };
}

describe("buildImportedCsvMetricPreview completed Month+N averages", () => {
  it("keeps golden Month+1/2/3 averages stable under completed-only", () => {
    const ds = buildGoldenRetentionOSDataset();
    const preview = buildImportedCsvMetricPreview(ds.customers, ds.orders, ds.products);
    assert.equal(preview.averageMonth1ActiveRate, 1 / 3);
    assert.equal(preview.averageMonth2ActiveRate, 0);
    assert.equal(preview.averageMonth3ActiveRate, 0);
  });

  it("excludes partial Month+1 from preview average", () => {
    const customers: Customer[] = [
      { id: "d1", firstOrderAt: "2024-12-05T12:00:00.000Z" },
      { id: "d2", firstOrderAt: "2024-12-10T12:00:00.000Z" },
      { id: "j1", firstOrderAt: "2025-01-05T12:00:00.000Z" },
      { id: "j2", firstOrderAt: "2025-01-08T12:00:00.000Z" },
    ];
    const orders: Order[] = [
      order("o1", "d1", "2024-12-05T12:00:00.000Z"),
      order("o2", "d2", "2024-12-10T12:00:00.000Z"),
      order("o3", "d1", "2025-01-10T12:00:00.000Z"),
      order("o3b", "d2", "2025-01-12T12:00:00.000Z"),
      order("o4", "j1", "2025-01-05T12:00:00.000Z"),
      order("o5", "j2", "2025-01-08T12:00:00.000Z"),
      order("o6", "j1", "2025-02-10T12:00:00.000Z"),
    ];
    const preview = buildImportedCsvMetricPreview(customers, orders, []);
    assert.equal(preview.averageMonth1ActiveRate, 1);
  });

  it("returns null Month+N averages when orders are empty", () => {
    const preview = buildImportedCsvMetricPreview(
      [{ id: "c1", firstOrderAt: "2025-01-01T00:00:00.000Z" }],
      [],
      [],
    );
    assert.equal(preview.averageMonth1ActiveRate, null);
    assert.equal(preview.averageMonth2ActiveRate, null);
    assert.equal(preview.averageMonth3ActiveRate, null);
  });
});
