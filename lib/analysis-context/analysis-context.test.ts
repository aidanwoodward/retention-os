import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { MarketingSpend } from "../types/marketing";
import type { Order } from "../types/order";
import {
  buildAnalysisSelection,
  getMonthlyCohortMaturityStatus,
  inferConservativeAsOfDateFromDataset,
  isCompletedMaturityOffsetAvailable,
  utcMonthStartInstant,
} from "./index";

function customer(id: string, firstOrderAt: string): Customer {
  return { id, firstOrderAt };
}

function order(
  id: string,
  customerId: string | null,
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

function fixture(partial?: {
  customers?: readonly Customer[];
  orders?: readonly Order[];
  marketingSpend?: readonly MarketingSpend[];
}): RetentionOSDataset {
  const customers = partial?.customers ?? [
    customer("c_before", "2024-11-10T12:00:00.000Z"),
    customer("c_jan", "2025-01-05T12:00:00.000Z"),
    customer("c_feb", "2025-02-10T12:00:00.000Z"),
  ];
  const orders = partial?.orders ?? [
    order("o_before_acq", "c_before", "2024-11-10T12:00:00.000Z"),
    order("o_before_in_jan", "c_before", "2025-01-15T12:00:00.000Z"),
    order("o_jan_acq", "c_jan", "2025-01-05T12:00:00.000Z"),
    order("o_feb_acq", "c_feb", "2025-02-10T12:00:00.000Z"),
    order("o_guest_jan", null, "2025-01-20T12:00:00.000Z"),
  ];
  return {
    customers,
    orders,
    products: [],
    marketingSpend: partial?.marketingSpend ?? [
      { month: "2024-11", spend: 50 },
      { month: "2025-01-01", spend: 100 },
      { month: "2025-02", spend: 80 },
    ],
    meta: {
      sourceType: "demo",
      sourceLabel: "analysis-context-fixture",
      isDemo: true,
      isUploaded: false,
      customerCount: customers.length,
      orderCount: orders.length,
      productCount: 0,
      lineItemCount: 0,
    },
  };
}

const JAN_START = "2025-01-01T00:00:00.000Z";
const FEB_START = "2025-02-01T00:00:00.000Z";
const MAR_START = "2025-03-01T00:00:00.000Z";
const AS_OF_END_JAN = "2025-01-31T23:59:59.000Z";
const AS_OF_MID_FEB = "2025-02-15T12:00:00.000Z";
const AS_OF_MAR_1 = "2025-03-01T00:00:00.000Z";

describe("analysis-context reporting period", () => {
  it("keeps customer acquired before reporting period as returning-classifiable", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const before = sel.fullDataset.customers.find((c) => c.id === "c_before")!;
    assert.ok(before.firstOrderAt < JAN_START);
    assert.ok(sel.reportingOrders.some((o) => o.id === "o_before_in_jan"));
    assert.equal(before.firstOrderAt, "2024-11-10T12:00:00.000Z");
  });

  it("treats customer acquired inside reporting period as new-classifiable", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const jan = sel.fullDataset.customers.find((c) => c.id === "c_jan")!;
    assert.ok(jan.firstOrderAt >= JAN_START && jan.firstOrderAt < FEB_START);
  });

  it("does not rewrite firstOrderAt when filtering reporting orders", () => {
    const dataset = fixture();
    const before = dataset.customers.map((c) => ({ ...c }));
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    assert.deepEqual(
      sel.fullDataset.customers.map((c) => c.firstOrderAt),
      before.map((c) => c.firstOrderAt),
    );
    assert.equal(sel.fullDataset, dataset);
  });

  it("includes orders exactly on start boundary", () => {
    const dataset = fixture({
      orders: [order("on_start", "c_jan", JAN_START)],
      customers: [customer("c_jan", JAN_START)],
    });
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    assert.equal(sel.reportingOrders.length, 1);
  });

  it("excludes orders exactly on end boundary", () => {
    const dataset = fixture({
      orders: [order("on_end", "c_jan", FEB_START)],
      customers: [customer("c_jan", "2025-01-05T12:00:00.000Z")],
    });
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    assert.equal(sel.reportingOrders.length, 0);
  });

  it("represents empty reporting population with zero completeness", () => {
    const dataset = fixture({
      orders: [order("old", "c_before", "2024-11-10T12:00:00.000Z")],
    });
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    assert.equal(sel.reportingOrders.length, 0);
    assert.equal(sel.completeness.reportingOrderCount, 0);
    assert.equal(sel.completeness.identifiableReportingOrderCount, 0);
    assert.equal(sel.completeness.guestReportingOrderCount, 0);
  });

  it("supports arbitrary non-month reporting windows (half-month)", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: {
        startDate: "2025-01-01T00:00:00.000Z",
        endDateExclusive: "2025-01-16T00:00:00.000Z",
      },
    });
    assert.ok(sel.reportingOrders.every((o) => o.orderedAt < "2025-01-16T00:00:00.000Z"));
    assert.ok(sel.reportingOrders.some((o) => o.id === "o_jan_acq"));
    assert.ok(sel.reportingOrders.some((o) => o.id === "o_before_in_jan"));
    assert.ok(!sel.reportingOrders.some((o) => o.id === "o_guest_jan")); // Jan 20 outside half-month
  });
});

describe("analysis-context acquisition vs reporting", () => {
  it("acquisition-period selection differs from reporting-period selection", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
      acquisitionPeriod: { startDate: FEB_START, endDateExclusive: MAR_START },
    });
    assert.ok(sel.eligibleCustomerIds.has("c_feb"));
    assert.ok(!sel.eligibleCustomerIds.has("c_jan"));
    assert.ok(sel.reportingOrders.some((o) => o.id === "o_jan_acq"));
    assert.ok(!sel.reportingOrders.some((o) => o.id === "o_feb_acq"));
  });

  it("bounded acquisition applies identical month coverage to customers and spend", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      acquisitionPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    assert.equal(sel.completeness.acquisitionScope, "bounded");
    assert.equal(sel.completeness.acquisitionMonthKeyCount, 1);
    assert.deepEqual([...sel.eligibleCustomerIds].sort(), ["c_jan"]);
    assert.equal(sel.selectedMarketingSpend.length, 1);
    assert.equal(sel.selectedMarketingSpend[0]!.spend, 100);
  });

  it("no acquisitionPeriod selects all identifiable customers and all valid spend", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
    });
    assert.equal(sel.completeness.acquisitionScope, "all");
    assert.equal(sel.eligibleCustomerIds.size, 3);
    assert.equal(sel.selectedMarketingSpend.length, 3);
    assert.ok(sel.completeness.acquisitionMonthKeyCount > 0);
  });

  it("reportingOrdersForEligibleCustomers intersects reporting and acquisition scopes", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
      acquisitionPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    const ids = sel.reportingOrdersForEligibleCustomers.map((o) => o.id).sort();
    assert.deepEqual(ids, ["o_jan_acq"]);
    assert.ok(sel.reportingOrders.some((o) => o.id === "o_guest_jan"));
    assert.ok(sel.reportingOrders.some((o) => o.id === "o_before_in_jan"));
    assert.ok(!sel.reportingOrdersForEligibleCustomers.some((o) => o.customerId === "c_before"));
  });
});

describe("analysis-context guests", () => {
  it("includes guest in reportingOrders but excludes from identifiable and eligible sets", () => {
    const dataset = fixture();
    const sel = buildAnalysisSelection(dataset, {
      asOfDate: AS_OF_MID_FEB,
      reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
    });
    assert.ok(sel.reportingOrders.some((o) => o.id === "o_guest_jan"));
    assert.ok(!sel.identifiableReportingOrders.some((o) => o.id === "o_guest_jan"));
    assert.equal(sel.completeness.guestReportingOrderCount, 1);
    for (const id of sel.eligibleCustomerIds) {
      assert.notEqual(id, null);
    }
  });
});

describe("analysis-context validation", () => {
  it("throws on inverted reporting period", () => {
    const dataset = fixture();
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: AS_OF_MID_FEB,
          reportingPeriod: { startDate: FEB_START, endDateExclusive: JAN_START },
        }),
      RangeError,
    );
  });

  it("throws on non-month-aligned acquisition period", () => {
    const dataset = fixture();
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: AS_OF_MID_FEB,
          acquisitionPeriod: {
            startDate: "2025-01-15T00:00:00.000Z",
            endDateExclusive: FEB_START,
          },
        }),
      RangeError,
    );
  });

  it("throws on non-canonical or non-UTC boundaries", () => {
    const dataset = fixture();
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: "2025-02-15T12:00:00+01:00",
        }),
      RangeError,
    );
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: "2025-02-15T12:00:00Z",
        }),
      RangeError,
    );
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: AS_OF_MID_FEB,
          reportingPeriod: {
            startDate: "2025-01-01",
            endDateExclusive: FEB_START,
          },
        }),
      RangeError,
    );
  });

  it("throws when reporting end exceeds asOfDate", () => {
    const dataset = fixture();
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: AS_OF_END_JAN,
          reportingPeriod: { startDate: JAN_START, endDateExclusive: FEB_START },
        }),
      RangeError,
    );
  });

  it("throws on negative or fractional maturityHorizonMonths", () => {
    const dataset = fixture();
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: AS_OF_MID_FEB,
          maturityHorizonMonths: -1,
        }),
      RangeError,
    );
    assert.throws(
      () =>
        buildAnalysisSelection(dataset, {
          asOfDate: AS_OF_MID_FEB,
          maturityHorizonMonths: 1.5,
        }),
      RangeError,
    );
  });
});

describe("analysis-context maturity status", () => {
  it("January cohort as-of 31 Jan: Month+0 partial, Month+1 unavailable", () => {
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 0, AS_OF_END_JAN),
      "partial",
    );
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 1, AS_OF_END_JAN),
      "unavailable",
    );
    assert.equal(isCompletedMaturityOffsetAvailable("2025-01", 0, AS_OF_END_JAN), false);
  });

  it("January cohort as-of 15 Feb: Month+0 complete, Month+1 partial", () => {
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 0, AS_OF_MID_FEB),
      "complete",
    );
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 1, AS_OF_MID_FEB),
      "partial",
    );
    assert.equal(isCompletedMaturityOffsetAvailable("2025-01", 0, AS_OF_MID_FEB), true);
    assert.equal(isCompletedMaturityOffsetAvailable("2025-01", 1, AS_OF_MID_FEB), false);
  });

  it("January cohort as-of 1 March: Month+1 complete", () => {
    assert.equal(getMonthlyCohortMaturityStatus("2025-01", 1, AS_OF_MAR_1), "complete");
    assert.equal(isCompletedMaturityOffsetAvailable("2025-01", 1, AS_OF_MAR_1), true);
  });

  it("mid-month asOf does not complete the current Month+N", () => {
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 1, "2025-02-28T23:59:59.000Z"),
      "partial",
    );
  });

  it("Month+N unlocks exactly at the next UTC month boundary", () => {
    const justBefore = "2025-03-01T00:00:00.000Z";
    // first instant of Month+2 for Jan cohort is Mar 1 — complete at exactly that instant
    assert.equal(getMonthlyCohortMaturityStatus("2025-01", 1, justBefore), "complete");
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 1, "2025-02-28T23:59:59.999Z"),
      "partial",
    );
    assert.equal(utcMonthStartInstant("2025-03"), MAR_START);
  });

  it("asOfDate controls maturity rather than system clock", () => {
    const status = getMonthlyCohortMaturityStatus("2025-01", 0, AS_OF_END_JAN);
    assert.equal(status, "partial");
    // Wall clock must not flip this fixture
    assert.notEqual(status, getMonthlyCohortMaturityStatus("2025-01", 0, AS_OF_MAR_1));
  });

  it("offset beyond maturityHorizonMonths is unavailable", () => {
    assert.equal(
      getMonthlyCohortMaturityStatus("2025-01", 2, AS_OF_MAR_1, 1),
      "unavailable",
    );
    assert.equal(isCompletedMaturityOffsetAvailable("2025-01", 1, AS_OF_MAR_1, 1), true);
  });

  it("negative offset throws", () => {
    assert.throws(
      () => getMonthlyCohortMaturityStatus("2025-01", -1, AS_OF_MID_FEB),
      RangeError,
    );
  });
});

describe("analysis-context asOf inference", () => {
  it("inferConservativeAsOfDateFromDataset returns null for no orders and is not auto-used", () => {
    const emptyOrders = fixture({ orders: [] });
    assert.equal(inferConservativeAsOfDateFromDataset(emptyOrders), null);
    // buildAnalysisSelection requires explicit asOfDate — never infers from orders
    assert.throws(
      () =>
        buildAnalysisSelection(emptyOrders, {
          asOfDate: "not-a-canonical-instant",
        }),
      RangeError,
    );
    const withOrders = fixture();
    const inferred = inferConservativeAsOfDateFromDataset(withOrders);
    const sel = buildAnalysisSelection(withOrders, {
      asOfDate: AS_OF_MID_FEB,
    });
    assert.notEqual(sel.context.asOfDate, inferred);
  });

  it("inferConservativeAsOfDateFromDataset returns latest order instant", () => {
    const dataset = fixture();
    assert.equal(inferConservativeAsOfDateFromDataset(dataset), "2025-02-10T12:00:00.000Z");
  });
});
