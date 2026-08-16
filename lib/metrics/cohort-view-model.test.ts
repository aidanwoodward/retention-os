import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMonthlyCohortMaturityStatus } from "../analysis-context";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import { averageCompletedCohortLtvAtOffset } from "./completed-cohort-ltv";
import { averageCompletedCohortRetentionAtOffset } from "./completed-cohort-retention";
import { calculateLTVByCohort } from "./ltv";
import { calculateRetentionByCohort } from "./retention";
import { buildCohortsPageViewModelFromDataset } from "./cohort-view-model";
import { buildLTVPageViewModelFromDataset } from "./ltv-view-model";

function identifiedOrder(
  id: string,
  customerId: string,
  orderedAt: string,
  grossRevenue = 100,
  discounts = 0,
  refunds = 0,
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue,
    discounts,
    refunds,
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
      lastOrderAt:
        orders.length > 0
          ? orders.reduce((latest, o) => (o.orderedAt > latest ? o.orderedAt : latest), orders[0]!.orderedAt)
          : undefined,
    },
  };
}

/** Dec 2024 + Jan 2025; asOf = 2025-02-10. Dec M+1 complete; Jan M+1 partial; no completed M+3. */
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
    "cohorts-vm-mixed-maturity",
  );
}

function groupLtvByCohort(points: ReturnType<typeof calculateLTVByCohort>): Map<string, typeof points> {
  const map = new Map<string, typeof points>();
  for (const p of points) {
    const list = map.get(p.cohortKey) ?? [];
    list.push(p);
    map.set(p.cohortKey, list);
  }
  return map;
}

describe("buildCohortsPageViewModelFromDataset", () => {
  it("A: orders cohort rows chronologically", () => {
    const vm = buildCohortsPageViewModelFromDataset(mixedMaturityDataset());
    assert.deepEqual(
      vm.cohortRows.map((r) => r.cohortPeriod),
      ["2024-12", "2025-01"],
    );
  });

  it("B: row exposes same-offset M+1/M+3 active and Revenue LTV fields", () => {
    const vm = buildCohortsPageViewModelFromDataset(mixedMaturityDataset());
    const dec = vm.cohortRows[0]!;
    assert.equal(typeof dec.monthPlus1ActiveRate, "number");
    assert.ok("monthPlus3ActiveRate" in dec);
    assert.ok("monthPlus1RevenueLtv" in dec);
    assert.ok("monthPlus3RevenueLtv" in dec);
  });

  it("C: table fields use same-offset Revenue LTV, not terminal latest average", () => {
    const ds = dataset(
      [
        { id: "a1", firstOrderAt: "2024-06-01T12:00:00.000Z" },
        { id: "a2", firstOrderAt: "2024-07-01T12:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a1", "2024-06-01T12:00:00.000Z", 100),
        identifiedOrder("o2", "a1", "2024-07-01T12:00:00.000Z", 50),
        identifiedOrder("o3", "a1", "2024-08-01T12:00:00.000Z", 50),
        identifiedOrder("o4", "a1", "2024-09-01T12:00:00.000Z", 50),
        identifiedOrder("o5", "a2", "2024-07-01T12:00:00.000Z", 200),
        identifiedOrder("o6", "a2", "2024-08-01T12:00:00.000Z", 100),
        identifiedOrder("o7", "a2", "2024-09-01T12:00:00.000Z", 100),
        identifiedOrder("o8", "a2", "2024-10-01T12:00:00.000Z", 100),
      ],
      "cohorts-same-offset-vs-terminal",
    );
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const jun = vm.cohortRows.find((r) => r.cohortPeriod === "2024-06")!;
    const ltvPoints = calculateLTVByCohort(ds.customers, ds.orders);
    const m1Point = ltvPoints.find((p) => p.cohortKey === "2024-06" && p.offset === 1);
    assert.equal(jun.monthPlus1RevenueLtv, m1Point?.cumulativeAvgGrossRevenue ?? null);
    assert.notEqual(jun.monthPlus1RevenueLtv, jun.latestAvgNetRevenueLtv);
    assert.ok(jun.monthPlus3RevenueLtv != null);
  });

  it("D/E/F: marks complete, partial, and unavailable maturity", () => {
    const vm = buildCohortsPageViewModelFromDataset(mixedMaturityDataset());
    const asOf = vm.summary.asOfDate!;
    const dec = vm.cohortRows.find((r) => r.cohortPeriod === "2024-12")!;
    const jan = vm.cohortRows.find((r) => r.cohortPeriod === "2025-01")!;

    assert.equal(dec.monthPlus1ActiveMaturity, getMonthlyCohortMaturityStatus("2024-12", 1, asOf));
    assert.equal(dec.monthPlus1ActiveMaturity, "complete");
    assert.equal(jan.monthPlus1ActiveMaturity, "partial");
    assert.equal(jan.monthPlus3ActiveMaturity, "unavailable");
  });

  it("G: completed zero active rate remains zero and is distinct from unavailable", () => {
    const ds = dataset(
      [
        { id: "c1", firstOrderAt: "2024-06-15T12:00:00.000Z" },
        { id: "c2", firstOrderAt: "2024-09-10T12:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "c1", "2024-06-15T12:00:00.000Z", 100),
        identifiedOrder("o2", "c1", "2024-10-01T12:00:00.000Z", 50),
        identifiedOrder("o3", "c2", "2024-09-10T12:00:00.000Z", 80),
      ],
      "cohorts-completed-zero-active",
    );
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const asOf = vm.summary.asOfDate!;
    const jun = vm.cohortRows.find((r) => r.cohortPeriod === "2024-06")!;
    const sep = vm.cohortRows.find((r) => r.cohortPeriod === "2024-09")!;

    assert.equal(getMonthlyCohortMaturityStatus("2024-06", 1, asOf), "complete");
    assert.equal(jun.monthPlus1ActiveMaturity, "complete");
    assert.equal(jun.monthPlus1ActiveRate, 0);
    assert.equal(typeof jun.monthPlus1RevenueLtv, "number");
    assert.ok(jun.monthPlus1RevenueLtv! > 0);

    assert.equal(getMonthlyCohortMaturityStatus("2024-09", 3, asOf), "unavailable");
    assert.equal(sep.monthPlus3ActiveMaturity, "unavailable");
    assert.equal(sep.monthPlus3ActiveRate, null);
  });

  it("H: partial observation excluded from completed-only averages", () => {
    const ds = mixedMaturityDataset();
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const asOf = vm.summary.asOfDate!;
    const expected = averageCompletedCohortRetentionAtOffset(
      calculateRetentionByCohort(ds.customers, ds.orders),
      1,
      asOf,
    );
    assert.equal(vm.summary.avgCompletedMonthPlus1ActiveRate, expected);
    assert.equal(vm.summary.avgCompletedMonthPlus1ActiveRate, 1);
  });

  it("I: no completed M+1 → average null", () => {
    const ds = dataset(
      [{ id: "j1", firstOrderAt: "2025-01-05T12:00:00.000Z" }],
      [identifiedOrder("o1", "j1", "2025-01-05T12:00:00.000Z")],
      "cohorts-no-complete-m1",
    );
    const vm = buildCohortsPageViewModelFromDataset(ds);
    assert.equal(vm.summary.avgCompletedMonthPlus1ActiveRate, null);
  });

  it("J: no completed M+3 → Revenue LTV average null", () => {
    const vm = buildCohortsPageViewModelFromDataset(mixedMaturityDataset());
    assert.equal(vm.summary.avgCompletedMonthPlus3RevenueLtv, null);
  });

  it("K: no completed M+3 → comparable count 0 / total", () => {
    const vm = buildCohortsPageViewModelFromDataset(mixedMaturityDataset());
    assert.equal(vm.summary.completedMonthPlus3CohortCount, 0);
    assert.equal(vm.summary.totalCohortCount, 2);
  });

  it("L: completed-only M+1 active average matches canonical helper", () => {
    const ds = mixedMaturityDataset();
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const expected = averageCompletedCohortRetentionAtOffset(
      calculateRetentionByCohort(ds.customers, ds.orders),
      1,
      vm.summary.asOfDate!,
    );
    assert.equal(vm.summary.avgCompletedMonthPlus1ActiveRate, expected);
  });

  it("M: completed-only M+3 Revenue LTV average matches shared helper and LTV VM", () => {
    const ds = dataset(
      [
        { id: "a1", firstOrderAt: "2024-06-01T12:00:00.000Z" },
        { id: "a2", firstOrderAt: "2024-07-01T12:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a1", "2024-06-01T12:00:00.000Z", 100),
        identifiedOrder("o2", "a1", "2024-07-01T12:00:00.000Z", 50),
        identifiedOrder("o3", "a1", "2024-08-01T12:00:00.000Z", 50),
        identifiedOrder("o4", "a1", "2024-09-01T12:00:00.000Z", 50),
        identifiedOrder("o5", "a2", "2024-07-01T12:00:00.000Z", 200),
        identifiedOrder("o6", "a2", "2024-08-01T12:00:00.000Z", 100),
        identifiedOrder("o7", "a2", "2024-09-01T12:00:00.000Z", 100),
        identifiedOrder("o8", "a2", "2024-10-01T12:00:00.000Z", 100),
      ],
      "cohorts-m3-complete",
    );
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const ltvVm = buildLTVPageViewModelFromDataset(ds);
    const ltvPoints = calculateLTVByCohort(ds.customers, ds.orders);
    const curves = groupLtvByCohort(ltvPoints);
    const periods = vm.cohortRows.map((r) => r.cohortPeriod);
    const expected = averageCompletedCohortLtvAtOffset(periods, curves, 3, vm.summary.asOfDate!, "revenue");
    assert.equal(vm.summary.avgCompletedMonthPlus3RevenueLtv, expected);
    assert.equal(vm.summary.avgCompletedMonthPlus3RevenueLtv, ltvVm.summary.avgCompletedMonthPlus3NetRevenueLtv);
  });

  it("N: Revenue LTV table value equals canonical engine M+N point", () => {
    const ds = mixedMaturityDataset();
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const ltvPoints = calculateLTVByCohort(ds.customers, ds.orders);
    const dec = vm.cohortRows.find((r) => r.cohortPeriod === "2024-12")!;
    const m1 = ltvPoints.find((p) => p.cohortKey === "2024-12" && p.offset === 1);
    assert.equal(dec.monthPlus1RevenueLtv, m1?.cumulativeAvgGrossRevenue ?? null);
  });

  it("O: empty dataset", () => {
    const vm = buildCohortsPageViewModelFromDataset(dataset([], [], "cohorts-empty"));
    assert.equal(vm.cohortRows.length, 0);
    assert.equal(vm.summary.totalCohortCount, 0);
    assert.equal(vm.summary.avgCompletedMonthPlus1ActiveRate, null);
    assert.equal(vm.summary.avgCompletedMonthPlus3RevenueLtv, null);
    assert.equal(vm.summary.completedMonthPlus3CohortCount, 0);
    assert.equal(vm.summary.asOfDate, null);
  });

  it("P: one cohort", () => {
    const ds = dataset(
      [{ id: "c1", firstOrderAt: "2024-06-01T12:00:00.000Z" }],
      [
        identifiedOrder("o1", "c1", "2024-06-01T12:00:00.000Z"),
        identifiedOrder("o2", "c1", "2024-07-01T12:00:00.000Z"),
      ],
      "cohorts-one",
    );
    const vm = buildCohortsPageViewModelFromDataset(ds);
    assert.equal(vm.cohortRows.length, 1);
    assert.equal(vm.summary.totalCohortCount, 1);
  });

  it("Q: exact month-boundary maturity", () => {
    const ds = dataset(
      [{ id: "c1", firstOrderAt: "2024-12-01T12:00:00.000Z" }],
      [
        identifiedOrder("o1", "c1", "2024-12-01T12:00:00.000Z"),
        identifiedOrder("o2", "c1", "2025-01-15T12:00:00.000Z"),
      ],
      "cohorts-boundary",
    );
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const asOf = vm.summary.asOfDate!;
    assert.equal(getMonthlyCohortMaturityStatus("2024-12", 1, asOf), vm.cohortRows[0]!.monthPlus1ActiveMaturity);
  });

  it("R: asOf exclusivity — partial M+1 when asOf before Month+2 start", () => {
    const ds = mixedMaturityDataset();
    const vm = buildCohortsPageViewModelFromDataset(ds);
    const jan = vm.cohortRows.find((r) => r.cohortPeriod === "2025-01")!;
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 1, "2025-02-10T12:00:00.000Z"),
      jan.monthPlus1ActiveMaturity,
    );
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 1, "2025-02-01T00:00:00.000Z"),
      "partial",
    );
  });

  it("S: input reorder determinism", () => {
    const ds = mixedMaturityDataset();
    const forward = buildCohortsPageViewModelFromDataset(ds);
    const reversedCustomers = [...ds.customers].reverse();
    const reversedOrders = [...ds.orders].reverse();
    const reverse = buildCohortsPageViewModelFromDataset({
      ...ds,
      customers: reversedCustomers,
      orders: reversedOrders,
    });
    assert.deepEqual(
      forward.cohortRows.map((r) => r.cohortPeriod),
      reverse.cohortRows.map((r) => r.cohortPeriod),
    );
    assert.equal(forward.summary.avgCompletedMonthPlus1ActiveRate, reverse.summary.avgCompletedMonthPlus1ActiveRate);
  });

  it("T: input not mutated", () => {
    const ds = mixedMaturityDataset();
    const customersCopy = ds.customers.map((c) => ({ ...c }));
    const ordersCopy = ds.orders.map((o) => ({ ...o, lineItems: [...o.lineItems] }));
    buildCohortsPageViewModelFromDataset(ds);
    assert.deepEqual(ds.customers, customersCopy);
    assert.deepEqual(ds.orders, ordersCopy);
  });

  it("preserves legacy terminal VM fields for compatibility", () => {
    const vm = buildCohortsPageViewModelFromDataset(mixedMaturityDataset());
    const row = vm.cohortRows[0]!;
    assert.ok("latestAvgNetRevenueLtv" in row);
    assert.ok("latestAvgContributionLtv" in row);
    assert.ok("nextMonthActiveRate" in row);
    assert.equal(row.nextMonthActiveRate, row.monthPlus1ActiveRate);
  });
});
