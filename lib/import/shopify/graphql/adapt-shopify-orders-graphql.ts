/**
 * Pure Shopify GraphQL fixture adapter (Sprint 5W-B).
 * No network, DB, env, or session activation. Does not set RetentionOSDataset provenance meta.
 */

import type { Customer, Order, OrderLineItem, Product } from "../../../types";
import { netOrderRevenue } from "../../../metrics/utils";
import {
  compareOrdersForRefresh,
  currencyFromBag,
  isExcludedFinancialStatus,
  isIncludedFinancialStatus,
  isProvisionalFinancialStatus,
  pushGraphqlIssue,
  shopMoneyFromBag,
  sortTrustedOrdersForCustomer,
  toShopifyCustomerId,
  toShopifyLineItemId,
  toShopifyOrderId,
  toShopifyProductId,
  toShopifyVariantId,
} from "./shopify-orders-graphql-helpers";
import type {
  ShopifyGraphqlAdaptResult,
  ShopifyGraphqlCompleteness,
  ShopifyGraphqlEntityOutput,
  ShopifyGraphqlImportIssue,
  ShopifyGraphqlLineItemNode,
  ShopifyGraphqlOrderDisposition,
  ShopifyGraphqlOrderNode,
  ShopifyGraphqlOrdersFixtureInput,
  ShopifyGraphqlShopCurrencyState,
} from "./shopify-orders-graphql-types";

function emptyCompleteness(
  shopCurrency: string | null,
  shopCurrencyState: ShopifyGraphqlShopCurrencyState,
): ShopifyGraphqlCompleteness {
  return {
    trustedOrderCount: 0,
    trustedNetRevenue: 0,
    identifiableTrustedOrderCount: 0,
    identifiableTrustedNetRevenue: 0,
    unidentifiedTrustedOrderCount: 0,
    unidentifiedTrustedNetRevenue: 0,
    customerIdentityCoverageByOrderCount: 0,
    customerIdentityCoverageByNetRevenue: 0,
    provisionalCount: 0,
    excludedCount: 0,
    unsupportedEditedCount: 0,
    blockedTaxInclusiveCount: 0,
    shopCurrency,
    shopCurrencyState,
  };
}

function dedupeByGidLatest(orders: readonly ShopifyGraphqlOrderNode[]): ShopifyGraphqlOrderNode[] {
  const map = new Map<string, ShopifyGraphqlOrderNode>();
  for (const o of orders) {
    const prev = map.get(o.id);
    if (!prev || compareOrdersForRefresh(prev, o) < 0) {
      map.set(o.id, o);
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return a.id.localeCompare(b.id, "en");
  });
}

function resolveShopCurrency(
  orders: readonly ShopifyGraphqlOrderNode[],
  override?: string,
): { shopCurrency: string | null; shopCurrencyState: ShopifyGraphqlShopCurrencyState } {
  if (override != null && override.trim() !== "") {
    const want = override.trim();
    for (const o of orders) {
      const fromOrder = o.currencyCode?.trim() || currencyFromBag(o.totalDiscountsSet);
      if (fromOrder && fromOrder !== want) {
        return { shopCurrency: null, shopCurrencyState: "mixed" };
      }
    }
    return { shopCurrency: want, shopCurrencyState: "resolved" };
  }

  const codes = new Set<string>();
  for (const o of orders) {
    const code = o.currencyCode?.trim() || currencyFromBag(o.totalDiscountsSet);
    if (!code) {
      return { shopCurrency: null, shopCurrencyState: "unknown" };
    }
    codes.add(code);
  }
  if (codes.size === 0) return { shopCurrency: null, shopCurrencyState: "unknown" };
  if (codes.size > 1) return { shopCurrency: null, shopCurrencyState: "mixed" };
  return { shopCurrency: [...codes][0]!, shopCurrencyState: "resolved" };
}

function buildLineItems(nodes: readonly ShopifyGraphqlLineItemNode[]): {
  lineItems: OrderLineItem[];
  grossRevenue: number;
  missingTaxonomy: boolean;
  productDrafts: Array<{
    id: string;
    title: string;
    sku?: string;
    vendor?: string;
    isDeletedOrMissing?: boolean;
  }>;
} {
  const lineItems: OrderLineItem[] = [];
  let grossRevenue = 0;
  let missingTaxonomy = false;
  const productDrafts: Array<{
    id: string;
    title: string;
    sku?: string;
    vendor?: string;
    isDeletedOrMissing?: boolean;
  }> = [];

  for (const node of nodes) {
    if (node.isGiftCard === true) {
      continue;
    }
    const lineTotal = shopMoneyFromBag(node.originalTotalSet);
    grossRevenue += lineTotal;

    const variantGid = node.variant?.id ?? null;
    const productGid = node.product?.id ?? null;
    const deleted = productGid == null;
    let productId: string | undefined;
    if (productGid) {
      productId = toShopifyProductId(productGid);
    } else if (variantGid) {
      productId = toShopifyVariantId(variantGid);
    }

    const title = (node.title ?? node.name ?? node.product?.title ?? "Unknown product").trim() || "Unknown product";
    const sku = (node.sku ?? node.variant?.sku ?? undefined) || undefined;
    const vendor = (node.vendor ?? node.product?.vendor ?? undefined) || undefined;

    if (node.product && (node.product.category == null || node.product.category === undefined)) {
      missingTaxonomy = true;
    } else if (!node.product) {
      missingTaxonomy = true;
    }

    lineItems.push({
      id: toShopifyLineItemId(node.id),
      productId,
      variantId: variantGid ?? undefined,
      sku,
      title,
      quantity: node.quantity,
      lineTotal,
    });

    if (productId) {
      productDrafts.push({
        id: productId,
        title,
        sku,
        vendor,
        isDeletedOrMissing: deleted || undefined,
      });
    }
  }

  return { lineItems, grossRevenue, missingTaxonomy, productDrafts };
}

function merchandiseRefunds(order: ShopifyGraphqlOrderNode): number {
  let sum = 0;
  for (const edge of order.refunds.edges) {
    for (const li of edge.node.refundLineItems.edges) {
      sum += shopMoneyFromBag(li.node.subtotalSet);
    }
  }
  return sum;
}

function buildCompleteness(
  trustedOrders: readonly Order[],
  dispositions: readonly ShopifyGraphqlOrderDisposition[],
  shopCurrency: string | null,
  shopCurrencyState: ShopifyGraphqlShopCurrencyState,
): ShopifyGraphqlCompleteness {
  let trustedNetRevenue = 0;
  let identifiableTrustedOrderCount = 0;
  let identifiableTrustedNetRevenue = 0;
  let unidentifiedTrustedOrderCount = 0;
  let unidentifiedTrustedNetRevenue = 0;

  for (const o of trustedOrders) {
    const net = netOrderRevenue(o);
    trustedNetRevenue += net;
    if (o.customerId == null) {
      unidentifiedTrustedOrderCount += 1;
      unidentifiedTrustedNetRevenue += net;
    } else {
      identifiableTrustedOrderCount += 1;
      identifiableTrustedNetRevenue += net;
    }
  }

  const trustedOrderCount = trustedOrders.length;
  const coverageOrders =
    trustedOrderCount === 0 ? 0 : identifiableTrustedOrderCount / trustedOrderCount;
  const coverageRevenue =
    trustedNetRevenue === 0 ? 0 : identifiableTrustedNetRevenue / trustedNetRevenue;

  let provisionalCount = 0;
  let excludedCount = 0;
  let unsupportedEditedCount = 0;
  let blockedTaxInclusiveCount = 0;
  for (const d of dispositions) {
    if (d.kind === "provisional") provisionalCount += 1;
    else if (d.kind === "excluded") excludedCount += 1;
    else if (d.kind === "unsupported_edited") unsupportedEditedCount += 1;
    else if (d.kind === "blocked_tax_inclusive") blockedTaxInclusiveCount += 1;
  }

  return {
    trustedOrderCount,
    trustedNetRevenue,
    identifiableTrustedOrderCount,
    identifiableTrustedNetRevenue,
    unidentifiedTrustedOrderCount,
    unidentifiedTrustedNetRevenue,
    customerIdentityCoverageByOrderCount: coverageOrders,
    customerIdentityCoverageByNetRevenue: coverageRevenue,
    provisionalCount,
    excludedCount,
    unsupportedEditedCount,
    blockedTaxInclusiveCount,
    shopCurrency,
    shopCurrencyState,
  };
}

/**
 * Adapt Shopify GraphQL–shaped order fixtures into canonical entities + provenance.
 *
 * Whole-fixture blockers: any `taxesIncluded == true`, mixed/unknown shop currency.
 * Per-order: edited → unsupported_edited; cancelled/test/voided/expired → excluded;
 * AUTHORIZED/PENDING → provisional.
 */
export function adaptShopifyGraphqlOrdersFixture(
  input: ShopifyGraphqlOrdersFixtureInput,
): ShopifyGraphqlAdaptResult {
  const issues: ShopifyGraphqlImportIssue[] = [];
  const dispositions: ShopifyGraphqlOrderDisposition[] = [];
  const deduped = dedupeByGidLatest(input.orders);

  const { shopCurrency, shopCurrencyState } = resolveShopCurrency(deduped, input.shopCurrency);

  if (shopCurrencyState === "mixed" || shopCurrencyState === "unknown") {
    pushGraphqlIssue(
      issues,
      "error",
      "SHOPIFY_GRAPHQL_CURRENCY_BLOCKED",
      shopCurrencyState === "mixed"
        ? "Mixed shop currencies across fixture orders; dataset activation blocked."
        : "Shop currency could not be resolved; dataset activation blocked.",
    );
    return {
      status: "blocked",
      entities: null,
      issues,
      completeness: emptyCompleteness(null, shopCurrencyState),
      orderDispositions: dispositions,
    };
  }

  let taxInclusiveCount = 0;
  for (const o of deduped) {
    if (o.taxesIncluded === true) {
      taxInclusiveCount += 1;
      dispositions.push({
        orderGid: o.id,
        kind: "blocked_tax_inclusive",
        unidentifiedCustomer: o.customer == null,
        reason: "taxesIncluded == true; whole fixture blocked until tax-exclusive normalisation exists.",
      });
    }
  }

  if (taxInclusiveCount > 0) {
    pushGraphqlIssue(
      issues,
      "error",
      "SHOPIFY_GRAPHQL_TAX_INCLUSIVE_BLOCKED",
      `${taxInclusiveCount} order(s) have taxesIncluded == true; whole fixture blocked (not tax-stripped).`,
    );
    const completeness = emptyCompleteness(shopCurrency, shopCurrencyState);
    return {
      status: "blocked",
      entities: null,
      issues,
      completeness: {
        ...completeness,
        blockedTaxInclusiveCount: taxInclusiveCount,
      },
      orderDispositions: dispositions,
    };
  }

  const trustedOrders: Order[] = [];
  const productMap = new Map<string, Product>();
  let hasLimitations = false;

  for (const o of deduped) {
    const unidentified = o.customer == null;

    if (o.cancelledAt != null) {
      dispositions.push({
        orderGid: o.id,
        kind: "excluded",
        unidentifiedCustomer: unidentified,
        reason: "cancelledAt is set",
      });
      continue;
    }
    if (o.test === true) {
      dispositions.push({
        orderGid: o.id,
        kind: "excluded",
        unidentifiedCustomer: unidentified,
        reason: "test == true",
      });
      continue;
    }
    if (isExcludedFinancialStatus(o.displayFinancialStatus)) {
      dispositions.push({
        orderGid: o.id,
        kind: "excluded",
        unidentifiedCustomer: unidentified,
        reason: `displayFinancialStatus == ${o.displayFinancialStatus}`,
      });
      continue;
    }
    if (isProvisionalFinancialStatus(o.displayFinancialStatus)) {
      dispositions.push({
        orderGid: o.id,
        kind: "provisional",
        unidentifiedCustomer: unidentified,
        reason: `displayFinancialStatus == ${o.displayFinancialStatus}`,
      });
      hasLimitations = true;
      pushGraphqlIssue(
        issues,
        "limitation",
        "SHOPIFY_GRAPHQL_PROVISIONAL_ORDER",
        `Order ${o.id} is provisional (${o.displayFinancialStatus}); excluded from trusted metrics.`,
      );
      continue;
    }
    if (!isIncludedFinancialStatus(o.displayFinancialStatus)) {
      dispositions.push({
        orderGid: o.id,
        kind: "excluded",
        unidentifiedCustomer: unidentified,
        reason: `unrecognised displayFinancialStatus == ${o.displayFinancialStatus}`,
      });
      continue;
    }
    if (o.edited === true) {
      dispositions.push({
        orderGid: o.id,
        kind: "unsupported_edited",
        unidentifiedCustomer: unidentified,
        reason: "edited == true; fail-closed (not trusted §3.1)",
      });
      hasLimitations = true;
      pushGraphqlIssue(
        issues,
        "limitation",
        "SHOPIFY_GRAPHQL_EDITED_UNSUPPORTED",
        `Order ${o.id} is edited; excluded from trusted revenue (updatedAt replace is not edit-aware).`,
      );
      continue;
    }

    const lineNodes = o.lineItems.edges.map((e) => e.node);
    const { lineItems, grossRevenue, missingTaxonomy, productDrafts } = buildLineItems(lineNodes);
    const discounts = shopMoneyFromBag(o.totalDiscountsSet);
    const refunds = merchandiseRefunds(o);

    for (const p of productDrafts) {
      const existing = productMap.get(p.id);
      if (!existing) {
        productMap.set(p.id, {
          id: p.id,
          title: p.title,
          sku: p.sku,
          vendor: p.vendor,
          isDeletedOrMissing: p.isDeletedOrMissing,
        });
      } else {
        if (p.vendor && !existing.vendor) {
          productMap.set(p.id, { ...existing, vendor: p.vendor });
        }
        if (p.isDeletedOrMissing) {
          productMap.set(p.id, { ...existing, isDeletedOrMissing: true });
        }
      }
    }

    if (missingTaxonomy) {
      hasLimitations = true;
      pushGraphqlIssue(
        issues,
        "notice",
        "SHOPIFY_GRAPHQL_MISSING_TAXONOMY",
        `Order ${o.id} has missing Shopify taxonomy category; category filter unsupported/unknown.`,
      );
    }

    if (unidentified) {
      hasLimitations = true;
      pushGraphqlIssue(
        issues,
        "limitation",
        "SHOPIFY_GRAPHQL_UNIDENTIFIED_CUSTOMER",
        `Order ${o.id} has no identifiable customer; Unidentified for identity-sensitive metrics.`,
      );
    }

    dispositions.push({
      orderGid: o.id,
      kind: "trusted",
      unidentifiedCustomer: unidentified,
      reason: "trusted-eligible under §5.4",
      missingTaxonomy: missingTaxonomy || undefined,
    });

    trustedOrders.push({
      id: toShopifyOrderId(o.id),
      customerId: o.customer ? toShopifyCustomerId(o.customer.id) : null,
      orderedAt: o.createdAt,
      grossRevenue,
      discounts,
      refunds,
      lineItems,
    });
  }

  // Identifiable customers from trusted orders only.
  // firstProductId = first line on chronological first order (CSV / deriveFirstProductIdForCustomer parity).
  const byCustomer = new Map<string, Order[]>();
  for (const order of trustedOrders) {
    if (order.customerId == null) continue;
    const list = byCustomer.get(order.customerId) ?? [];
    list.push(order);
    byCustomer.set(order.customerId, list);
  }

  const customers: Customer[] = [];
  for (const [customerId, custOrders] of byCustomer) {
    const sorted = sortTrustedOrdersForCustomer(custOrders);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const firstLine = custOrders.find((o) => o.id === first.id)?.lineItems[0];
    customers.push({
      id: customerId,
      firstOrderAt: first.orderedAt,
      lastOrderAt: last.orderedAt,
      firstProductId: firstLine?.productId,
    });
  }
  customers.sort((a, b) => a.id.localeCompare(b.id, "en"));

  const products = [...productMap.values()].sort((a, b) => a.id.localeCompare(b.id, "en"));
  const entities: ShopifyGraphqlEntityOutput = {
    customers,
    orders: trustedOrders,
    products,
  };

  const completeness = buildCompleteness(trustedOrders, dispositions, shopCurrency, shopCurrencyState);

  if (completeness.unidentifiedTrustedOrderCount > 0) {
    hasLimitations = true;
  }
  if (completeness.unsupportedEditedCount > 0 || completeness.provisionalCount > 0) {
    hasLimitations = true;
  }

  return {
    status: hasLimitations ? "accepted_with_limitations" : "ok",
    entities,
    issues,
    completeness,
    orderDispositions: dispositions,
  };
}
