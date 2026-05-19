/**
 * Small guards and summaries for `RetentionOSDataset` — keep scope modest per Sprint 3D.
 */

import type { RetentionOSDataset, RetentionOSDatasetSummary } from "./dataset-types";
import type { Order } from "../types";

export function countLineItems(orders: readonly Order[]): number {
  let n = 0;
  for (const o of orders) {
    n += o.lineItems.length;
  }
  return n;
}

/** True when every order carries a finite `contributionMargin` (order-level dollars). */
export function hasContributionMarginCoverage(dataset: RetentionOSDataset): boolean {
  if (dataset.orders.length === 0) return false;
  return dataset.orders.every(
    (o) => o.contributionMargin != null && Number.isFinite(o.contributionMargin),
  );
}

/** Throws if the dataset cannot run portfolio metrics (empty population). */
export function assertDatasetUsableForMetrics(dataset: RetentionOSDataset): void {
  if (dataset.customers.length === 0) {
    throw new Error("RetentionOSDataset has no customers — metrics require at least one customer.");
  }
  if (dataset.orders.length === 0) {
    throw new Error("RetentionOSDataset has no orders — metrics require at least one order.");
  }
}

export function getDatasetSummary(dataset: RetentionOSDataset): RetentionOSDatasetSummary {
  return {
    ...dataset.meta,
    hasMarginAssumptions: dataset.marginAssumptions != null,
    hasMarketingSpend: dataset.marketingSpend != null && dataset.marketingSpend.length > 0,
    hasFullOrderContributionMargin: hasContributionMarginCoverage(dataset),
  };
}

function minMaxIsoOrderTimes(orders: readonly Order[]): { first?: string; last?: string } {
  if (orders.length === 0) return {};
  let first = orders[0]!.orderedAt;
  let last = orders[0]!.orderedAt;
  for (let i = 1; i < orders.length; i++) {
    const t = orders[i]!.orderedAt;
    if (t < first) first = t;
    if (t > last) last = t;
  }
  return { first, last };
}

/** Derive first/last order ISO from orders when metadata fields are blank. */
export function inferOrderWindowFromOrders(orders: readonly Order[]): { firstOrderAt?: string; lastOrderAt?: string } {
  const { first, last } = minMaxIsoOrderTimes(orders);
  return { firstOrderAt: first, lastOrderAt: last };
}
