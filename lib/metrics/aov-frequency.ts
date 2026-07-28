/**
 * Selected-period customer count × purchase frequency × AOV (MET-AOV-FREQ).
 *
 * Consumes AnalysisSelection directly; does not re-filter reportingPeriod.
 * Portfolio AOV includes all trusted reporting orders; classified economics
 * require customer-resolved identity. Does not call calculateNewReturningMix.
 *
 * Duplicate order IDs: relies on upstream canonical construction (import Map-by-
 * orderId); this metric does not silent-dedupe or fail on duplicates.
 */

import type { AnalysisSelection } from "../analysis-context/types";
import type { CustomerId } from "../types/customer";
import { isIdentifiedOrder } from "../types/order";
import { netOrderRevenue } from "./utils";

export type AovFrequencyResult = {
  readonly totalReportingRevenue: number;
  readonly reportingOrderCount: number;
  readonly portfolioAverageOrderValue: number | null;

  readonly activeCustomerCount: number;
  readonly classifiedOrderCount: number;
  readonly classifiedRevenue: number;
  readonly ordersPerActiveCustomer: number | null;
  readonly classifiedAverageOrderValue: number | null;
  readonly revenuePerActiveCustomer: number | null;

  readonly unidentifiedOrderCount: number;
  readonly unidentifiedRevenue: number;
  readonly unresolvedOrderCount: number;
  readonly unresolvedRevenue: number;

  readonly customerIdentityOrderCoverage: number | null;
  readonly customerIdentityRevenueCoverage: number | null;

  readonly status: "available" | "empty";
};

function ratioOrNull(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function emptyResult(): AovFrequencyResult {
  return {
    totalReportingRevenue: 0,
    reportingOrderCount: 0,
    portfolioAverageOrderValue: null,
    activeCustomerCount: 0,
    classifiedOrderCount: 0,
    classifiedRevenue: 0,
    ordersPerActiveCustomer: null,
    classifiedAverageOrderValue: null,
    revenuePerActiveCustomer: null,
    unidentifiedOrderCount: 0,
    unidentifiedRevenue: 0,
    unresolvedOrderCount: 0,
    unresolvedRevenue: 0,
    customerIdentityOrderCoverage: null,
    customerIdentityRevenueCoverage: null,
    status: "empty",
  };
}

/**
 * Selected-period AOV and purchase-frequency decomposition over AnalysisSelection.reportingOrders.
 */
export function calculateAovFrequency(selection: AnalysisSelection): AovFrequencyResult {
  if (selection.context.reportingPeriod == null) {
    throw new RangeError(
      "calculateAovFrequency requires selection.context.reportingPeriod; all-time AOV/frequency is not supported",
    );
  }

  const reportingOrders = selection.reportingOrders;
  const reportingOrderCount = reportingOrders.length;

  if (reportingOrderCount === 0) {
    return emptyResult();
  }

  const customerIds = new Set<CustomerId>();
  for (const c of selection.fullDataset.customers) {
    customerIds.add(c.id);
  }

  let totalReportingRevenue = 0;
  let classifiedOrderCount = 0;
  let classifiedRevenue = 0;
  let unidentifiedOrderCount = 0;
  let unidentifiedRevenue = 0;
  let unresolvedOrderCount = 0;
  let unresolvedRevenue = 0;
  const activeCustomerIds = new Set<CustomerId>();

  for (const order of reportingOrders) {
    const net = netOrderRevenue(order);
    totalReportingRevenue += net;

    if (!isIdentifiedOrder(order)) {
      unidentifiedOrderCount += 1;
      unidentifiedRevenue += net;
      continue;
    }

    if (!customerIds.has(order.customerId)) {
      unresolvedOrderCount += 1;
      unresolvedRevenue += net;
      continue;
    }

    classifiedOrderCount += 1;
    classifiedRevenue += net;
    activeCustomerIds.add(order.customerId);
  }

  const activeCustomerCount = activeCustomerIds.size;

  return {
    totalReportingRevenue,
    reportingOrderCount,
    portfolioAverageOrderValue: totalReportingRevenue / reportingOrderCount,
    activeCustomerCount,
    classifiedOrderCount,
    classifiedRevenue,
    ordersPerActiveCustomer: ratioOrNull(classifiedOrderCount, activeCustomerCount),
    classifiedAverageOrderValue: ratioOrNull(classifiedRevenue, classifiedOrderCount),
    revenuePerActiveCustomer: ratioOrNull(classifiedRevenue, activeCustomerCount),
    unidentifiedOrderCount,
    unidentifiedRevenue,
    unresolvedOrderCount,
    unresolvedRevenue,
    customerIdentityOrderCoverage: ratioOrNull(classifiedOrderCount, reportingOrderCount),
    customerIdentityRevenueCoverage: ratioOrNull(classifiedRevenue, totalReportingRevenue),
    status: "available",
  };
}
