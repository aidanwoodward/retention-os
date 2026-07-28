/**
 * Selected-period new-versus-returning customer and revenue mix (MET-NEW-RETURN).
 *
 * Consumes AnalysisSelection directly; does not re-filter reportingPeriod.
 * Integrity and first-order identity are scoped to reporting-active resolved customers.
 */

import { assertCanonicalUtcInstant } from "../analysis-context/period";
import type { AnalysisSelection } from "../analysis-context/types";
import type { Customer, CustomerId } from "../types/customer";
import { isIdentifiedOrder, type Order, type OrderId } from "../types/order";
import { netOrderRevenue } from "./utils";

export type NewReturningMixResult = {
  readonly newCustomerCount: number;
  readonly returningCustomerCount: number;
  readonly classifiedActiveCustomerCount: number;

  readonly newRevenue: number;
  readonly returningRevenue: number;
  readonly unidentifiedRevenue: number;
  readonly unresolvedRevenue: number;
  readonly classifiedRevenue: number;
  readonly totalReportingRevenue: number;

  readonly newCustomerShare: number | null;
  readonly returningCustomerShare: number | null;
  readonly newRevenueShareOfClassifiedRevenue: number | null;
  readonly returningRevenueShareOfClassifiedRevenue: number | null;
  readonly revenueClassificationCoverage: number | null;

  readonly reportingOrderCount: number;
  readonly status: "available" | "empty";
};

function shareOrNull(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function emptyResult(reportingOrderCount: number, status: "available" | "empty"): NewReturningMixResult {
  return {
    newCustomerCount: 0,
    returningCustomerCount: 0,
    classifiedActiveCustomerCount: 0,
    newRevenue: 0,
    returningRevenue: 0,
    unidentifiedRevenue: 0,
    unresolvedRevenue: 0,
    classifiedRevenue: 0,
    totalReportingRevenue: 0,
    newCustomerShare: null,
    returningCustomerShare: null,
    newRevenueShareOfClassifiedRevenue: null,
    returningRevenueShareOfClassifiedRevenue: null,
    revenueClassificationCoverage: null,
    reportingOrderCount,
    status,
  };
}

function compareOrdersByCanonicalFirstIdentity(a: Order, b: Order): number {
  if (a.orderedAt < b.orderedAt) return -1;
  if (a.orderedAt > b.orderedAt) return 1;
  return a.id.localeCompare(b.id, "en");
}

/**
 * Deterministic first-order id for a reporting-active resolved customer, or null when
 * the earliest observed as-of history is after firstOrderAt (incomplete earlier history).
 */
function resolveCanonicalFirstOrderId(
  customer: Customer,
  historyOrders: readonly Order[],
  asOfMs: number,
): OrderId | null {
  const firstOrderAtMs = assertCanonicalUtcInstant(customer.firstOrderAt, "firstOrderAt");

  const observed: Order[] = [];
  for (const order of historyOrders) {
    if (!isIdentifiedOrder(order) || order.customerId !== customer.id) continue;
    const orderedAtMs = assertCanonicalUtcInstant(order.orderedAt, "orderedAt");
    if (!(orderedAtMs < asOfMs)) continue;
    if (orderedAtMs < firstOrderAtMs) {
      throw new RangeError(
        `Canonical integrity violation: order "${order.id}" orderedAt is before customer "${customer.id}" firstOrderAt`,
      );
    }
    observed.push(order);
  }

  if (observed.length === 0) {
    return null;
  }

  observed.sort(compareOrdersByCanonicalFirstIdentity);
  const earliest = observed[0]!;
  const earliestMs = assertCanonicalUtcInstant(earliest.orderedAt, "orderedAt");

  if (earliestMs > firstOrderAtMs) {
    // History gap: first order occurred before available history — no observed order is "new".
    return null;
  }

  // earliestMs === firstOrderAtMs (earliestMs < firstOrderAtMs already rejected).
  return earliest.id;
}

/**
 * Selected-period new vs returning mix over AnalysisSelection.reportingOrders.
 */
export function calculateNewReturningMix(selection: AnalysisSelection): NewReturningMixResult {
  const reportingPeriod = selection.context.reportingPeriod;
  if (reportingPeriod == null) {
    throw new RangeError(
      "calculateNewReturningMix requires selection.context.reportingPeriod; all-time mix is not supported",
    );
  }

  const reportingOrders = selection.reportingOrders;
  const reportingOrderCount = reportingOrders.length;

  if (reportingOrderCount === 0) {
    return emptyResult(0, "empty");
  }

  const asOfMs = assertCanonicalUtcInstant(selection.context.asOfDate, "asOfDate");
  const periodStartMs = assertCanonicalUtcInstant(reportingPeriod.startDate, "reportingPeriod.startDate");
  const periodEndMs = assertCanonicalUtcInstant(
    reportingPeriod.endDateExclusive,
    "reportingPeriod.endDateExclusive",
  );

  const customersById = new Map<CustomerId, Customer>();
  for (const c of selection.fullDataset.customers) {
    customersById.set(c.id, c);
  }

  let unidentifiedRevenue = 0;
  let unresolvedRevenue = 0;
  let totalReportingRevenue = 0;

  const activeResolvedIds = new Set<CustomerId>();
  const reportingOrdersByCustomer = new Map<CustomerId, Order[]>();

  for (const order of reportingOrders) {
    const net = netOrderRevenue(order);
    totalReportingRevenue += net;

    if (!isIdentifiedOrder(order)) {
      unidentifiedRevenue += net;
      continue;
    }

    const customer = customersById.get(order.customerId);
    if (customer == null) {
      unresolvedRevenue += net;
      continue;
    }

    activeResolvedIds.add(order.customerId);
    let list = reportingOrdersByCustomer.get(order.customerId);
    if (list == null) {
      list = [];
      reportingOrdersByCustomer.set(order.customerId, list);
    }
    list.push(order);
  }

  let newCustomerCount = 0;
  let returningCustomerCount = 0;
  let newRevenue = 0;
  let returningRevenue = 0;

  for (const customerId of activeResolvedIds) {
    const customer = customersById.get(customerId)!;
    const firstOrderId = resolveCanonicalFirstOrderId(customer, selection.fullDataset.orders, asOfMs);

    const firstOrderAtMs = assertCanonicalUtcInstant(customer.firstOrderAt, "firstOrderAt");
    if (periodStartMs <= firstOrderAtMs && firstOrderAtMs < periodEndMs) {
      newCustomerCount += 1;
    } else if (firstOrderAtMs < periodStartMs) {
      returningCustomerCount += 1;
    } else {
      // firstOrderAt >= period end — acquired after reporting period but somehow active
      // in reportingOrders (should not occur under selection invariants). Treat as neither
      // new nor returning for the commercial partition; still classify order revenue.
      // Actually: if they have reporting orders in period but firstOrderAt after period end,
      // that's contradictory history (first order after an earlier reporting order).
      // Integrity: any reporting order with orderedAt < firstOrderAt already throws in
      // resolveCanonicalFirstOrderId when scanning asOf-bounded history including reporting.
      // If firstOrderAt is after period end, reporting orders in period would have
      // orderedAt < firstOrderAt → RangeError. So this branch is unreachable for valid data.
      throw new RangeError(
        `Canonical integrity violation: reporting-active customer "${customerId}" has firstOrderAt outside/after the reporting period while holding reporting-period orders`,
      );
    }

    const customerReportingOrders = reportingOrdersByCustomer.get(customerId) ?? [];
    for (const order of customerReportingOrders) {
      const net = netOrderRevenue(order);
      if (firstOrderId != null && order.id === firstOrderId) {
        newRevenue += net;
      } else {
        returningRevenue += net;
      }
    }
  }

  const classifiedActiveCustomerCount = newCustomerCount + returningCustomerCount;
  const classifiedRevenue = newRevenue + returningRevenue;

  return {
    newCustomerCount,
    returningCustomerCount,
    classifiedActiveCustomerCount,
    newRevenue,
    returningRevenue,
    unidentifiedRevenue,
    unresolvedRevenue,
    classifiedRevenue,
    totalReportingRevenue,
    newCustomerShare: shareOrNull(newCustomerCount, classifiedActiveCustomerCount),
    returningCustomerShare: shareOrNull(returningCustomerCount, classifiedActiveCustomerCount),
    newRevenueShareOfClassifiedRevenue: shareOrNull(newRevenue, classifiedRevenue),
    returningRevenueShareOfClassifiedRevenue: shareOrNull(returningRevenue, classifiedRevenue),
    revenueClassificationCoverage: shareOrNull(classifiedRevenue, totalReportingRevenue),
    reportingOrderCount,
    status: "available",
  };
}
