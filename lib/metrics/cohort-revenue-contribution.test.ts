/**
 * Sprint MET-SHARE — acquisition-cohort revenue contribution tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAnalysisSelection } from "../analysis-context";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import {
  calculateCohortRevenueContribution,
  type CohortRevenueContributionResult,
} from "./cohort-revenue-contribution";
import { CONTRACTED_METRIC_IDS, getMetricContractIndexEntry } from "./metric-contract-index";

const JAN_START = "2025-01-01T00:00:00.000Z";
const FEB_START = "2025-02-01T00:00:00.000Z";
const MAR_START = "2025-03-01T00:00:00.000Z";
const AS_OF = "2025-03-15T12:00:00.000Z";

function assertClose(actual: number, expected: number, label: string): void {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

function customer(id: string, firstOrderAt: string): Customer {
  return { id, firstOrderAt };
}

function order(
  id: string,
  customerId: string | null,
  orderedAt: string,
  opts?: { gross?: number; discounts?: number; refunds?: number },
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue: opts?.gross ?? 100,
    discounts: opts?.discounts ?? 0,
    refunds: opts?.refunds ?? 0,
    lineItems: [],
  };
}

function dataset(
  customers: readonly Customer[],
  orders: readonly Order[],
): RetentionOSDataset {
  return {
    customers,
    orders,
    products: [],
    meta: {
      sourceType: "demo",
      sourceLabel: "met-share-fixture",
      isDemo: true,
      isUploaded: false,
      customerCount: customers.length,
      orderCount: orders.length,
      productCount: 0,
      lineItemCount: 0,
    },
  };
}

function assertReconciles(result: CohortRevenueContributionResult): void {
  const rowSum = result.rows.reduce((s, r) => s + r.revenue, 0);
  assertClose(rowSum, result.totalReportingRevenue, "row revenue sum");
  if (result.totalReportingRevenue > 0) {
    const shareSum = result.rows.reduce((s, r) => s + (r.shareOfReportingRevenue ?? NaN), 0);
    assertClose(shareSum, 1, "share sum");
  }
}

describe("calculateCohortRevenueContribution", () => {
  it("attributes multiple acquisition cohorts in one reporting period", () => {
    const ds = dataset(
      [customer("c_dec", "2024-12-05T12:00:00.000Z"), customer("c_jan", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c_dec", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("o2", "c_jan", "2025-01-15T12:00:00.000Z", { gross: 120 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assert.equal(result.status, "available");
    assertClose(result.totalReportingRevenue, 200, "total");
    const dec = result.rows.find((r) => r.kind === "cohort" && r.cohortMonthKey === "2024-12");
    const jan = result.rows.find((r) => r.kind === "cohort" && r.cohortMonthKey === "2025-01");
    assert.ok(dec && dec.kind === "cohort");
    assert.ok(jan && jan.kind === "cohort");
    assertClose(dec.revenue, 80, "dec revenue");
    assertClose(jan.revenue, 120, "jan revenue");
    assertReconciles(result);
  });

  it("attributes via canonical customer.firstOrderAt, not reporting order date", () => {
    const ds = dataset(
      [customer("c1", "2024-06-01T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 })],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]!.kind, "cohort");
    if (result.rows[0]!.kind === "cohort") {
      assert.equal(result.rows[0]!.cohortMonthKey, "2024-06");
    }
  });

  it("keeps pre-reporting-period customers on their original cohort", () => {
    const ds = dataset(
      [customer("c_old", "2024-11-10T12:00:00.000Z")],
      [
        order("o_acq", "c_old", "2024-11-10T12:00:00.000Z", { gross: 10 }),
        order("o_rpt", "c_old", "2025-01-20T12:00:00.000Z", { gross: 90 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assertClose(result.totalReportingRevenue, 90, "period total");
    assert.equal(result.rows[0]!.kind, "cohort");
    if (result.rows[0]!.kind === "cohort") {
      assert.equal(result.rows[0]!.cohortMonthKey, "2024-11");
    }
  });

  it("includes reporting start boundary and excludes end boundary", () => {
    const ds = dataset(
      [customer("c1", "2024-12-01T12:00:00.000Z")],
      [
        order("o_start", "c1", JAN_START, { gross: 40 }),
        order("o_end", "c1", FEB_START, { gross: 60 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assertClose(result.totalReportingRevenue, 40, "start included end excluded");
    assert.equal(result.reportingOrderCount, 1);
  });

  it("aggregates multiple reporting orders from one customer", () => {
    const ds = dataset(
      [customer("c1", "2025-01-02T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 30 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 70 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assert.equal(result.rows.length, 1);
    assertClose(result.rows[0]!.revenue, 100, "aggregated");
    assert.equal(result.rows[0]!.orderCount, 2);
    assert.equal(result.rows[0]!.customerCount, 1);
  });

  it("puts guest revenue in unidentified_customer", () => {
    const ds = dataset(
      [customer("c1", "2025-01-02T12:00:00.000Z")],
      [
        order("o_id", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("o_guest", null, "2025-01-12T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    const guest = result.rows.find((r) => r.kind === "unidentified_customer");
    assert.ok(guest);
    assertClose(guest!.revenue, 50, "guest");
    assert.equal(guest!.customerCount, null);
    assertClose(result.selectedCohortRevenue, 100, "selected");
    assertClose(result.cohortResolvedRevenue, 100, "resolved excludes guest");
    assertClose(result.cohortAttributionCoverage!, 100 / 150, "coverage");
    assertReconciles(result);
  });

  it("bounded acquisition creates outside_selected_acquisition_period and splits selected vs coverage", () => {
    const ds = dataset(
      [
        customer("c_in", "2025-01-05T12:00:00.000Z"),
        customer("c_out", "2024-11-10T12:00:00.000Z"),
      ],
      [
        order("o_in", "c_in", "2025-01-15T12:00:00.000Z", { gross: 100 }),
        order("o_out", "c_out", "2025-01-20T12:00:00.000Z", { gross: 40 }),
        order("o_guest", null, "2025-01-22T12:00:00.000Z", { gross: 10 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
      acquisitionPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assertClose(result.totalReportingRevenue, 150, "total");
    assertClose(result.selectedCohortRevenue, 100, "selected cohort");
    assertClose(result.selectedCohortShareOfReportingRevenue!, 100 / 150, "selected share");
    assertClose(result.cohortResolvedRevenue, 140, "resolved = cohort + outside");
    assertClose(result.cohortAttributionCoverage!, 140 / 150, "coverage includes outside");
    assert.ok(result.selectedCohortShareOfReportingRevenue! < result.cohortAttributionCoverage!);
    const outside = result.rows.find((r) => r.kind === "outside_selected_acquisition_period");
    assert.ok(outside);
    assertClose(outside!.revenue, 40, "outside");
    assert.equal(outside!.customerCount, 1);
    const guest = result.rows.find((r) => r.kind === "unidentified_customer");
    assert.ok(guest);
    assertClose(guest!.revenue, 10, "guest excluded from coverage");
    assertReconciles(result);
  });

  it("unbounded acquisition scope does not emit outside_selected_acquisition_period", () => {
    const ds = dataset(
      [customer("c_old", "2024-11-10T12:00:00.000Z")],
      [order("o1", "c_old", "2025-01-15T12:00:00.000Z", { gross: 70 })],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    assert.equal(sel.completeness.acquisitionScope, "all");
    const result = calculateCohortRevenueContribution(sel);
    assert.equal(
      result.rows.some((r) => r.kind === "outside_selected_acquisition_period"),
      false,
    );
    assertClose(result.selectedCohortRevenue, 70, "all attributed to cohort");
    assertClose(result.cohortResolvedRevenue, 70, "resolved");
  });

  it("missing canonical customer record goes to unresolved_customer", () => {
    const ds = dataset(
      [customer("c1", "2025-01-02T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("o_missing", "missing_id", "2025-01-12T12:00:00.000Z", { gross: 20 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    const unresolved = result.rows.find((r) => r.kind === "unresolved_customer");
    assert.ok(unresolved);
    assertClose(unresolved!.revenue, 20, "unresolved");
    assert.equal(unresolved!.customerCount, 1);
    assertClose(result.cohortAttributionCoverage!, 80 / 100, "coverage excludes unresolved");
    assertReconciles(result);
  });

  it("fails explicitly on invalid canonical firstOrderAt", () => {
    const badOrder = order("o1", "c_bad", "2025-01-10T12:00:00.000Z", { gross: 50 });
    const badCustomer = customer("c_bad", "not-a-date");
    // Hand-built selection: metric must throw RangeError (not classify as unresolved).
    const selection = {
      context: { asOfDate: AS_OF },
      fullDataset: dataset([badCustomer], [badOrder]),
      reportingOrders: [badOrder],
      identifiableReportingOrders: [badOrder as Order & { customerId: string }],
      reportingOrdersForEligibleCustomers: [badOrder as Order & { customerId: string }],
      eligibleCustomerIds: new Set(["c_bad"]),
      selectedMarketingSpend: [],
      completeness: {
        reportingOrderCount: 1,
        identifiableReportingOrderCount: 1,
        guestReportingOrderCount: 0,
        eligibleCustomerCount: 1,
        acquisitionScope: "all" as const,
        acquisitionMonthKeyCount: 1,
        marketingSpendRowCount: 0,
      },
    };
    assert.throws(() => calculateCohortRevenueContribution(selection), RangeError);
  });

  it("zero total reporting revenue stays available with null ratios", () => {
    const ds = dataset(
      [customer("c1", "2025-01-02T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50, refunds: 50 })],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assert.equal(result.status, "available");
    assert.equal(result.totalReportingRevenue, 0);
    assert.equal(result.selectedCohortShareOfReportingRevenue, null);
    assert.equal(result.cohortAttributionCoverage, null);
    assert.equal(result.rows[0]!.shareOfReportingRevenue, null);
    assert.equal(result.rows[0]!.orderCount, 1);
    assert.ok(Number.isFinite(result.totalReportingRevenue));
  });

  it("empty reporting population produces status empty", () => {
    const ds = dataset(
      [customer("c1", "2024-12-01T12:00:00.000Z")],
      [order("o1", "c1", "2024-12-15T12:00:00.000Z", { gross: 100 })],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assert.equal(result.status, "empty");
    assert.equal(result.reportingOrderCount, 0);
    assert.deepEqual(result.rows, []);
    assert.equal(result.selectedCohortShareOfReportingRevenue, null);
    assert.equal(result.cohortAttributionCoverage, null);
  });

  it("orders cohort rows chronologically and residuals in documented order", () => {
    const ds = dataset(
      [
        customer("c_feb", "2025-02-05T12:00:00.000Z"),
        customer("c_dec", "2024-12-05T12:00:00.000Z"),
        customer("c_out", "2024-10-01T12:00:00.000Z"),
      ],
      [
        order("o_feb", "c_feb", "2025-02-10T12:00:00.000Z", { gross: 10 }),
        order("o_dec", "c_dec", "2025-02-11T12:00:00.000Z", { gross: 20 }),
        order("o_guest", null, "2025-02-12T12:00:00.000Z", { gross: 5 }),
        order("o_out", "c_out", "2025-02-13T12:00:00.000Z", { gross: 7 }),
        order("o_miss", "ghost", "2025-02-14T12:00:00.000Z", { gross: 3 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: FEB_START, endDateExclusive: MAR_START },
      // Include Dec–Feb so c_dec/c_feb are in-scope cohorts; c_out (Oct) remains outside.
      acquisitionPeriod: {
        startDate: "2024-12-01T00:00:00.000Z",
        endDateExclusive: MAR_START,
      },
    });
    const result = calculateCohortRevenueContribution(sel);
    const kinds = result.rows.map((r) => (r.kind === "cohort" ? `cohort:${r.cohortMonthKey}` : r.kind));
    assert.deepEqual(kinds, [
      "cohort:2024-12",
      "cohort:2025-02",
      "unidentified_customer",
      "outside_selected_acquisition_period",
      "unresolved_customer",
    ]);
  });

  it("does not mutate dataset or selection", () => {
    const ds = dataset(
      [customer("c1", "2025-01-02T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 })],
    );
    const customersBefore = ds.customers.map((c) => ({ ...c }));
    const ordersBefore = ds.orders.map((o) => ({ ...o, lineItems: [...o.lineItems] }));
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const reportingLen = sel.reportingOrders.length;
    calculateCohortRevenueContribution(sel);
    assert.deepEqual(ds.customers, customersBefore);
    assert.deepEqual(
      ds.orders.map((o) => ({ id: o.id, customerId: o.customerId, orderedAt: o.orderedAt })),
      ordersBefore.map((o) => ({ id: o.id, customerId: o.customerId, orderedAt: o.orderedAt })),
    );
    assert.equal(sel.reportingOrders.length, reportingLen);
  });

  it("partial maturity does not prevent counting reporting-period revenue", () => {
    const asOfPartial = "2025-02-20T12:00:00.000Z";
    const ds = dataset(
      [customer("c_new", "2025-02-10T12:00:00.000Z")],
      [order("o1", "c_new", "2025-02-15T12:00:00.000Z", { gross: 55 })],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: asOfPartial,
      reportingPeriod: { startDate: FEB_START, endDateExclusive: asOfPartial },
      maturityHorizonMonths: 0,
    });
    const result = calculateCohortRevenueContribution(sel);
    assertClose(result.totalReportingRevenue, 55, "counted despite partial maturity");
    assert.equal(result.status, "available");
  });

  it("does not derive cohort from first reporting-window order", () => {
    const ds = dataset(
      [customer("c1", "2024-08-01T12:00:00.000Z")],
      [
        order("o_first_in_window", "c1", "2025-01-05T12:00:00.000Z", { gross: 25 }),
        order("o_later", "c1", "2025-01-25T12:00:00.000Z", { gross: 25 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, {
      asOfDate: AS_OF,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const result = calculateCohortRevenueContribution(sel);
    assert.equal(result.rows[0]!.kind, "cohort");
    if (result.rows[0]!.kind === "cohort") {
      assert.equal(result.rows[0]!.cohortMonthKey, "2024-08");
    }
  });

  it("omitted reportingPeriod uses full observed history via AnalysisSelection", () => {
    const ds = dataset(
      [customer("c1", "2024-12-01T12:00:00.000Z")],
      [
        order("o1", "c1", "2024-12-15T12:00:00.000Z", { gross: 30 }),
        order("o2", "c1", "2025-01-15T12:00:00.000Z", { gross: 70 }),
      ],
    );
    const sel = buildAnalysisSelection(ds, { asOfDate: AS_OF });
    const result = calculateCohortRevenueContribution(sel);
    assertClose(result.totalReportingRevenue, 100, "all orders");
    assert.equal(result.reportingOrderCount, 2);
  });
});

describe("MET-SHARE metric-contract index honesty", () => {
  it("registers cohort_revenue_contribution with no current view-model or route wiring", () => {
    assert.ok((CONTRACTED_METRIC_IDS as readonly string[]).includes("cohort_revenue_contribution"));
    const entry = getMetricContractIndexEntry("cohort_revenue_contribution");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
    assert.ok(entry.engineEntrypoints.length > 0);
    assert.ok(entry.existingTests.length > 0);
  });
});
