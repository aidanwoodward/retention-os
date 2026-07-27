/**
 * Pure dataset selection helpers for AnalysisContext.
 * Preserves canonical full-history customers; never rewrites firstOrderAt.
 */

import type { RetentionOSDataset } from "../data-source/dataset-types";
import { spendBucketToCohortMonthKey } from "../import/normalise-marketing-spend";
import type { CustomerId } from "../types/customer";
import type { MarketingSpend } from "../types/marketing";
import { isIdentifiedOrder, type Order } from "../types/order";
import { utcMonthKeyFromIso } from "../metrics/utils";
import {
  assertCanonicalUtcInstant,
  assertMonthAlignedAcquisitionPeriod,
  assertNonNegativeInteger,
  assertValidHalfOpenPeriod,
  isInstantInHalfOpenPeriod,
  monthKeysCoveredByAcquisitionPeriod,
} from "./period";
import type {
  AcquisitionScope,
  AnalysisContext,
  AnalysisSelection,
  AnalysisSelectionCompleteness,
} from "./types";

/**
 * Conservative suggestion only: latest order `orderedAt` when it is already a
 * canonical UTC instant; otherwise null.
 * Never called by buildAnalysisSelection. Does not claim coverage completeness.
 * Does not prefer meta.lastOrderAt (order window metadata ≠ trust boundary).
 */
export function inferConservativeAsOfDateFromDataset(
  dataset: RetentionOSDataset,
): string | null {
  let latest: string | null = null;
  for (const o of dataset.orders) {
    if (latest == null || o.orderedAt > latest) {
      latest = o.orderedAt;
    }
  }
  if (latest == null) return null;
  try {
    assertCanonicalUtcInstant(latest, "orderedAt");
    return latest;
  } catch {
    return null;
  }
}

function assertAnalysisContext(context: AnalysisContext): void {
  assertCanonicalUtcInstant(context.asOfDate, "asOfDate");
  if (context.maturityHorizonMonths !== undefined) {
    assertNonNegativeInteger(context.maturityHorizonMonths, "maturityHorizonMonths");
  }
  if (context.reportingPeriod) {
    assertValidHalfOpenPeriod(context.reportingPeriod, "reportingPeriod");
    const endMs = Date.parse(context.reportingPeriod.endDateExclusive);
    const asOfMs = Date.parse(context.asOfDate);
    if (endMs > asOfMs) {
      throw new RangeError(
        `reportingPeriod.endDateExclusive must not exceed asOfDate (${context.reportingPeriod.endDateExclusive} > ${context.asOfDate})`,
      );
    }
  }
  if (context.acquisitionPeriod) {
    assertMonthAlignedAcquisitionPeriod(context.acquisitionPeriod);
  }
}

export function selectMarketingSpendForAcquisitionMonthKeys(
  spend: readonly MarketingSpend[] | undefined,
  monthKeys: ReadonlySet<string> | "all",
): readonly MarketingSpend[] {
  if (spend == null || spend.length === 0) return [];
  if (monthKeys === "all") {
    return spend.filter((row) => spendBucketToCohortMonthKey(row.month) != null);
  }
  const out: MarketingSpend[] = [];
  for (const row of spend) {
    const ck = spendBucketToCohortMonthKey(row.month);
    if (ck != null && monthKeys.has(ck)) {
      out.push(row);
    }
  }
  return out;
}

function selectReportingOrders(
  orders: readonly Order[],
  reportingPeriod: AnalysisContext["reportingPeriod"],
): readonly Order[] {
  if (!reportingPeriod) return orders;
  return orders.filter((o) => isInstantInHalfOpenPeriod(o.orderedAt, reportingPeriod));
}

/**
 * Build an analysis selection over the canonical dataset.
 * Requires explicit context.asOfDate — never infers or defaults it.
 */
export function buildAnalysisSelection(
  dataset: RetentionOSDataset,
  context: AnalysisContext,
): AnalysisSelection {
  assertAnalysisContext(context);

  const reportingOrders = selectReportingOrders(dataset.orders, context.reportingPeriod);
  const identifiableReportingOrders = reportingOrders.filter(isIdentifiedOrder);

  let acquisitionScope: AcquisitionScope;
  let coveredMonthKeys: ReadonlySet<string> | "all";
  let acquisitionMonthKeyCount: number;
  let eligibleCustomerIds: ReadonlySet<CustomerId>;

  if (context.acquisitionPeriod) {
    acquisitionScope = "bounded";
    const keys = monthKeysCoveredByAcquisitionPeriod(context.acquisitionPeriod);
    coveredMonthKeys = new Set(keys);
    acquisitionMonthKeyCount = keys.length;
    const eligible = new Set<CustomerId>();
    for (const c of dataset.customers) {
      const mk = utcMonthKeyFromIso(c.firstOrderAt);
      if (coveredMonthKeys.has(mk)) {
        eligible.add(c.id);
      }
    }
    eligibleCustomerIds = eligible;
  } else {
    acquisitionScope = "all";
    coveredMonthKeys = "all";
    const eligible = new Set<CustomerId>();
    const distinctMonths = new Set<string>();
    for (const c of dataset.customers) {
      eligible.add(c.id);
      distinctMonths.add(utcMonthKeyFromIso(c.firstOrderAt));
    }
    eligibleCustomerIds = eligible;
    acquisitionMonthKeyCount = distinctMonths.size;
  }

  const selectedMarketingSpend = selectMarketingSpendForAcquisitionMonthKeys(
    dataset.marketingSpend,
    coveredMonthKeys,
  );

  const reportingOrdersForEligibleCustomers = identifiableReportingOrders.filter((o) =>
    eligibleCustomerIds.has(o.customerId),
  );

  const guestReportingOrderCount = reportingOrders.length - identifiableReportingOrders.length;

  const completeness: AnalysisSelectionCompleteness = {
    reportingOrderCount: reportingOrders.length,
    identifiableReportingOrderCount: identifiableReportingOrders.length,
    guestReportingOrderCount,
    eligibleCustomerCount: eligibleCustomerIds.size,
    acquisitionScope,
    acquisitionMonthKeyCount,
    marketingSpendRowCount: selectedMarketingSpend.length,
  };

  return {
    context,
    fullDataset: dataset,
    reportingOrders,
    identifiableReportingOrders,
    reportingOrdersForEligibleCustomers,
    eligibleCustomerIds,
    selectedMarketingSpend,
    completeness,
  };
}
