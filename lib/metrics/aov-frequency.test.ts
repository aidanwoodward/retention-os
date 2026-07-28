/**
 * Sprint MET-AOV-FREQ — selected-period AOV and purchase-frequency tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAnalysisSelection } from "../analysis-context";
import type { AnalysisSelection } from "../analysis-context/types";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import { calculateAovFrequency, type AovFrequencyResult } from "./aov-frequency";
import { CONTRACTED_METRIC_IDS, getMetricContractIndexEntry } from "./metric-contract-index";

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
      sourceLabel: "met-aov-freq-fixture",
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
    maturityHorizonMonths?: number;
  },
) {
  return buildAnalysisSelection(ds, {
    asOfDate: opts?.asOfDate ?? AS_OF,
    reportingPeriod: {
      startDate: opts?.reportingStart ?? JAN_START,
      endDateExclusive: opts?.reportingEnd ?? FEB_START,
    },
    ...(opts?.acquisitionPeriod != null ? { acquisitionPeriod: opts.acquisitionPeriod } : {}),
    ...(opts?.maturityHorizonMonths != null
      ? { maturityHorizonMonths: opts.maturityHorizonMonths }
      : {}),
  });
}

function assertPartition(result: AovFrequencyResult): void {
  assert.equal(
    result.classifiedOrderCount + result.unidentifiedOrderCount + result.unresolvedOrderCount,
    result.reportingOrderCount,
    "order partition",
  );
  assertClose(
    result.classifiedRevenue + result.unidentifiedRevenue + result.unresolvedRevenue,
    result.totalReportingRevenue,
    "revenue partition",
  );
}

function assertDecomposition(result: AovFrequencyResult): void {
  if (result.activeCustomerCount === 0 || result.classifiedOrderCount === 0) return;
  assert.ok(result.ordersPerActiveCustomer != null);
  assert.ok(result.classifiedAverageOrderValue != null);
  assert.ok(result.revenuePerActiveCustomer != null);
  assertClose(
    result.activeCustomerCount * result.ordersPerActiveCustomer * result.classifiedAverageOrderValue,
    result.classifiedRevenue,
    "3-factor decomposition",
  );
  assertClose(
    result.ordersPerActiveCustomer * result.classifiedAverageOrderValue,
    result.revenuePerActiveCustomer,
    "freq x classified AOV",
  );
}

describe("calculateAovFrequency", () => {
  it("1: portfolio AOV = total trusted net / reporting order count", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 })],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.totalReportingRevenue, 80, "revenue");
    assert.equal(result.reportingOrderCount, 1);
    assertClose(result.portfolioAverageOrderValue, 80, "portfolio AOV");
  });

  it("2: multiple orders aggregate correctly", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z"), customer("c2", "2025-01-08T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("o2", "c2", "2025-01-12T12:00:00.000Z", { gross: 50, discounts: 10 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.totalReportingRevenue, 140, "revenue");
    assert.equal(result.reportingOrderCount, 2);
    assertClose(result.portfolioAverageOrderValue, 70, "portfolio AOV");
  });

  it("3: zero-net order remains in the AOV denominator", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("o2", "c1", "2025-01-15T12:00:00.000Z", { gross: 50, refunds: 50 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.reportingOrderCount, 2);
    assertClose(result.totalReportingRevenue, 100, "revenue");
    assertClose(result.portfolioAverageOrderValue, 50, "portfolio AOV");
  });

  it("4: fully refunded order remains in the order count", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80, refunds: 80 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.reportingOrderCount, 1);
    assert.equal(result.totalReportingRevenue, 0);
    assertClose(result.portfolioAverageOrderValue, 0, "portfolio AOV 0");
  });

  it("5: portfolio AOV includes guest orders", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("og", null, "2025-01-12T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.reportingOrderCount, 2);
    assertClose(result.portfolioAverageOrderValue, 75, "portfolio AOV");
    assert.equal(result.unidentifiedOrderCount, 1);
  });

  it("6: portfolio AOV includes unresolved identified orders", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("ox", "ghost", "2025-01-12T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.reportingOrderCount, 2);
    assertClose(result.portfolioAverageOrderValue, 75, "portfolio AOV");
    assert.equal(result.unresolvedOrderCount, 1);
  });

  it("7: no reporting orders gives null portfolio AOV", () => {
    const ds = dataset(
      [customer("c1", "2024-12-01T12:00:00.000Z")],
      [order("o0", "c1", "2024-12-15T12:00:00.000Z", { gross: 100 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.status, "empty");
    assert.equal(result.reportingOrderCount, 0);
    assert.equal(result.portfolioAverageOrderValue, null);
    assert.equal(result.customerIdentityOrderCoverage, null);
    assert.equal(result.customerIdentityRevenueCoverage, null);
  });

  it("8: positive order count with zero revenue gives portfolio AOV 0", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40, refunds: 40 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.status, "available");
    assertClose(result.portfolioAverageOrderValue, 0, "portfolio AOV 0");
    assert.equal(result.customerIdentityRevenueCoverage, null);
  });

  it("9: one resolved customer with one order gives frequency 1", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 60 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assertClose(result.ordersPerActiveCustomer, 1, "freq");
  });

  it("10: one resolved customer with multiple orders gives frequency above 1", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 60 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assertClose(result.ordersPerActiveCustomer, 2, "freq");
  });

  it("11: multiple resolved customers are counted distinctly", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z"), customer("c2", "2025-01-08T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 }),
        order("o2", "c2", "2025-01-12T12:00:00.000Z", { gross: 60 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 2);
    assertClose(result.ordersPerActiveCustomer, 1, "freq");
  });

  it("12: a customer with multiple orders is counted once", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 30 }),
        order("o2", "c1", "2025-01-15T12:00:00.000Z", { gross: 30 }),
        order("o3", "c1", "2025-01-20T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assert.equal(result.classifiedOrderCount, 3);
  });

  it("13: guest orders do not increase activeCustomerCount", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }),
        order("og", null, "2025-01-12T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assert.equal(result.unidentifiedOrderCount, 1);
  });

  it("14: unresolved orders do not increase activeCustomerCount", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }),
        order("ox", "ghost", "2025-01-12T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assert.equal(result.unresolvedOrderCount, 1);
  });

  it("15: zero-net resolved orders activate customers", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40, refunds: 40 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assert.equal(result.classifiedOrderCount, 1);
  });

  it("16: classifiedOrderCount includes resolved zero-net orders", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("o2", "c1", "2025-01-15T12:00:00.000Z", { gross: 20, refunds: 20 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.classifiedOrderCount, 2);
    assertClose(result.classifiedRevenue, 100, "classified revenue");
  });

  it("17: ordersPerActiveCustomer is null when activeCustomerCount is zero", () => {
    const ds = dataset([], [order("og", null, "2025-01-10T12:00:00.000Z", { gross: 70 })]);
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 0);
    assert.equal(result.ordersPerActiveCustomer, null);
    assert.equal(result.classifiedAverageOrderValue, null);
    assert.equal(result.revenuePerActiveCustomer, null);
  });

  it("18: classifiedAverageOrderValue = classifiedRevenue / classifiedOrderCount", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.classifiedAverageOrderValue, 75, "classified AOV");
  });

  it("19: revenuePerActiveCustomer = classifiedRevenue / activeCustomerCount", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z"), customer("c2", "2025-01-08T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("o2", "c2", "2025-01-12T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.revenuePerActiveCustomer, 75, "RPA");
  });

  it("20: revenuePerActiveCustomer equals frequency x classified AOV", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z"), customer("c2", "2024-12-01T12:00:00.000Z")],
      [
        order("o0", "c2", "2024-12-01T12:00:00.000Z", { gross: 10 }),
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("o2", "c2", "2025-01-15T12:00:00.000Z", { gross: 40 }),
        order("o3", "c2", "2025-01-20T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertDecomposition(result);
  });

  it("21: active customers x frequency x classified AOV reconciles to classified revenue", () => {
    const ds = dataset(
      [
        customer("c1", "2024-12-05T12:00:00.000Z"),
        customer("c4", "2025-01-05T12:00:00.000Z"),
        customer("c5", "2025-01-10T12:00:00.000Z"),
        customer("c6", "2025-01-12T12:00:00.000Z"),
      ],
      [
        order("o2", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("o6", "c4", "2025-01-05T12:00:00.000Z", { gross: 100 }),
        order("o7", "c4", "2025-01-25T12:00:00.000Z", { gross: 100 }),
        order("o8", "c5", "2025-01-10T12:00:00.000Z", { gross: 60, discounts: 10 }),
        order("o9", "c6", "2025-01-12T12:00:00.000Z", { gross: 80 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 4);
    assertClose(result.ordersPerActiveCustomer, 1.25, "freq");
    assertClose(result.classifiedAverageOrderValue, 82, "classified AOV");
    assertClose(result.classifiedRevenue, 410, "classified revenue");
    assertDecomposition(result);
  });

  it("22: residual guest activity can make portfolio AOV differ from classified AOV", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("og", null, "2025-01-12T12:00:00.000Z", { gross: 20 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.portfolioAverageOrderValue, 60, "portfolio");
    assertClose(result.classifiedAverageOrderValue, 100, "classified");
    assert.notEqual(result.portfolioAverageOrderValue, result.classifiedAverageOrderValue);
  });

  it("23: residual unresolved activity can make portfolio AOV differ from classified AOV", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("ox", "ghost", "2025-01-12T12:00:00.000Z", { gross: 20 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.portfolioAverageOrderValue, 60, "portfolio");
    assertClose(result.classifiedAverageOrderValue, 100, "classified");
  });

  it("24: classifiedAverageOrderValue is null when classifiedOrderCount is zero", () => {
    const ds = dataset([], [order("og", null, "2025-01-10T12:00:00.000Z", { gross: 40 })]);
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.classifiedOrderCount, 0);
    assert.equal(result.classifiedAverageOrderValue, null);
  });

  it("25: classifiedAverageOrderValue is 0 when classified orders exist but revenue is zero", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50, refunds: 50 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.classifiedOrderCount, 1);
    assertClose(result.classifiedAverageOrderValue, 0, "classified AOV 0");
  });

  it("26: revenuePerActiveCustomer is 0 when active customers exist but classified revenue is zero", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50, refunds: 50 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assertClose(result.revenuePerActiveCustomer, 0, "RPA 0");
  });

  it("27: guest order and revenue residuals reconcile", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("og", null, "2025-01-12T12:00:00.000Z", { gross: 20 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.unidentifiedOrderCount, 1);
    assertClose(result.unidentifiedRevenue, 20, "guest rev");
    assertPartition(result);
  });

  it("28: unresolved order and revenue residuals reconcile", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("ox", "ghost", "2025-01-12T12:00:00.000Z", { gross: 25 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.unresolvedOrderCount, 1);
    assertClose(result.unresolvedRevenue, 25, "unresolved rev");
    assertPartition(result);
  });

  it("29-30: classified + unidentified + unresolved equal reporting totals", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("og", null, "2025-01-11T12:00:00.000Z", { gross: 20 }),
        order("ox", "ghost", "2025-01-12T12:00:00.000Z", { gross: 15 }),
      ],
    );
    assertPartition(calculateAovFrequency(select(ds)));
  });

  it("31: order identity coverage is calculated correctly", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }),
        order("og", null, "2025-01-12T12:00:00.000Z", { gross: 100 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.customerIdentityOrderCoverage, 0.5, "order coverage");
  });

  it("32: revenue identity coverage is calculated correctly", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("og", null, "2025-01-12T12:00:00.000Z", { gross: 20 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assertClose(result.customerIdentityRevenueCoverage, 0.8, "revenue coverage");
  });

  it("33: guest-only activity gives zero identity coverage with positive denominators", () => {
    const ds = dataset([], [order("og", null, "2025-01-10T12:00:00.000Z", { gross: 70 })]);
    const result = calculateAovFrequency(select(ds));
    assertClose(result.customerIdentityOrderCoverage, 0, "order coverage");
    assertClose(result.customerIdentityRevenueCoverage, 0, "revenue coverage");
  });

  it("34: unresolved-only activity gives zero identity coverage with positive denominators", () => {
    const ds = dataset([], [order("ox", "ghost", "2025-01-10T12:00:00.000Z", { gross: 55 })]);
    const result = calculateAovFrequency(select(ds));
    assertClose(result.customerIdentityOrderCoverage, 0, "order coverage");
    assertClose(result.customerIdentityRevenueCoverage, 0, "revenue coverage");
  });

  it("35: zero total revenue produces null revenue coverage", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100, refunds: 100 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.customerIdentityRevenueCoverage, null);
    assertClose(result.customerIdentityOrderCoverage, 1, "order coverage");
  });

  it("36: no reporting orders produces null order coverage", () => {
    const ds = dataset([], []);
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.customerIdentityOrderCoverage, null);
  });

  it("37: missing reportingPeriod throws RangeError", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 })],
    );
    const sel = buildAnalysisSelection(ds, { asOfDate: AS_OF });
    assert.throws(() => calculateAovFrequency(sel), RangeError);
  });

  it("38: acquisitionPeriod does not remove older active customers", () => {
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
    const withAcq = calculateAovFrequency(
      select(ds, {
        acquisitionPeriod: {
          startDate: "2025-01-01T00:00:00.000Z",
          endDateExclusive: "2025-02-01T00:00:00.000Z",
        },
      }),
    );
    const without = calculateAovFrequency(select(ds));
    assert.equal(withAcq.activeCustomerCount, 2);
    assert.equal(withAcq.activeCustomerCount, without.activeCustomerCount);
    assertClose(withAcq.classifiedRevenue, without.classifiedRevenue, "revenue");
  });

  it("39: eligibleCustomerIds does not change the selected-period result", () => {
    const ds = dataset(
      [
        customer("c_old", "2024-11-01T12:00:00.000Z"),
        customer("c_jan", "2025-01-05T12:00:00.000Z"),
      ],
      [
        order("o1", "c_old", "2025-01-10T12:00:00.000Z", { gross: 70 }),
        order("o2", "c_jan", "2025-01-05T12:00:00.000Z", { gross: 50 }),
      ],
    );
    const bounded = select(ds, {
      acquisitionPeriod: {
        startDate: "2025-01-01T00:00:00.000Z",
        endDateExclusive: "2025-02-01T00:00:00.000Z",
      },
    });
    assert.equal(bounded.eligibleCustomerIds.has("c_old"), false);
    const result = calculateAovFrequency(bounded);
    assert.equal(result.activeCustomerCount, 2);
    assertClose(result.classifiedRevenue, 120, "includes older");
  });

  it("40: reportingPeriod changes alter the metric deterministically", () => {
    const ds = dataset(
      [customer("c1", "2024-12-05T12:00:00.000Z")],
      [
        order("o_dec", "c1", "2024-12-15T12:00:00.000Z", { gross: 30 }),
        order("o_jan", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }),
        order("o_feb", "c1", "2025-02-10T12:00:00.000Z", { gross: 40 }),
      ],
    );
    const jan = calculateAovFrequency(select(ds));
    const feb = calculateAovFrequency(
      select(ds, { reportingStart: FEB_START, reportingEnd: MAR_START }),
    );
    assertClose(jan.totalReportingRevenue, 80, "jan");
    assertClose(feb.totalReportingRevenue, 40, "feb");
  });

  it("41: exact reporting-period end is excluded by AnalysisSelection", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }),
        order("o_end", "c1", FEB_START, { gross: 99 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.reportingOrderCount, 1);
    assertClose(result.totalReportingRevenue, 50, "excludes end");
  });

  it("42: exact asOfDate order is excluded by AnalysisSelection", () => {
    const asOf = "2025-02-01T00:00:00.000Z";
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 50 }),
        order("o_asof", "c1", asOf, { gross: 99 }),
      ],
    );
    const result = calculateAovFrequency(
      select(ds, { asOfDate: asOf, reportingEnd: asOf }),
    );
    assert.equal(result.reportingOrderCount, 1);
    assertClose(result.totalReportingRevenue, 50, "excludes asOf");
  });

  it("43: metric does not independently re-filter reportingOrders", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 })],
    );
    const base = select(ds);
    const injected = order("o_extra", "c1", "2024-06-01T12:00:00.000Z", { gross: 200 });
    const patched: AnalysisSelection = {
      ...base,
      reportingOrders: [...base.reportingOrders, injected],
    };
    const result = calculateAovFrequency(patched);
    assert.equal(result.reportingOrderCount, 2);
    assertClose(result.totalReportingRevenue, 250, "uses injected reportingOrders");
  });

  it("44: maturityHorizonMonths does not change the result", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 55 })],
    );
    const a = calculateAovFrequency(select(ds));
    const b = calculateAovFrequency(select(ds, { maturityHorizonMonths: 3 }));
    assert.deepEqual(a, b);
  });

  it("45: first-order history and firstOrderAt are not required for classification", () => {
    const ds = dataset(
      [{ id: "c1", firstOrderAt: "2025-01-05T12:00:00.000Z" }],
      [order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 60 })],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.activeCustomerCount, 1);
    assertClose(result.classifiedRevenue, 60, "classified");
  });

  it("46: an unrelated malformed firstOrderAt does not fail AOV/FREQ", () => {
    const ds = dataset(
      [customer("c_ok", "2025-01-05T12:00:00.000Z")],
      [order("o1", "c_ok", "2025-01-05T12:00:00.000Z", { gross: 50 })],
    );
    const base = select(ds);
    // Malformed firstOrderAt would fail selection/new-returning; AOV only resolves by id.
    const patched: AnalysisSelection = {
      ...base,
      fullDataset: {
        ...base.fullDataset,
        customers: [
          ...base.fullDataset.customers,
          { id: "c_bad", firstOrderAt: "not-a-valid-instant" },
        ],
      },
    };
    const result = calculateAovFrequency(patched);
    assert.equal(result.status, "available");
    assert.equal(result.activeCustomerCount, 1);
    assertClose(result.classifiedRevenue, 50, "ok only");
  });

  it("47: input arrays and objects are not mutated", () => {
    const customers = [customer("c1", "2025-01-05T12:00:00.000Z")];
    const orders = [
      order("o2", "c1", "2025-01-20T12:00:00.000Z", { gross: 30 }),
      order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 70 }),
    ];
    const ordersBefore = orders.map((o) => o.id);
    const ds = dataset(customers, orders);
    const sel = select(ds);
    const reportingBefore = sel.reportingOrders.map((o) => o.id);
    calculateAovFrequency(sel);
    assert.deepEqual(
      orders.map((o) => o.id),
      ordersBefore,
    );
    assert.deepEqual(
      sel.reportingOrders.map((o) => o.id),
      reportingBefore,
    );
  });

  it("48: duplicate-order policy follows verified canonical invariant (no silent dedupe)", () => {
    const ds = dataset(
      [customer("c1", "2025-01-05T12:00:00.000Z")],
      [
        order("dup", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 }),
        order("dup", "c1", "2025-01-15T12:00:00.000Z", { gross: 60 }),
      ],
    );
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.reportingOrderCount, 2);
    assertClose(result.totalReportingRevenue, 100, "no silent dedupe");
  });

  it("50: metric contract uses empty viewModelBuilders and uiRoutes", () => {
    assert.ok((CONTRACTED_METRIC_IDS as readonly string[]).includes("aov_frequency"));
    const entry = getMetricContractIndexEntry("aov_frequency");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
    assert.ok(entry.engineEntrypoints.some((e) => e.includes("calculateAovFrequency")));
  });

  it("52: does not depend on calculateNewReturningMix (engine-local classification)", () => {
    const ds = dataset(
      [
        customer("c_ok", "2025-01-05T12:00:00.000Z"),
        customer("c_bad", "2025-06-01T12:00:00.000Z"),
      ],
      [
        order("o_ok", "c_ok", "2025-01-05T12:00:00.000Z", { gross: 40 }),
        order("o_bad", "c_bad", "2025-01-10T12:00:00.000Z", { gross: 30 }),
        order("o_hist", "c_bad", "2024-01-01T12:00:00.000Z", { gross: 10 }),
      ],
    );
    // Would fail new-returning integrity (order before firstOrderAt) but AOV/FREQ must succeed.
    const result = calculateAovFrequency(select(ds));
    assert.equal(result.status, "available");
    assert.equal(result.activeCustomerCount, 2);
    assertClose(result.classifiedRevenue, 70, "both classified without first-order checks");
  });
});
