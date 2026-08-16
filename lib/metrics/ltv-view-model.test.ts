import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMonthlyCohortMaturityStatus } from "../analysis-context";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { MarginAssumptions } from "../types/scenario";
import type { Order } from "../types/order";
import { calculateLTVByCohort } from "./ltv";
import {
  buildLTVPageViewModelFromDataset,
  type LTVPageSummaryView,
} from "./ltv-view-model";

function identifiedOrder(
  id: string,
  customerId: string,
  orderedAt: string,
  grossRevenue = 100,
  discounts = 0,
  refunds = 0,
  contributionMargin?: number,
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue,
    discounts,
    refunds,
    lineItems: [],
    ...(contributionMargin !== undefined ? { contributionMargin } : {}),
  };
}

function dataset(
  customers: Customer[],
  orders: Order[],
  sourceLabel: string,
  marginAssumptions?: MarginAssumptions,
): RetentionOSDataset {
  return {
    customers,
    orders,
    products: [],
    ...(marginAssumptions !== undefined ? { marginAssumptions } : {}),
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
function mixedMaturityDataset(opts?: {
  contributionMargin?: number;
  marginAssumptions?: MarginAssumptions;
}): RetentionOSDataset {
  return dataset(
    [
      { id: "d1", firstOrderAt: "2024-12-05T12:00:00.000Z" },
      { id: "d2", firstOrderAt: "2024-12-10T12:00:00.000Z" },
      { id: "j1", firstOrderAt: "2025-01-05T12:00:00.000Z" },
      { id: "j2", firstOrderAt: "2025-01-08T12:00:00.000Z" },
    ],
    [
      identifiedOrder("o1", "d1", "2024-12-05T12:00:00.000Z", 100, 0, 0, opts?.contributionMargin),
      identifiedOrder("o2", "d2", "2024-12-10T12:00:00.000Z", 100, 0, 0, opts?.contributionMargin),
      identifiedOrder("o3", "d1", "2025-01-10T12:00:00.000Z", 50, 0, 0, opts?.contributionMargin),
      identifiedOrder("o3b", "d2", "2025-01-12T12:00:00.000Z", 50, 0, 0, opts?.contributionMargin),
      identifiedOrder("o4", "j1", "2025-01-05T12:00:00.000Z", 80, 0, 0, opts?.contributionMargin),
      identifiedOrder("o5", "j2", "2025-01-08T12:00:00.000Z", 80, 0, 0, opts?.contributionMargin),
      identifiedOrder("o6", "j1", "2025-02-10T12:00:00.000Z", 40, 0, 0, opts?.contributionMargin),
    ],
    "ltv-vm-partial-m1",
    opts?.marginAssumptions,
  );
}

/** Oct + Nov 2024 cohorts with history through Mar 2025 so M+3 is complete. */
function completedMonthPlus3Dataset(marginAssumptions?: MarginAssumptions): RetentionOSDataset {
  return dataset(
    [
      { id: "o1c", firstOrderAt: "2024-10-05T12:00:00.000Z" },
      { id: "n1c", firstOrderAt: "2024-11-05T12:00:00.000Z" },
    ],
    [
      identifiedOrder("a0", "o1c", "2024-10-05T12:00:00.000Z", 100),
      identifiedOrder("a1", "o1c", "2024-11-10T12:00:00.000Z", 20),
      identifiedOrder("a2", "o1c", "2024-12-10T12:00:00.000Z", 20),
      identifiedOrder("a3", "o1c", "2025-01-10T12:00:00.000Z", 20),
      identifiedOrder("b0", "n1c", "2024-11-05T12:00:00.000Z", 80),
      identifiedOrder("b1", "n1c", "2024-12-10T12:00:00.000Z", 10),
      identifiedOrder("b2", "n1c", "2025-01-10T12:00:00.000Z", 10),
      identifiedOrder("b3", "n1c", "2025-02-10T12:00:00.000Z", 10),
      identifiedOrder("tail", "o1c", "2025-03-15T12:00:00.000Z", 5),
    ],
    "ltv-vm-completed-m3",
    marginAssumptions,
  );
}

function enginePoint(
  ds: RetentionOSDataset,
  cohortKey: string,
  offset: number,
) {
  const points = calculateLTVByCohort(ds.customers, ds.orders, ds.marginAssumptions);
  return points.find((p) => p.cohortKey === cohortKey && p.offset === offset);
}

function assertNoAcquisitionFields(summary: LTVPageSummaryView) {
  const keys = Object.keys(summary);
  for (const banned of ["cac", "blendedCac", "payback", "ltvCac", "revenueLtvCac", "contributionLtvCac"]) {
    assert.equal(keys.includes(banned), false, `summary must not include ${banned}`);
  }
}

describe("buildLTVPageViewModelFromDataset", () => {
  it("passes through canonical Revenue LTV M0–M3 and latest observed from the engine", () => {
    const ds = mixedMaturityDataset();
    const vm = buildLTVPageViewModelFromDataset(ds);
    const dec = vm.cohortRows.find((r) => r.cohortPeriod === "2024-12");
    assert.ok(dec);
    const p0 = enginePoint(ds, "2024-12", 0);
    const p1 = enginePoint(ds, "2024-12", 1);
    const p2 = enginePoint(ds, "2024-12", 2);
    const points = calculateLTVByCohort(ds.customers, ds.orders, ds.marginAssumptions).filter(
      (p) => p.cohortKey === "2024-12",
    );
    const tail = points[points.length - 1];
    assert.equal(dec.netRevenueLtvMonth0, p0?.cumulativeAvgGrossRevenue);
    assert.equal(dec.netRevenueLtvMonth1, p1?.cumulativeAvgGrossRevenue);
    assert.equal(dec.netRevenueLtvMonth2, p2?.cumulativeAvgGrossRevenue);
    assert.equal(dec.netRevenueLtvMonth3, null);
    assert.equal(dec.latestObservedNetRevenueLtv, tail?.cumulativeAvgGrossRevenue);
  });

  it("reflects refunds and discounts through canonical net revenue LTV", () => {
    const ds = dataset(
      [{ id: "c1", firstOrderAt: "2025-01-01T00:00:00.000Z" }],
      [identifiedOrder("o1", "c1", "2025-01-01T00:00:00.000Z", 100, 20, 10)],
      "refunds-discounts",
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    const p0 = enginePoint(ds, "2025-01", 0);
    assert.equal(p0?.cumulativeAvgGrossRevenue, 70);
    assert.equal(vm.cohortRows[0]?.netRevenueLtvMonth0, 70);
    assert.equal(vm.cohortRows[0]?.contributionLtvMonth0, null);
  });

  it("classifies order-level contribution without changing Revenue LTV", () => {
    const none = mixedMaturityDataset();
    const orderLevel = mixedMaturityDataset({ contributionMargin: 25 });
    const vmNone = buildLTVPageViewModelFromDataset(none);
    const vmOrder = buildLTVPageViewModelFromDataset(orderLevel);
    assert.equal(vmOrder.summary.contributionSourcePath, "order_level");
    assert.equal(vmOrder.summary.contributionDataQuality, "partial");
    assert.equal(vmNone.cohortRows[0]?.netRevenueLtvMonth0, vmOrder.cohortRows[0]?.netRevenueLtvMonth0);
    assert.equal(vmNone.summary.avgCompletedMonthPlus1NetRevenueLtv, vmOrder.summary.avgCompletedMonthPlus1NetRevenueLtv);
    assert.ok(vmOrder.cohortRows[0]?.contributionLtvMonth0 != null);
    assert.equal(vmNone.cohortRows[0]?.contributionLtvMonth0, null);
  });

  it("classifies margin-assumption contribution without changing Revenue LTV", () => {
    const none = mixedMaturityDataset();
    const assumed = mixedMaturityDataset({
      marginAssumptions: { contributionMarginPct: 0.4 },
    });
    const vmNone = buildLTVPageViewModelFromDataset(none);
    const vmAssumed = buildLTVPageViewModelFromDataset(assumed);
    assert.equal(vmAssumed.summary.contributionSourcePath, "margin_assumption");
    assert.equal(vmAssumed.summary.contributionDataQuality, "partial");
    assert.equal(vmNone.summary.avgCompletedMonthPlus1NetRevenueLtv, vmAssumed.summary.avgCompletedMonthPlus1NetRevenueLtv);
    const decNone = vmNone.cohortRows.find((r) => r.cohortPeriod === "2024-12");
    const decAssumed = vmAssumed.cohortRows.find((r) => r.cohortPeriod === "2024-12");
    assert.equal(decNone?.netRevenueLtvMonth1, decAssumed?.netRevenueLtvMonth1);
    assert.equal(decNone?.contributionLtvMonth1, null);
    assert.ok(decAssumed?.contributionLtvMonth1 != null);
    const p1 = enginePoint(assumed, "2024-12", 1);
    assert.equal(decAssumed?.contributionLtvMonth1, p1?.cumulativeAvgContribution);
  });

  it("classifies no contribution path as unavailable with nulls rather than fabricated zero", () => {
    const vm = buildLTVPageViewModelFromDataset(mixedMaturityDataset());
    assert.equal(vm.summary.contributionSourcePath, "none");
    assert.equal(vm.summary.contributionDataQuality, "unavailable");
    assert.equal(vm.summary.avgCompletedMonthPlus1ContributionLtv, null);
    assert.equal(vm.summary.avgCompletedMonthPlus3ContributionLtv, null);
    for (const row of vm.cohortRows) {
      assert.equal(row.contributionLtvMonth0, null);
      assert.equal(row.contributionLtvMonth1, null);
      assert.equal(row.latestObservedContributionLtv, null);
    }
  });

  it("uses completed-only Month +1 Revenue LTV averages and excludes partial observations", () => {
    const ds = mixedMaturityDataset();
    const vm = buildLTVPageViewModelFromDataset(ds);
    const decM1 = enginePoint(ds, "2024-12", 1);
    assert.equal(vm.summary.avgCompletedMonthPlus1NetRevenueLtv, decM1?.cumulativeAvgGrossRevenue);
    const jan = vm.cohortRows.find((r) => r.cohortPeriod === "2025-01");
    assert.equal(jan?.monthPlus1Maturity, "partial");
    assert.ok(jan?.netRevenueLtvMonth1 != null);
    assert.equal(jan?.netRevenueLtvMonth1, enginePoint(ds, "2025-01", 1)?.cumulativeAvgGrossRevenue);
  });

  it("uses completed-only Month +1 Contribution LTV averages when a contribution path exists", () => {
    const ds = mixedMaturityDataset({ marginAssumptions: { contributionMarginPct: 0.5 } });
    const vm = buildLTVPageViewModelFromDataset(ds);
    const decM1 = enginePoint(ds, "2024-12", 1);
    assert.equal(vm.summary.avgCompletedMonthPlus1ContributionLtv, decM1?.cumulativeAvgContribution);
  });

  it("returns null completed Month +3 averages when no cohort has completed M+3", () => {
    const vm = buildLTVPageViewModelFromDataset(mixedMaturityDataset());
    assert.equal(vm.summary.avgCompletedMonthPlus3NetRevenueLtv, null);
    assert.equal(vm.summary.avgCompletedMonthPlus3ContributionLtv, null);
  });

  it("averages completed Month +3 Revenue and Contribution LTV across complete cohorts only", () => {
    const ds = completedMonthPlus3Dataset({ contributionMarginPct: 0.4 });
    const vm = buildLTVPageViewModelFromDataset(ds);
    const asOf = "2025-03-15T12:00:00.000Z";
    assert.equal(getMonthlyCohortMaturityStatus("2024-10", 3, asOf), "complete");
    assert.equal(getMonthlyCohortMaturityStatus("2024-11", 3, asOf), "complete");
    const oct = enginePoint(ds, "2024-10", 3);
    const nov = enginePoint(ds, "2024-11", 3);
    assert.ok(oct && nov);
    assert.equal(
      vm.summary.avgCompletedMonthPlus3NetRevenueLtv,
      (oct.cumulativeAvgGrossRevenue + nov.cumulativeAvgGrossRevenue) / 2,
    );
    assert.equal(
      vm.summary.avgCompletedMonthPlus3ContributionLtv,
      ((oct.cumulativeAvgContribution ?? 0) + (nov.cumulativeAvgContribution ?? 0)) / 2,
    );
  });

  it("marks complete, partial, and unavailable Month+N cells without changing engine values", () => {
    const ds = mixedMaturityDataset();
    const vm = buildLTVPageViewModelFromDataset(ds);
    const asOf = "2025-02-10T12:00:00.000Z";
    const jan = vm.cohortRows.find((r) => r.cohortPeriod === "2025-01");
    const dec = vm.cohortRows.find((r) => r.cohortPeriod === "2024-12");
    assert.ok(jan);
    assert.ok(dec);

    assert.equal(jan.monthPlus0Maturity, "complete");
    assert.equal(jan.monthPlus1Maturity, "partial");
    assert.equal(jan.monthPlus3Maturity, "unavailable");
    assert.equal(jan.netRevenueLtvMonth3, null);
    assert.equal(jan.monthPlus1Maturity, getMonthlyCohortMaturityStatus("2025-01", 1, asOf));

    assert.equal(dec.monthPlus0Maturity, "complete");
    assert.equal(dec.monthPlus1Maturity, "complete");
    assert.equal(dec.monthPlus2Maturity, "partial");
    assert.equal(dec.netRevenueLtvMonth1, enginePoint(ds, "2024-12", 1)?.cumulativeAvgGrossRevenue);
  });

  it("returns null averages and null maturity when no orders (no asOf)", () => {
    const vm = buildLTVPageViewModelFromDataset(
      dataset([{ id: "c1", firstOrderAt: "2025-01-01T00:00:00.000Z" }], [], "empty-orders"),
    );
    assert.equal(vm.summary.avgCompletedMonthPlus1NetRevenueLtv, null);
    assert.equal(vm.summary.avgCompletedMonthPlus3NetRevenueLtv, null);
    assert.equal(vm.cohortRows[0]?.monthPlus0Maturity, null);
    assert.equal(vm.summary.contributionSourcePath, "none");
  });

  it("preserves empty-customer engine behaviour", () => {
    const vm = buildLTVPageViewModelFromDataset(dataset([], [], "empty-customers"));
    assert.deepEqual(vm.cohortRows, []);
    assert.equal(vm.summary.avgCompletedMonthPlus1NetRevenueLtv, null);
    assert.equal(vm.summary.contributionSourcePath, "none");
  });

  it("keeps zero-value identified orders in the cohort denominator", () => {
    const ds = dataset(
      [
        { id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" },
        { id: "b", firstOrderAt: "2025-01-02T00:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z", 100),
        identifiedOrder("o2", "b", "2025-01-02T00:00:00.000Z", 0),
      ],
      "zero-value",
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    const p0 = enginePoint(ds, "2025-01", 0);
    assert.equal(p0?.cumulativeAvgGrossRevenue, 50);
    assert.equal(vm.cohortRows[0]?.cohortSize, 2);
    assert.equal(vm.cohortRows[0]?.netRevenueLtvMonth0, 50);
  });

  it("does not let guest orders enter identifiable LTV (engine-defined)", () => {
    const ds = dataset(
      [{ id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" }],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z", 100),
        {
          id: "guest",
          customerId: null,
          orderedAt: "2025-01-15T00:00:00.000Z",
          grossRevenue: 999,
          discounts: 0,
          refunds: 0,
          lineItems: [],
        },
      ],
      "guest-order",
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    assert.equal(vm.cohortRows[0]?.netRevenueLtvMonth0, 100);
    assert.equal(enginePoint(ds, "2025-01", 0)?.cumulativeAvgGrossRevenue, 100);
  });

  it("keeps short-history Month +1 values while marking them partial and excluding them from completed averages", () => {
    const ds = dataset(
      [{ id: "c1", firstOrderAt: "2025-02-01T00:00:00.000Z" }],
      [
        identifiedOrder("o1", "c1", "2025-02-01T00:00:00.000Z", 100),
        identifiedOrder("o2", "c1", "2025-03-10T00:00:00.000Z", 40),
      ],
      "short-history",
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    const row = vm.cohortRows.find((r) => r.cohortPeriod === "2025-02");
    assert.ok(row);
    assert.equal(row.monthPlus1Maturity, "partial");
    assert.equal(row.netRevenueLtvMonth1, enginePoint(ds, "2025-02", 1)?.cumulativeAvgGrossRevenue);
    assert.equal(vm.summary.avgCompletedMonthPlus1NetRevenueLtv, null);
  });

  it("does not add CAC or payback fields to the page view model", () => {
    const vm = buildLTVPageViewModelFromDataset(mixedMaturityDataset());
    assertNoAcquisitionFields(vm.summary);
  });

  it("classifies full order-level contribution when every relevant order has finite contribution", () => {
    const ds = mixedMaturityDataset({ contributionMargin: 25 });
    const vm = buildLTVPageViewModelFromDataset(ds);
    assert.equal(vm.summary.contributionSourcePath, "order_level");
    assert.equal(vm.summary.contributionDataQuality, "partial");
    const p0 = enginePoint(ds, "2024-12", 0);
    assert.equal(vm.cohortRows.find((r) => r.cohortPeriod === "2024-12")?.contributionLtvMonth0, p0?.cumulativeAvgContribution);
  });

  it("classifies pure margin-assumption contribution when no order has finite order-level contribution", () => {
    const ds = mixedMaturityDataset({ marginAssumptions: { contributionMarginPct: 0.4 } });
    const vm = buildLTVPageViewModelFromDataset(ds);
    assert.equal(vm.summary.contributionSourcePath, "margin_assumption");
    assert.equal(vm.summary.contributionDataQuality, "partial");
  });

  it("classifies mixed order-level and margin-assumption contribution with canonical numeric pass-through", () => {
    const ds = dataset(
      [
        { id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" },
        { id: "b", firstOrderAt: "2025-01-02T00:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z", 100, 0, 0, 40),
        identifiedOrder("o2", "b", "2025-01-02T00:00:00.000Z", 100),
      ],
      "mixed-order-assumption",
      { contributionMarginPct: 0.5 },
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    const p0 = enginePoint(ds, "2025-01", 0);
    assert.equal(p0?.cumulativeAvgContribution, 45);
    assert.equal(vm.cohortRows[0]?.contributionLtvMonth0, 45);
    assert.equal(vm.summary.contributionSourcePath, "mixed");
    assert.notEqual(vm.summary.contributionSourcePath, "order_level");
  });

  it("classifies partial order-level contribution without margin assumption with canonical numeric pass-through", () => {
    const ds = dataset(
      [
        { id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" },
        { id: "b", firstOrderAt: "2025-01-02T00:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z", 100, 0, 0, 40),
        identifiedOrder("o2", "b", "2025-01-02T00:00:00.000Z", 100),
      ],
      "partial-order-level",
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    const p0 = enginePoint(ds, "2025-01", 0);
    assert.equal(p0?.cumulativeAvgContribution, 20);
    assert.equal(vm.cohortRows[0]?.contributionLtvMonth0, 20);
    assert.equal(vm.summary.contributionSourcePath, "partial_order_level");
    assert.notEqual(vm.summary.contributionSourcePath, "order_level");
  });

  it("treats 0% margin assumption as margin_assumption with a genuine zero contribution display", () => {
    const ds = dataset(
      [
        { id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" },
        { id: "b", firstOrderAt: "2025-01-02T00:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z", 100),
        identifiedOrder("o2", "b", "2025-01-02T00:00:00.000Z", 80),
      ],
      "zero-assumption",
      { contributionMarginPct: 0 },
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    assert.equal(vm.summary.contributionSourcePath, "margin_assumption");
    assert.equal(vm.summary.contributionDataQuality, "partial");
    assert.equal(vm.cohortRows[0]?.contributionLtvMonth0, 0);
    assert.equal(enginePoint(ds, "2025-01", 0)?.cumulativeAvgContribution, 0);
  });

  it("classifies all-zero order-level contribution without margin assumption as unavailable none", () => {
    const ds = dataset(
      [
        { id: "a", firstOrderAt: "2025-01-01T00:00:00.000Z" },
        { id: "b", firstOrderAt: "2025-01-02T00:00:00.000Z" },
      ],
      [
        identifiedOrder("o1", "a", "2025-01-01T00:00:00.000Z", 100, 0, 0, 0),
        identifiedOrder("o2", "b", "2025-01-02T00:00:00.000Z", 80, 0, 0, 0),
      ],
      "all-zero-order-level",
    );
    const vm = buildLTVPageViewModelFromDataset(ds);
    assert.equal(vm.summary.contributionSourcePath, "none");
    assert.equal(vm.summary.contributionDataQuality, "unavailable");
    assert.equal(vm.cohortRows[0]?.contributionLtvMonth0, null);
    assert.equal(enginePoint(ds, "2025-01", 0)?.cumulativeAvgContribution, undefined);
  });

  it("exposes latest observed staircase offset from canonical tail point", () => {
    const ds = mixedMaturityDataset();
    const vm = buildLTVPageViewModelFromDataset(ds);
    const dec = vm.cohortRows.find((r) => r.cohortPeriod === "2024-12");
    assert.ok(dec);
    const points = calculateLTVByCohort(ds.customers, ds.orders, ds.marginAssumptions).filter(
      (p) => p.cohortKey === "2024-12",
    );
    const tail = points[points.length - 1];
    assert.equal(dec.latestObservedOffset, tail?.offset);
  });
});
