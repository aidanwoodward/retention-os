import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMonthlyCohortMaturityStatus } from "../analysis-context";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { buildRetentionPageViewModelFromDataset } from "./retention-view-model";

function identifiedOrder(
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

function dataset(
  customers: Customer[],
  orders: Order[],
  sourceLabel: string,
): RetentionOSDataset {
  return {
    customers,
    orders,
    products: [],
    meta: {
      sourceType: "demo",
      sourceLabel,
      isDemo: true,
      isUploaded: false,
      customerCount: customers.length,
      orderCount: orders.length,
      productCount: 0,
      lineItemCount: 0,
      lastOrderAt: orders.length > 0 ? orders.reduce((latest, o) => (o.orderedAt > latest ? o.orderedAt : latest), orders[0]!.orderedAt) : undefined,
    },
  };
}

/** Dec 2024 + Jan 2025 cohorts; asOf = latest order 2025-02-10. */
function mixedMaturityDataset(): RetentionOSDataset {
  return dataset(
    [
      { id: "d1", firstOrderAt: "2024-12-05T12:00:00.000Z" },
      { id: "d2", firstOrderAt: "2024-12-10T12:00:00.000Z" },
      { id: "j1", firstOrderAt: "2025-01-05T12:00:00.000Z" },
      { id: "j2", firstOrderAt: "2025-01-08T12:00:00.000Z" },
    ],
    [
      identifiedOrder("o1", "d1", "2024-12-05T12:00:00.000Z"),
      identifiedOrder("o2", "d2", "2024-12-10T12:00:00.000Z"),
      identifiedOrder("o3", "d1", "2025-01-10T12:00:00.000Z", 50),
      identifiedOrder("o3b", "d2", "2025-01-12T12:00:00.000Z", 50),
      identifiedOrder("o4", "j1", "2025-01-05T12:00:00.000Z", 80),
      identifiedOrder("o5", "j2", "2025-01-08T12:00:00.000Z", 80),
      identifiedOrder("o6", "j1", "2025-02-10T12:00:00.000Z", 40),
    ],
    "retention-vm-partial-m1",
  );
}

describe("buildRetentionPageViewModelFromDataset", () => {
  it("passes through canonical F2S, repeat, and timing without changing formulas", () => {
    const ds = mixedMaturityDataset();
    const vm = buildRetentionPageViewModelFromDataset(ds);
    const repeat = calculateRepeatPurchaseRate(ds.customers, ds.orders);
    const f2 = calculateFirstToSecondOrderConversion(ds.customers, ds.orders, 90);

    assert.equal(vm.summary.totalCustomers, repeat.totalCustomers);
    assert.equal(vm.summary.allTimeRepeatPurchaseRate, repeat.repeatPurchaseRate);
    assert.equal(vm.summary.firstToSecondWithin90DaysRate, f2.conversionRateWithinWindow);
    assert.equal(vm.summary.averageDaysToSecondOrder, f2.averageDaysToSecondOrder);
    assert.equal(vm.summary.medianDaysToSecondOrder, f2.medianDaysToSecondOrder);
    assert.equal(vm.summary.customersWithSecondOrder, f2.customersWithSecondOrder);
    assert.equal(vm.summary.customersWithSecondOrder, 3);
  });

  it("uses completed-only Month+N summary averages", () => {
    const vm = buildRetentionPageViewModelFromDataset(mixedMaturityDataset());
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, 1);
    assert.equal(vm.summary.averageMonthPlus2ActiveRate, null);
    assert.equal(vm.summary.averageMonthPlus3ActiveRate, null);
    const jan = vm.cohortRows.find((r) => r.cohortPeriod === "2025-01");
    assert.equal(jan?.monthPlus1ActiveRate, 0.5);
  });

  it("marks complete, partial, and unavailable Month+N cells without changing rates", () => {
    const ds = mixedMaturityDataset();
    const vm = buildRetentionPageViewModelFromDataset(ds);
    const asOf = "2025-02-10T12:00:00.000Z";
    const jan = vm.cohortRows.find((r) => r.cohortPeriod === "2025-01");
    const dec = vm.cohortRows.find((r) => r.cohortPeriod === "2024-12");
    assert.ok(jan);
    assert.ok(dec);

    assert.equal(jan.monthPlus0Maturity, "complete");
    assert.equal(jan.monthPlus0Maturity, getMonthlyCohortMaturityStatus("2025-01", 0, asOf));
    assert.equal(jan.monthPlus1Maturity, "partial");
    assert.equal(jan.monthPlus1ActiveRate, 0.5);
    assert.equal(jan.monthPlus1Maturity, getMonthlyCohortMaturityStatus("2025-01", 1, asOf));
    assert.equal(jan.monthPlus6Maturity, "unavailable");
    assert.equal(jan.monthPlus6ActiveRate, null);

    assert.equal(dec.monthPlus0Maturity, "complete");
    assert.equal(dec.monthPlus1Maturity, "complete");
    assert.equal(dec.monthPlus1ActiveRate, 1);
    assert.equal(dec.monthPlus2Maturity, "partial");
  });

  it("returns null averages and null maturity when no orders (no asOf)", () => {
    const vm = buildRetentionPageViewModelFromDataset(
      dataset([{ id: "c1", firstOrderAt: "2025-01-01T00:00:00.000Z" }], [], "empty"),
    );
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, null);
    assert.equal(vm.summary.customersWithSecondOrder, 0);
    assert.equal(vm.summary.medianDaysToSecondOrder, null);
    assert.equal(vm.cohortRows[0]?.monthPlus0Maturity, null);
    assert.equal(vm.cohortRows[0]?.monthPlus1Maturity, null);
  });

  it("returns zero converters and null timing when no customer has a second order", () => {
    const ds = dataset(
      [
        { id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" },
        { id: "b", firstOrderAt: "2025-01-02T00:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z"),
        identifiedOrder("o2", "b", "2025-01-02T00:00:00.000Z"),
      ],
      "no-second",
    );
    const vm = buildRetentionPageViewModelFromDataset(ds);
    const f2 = calculateFirstToSecondOrderConversion(ds.customers, ds.orders, 90);
    assert.equal(vm.summary.customersWithSecondOrder, 0);
    assert.equal(vm.summary.customersWithSecondOrder, f2.customersWithSecondOrder);
    assert.equal(vm.summary.averageDaysToSecondOrder, null);
    assert.equal(vm.summary.medianDaysToSecondOrder, null);
    assert.equal(vm.summary.firstToSecondWithin90DaysRate, 0);
    assert.equal(vm.summary.allTimeRepeatPurchaseRate, 0);
  });

  it("counts every customer as a converter when all have a second order within 90 days", () => {
    const ds = dataset(
      [
        { id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" },
        { id: "b", firstOrderAt: "2025-01-02T00:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z"),
        identifiedOrder("o2", "a", "2025-01-20T00:00:00.000Z"),
        identifiedOrder("o3", "b", "2025-01-02T00:00:00.000Z"),
        identifiedOrder("o4", "b", "2025-01-15T00:00:00.000Z"),
      ],
      "all-repeat",
    );
    const vm = buildRetentionPageViewModelFromDataset(ds);
    const f2 = calculateFirstToSecondOrderConversion(ds.customers, ds.orders, 90);
    const repeat = calculateRepeatPurchaseRate(ds.customers, ds.orders);
    assert.equal(vm.summary.totalCustomers, 2);
    assert.equal(vm.summary.customersWithSecondOrder, 2);
    assert.equal(vm.summary.customersWithSecondOrder, f2.customersWithSecondOrder);
    assert.equal(vm.summary.firstToSecondWithin90DaysRate, 1);
    assert.equal(vm.summary.allTimeRepeatPurchaseRate, 1);
    assert.equal(vm.summary.allTimeRepeatPurchaseRate, repeat.repeatPurchaseRate);
    assert.equal(vm.summary.medianDaysToSecondOrder, f2.medianDaysToSecondOrder);
    assert.ok(vm.summary.medianDaysToSecondOrder != null);
  });

  it("keeps short-history Month +1 rates while marking them partial", () => {
    const ds = dataset(
      [{ id: "c1", firstOrderAt: "2025-02-01T00:00:00.000Z" }],
      [
        identifiedOrder("o1", "c1", "2025-02-01T00:00:00.000Z"),
        identifiedOrder("o2", "c1", "2025-03-10T00:00:00.000Z"),
      ],
      "short-history",
    );
    const vm = buildRetentionPageViewModelFromDataset(ds);
    const row = vm.cohortRows.find((r) => r.cohortPeriod === "2025-02");
    assert.ok(row);
    assert.equal(row.monthPlus1ActiveRate, 1);
    assert.equal(row.monthPlus1Maturity, "partial");
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, null);
  });

  it("counts second order after 90-day window as converter but not F2S within 90 days", () => {
    const ds = dataset(
      [{ id: "late", firstOrderAt: "2025-01-01T00:00:00.000Z" }],
      [
        identifiedOrder("o1", "late", "2025-01-01T00:00:00.000Z"),
        identifiedOrder("o2", "late", "2025-05-02T00:00:00.000Z"),
      ],
      "second-after-90d",
    );
    const vm = buildRetentionPageViewModelFromDataset(ds);
    const f2 = calculateFirstToSecondOrderConversion(ds.customers, ds.orders, 90);
    assert.equal(vm.summary.customersWithSecondOrder, 1);
    assert.equal(vm.summary.customersWithSecondOrder, f2.customersWithSecondOrder);
    assert.equal(vm.summary.firstToSecondWithin90DaysRate, 0);
    assert.equal(vm.summary.firstToSecondWithin90DaysRate, f2.conversionRateWithinWindow);
    assert.equal(f2.customersWithSecondOrderWithinWindow, 0);
  });

  it("preserves empty-customer engine behaviour", () => {
    const ds = dataset([], [], "empty-customers");
    const vm = buildRetentionPageViewModelFromDataset(ds);
    const f2 = calculateFirstToSecondOrderConversion(ds.customers, ds.orders, 90);
    const repeat = calculateRepeatPurchaseRate(ds.customers, ds.orders);
    assert.equal(vm.summary.totalCustomers, 0);
    assert.equal(vm.summary.customersWithSecondOrder, 0);
    assert.equal(vm.summary.customersWithSecondOrder, f2.customersWithSecondOrder);
    assert.equal(vm.summary.firstToSecondWithin90DaysRate, 0);
    assert.equal(vm.summary.allTimeRepeatPurchaseRate, repeat.repeatPurchaseRate);
    assert.equal(vm.summary.averageDaysToSecondOrder, null);
    assert.equal(vm.summary.medianDaysToSecondOrder, null);
    assert.equal(vm.summary.averageMonthPlus1ActiveRate, null);
    assert.deepEqual(vm.cohortRows, []);
  });
});
