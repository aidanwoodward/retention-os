/**
 * Acquisition-cohort share of selected-period trusted net revenue (MET-SHARE).
 *
 * Period-based portfolio contribution — not cumulative cohort LTV.
 * Consumes AnalysisSelection directly; does not re-filter periods.
 */

import type { AnalysisSelection } from "../analysis-context/types";
import type { Customer, CustomerId } from "../types/customer";
import { isIdentifiedOrder, type Order } from "../types/order";
import { netOrderRevenue, utcMonthKeyFromIso } from "./utils";

export type CohortRevenueContributionResidualKind =
  | "unidentified_customer"
  | "outside_selected_acquisition_period"
  | "unresolved_customer";

export type CohortRevenueContributionRow =
  | {
      kind: "cohort";
      cohortMonthKey: string;
      revenue: number;
      shareOfReportingRevenue: number | null;
      orderCount: number;
      customerCount: number;
    }
  | {
      kind: CohortRevenueContributionResidualKind;
      revenue: number;
      shareOfReportingRevenue: number | null;
      orderCount: number;
      customerCount: number | null;
    };

export type CohortRevenueContributionResult = {
  readonly rows: readonly CohortRevenueContributionRow[];
  readonly totalReportingRevenue: number;
  /** Σ kind === "cohort" revenue (inside selected acquisition scope). */
  readonly selectedCohortRevenue: number;
  readonly selectedCohortShareOfReportingRevenue: number | null;
  /**
   * Cohort rows + outside_selected_acquisition_period revenue
   * (resolved acquisition identity; excludes unidentified/unresolved).
   */
  readonly cohortResolvedRevenue: number;
  readonly cohortAttributionCoverage: number | null;
  readonly reportingOrderCount: number;
  readonly status: "available" | "empty";
};

type MutableBucket = {
  revenue: number;
  orderCount: number;
  customerIds: Set<CustomerId>;
};

const RESIDUAL_ORDER: readonly CohortRevenueContributionResidualKind[] = [
  "unidentified_customer",
  "outside_selected_acquisition_period",
  "unresolved_customer",
];

function shareOrNull(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function emptyBucket(): MutableBucket {
  return { revenue: 0, orderCount: 0, customerIds: new Set() };
}

function addToBucket(bucket: MutableBucket, order: Order, net: number, customerId: CustomerId | null): void {
  bucket.revenue += net;
  bucket.orderCount += 1;
  if (customerId != null) {
    bucket.customerIds.add(customerId);
  }
}

/**
 * Attribute reporting-period trusted net revenue to acquisition cohorts and explicit residuals.
 */
export function calculateCohortRevenueContribution(
  selection: AnalysisSelection,
): CohortRevenueContributionResult {
  const reportingOrders = selection.reportingOrders;
  const reportingOrderCount = reportingOrders.length;

  if (reportingOrderCount === 0) {
    return {
      rows: [],
      totalReportingRevenue: 0,
      selectedCohortRevenue: 0,
      selectedCohortShareOfReportingRevenue: null,
      cohortResolvedRevenue: 0,
      cohortAttributionCoverage: null,
      reportingOrderCount: 0,
      status: "empty",
    };
  }

  const customersById = new Map<CustomerId, Customer>();
  for (const c of selection.fullDataset.customers) {
    customersById.set(c.id, c);
  }

  const cohortBuckets = new Map<string, MutableBucket>();
  const residualBuckets: Record<CohortRevenueContributionResidualKind, MutableBucket> = {
    unidentified_customer: emptyBucket(),
    outside_selected_acquisition_period: emptyBucket(),
    unresolved_customer: emptyBucket(),
  };

  let totalReportingRevenue = 0;

  for (const order of reportingOrders) {
    const net = netOrderRevenue(order);
    totalReportingRevenue += net;

    if (!isIdentifiedOrder(order)) {
      addToBucket(residualBuckets.unidentified_customer, order, net, null);
      continue;
    }

    const customer = customersById.get(order.customerId);
    if (customer == null) {
      addToBucket(residualBuckets.unresolved_customer, order, net, order.customerId);
      continue;
    }

    // Invalid firstOrderAt must fail explicitly (utcMonthKeyFromIso → RangeError).
    const cohortMonthKey = utcMonthKeyFromIso(customer.firstOrderAt);

    if (
      selection.completeness.acquisitionScope === "bounded" &&
      !selection.eligibleCustomerIds.has(order.customerId)
    ) {
      addToBucket(residualBuckets.outside_selected_acquisition_period, order, net, order.customerId);
      continue;
    }

    let bucket = cohortBuckets.get(cohortMonthKey);
    if (bucket == null) {
      bucket = emptyBucket();
      cohortBuckets.set(cohortMonthKey, bucket);
    }
    addToBucket(bucket, order, net, order.customerId);
  }

  const rows: CohortRevenueContributionRow[] = [];

  for (const cohortMonthKey of [...cohortBuckets.keys()].sort()) {
    const bucket = cohortBuckets.get(cohortMonthKey)!;
    if (bucket.orderCount === 0) continue;
    rows.push({
      kind: "cohort",
      cohortMonthKey,
      revenue: bucket.revenue,
      shareOfReportingRevenue: shareOrNull(bucket.revenue, totalReportingRevenue),
      orderCount: bucket.orderCount,
      customerCount: bucket.customerIds.size,
    });
  }

  for (const kind of RESIDUAL_ORDER) {
    if (selection.completeness.acquisitionScope === "all" && kind === "outside_selected_acquisition_period") {
      continue;
    }
    const bucket = residualBuckets[kind];
    if (bucket.orderCount === 0) continue;
    rows.push({
      kind,
      revenue: bucket.revenue,
      shareOfReportingRevenue: shareOrNull(bucket.revenue, totalReportingRevenue),
      orderCount: bucket.orderCount,
      customerCount: kind === "unidentified_customer" ? null : bucket.customerIds.size,
    });
  }

  let selectedCohortRevenue = 0;
  let outsideRevenue = 0;
  for (const row of rows) {
    if (row.kind === "cohort") {
      selectedCohortRevenue += row.revenue;
    } else if (row.kind === "outside_selected_acquisition_period") {
      outsideRevenue += row.revenue;
    }
  }
  const cohortResolvedRevenue = selectedCohortRevenue + outsideRevenue;

  return {
    rows,
    totalReportingRevenue,
    selectedCohortRevenue,
    selectedCohortShareOfReportingRevenue: shareOrNull(selectedCohortRevenue, totalReportingRevenue),
    cohortResolvedRevenue,
    cohortAttributionCoverage: shareOrNull(cohortResolvedRevenue, totalReportingRevenue),
    reportingOrderCount,
    status: "available",
  };
}
