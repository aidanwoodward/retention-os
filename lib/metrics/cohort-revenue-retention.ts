/**
 * Period-based cohort revenue retention (MET-REV-RETENTION).
 *
 * For acquisition cohort C at Month+N:
 *   periodRevenue(C, N) / periodRevenue(C, 0)
 *
 * Consumes AnalysisSelection directly. Uses fullDataset + eligibleCustomerIds +
 * asOfDate (exclusive observation boundary) + optional maturityHorizonMonths.
 * Never reads reportingPeriod / reportingOrders.
 */

import { getMonthlyCohortMaturityStatus } from "../analysis-context/maturity";
import { assertCanonicalUtcInstant, utcMonthStartInstant } from "../analysis-context/period";
import type { AnalysisSelection, MaturityStatus } from "../analysis-context/types";
import type { Customer, CustomerId } from "../types/customer";
import { isIdentifiedOrder } from "../types/order";
import {
  addMonthsToMonthKey,
  monthsBetweenMonthKeys,
  netOrderRevenue,
  utcMonthKeyFromIso,
} from "./utils";

export type CohortRevenueRetentionCell = {
  readonly offset: number;
  readonly periodMonthKey: string;
  readonly maturityStatus: MaturityStatus;
  readonly revenue: number | null;
  readonly retentionRate: number | null;
  readonly orderCount: number | null;
  readonly activeCustomerCount: number | null;
};

export type CohortRevenueRetentionCohortRow = {
  readonly cohortMonthKey: string;
  readonly cohortCustomerCount: number;
  readonly month0Revenue: number | null;
  readonly cells: readonly CohortRevenueRetentionCell[];
};

export type CohortRevenueRetentionResult = {
  readonly rows: readonly CohortRevenueRetentionCohortRow[];
  readonly maxOffset: number;
  readonly eligibleCustomerCount: number;
  readonly status: "available" | "empty";
};

type PeriodBucket = {
  revenue: number;
  orderCount: number;
  activeCustomerIds: Set<CustomerId>;
};

function emptyBucket(): PeriodBucket {
  return { revenue: 0, orderCount: 0, activeCustomerIds: new Set() };
}

function rateOrNull(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Latest UTC calendar month that has any instant strictly before exclusive asOfDate.
 * Mid-month asOf includes the current month; asOf exactly at month start uses the prior month.
 */
function latestObservedMonthKeyBeforeAsOf(asOfDate: string): string {
  const asOfMonthKey = utcMonthKeyFromIso(asOfDate);
  const monthStart = utcMonthStartInstant(asOfMonthKey);
  if (asOfDate === monthStart) {
    return addMonthsToMonthKey(asOfMonthKey, -1);
  }
  return asOfMonthKey;
}

/**
 * Period-based cohort revenue retention over canonical full history.
 *
 * Integrity (before empty return / acquisition filter):
 * for every identified order with orderedAt < asOfDate — resolve customer,
 * validate firstOrderAt, reject orderedAt < firstOrderAt — then apply eligibility.
 */
export function calculateCohortRevenueRetention(
  selection: AnalysisSelection,
): CohortRevenueRetentionResult {
  const asOfDate = selection.context.asOfDate;
  const asOfMs = assertCanonicalUtcInstant(asOfDate, "asOfDate");
  const horizon = selection.context.maturityHorizonMonths;

  const customersById = new Map<CustomerId, Customer>();
  for (const c of selection.fullDataset.customers) {
    customersById.set(c.id, c);
  }

  for (const customerId of selection.eligibleCustomerIds) {
    if (!customersById.has(customerId)) {
      throw new RangeError(
        `Canonical integrity violation: eligible customer "${customerId}" has no customer record`,
      );
    }
  }

  /** cohortMonthKey → periodMonthKey → bucket (eligible observed attribution only) */
  const cohortPeriodBuckets = new Map<string, Map<string, PeriodBucket>>();
  const cohortCustomerIds = new Map<string, Set<CustomerId>>();

  for (const order of selection.fullDataset.orders) {
    if (!isIdentifiedOrder(order)) {
      continue;
    }

    const orderedAtMs = assertCanonicalUtcInstant(order.orderedAt, "orderedAt");
    if (!(orderedAtMs < asOfMs)) {
      continue;
    }

    const customer = customersById.get(order.customerId);
    if (customer == null) {
      throw new RangeError(
        `Canonical integrity violation: identified order "${order.id}" references missing customer "${order.customerId}"`,
      );
    }

    const firstOrderAtMs = assertCanonicalUtcInstant(customer.firstOrderAt, "firstOrderAt");
    if (orderedAtMs < firstOrderAtMs) {
      throw new RangeError(
        `Canonical integrity violation: order "${order.id}" orderedAt is before customer "${customer.id}" firstOrderAt`,
      );
    }

    // Acquisition filter only after integrity validation.
    if (!selection.eligibleCustomerIds.has(order.customerId)) {
      continue;
    }

    if (!(firstOrderAtMs < asOfMs)) {
      continue;
    }

    const cohortMonthKey = utcMonthKeyFromIso(customer.firstOrderAt);
    const periodMonthKey = utcMonthKeyFromIso(order.orderedAt);
    const net = netOrderRevenue(order);

    let periodMap = cohortPeriodBuckets.get(cohortMonthKey);
    if (periodMap == null) {
      periodMap = new Map();
      cohortPeriodBuckets.set(cohortMonthKey, periodMap);
    }
    let bucket = periodMap.get(periodMonthKey);
    if (bucket == null) {
      bucket = emptyBucket();
      periodMap.set(periodMonthKey, bucket);
    }
    bucket.revenue += net;
    bucket.orderCount += 1;
    bucket.activeCustomerIds.add(order.customerId);

    let members = cohortCustomerIds.get(cohortMonthKey);
    if (members == null) {
      members = new Set();
      cohortCustomerIds.set(cohortMonthKey, members);
    }
    members.add(order.customerId);
  }

  // Observed eligible customers (may have zero orders after asOf filter).
  for (const customerId of selection.eligibleCustomerIds) {
    const customer = customersById.get(customerId)!;
    const firstOrderAtMs = assertCanonicalUtcInstant(customer.firstOrderAt, "firstOrderAt");
    if (!(firstOrderAtMs < asOfMs)) {
      continue;
    }
    const cohortMonthKey = utcMonthKeyFromIso(customer.firstOrderAt);
    let members = cohortCustomerIds.get(cohortMonthKey);
    if (members == null) {
      members = new Set();
      cohortCustomerIds.set(cohortMonthKey, members);
    }
    members.add(customerId);
  }

  const observedCohortKeys = [...cohortCustomerIds.keys()].sort();
  let eligibleCustomerCount = 0;
  for (const key of observedCohortKeys) {
    eligibleCustomerCount += cohortCustomerIds.get(key)!.size;
  }

  if (eligibleCustomerCount === 0) {
    return {
      rows: [],
      maxOffset: 0,
      eligibleCustomerCount: 0,
      status: "empty",
    };
  }

  const earliestCohortMonthKey = observedCohortKeys[0]!;
  let maxOffset: number;
  if (horizon !== undefined) {
    maxOffset = horizon;
  } else {
    const latestMonth = latestObservedMonthKeyBeforeAsOf(asOfDate);
    maxOffset = Math.max(0, monthsBetweenMonthKeys(earliestCohortMonthKey, latestMonth));
  }

  const rows: CohortRevenueRetentionCohortRow[] = [];

  for (const cohortMonthKey of observedCohortKeys) {
    const members = cohortCustomerIds.get(cohortMonthKey)!;
    const periodMap = cohortPeriodBuckets.get(cohortMonthKey) ?? new Map<string, PeriodBucket>();
    const month0Key = cohortMonthKey;
    const month0Status = getMonthlyCohortMaturityStatus(
      cohortMonthKey,
      0,
      asOfDate,
      horizon,
    );
    const month0Bucket = periodMap.get(month0Key);
    const month0Revenue =
      month0Status === "unavailable" ? null : (month0Bucket?.revenue ?? 0);
    const month0Denom = month0Revenue != null && month0Revenue > 0 ? month0Revenue : 0;

    const cells: CohortRevenueRetentionCell[] = [];
    for (let offset = 0; offset <= maxOffset; offset++) {
      const periodMonthKey = addMonthsToMonthKey(cohortMonthKey, offset);
      const maturityStatus = getMonthlyCohortMaturityStatus(
        cohortMonthKey,
        offset,
        asOfDate,
        horizon,
      );

      if (maturityStatus === "unavailable") {
        cells.push({
          offset,
          periodMonthKey,
          maturityStatus,
          revenue: null,
          retentionRate: null,
          orderCount: null,
          activeCustomerCount: null,
        });
        continue;
      }

      const bucket = periodMap.get(periodMonthKey);
      const revenue = bucket?.revenue ?? 0;
      const orderCount = bucket?.orderCount ?? 0;
      const activeCustomerCount = bucket?.activeCustomerIds.size ?? 0;
      const retentionRate = rateOrNull(revenue, month0Denom);

      cells.push({
        offset,
        periodMonthKey,
        maturityStatus,
        revenue,
        retentionRate,
        orderCount,
        activeCustomerCount,
      });
    }

    rows.push({
      cohortMonthKey,
      cohortCustomerCount: members.size,
      month0Revenue,
      cells,
    });
  }

  return {
    rows,
    maxOffset,
    eligibleCustomerCount,
    status: "available",
  };
}
