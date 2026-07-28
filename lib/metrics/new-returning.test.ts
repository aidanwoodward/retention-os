/**
 * Sprint MET-NEW-RETURN — selected-period new vs returning mix tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAnalysisSelection } from "../analysis-context";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import { CONTRACTED_METRIC_IDS, getMetricContractIndexEntry } from "./metric-contract-index";
import { calculateNewReturningMix, type NewReturningMixResult } from "./new-returning";

const JAN_START = "2025-01-01T00:00:00.000Z";
const FEB_START = "2025-02-01T00:00:00.000Z";
const MAR_START = "2025-03-01T00:00:00.000Z";
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

function dataset(customers: readonly Customer[], orders: readonly Order[]): RetentionOSDataset {
  return {
    customers,
    orders,
    products: [],
    meta: {
      sourceType: "demo",
      sourceLabel: "met-new-return-fixture",
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
    reportingStart?: string;
    reportingEnd?: string;
    asOfDate?: string;
    acquisitionPeriod?: { startDate: string; endDateExclusive: string };
  },
) {
  return buildAnalysisSelection(ds, {
    asOfDate: opts?.asOfDate ?? AS_OF,
    reportingPeriod: {
      startDate: opts?.reportingStart ?? JAN_START,
      endDateExclusive: opts?.reportingEnd ?? FEB_START,
    },
    ...(opts?.acquisitionPeriod != null ? { acquisitionPeriod: opts.acquisitionPeriod } : {}),
  });
}

function assertAmountRecon(result: NewReturningMixResult): void {
  assertClose(
    result.classifiedRevenue + result.unidentifiedRevenue + result.unresolvedRevenue,
    result.totalReportingRevenue,
    "amount reconciliation",
  );
  assertClose(result.newRevenue + result.returningRevenue, result.classifiedRevenue, "classified sum");
  assert.equal(
    result.newCustomerCount + result.returningCustomerCount,
    result.classifiedActiveCustomerCount,
  );
}

describe("calculateNewReturningMix", () => {
  it("1: acquired before period and active → returning customer", () => {
    const ds = dataset(
      [customer("c1", "2024-12-05T12:00:00.000Z")],
      [
        order("o0", "c1", "2024-12-05T12:00:00.000Z", { gross: 10 }),
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.returningCustomerCount, 1);
    assert.equal(result.newCustomerCount, 0);
    assertClose(result.returningRevenue, 80, "returning rev");
    assertClose(result.newRevenue, 0, "new rev");
  });

  it("2: acquired inside period → new customer", () => {
    const ds = dataset(
      [customer("c1", "2025-01-10T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.newCustomerCount, 1);
    assert.equal(result.returningCustomerCount, 0);
    assertClose(result.newRevenue, 50, "new rev");
  });

  it("3: acquired exactly at period start → new customer", () => {
    const ds = dataset(
      [customer("c1", JAN_START)],
      [order("o1", "c1", JAN_START, { gross: 40 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.newCustomerCount, 1);
    assertClose(result.newRevenue, 40, "new at start");
  });

  it("4: first visible order in period but firstOrderAt before → returning", () => {
    const ds = dataset(
      [customer("c1", "2024-06-01T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-15T12:00:00.000Z", { gross: 90 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.returningCustomerCount, 1);
    assert.equal(result.newCustomerCount, 0);
    assertClose(result.returningRevenue, 90, "history-gap returning only");
    assertClose(result.newRevenue, 0, "no synthetic new");
  });

  it("5: canonical first order in period → new revenue", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.newRevenue, 100, "first order new");
  });

  it("6: second order in same period → returning revenue", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 60 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.newRevenue, 100, "first");
    assertClose(result.returningRevenue, 60, "second");
  });

  it("7: first and second in period → one new customer only", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 100 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.newCustomerCount, 1);
    assert.equal(result.returningCustomerCount, 0);
    assert.equal(result.classifiedActiveCustomerCount, 1);
  });

  it("8: returning customer with multiple orders → counted once", () => {
    const ds = dataset(
      [customer("c1", "2024-11-01T12:00:00.000Z")],
      [
        order("o0", "c1", "2024-11-01T12:00:00.000Z", { gross: 10 }),
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 20 }),
        order("o2", "c1", "2025-01-25T12:00:00.000Z", { gross: 30 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.returningCustomerCount, 1);
    assertClose(result.returningRevenue, 50, "both reporting returning");
  });

  it("9: multiple customers aggregate correctly", () => {
    const ds = dataset(
      [
        customer("c_new", "2025-01-05T12:00:00.000Z"),
        customer("c_ret", "2024-12-01T12:00:00.000Z"),
      ],
      [
        order("o_n", "c_new", "2025-01-05T12:00:00.000Z", { gross: 40 }),
        order("o_r0", "c_ret", "2024-12-01T12:00:00.000Z", { gross: 10 }),
        order("o_r1", "c_ret", "2025-01-10T12:00:00.000Z", { gross: 60 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.newCustomerCount, 1);
    assert.equal(result.returningCustomerCount, 1);
    assertClose(result.newRevenue, 40, "new");
    assertClose(result.returningRevenue, 60, "ret");
    assertAmountRecon(result);
  });

  it("10: guest revenue → unidentifiedRevenue", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 50 }),
        order("og", null, "2025-01-10T12:00:00.000Z", { gross: 30 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.unidentifiedRevenue, 30, "guest");
    assertClose(result.classifiedRevenue, 50, "classified");
    assertAmountRecon(result);
  });

  it("11: guest orders do not affect customer counts", () => {
    const ds = dataset([], [order("og", null, "2025-01-10T12:00:00.000Z", { gross: 70 })]);
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.newCustomerCount, 0);
    assert.equal(result.returningCustomerCount, 0);
    assert.equal(result.classifiedActiveCustomerCount, 0);
    assertClose(result.unidentifiedRevenue, 70, "all guest");
  });

  it("12: missing canonical customer → unresolvedRevenue without throwing", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 40 }),
        order("ox", "missing", "2025-01-12T12:00:00.000Z", { gross: 25 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.unresolvedRevenue, 25, "unresolved");
    assert.equal(result.newCustomerCount, 1);
    assertAmountRecon(result);
  });

  it("13: amount reconciliation includes unidentified and unresolved", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("og", null, "2025-01-08T12:00:00.000Z", { gross: 20 }),
        order("ox", "ghost", "2025-01-09T12:00:00.000Z", { gross: 15 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.totalReportingRevenue, 135, "total");
    assertAmountRecon(result);
  });

  it("14: fully refunded first order preserves activity and £0 new revenue", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100, refunds: 100 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.newCustomerCount, 1);
    assertClose(result.newRevenue, 0, "zero new");
    assert.equal(result.status, "available");
  });

  it("15: fully refunded repeat order preserves activity and £0 returning revenue", () => {
    const ds = dataset(
      [customer("c1", "2024-12-01T12:00:00.000Z")],
      [
        order("o0", "c1", "2024-12-01T12:00:00.000Z", { gross: 50 }),
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80, refunds: 80 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.returningCustomerCount, 1);
    assertClose(result.returningRevenue, 0, "zero returning");
  });

  it("16: no reporting activity → empty", () => {
    const ds = dataset(
      [customer("c1", "2024-12-01T12:00:00.000Z")],
      [order("o0", "c1", "2024-12-01T12:00:00.000Z", { gross: 50 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.status, "empty");
    assert.equal(result.reportingOrderCount, 0);
    assert.equal(result.totalReportingRevenue, 0);
    assert.equal(result.newCustomerShare, null);
    assert.equal(result.revenueClassificationCoverage, null);
  });

  it("17: invalid firstOrderAt on reporting-active customer → RangeError", () => {
    const badOrder = order("o1", "c_bad", "2025-01-10T12:00:00.000Z", { gross: 50 });
    const badCustomer = customer("c_bad", "not-a-date");
    // Hand-built selection: metric must throw (buildAnalysisSelection also rejects bad dates).
    const selection = {
      context: {
        asOfDate: AS_OF,
        reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
      },
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
    assert.throws(() => calculateNewReturningMix(selection), RangeError);
  });

  it("18: observed order before firstOrderAt → RangeError", () => {
    const ds = dataset(
      [customer("c1", "2025-01-15T12:00:00.000Z")],
      [
        order("o_early", "c1", "2025-01-05T12:00:00.000Z", { gross: 40 }),
        order("o1", "c1", "2025-01-15T12:00:00.000Z", { gross: 50 }),
      ],
    );
    assert.throws(() => calculateNewReturningMix(select(ds)), RangeError);
  });

  it("19: missing reportingPeriod → RangeError", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 50 })],
    );
    const sel = buildAnalysisSelection(ds, { asOfDate: AS_OF });
    assert.equal(sel.context.reportingPeriod, undefined);
    assert.throws(() => calculateNewReturningMix(sel), RangeError);
  });

  it("20: exact asOfDate reporting order is excluded by AnalysisSelection", () => {
    const asOf = "2025-02-01T00:00:00.000Z";
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 50 }),
        order("o_asof", "c1", asOf, { gross: 999 }),
      ],
    );
    const result = calculateNewReturningMix(
      select(ds, { asOfDate: asOf, reportingEnd: asOf }),
    );
    assert.equal(result.reportingOrderCount, 1);
    assertClose(result.totalReportingRevenue, 50, "asOf excluded");
  });

  it("21: exact reporting-period end is excluded", () => {
    const ds = dataset(
      [customer("c1", "2024-12-01T12:00:00.000Z")],
      [
        order("o0", "c1", "2024-12-01T12:00:00.000Z", { gross: 10 }),
        order("o_start", "c1", JAN_START, { gross: 40 }),
        order("o_end", "c1", FEB_START, { gross: 60 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.reportingOrderCount, 1);
    assertClose(result.totalReportingRevenue, 40, "end excluded");
  });

  it("22: full-history identity scan excludes orders at or after asOfDate", () => {
    // Future order after asOf shares earliest timestamp with first — must not steal first identity.
    const asOf = "2025-02-01T00:00:00.000Z";
    const ts = "2025-01-05T12:00:00.000Z";
    const ds = dataset(
      [customer("c1", ts)],
      [
        order("o_z_future", "c1", "2025-06-01T12:00:00.000Z", { gross: 1 }),
        order("o_a_first", "c1", ts, { gross: 100 }),
        order("o_b_second", "c1", "2025-01-20T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateNewReturningMix(
      select(ds, { asOfDate: asOf, reportingEnd: asOf }),
    );
    assertClose(result.newRevenue, 100, "first not influenced by future");
    assertClose(result.returningRevenue, 50, "second");
  });

  it("23: first-order identity is independent of input array order", () => {
    const ts = "2025-01-05T12:00:00.000Z";
    const customers = [customer("c1", ts)];
    const ordersA = [
      order("o_b", "c1", ts, { gross: 20 }),
      order("o_a", "c1", ts, { gross: 80 }),
    ];
    const ordersB = [
      order("o_a", "c1", ts, { gross: 80 }),
      order("o_b", "c1", ts, { gross: 20 }),
    ];
    const a = calculateNewReturningMix(select(dataset(customers, ordersA)));
    const b = calculateNewReturningMix(select(dataset(customers, ordersB)));
    assertClose(a.newRevenue, b.newRevenue, "new equal");
    assertClose(a.returningRevenue, b.returningRevenue, "ret equal");
    // o_a wins id tie-break → new 80, returning 20
    assertClose(a.newRevenue, 80, "id tie-break new");
    assertClose(a.returningRevenue, 20, "id tie-break ret");
  });

  it("24: exact timestamp ties use stable order-ID ordering", () => {
    const ts = "2025-01-10T12:00:00.000Z";
    const ds = dataset(
      [customer("c1", ts)],
      [
        order("ord_z", "c1", ts, { gross: 30 }),
        order("ord_a", "c1", ts, { gross: 70 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.newRevenue, 70, "ord_a is first");
    assertClose(result.returningRevenue, 30, "ord_z returning");
  });

  it("25: history-gap customer receives returning revenue only", () => {
    const ds = dataset(
      [customer("c1", "2024-01-01T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 55 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.returningCustomerCount, 1);
    assertClose(result.newRevenue, 0, "no new");
    assertClose(result.returningRevenue, 55, "all returning");
  });

  it("26: reporting-period changes alter results deterministically", () => {
    const ds = dataset(
      [
        customer("c_dec", "2024-12-05T12:00:00.000Z"),
        customer("c_jan", "2025-01-05T12:00:00.000Z"),
      ],
      [
        order("o_dec", "c_dec", "2024-12-05T12:00:00.000Z", { gross: 10 }),
        order("o_dec_jan", "c_dec", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("o_jan", "c_jan", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o_feb", "c_jan", "2025-02-10T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const jan = calculateNewReturningMix(select(ds));
    const feb = calculateNewReturningMix(
      select(ds, { reportingStart: FEB_START, reportingEnd: MAR_START }),
    );
    assert.equal(jan.newCustomerCount, 1);
    assert.equal(jan.returningCustomerCount, 1);
    assertClose(jan.newRevenue, 100, "jan new");
    assertClose(jan.returningRevenue, 80, "jan ret");
    assert.equal(feb.newCustomerCount, 0);
    assert.equal(feb.returningCustomerCount, 1);
    assertClose(feb.returningRevenue, 40, "feb ret");
  });

  it("27: acquisitionPeriod does not remove returning customers", () => {
    const ds = dataset(
      [
        customer("c_old", "2024-11-01T12:00:00.000Z"),
        customer("c_jan", "2025-01-05T12:00:00.000Z"),
      ],
      [
        order("o0", "c_old", "2024-11-01T12:00:00.000Z", { gross: 10 }),
        order("o1", "c_old", "2025-01-10T12:00:00.000Z", { gross: 70 }),
        order("o2", "c_jan", "2025-01-05T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateNewReturningMix(
      select(ds, {
        acquisitionPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
      }),
    );
    assert.equal(result.returningCustomerCount, 1);
    assert.equal(result.newCustomerCount, 1);
    assertClose(result.returningRevenue, 70, "returning kept");
  });

  it("28: only reporting-active resolved histories are validated", () => {
    // Inactive customer has contradictory history (order before firstOrderAt) but no
    // reporting-period activity — must not fail the selected-period metric.
    const ds = dataset(
      [
        customer("c_active", "2025-01-05T12:00:00.000Z"),
        customer("c_bad", "2024-12-15T12:00:00.000Z"),
      ],
      [
        order("o1", "c_active", "2025-01-05T12:00:00.000Z", { gross: 50 }),
        order("o_before_first", "c_bad", "2024-06-01T12:00:00.000Z", { gross: 10 }),
        order("o_first_label", "c_bad", "2024-12-15T12:00:00.000Z", { gross: 10 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.newCustomerCount, 1);
    assertClose(result.newRevenue, 50, "active only");
  });

  it("29: unrelated malformed customer history does not fail the metric", () => {
    const ds = dataset(
      [
        customer("c_ok", "2025-01-05T12:00:00.000Z"),
        customer("c_contradiction", "2025-06-01T12:00:00.000Z"),
      ],
      [
        order("o_ok", "c_ok", "2025-01-05T12:00:00.000Z", { gross: 40 }),
        // Contradiction: order before firstOrderAt, but outside reporting period → ignored
        order("o_bad", "c_contradiction", "2024-01-01T12:00:00.000Z", { gross: 10 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.status, "available");
    assert.equal(result.newCustomerCount, 1);
  });

  it("30: new and returning customer shares sum to 1", () => {
    const ds = dataset(
      [
        customer("c_n", "2025-01-05T12:00:00.000Z"),
        customer("c_r", "2024-12-01T12:00:00.000Z"),
      ],
      [
        order("o_n", "c_n", "2025-01-05T12:00:00.000Z", { gross: 10 }),
        order("o_r0", "c_r", "2024-12-01T12:00:00.000Z", { gross: 5 }),
        order("o_r1", "c_r", "2025-01-10T12:00:00.000Z", { gross: 10 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.newCustomerShare! + result.returningCustomerShare!, 1, "customer shares");
  });

  it("31: new and returning classified revenue shares sum to 1", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 40 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 60 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(
      result.newRevenueShareOfClassifiedRevenue! + result.returningRevenueShareOfClassifiedRevenue!,
      1,
      "classified revenue shares",
    );
  });

  it("32: guest revenue lowers coverage but does not distort classified mix", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 80 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 20 }),
        order("og", null, "2025-01-15T12:00:00.000Z", { gross: 100 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.newRevenueShareOfClassifiedRevenue!, 0.8, "mix new");
    assertClose(result.returningRevenueShareOfClassifiedRevenue!, 0.2, "mix ret");
    assertClose(result.revenueClassificationCoverage!, 0.5, "coverage");
  });

  it("33: unresolved revenue lowers coverage but does not distort classified mix", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 75 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 25 }),
        order("ox", "ghost", "2025-01-15T12:00:00.000Z", { gross: 100 }),
      ],
    );
    const result = calculateNewReturningMix(select(ds));
    assertClose(result.newRevenueShareOfClassifiedRevenue!, 0.75, "mix new");
    assertClose(result.returningRevenueShareOfClassifiedRevenue!, 0.25, "mix ret");
    assertClose(result.revenueClassificationCoverage!, 0.5, "coverage");
  });

  it("34: classifiedRevenue = 0 gives null classified revenue shares", () => {
    const ds = dataset([], [order("og", null, "2025-01-10T12:00:00.000Z", { gross: 50 })]);
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.classifiedRevenue, 0);
    assert.equal(result.newRevenueShareOfClassifiedRevenue, null);
    assert.equal(result.returningRevenueShareOfClassifiedRevenue, null);
    assertClose(result.revenueClassificationCoverage!, 0, "coverage 0");
  });

  it("35: totalReportingRevenue = 0 gives null coverage", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 100, refunds: 100 })],
    );
    const result = calculateNewReturningMix(select(ds));
    assert.equal(result.status, "available");
    assert.equal(result.totalReportingRevenue, 0);
    assert.equal(result.revenueClassificationCoverage, null);
    assert.equal(result.newRevenueShareOfClassifiedRevenue, null);
    assert.equal(result.newCustomerCount, 1);
  });

  it("36: inputs are not mutated", () => {
    const customers = [customer("c1", "2025-01-05T12:00:00.000Z")];
    const orders = [
      order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 30 }),
      order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 70 }),
    ];
    const ordersBefore = orders.map((o) => o.id);
    const ds = dataset(customers, orders);
    const sel = select(ds);
    const reportingBefore = sel.reportingOrders.map((o) => o.id);
    calculateNewReturningMix(sel);
    assert.deepEqual(
      orders.map((o) => o.id),
      ordersBefore,
    );
    assert.deepEqual(
      sel.reportingOrders.map((o) => o.id),
      reportingBefore,
    );
  });

  it("38: metric contract uses empty viewModelBuilders and uiRoutes", () => {
    assert.ok((CONTRACTED_METRIC_IDS as readonly string[]).includes("new_returning_mix"));
    const entry = getMetricContractIndexEntry("new_returning_mix");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
    assert.ok(entry.engineEntrypoints.some((e) => e.includes("calculateNewReturningMix")));
  });
});
