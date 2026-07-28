/**
 * Sprint MET-REV-RETENTION — period-based cohort revenue retention tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAnalysisSelection } from "../analysis-context";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import {
  calculateCohortRevenueRetention,
  type CohortRevenueRetentionResult,
} from "./cohort-revenue-retention";
import { calculateLTVByCohort } from "./ltv";
import { CONTRACTED_METRIC_IDS, getMetricContractIndexEntry } from "./metric-contract-index";

const AS_OF = "2025-03-15T12:00:00.000Z";

function assertClose(actual: number | null, expected: number, label: string): void {
  assert.ok(actual != null, `${label}: expected ${expected}, got null`);
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
      sourceLabel: "met-rev-retention-fixture",
      isDemo: true,
      isUploaded: false,
      customerCount: customers.length,
      orderCount: orders.length,
      productCount: 0,
      lineItemCount: 0,
    },
  };
}

function select(
  ds: RetentionOSDataset,
  opts?: {
    asOfDate?: string;
    reportingPeriod?: { startDate: string; endDateExclusive: string };
    acquisitionPeriod?: { startDate: string; endDateExclusive: string };
    maturityHorizonMonths?: number;
  },
) {
  return buildAnalysisSelection(ds, {
    asOfDate: opts?.asOfDate ?? AS_OF,
    reportingPeriod: opts?.reportingPeriod,
    acquisitionPeriod: opts?.acquisitionPeriod,
    maturityHorizonMonths: opts?.maturityHorizonMonths,
  });
}

function cellAt(result: CohortRevenueRetentionResult, cohort: string, offset: number) {
  const row = result.rows.find((r) => r.cohortMonthKey === cohort);
  assert.ok(row, `missing cohort ${cohort}`);
  const cell = row.cells.find((c) => c.offset === offset);
  assert.ok(cell, `missing offset ${offset} on ${cohort}`);
  return { row, cell };
}

describe("calculateCohortRevenueRetention — commercial formula", () => {
  it("differs from cumulative LTV", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-02-10T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const sel = select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" });
    const retention = calculateCohortRevenueRetention(sel);
    const { cell } = cellAt(retention, "2025-01", 1);
    assertClose(cell.revenue, 40, "period M+1 revenue");
    assertClose(cell.retentionRate!, 0.4, "period retention");

    const ltv = calculateLTVByCohort(ds.customers, ds.orders);
    const ltvM1 = ltv.find((p) => p.cohortKey === "2025-01" && p.offset === 1);
    assert.ok(ltvM1);
    // Cumulative through M+1 = 140, not period 40.
    assertClose(ltvM1.cumulativeAvgGrossRevenue, 140, "cumulative LTV");
    assert.notEqual(cell.revenue, ltvM1.cumulativeAvgGrossRevenue);
  });

  it("Month+0 includes all observed acquisition-month orders", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateCohortRevenueRetention(select(ds));
    const { row, cell } = cellAt(result, "2025-01", 0);
    assertClose(row.month0Revenue!, 150, "month0Revenue");
    assertClose(cell.revenue!, 150, "M+0 revenue");
    assert.equal(cell.orderCount, 2);
  });

  it("Month+1 revenue divided by Month+0 revenue", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 200 }),
        order("o1", "c1", "2025-02-05T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    const { cell } = cellAt(result, "2025-01", 1);
    assertClose(cell.retentionRate!, 50 / 200, "M+1 rate");
  });

  it("revenue retention can exceed 100%", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-02-05T12:00:00.000Z", { gross: 150 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    const { cell } = cellAt(result, "2025-01", 1);
    assertClose(cell.retentionRate!, 1.5, ">100%");
  });

  it("cohort attribution uses canonical firstOrderAt", () => {
    const ds = dataset(
      [customer("c1", "2024-12-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2024-12-05T12:00:00.000Z", { gross: 80 }),
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const result = calculateCohortRevenueRetention(select(ds));
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]!.cohortMonthKey, "2024-12");
  });

  it("multiple customers aggregate correctly", () => {
    const ds = dataset(
      [
        customer("c1", "2025-01-05T12:00:00.000Z"),
        customer("c2", "2025-01-10T12:00:00.000Z"),
      ],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o2", "c2", "2025-01-10T12:00:00.000Z", { gross: 50 }),
        order("o3", "c1", "2025-02-05T12:00:00.000Z", { gross: 30 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    const { row, cell } = cellAt(result, "2025-01", 1);
    assert.equal(row.cohortCustomerCount, 2);
    assertClose(row.month0Revenue!, 150, "month0");
    assertClose(cell.revenue!, 30, "m1");
    assertClose(cell.retentionRate!, 30 / 150, "rate");
  });

  it("multiple orders per customer aggregate correctly", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 40 }),
        order("o2", "c1", "2025-01-15T12:00:00.000Z", { gross: 60 }),
        order("o3", "c1", "2025-02-05T12:00:00.000Z", { gross: 20 }),
        order("o4", "c1", "2025-02-20T12:00:00.000Z", { gross: 10 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    const { cell: m0 } = cellAt(result, "2025-01", 0);
    const { cell: m1 } = cellAt(result, "2025-01", 1);
    assertClose(m0.revenue!, 100, "m0");
    assertClose(m1.revenue!, 30, "m1");
    assert.equal(m1.orderCount, 2);
  });
});

describe("calculateCohortRevenueRetention — population and scope", () => {
  it("reporting-period changes do not alter the matrix", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-02-05T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const a = calculateCohortRevenueRetention(
      select(ds, {
        reportingPeriod: {
          startDate: "2025-01-01T00:00:00.000Z",
          endDateExclusive: "2025-02-01T00:00:00.000Z",
        },
      }),
    );
    const b = calculateCohortRevenueRetention(
      select(ds, {
        reportingPeriod: {
          startDate: "2025-02-01T00:00:00.000Z",
          endDateExclusive: "2025-03-01T00:00:00.000Z",
        },
      }),
    );
    assert.deepEqual(a, b);
  });

  it("bounded acquisition scope limits cohort rows", () => {
    const ds = dataset(
      [
        customer("c_dec", "2024-12-05T12:00:00.000Z"),
        customer("c_jan", "2025-01-05T12:00:00.000Z"),
      ],
      [
        order("o1", "c_dec", "2024-12-05T12:00:00.000Z", { gross: 80 }),
        order("o2", "c_jan", "2025-01-05T12:00:00.000Z", { gross: 100 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, {
        acquisitionPeriod: {
          startDate: "2025-01-01T00:00:00.000Z",
          endDateExclusive: "2025-02-01T00:00:00.000Z",
        },
      }),
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]!.cohortMonthKey, "2025-01");
  });

  it("unbounded scope includes all observed identifiable cohorts", () => {
    const ds = dataset(
      [
        customer("c_dec", "2024-12-05T12:00:00.000Z"),
        customer("c_jan", "2025-01-05T12:00:00.000Z"),
      ],
      [
        order("o1", "c_dec", "2024-12-05T12:00:00.000Z", { gross: 80 }),
        order("o2", "c_jan", "2025-01-05T12:00:00.000Z", { gross: 100 }),
      ],
    );
    const result = calculateCohortRevenueRetention(select(ds));
    assert.deepEqual(
      result.rows.map((r) => r.cohortMonthKey),
      ["2024-12", "2025-01"],
    );
  });

  it("guest orders are excluded without error", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("og", null, "2025-01-10T12:00:00.000Z", { gross: 999 }),
      ],
    );
    const result = calculateCohortRevenueRetention(select(ds));
    const { cell } = cellAt(result, "2025-01", 0);
    assertClose(cell.revenue!, 100, "guest excluded");
  });

  it("no observed eligible customers returns status empty", () => {
    const ds = dataset(
      [customer("c1", "2025-04-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-04-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    assert.equal(result.status, "empty");
    assert.deepEqual(result.rows, []);
    assert.equal(result.eligibleCustomerCount, 0);
  });
});

describe("calculateCohortRevenueRetention — integrity", () => {
  it("orphaned identified order under unbounded scope throws RangeError", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o_orphan", "missing", "2025-01-10T12:00:00.000Z", { gross: 50 }),
      ],
    );
    assert.throws(() => calculateCohortRevenueRetention(select(ds)), RangeError);
  });

  it("orphaned identified order under bounded scope throws RangeError", () => {
    const ds = dataset(
      [
        customer("c_jan", "2025-01-05T12:00:00.000Z"),
        customer("c_dec", "2024-12-05T12:00:00.000Z"),
      ],
      [
        order("o1", "c_jan", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o_orphan", "ghost", "2024-12-10T12:00:00.000Z", { gross: 50 }),
      ],
    );
    assert.throws(
      () =>
        calculateCohortRevenueRetention(
          select(ds, {
            acquisitionPeriod: {
              startDate: "2025-01-01T00:00:00.000Z",
              endDateExclusive: "2025-02-01T00:00:00.000Z",
            },
          }),
        ),
      RangeError,
    );
  });

  it("invalid firstOrderAt throws RangeError", () => {
    const ds = dataset(
      [customer("c1", "not-a-date")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    assert.throws(() => calculateCohortRevenueRetention(select(ds)), RangeError);
  });

  it("orderedAt before firstOrderAt throws RangeError", () => {
    const ds = dataset(
      [customer("c1", "2025-01-15T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    assert.throws(() => calculateCohortRevenueRetention(select(ds)), RangeError);
  });

  it("an order exactly at firstOrderAt is valid", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(select(ds));
    assert.equal(result.status, "available");
    assertClose(result.rows[0]!.month0Revenue!, 100, "exact first");
  });

  it("later acquisition-month orders are included in Month+0", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o2", "c1", "2025-01-28T12:00:00.000Z", { gross: 25 }),
      ],
    );
    const result = calculateCohortRevenueRetention(select(ds));
    assertClose(result.rows[0]!.month0Revenue!, 125, "later m0");
  });

  it("integrity checks happen before acquisition filtering", () => {
    // Orphan outside bounded acquisition still fails (cannot conceal malformed history).
    const ds = dataset(
      [customer("c_jan", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c_jan", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o_bad", "nobody", "2024-11-10T12:00:00.000Z", { gross: 1 }),
      ],
    );
    assert.throws(
      () =>
        calculateCohortRevenueRetention(
          select(ds, {
            acquisitionPeriod: {
              startDate: "2025-01-01T00:00:00.000Z",
              endDateExclusive: "2025-02-01T00:00:00.000Z",
            },
          }),
        ),
      RangeError,
    );
  });
});

describe("calculateCohortRevenueRetention — asOf boundary", () => {
  it("an order after asOfDate does not contribute", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o_future", "c1", "2025-02-20T12:00:00.000Z", { gross: 999 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-02-15T12:00:00.000Z" }),
    );
    const { cell } = cellAt(result, "2025-01", 1);
    assert.equal(cell.maturityStatus, "partial");
    assertClose(cell.revenue!, 0, "future excluded from partial");
  });

  it("an order exactly at asOfDate is excluded", () => {
    const asOf = "2025-02-15T12:00:00.000Z";
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o_exact", "c1", asOf, { gross: 999 }),
      ],
    );
    const result = calculateCohortRevenueRetention(select(ds, { asOfDate: asOf }));
    const { cell } = cellAt(result, "2025-01", 1);
    assertClose(cell.revenue!, 0, "exact asOf excluded");
  });

  it("a customer acquired after asOfDate creates no row", () => {
    const ds = dataset(
      [
        customer("c1", "2025-01-05T12:00:00.000Z"),
        customer("c2", "2025-04-05T12:00:00.000Z"),
      ],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o2", "c2", "2025-04-05T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    assert.deepEqual(
      result.rows.map((r) => r.cohortMonthKey),
      ["2025-01"],
    );
  });

  it("a customer acquired exactly at asOfDate creates no row", () => {
    const asOf = "2025-02-01T00:00:00.000Z";
    const ds = dataset(
      [customer("c1", asOf)],
      [order("o1", "c1", asOf, { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(select(ds, { asOfDate: asOf }));
    assert.equal(result.status, "empty");
    assert.deepEqual(result.rows, []);
  });

  it("changing asOfDate changes partial observed values deterministically", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-02-05T12:00:00.000Z", { gross: 40 }),
        order("o2", "c1", "2025-02-20T12:00:00.000Z", { gross: 60 }),
      ],
    );
    const early = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-02-10T12:00:00.000Z" }),
    );
    const late = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-02-25T12:00:00.000Z" }),
    );
    const e = cellAt(early, "2025-01", 1).cell;
    const l = cellAt(late, "2025-01", 1).cell;
    assert.equal(e.maturityStatus, "partial");
    assert.equal(l.maturityStatus, "partial");
    assertClose(e.revenue!, 40, "early partial");
    assertClose(l.revenue!, 100, "late partial");
  });

  it("later dataset rows do not affect an earlier as-of result", () => {
    const earlyDs = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-02-05T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const withFuture = dataset(
      [...earlyDs.customers],
      [
        ...earlyDs.orders,
        order("o_late", "c1", "2025-04-05T12:00:00.000Z", { gross: 999 }),
      ],
    );
    const asOf = "2025-03-01T00:00:00.000Z";
    const a = calculateCohortRevenueRetention(select(earlyDs, { asOfDate: asOf }));
    const b = calculateCohortRevenueRetention(select(withFuture, { asOfDate: asOf }));
    assert.deepEqual(a, b);
  });
});

describe("calculateCohortRevenueRetention — maturity and zeros", () => {
  it("Month+0 positive revenue gives retentionRate 1", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const { cell } = cellAt(calculateCohortRevenueRetention(select(ds)), "2025-01", 0);
    assertClose(cell.retentionRate!, 1, "m0 rate");
  });

  it("Month+0 zero revenue gives null rates", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 10, refunds: 10 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    for (const cell of result.rows[0]!.cells) {
      if (cell.maturityStatus === "unavailable") {
        assert.equal(cell.retentionRate, null);
      } else {
        assert.equal(cell.retentionRate, null, `offset ${cell.offset}`);
      }
    }
  });

  it("complete zero-activity Month+N gives revenue 0 and rate 0", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    const { cell } = cellAt(result, "2025-01", 1);
    assert.equal(cell.maturityStatus, "complete");
    assert.equal(cell.revenue, 0);
    assert.equal(cell.retentionRate, 0);
    assert.equal(cell.orderCount, 0);
    assert.equal(cell.activeCustomerCount, 0);
  });

  it("partial Month+N returns observed values with status partial", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-02-05T12:00:00.000Z", { gross: 25 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-02-15T12:00:00.000Z" }),
    );
    const { cell } = cellAt(result, "2025-01", 1);
    assert.equal(cell.maturityStatus, "partial");
    assertClose(cell.revenue!, 25, "partial revenue");
    assertClose(cell.retentionRate!, 0.25, "partial rate");
  });

  it("partial is not marked complete", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-02-15T12:00:00.000Z" }),
    );
    const { cell } = cellAt(result, "2025-01", 1);
    assert.equal(cell.maturityStatus, "partial");
    assert.notEqual(cell.maturityStatus, "complete");
  });

  it("future Month+N returns unavailable with null numeric fields", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, {
        asOfDate: "2025-02-15T12:00:00.000Z",
        maturityHorizonMonths: 3,
      }),
    );
    const { cell } = cellAt(result, "2025-01", 3);
    assert.equal(cell.maturityStatus, "unavailable");
    assert.equal(cell.revenue, null);
    assert.equal(cell.retentionRate, null);
    assert.equal(cell.orderCount, null);
    assert.equal(cell.activeCustomerCount, null);
  });

  it("maturityHorizonMonths caps the emitted offsets", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, {
        asOfDate: "2025-06-01T00:00:00.000Z",
        maturityHorizonMonths: 2,
      }),
    );
    assert.equal(result.maxOffset, 2);
    assert.equal(result.rows[0]!.cells.length, 3);
    assert.deepEqual(
      result.rows[0]!.cells.map((c) => c.offset),
      [0, 1, 2],
    );
  });

  it("exact UTC month-boundary maxOffset does not append a wholly future column", () => {
    // January cohort, asOf = 2026-03-01T00:00:00.000Z → latest emitted = February / Month+1
    const ds = dataset(
      [customer("c1", "2026-01-05T12:00:00.000Z")],
      [order("o0", "c1", "2026-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2026-03-01T00:00:00.000Z" }),
    );
    assert.equal(result.maxOffset, 1);
    assert.deepEqual(
      result.rows[0]!.cells.map((c) => c.periodMonthKey),
      ["2026-01", "2026-02"],
    );
    assert.ok(!result.rows[0]!.cells.some((c) => c.periodMonthKey === "2026-03"));
  });

  it("completed zero-activity cell remains distinguishable from unavailable", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, {
        asOfDate: "2025-03-01T00:00:00.000Z",
        maturityHorizonMonths: 3,
      }),
    );
    const zero = cellAt(result, "2025-01", 1).cell;
    const future = cellAt(result, "2025-01", 3).cell;
    assert.equal(zero.maturityStatus, "complete");
    assert.equal(zero.revenue, 0);
    assert.equal(future.maturityStatus, "unavailable");
    assert.equal(future.revenue, null);
  });

  it("zero-net orders preserve order and active-customer counts", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-02-05T12:00:00.000Z", { gross: 50, refunds: 50 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    const { cell } = cellAt(result, "2025-01", 1);
    assert.equal(cell.revenue, 0);
    assert.equal(cell.orderCount, 1);
    assert.equal(cell.activeCustomerCount, 1);
    assert.equal(cell.retentionRate, 0);
  });
});

describe("calculateCohortRevenueRetention — stability and contracts", () => {
  it("exact UTC month boundaries behave correctly", () => {
    const ds = dataset(
      [customer("c1", "2025-01-01T00:00:00.000Z")],
      [
        order("o0", "c1", "2025-01-01T00:00:00.000Z", { gross: 100 }),
        order("o1", "c1", "2025-01-31T23:59:59.000Z", { gross: 20 }),
        order("o2", "c1", "2025-02-01T00:00:00.000Z", { gross: 30 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-03-01T00:00:00.000Z" }),
    );
    const { cell: m0 } = cellAt(result, "2025-01", 0);
    const { cell: m1 } = cellAt(result, "2025-01", 1);
    assertClose(m0.revenue!, 120, "jan boundary");
    assertClose(m1.revenue!, 30, "feb boundary");
  });

  it("cohort rows are chronologically ordered", () => {
    const ds = dataset(
      [
        customer("c2", "2025-02-05T12:00:00.000Z"),
        customer("c1", "2025-01-05T12:00:00.000Z"),
      ],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o2", "c2", "2025-02-05T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { asOfDate: "2025-04-01T00:00:00.000Z" }),
    );
    assert.deepEqual(
      result.rows.map((r) => r.cohortMonthKey),
      ["2025-01", "2025-02"],
    );
  });

  it("cells are ordered by ascending offset", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateCohortRevenueRetention(
      select(ds, { maturityHorizonMonths: 3 }),
    );
    assert.deepEqual(
      result.rows[0]!.cells.map((c) => c.offset),
      [0, 1, 2, 3],
    );
  });

  it("inputs are not mutated", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o0", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const sel = select(ds);
    const customersSnap = structuredClone(sel.fullDataset.customers);
    const ordersSnap = structuredClone(sel.fullDataset.orders);
    const eligibleSnap = [...sel.eligibleCustomerIds].sort();
    calculateCohortRevenueRetention(sel);
    assert.deepEqual(sel.fullDataset.customers, customersSnap);
    assert.deepEqual(sel.fullDataset.orders, ordersSnap);
    assert.deepEqual([...sel.eligibleCustomerIds].sort(), eligibleSnap);
  });

  it("registers cohort_revenue_retention with empty VM and route wiring", () => {
    assert.ok((CONTRACTED_METRIC_IDS as readonly string[]).includes("cohort_revenue_retention"));
    const entry = getMetricContractIndexEntry("cohort_revenue_retention");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
  });
});
