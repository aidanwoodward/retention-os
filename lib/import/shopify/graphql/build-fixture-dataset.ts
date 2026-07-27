/**
 * Test-only helper: wrap adapter entity output into RetentionOSDataset.
 * The production-capable adapter never sets dataset provenance meta.
 */

import type { RetentionOSDataset, RetentionOSSourceMetadata } from "../../../data-source/dataset-types";
import type { MarginAssumptions } from "../../../types";
import type { MarketingSpend } from "../../../types/marketing";
import type { ShopifyGraphqlEntityOutput } from "./shopify-orders-graphql-types";

export type FixtureDatasetCallerMeta = Pick<
  RetentionOSSourceMetadata,
  "sourceType" | "sourceLabel" | "isDemo" | "isUploaded"
> &
  Partial<
    Omit<
      RetentionOSSourceMetadata,
      "sourceType" | "sourceLabel" | "isDemo" | "isUploaded" | "customerCount" | "orderCount" | "productCount" | "lineItemCount"
    >
  >;

export type BuildFixtureDatasetOptions = {
  readonly marginAssumptions?: MarginAssumptions;
  readonly marketingSpend?: readonly MarketingSpend[];
};

function countLineItems(entities: ShopifyGraphqlEntityOutput): number {
  let n = 0;
  for (const o of entities.orders) n += o.lineItems.length;
  return n;
}

/**
 * Builds a RetentionOSDataset from adapter entities.
 * Caller must supply provenance fields — adapter does not invent sourceType/isDemo.
 */
export function buildFixtureRetentionOSDataset(
  entities: ShopifyGraphqlEntityOutput,
  callerMeta: FixtureDatasetCallerMeta,
  options?: BuildFixtureDatasetOptions,
): RetentionOSDataset {
  const orderedAts = entities.orders.map((o) => o.orderedAt).sort();
  const meta: RetentionOSSourceMetadata = {
    sourceType: callerMeta.sourceType,
    sourceLabel: callerMeta.sourceLabel,
    isDemo: callerMeta.isDemo,
    isUploaded: callerMeta.isUploaded,
    uploadFormat: callerMeta.uploadFormat,
    importedAt: callerMeta.importedAt,
    firstOrderAt: callerMeta.firstOrderAt ?? orderedAts[0],
    lastOrderAt: callerMeta.lastOrderAt ?? orderedAts[orderedAts.length - 1],
    customerCount: entities.customers.length,
    orderCount: entities.orders.length,
    productCount: entities.products.length,
    lineItemCount: countLineItems(entities),
    warningCount: callerMeta.warningCount,
    errorCount: callerMeta.errorCount ?? 0,
  };

  return {
    customers: entities.customers,
    orders: entities.orders,
    products: entities.products,
    marginAssumptions: options?.marginAssumptions,
    marketingSpend: options?.marketingSpend,
    meta,
  };
}

/** Shared test provenance: closed enum forces a sourceType; label marks GraphQL fixture tests. */
export const GRAPHQL_FIXTURE_TEST_META: FixtureDatasetCallerMeta = {
  sourceType: "demo",
  sourceLabel: "Shopify GraphQL fixture (test-only)",
  isDemo: true,
  isUploaded: false,
};
