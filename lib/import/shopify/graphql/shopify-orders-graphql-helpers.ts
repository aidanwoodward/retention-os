import type {
  ShopifyDisplayFinancialStatus,
  ShopifyGraphqlImportIssue,
  ShopifyGraphqlImportIssueSeverity,
  ShopifyGraphqlMoneyBag,
  ShopifyGraphqlMoneyV2,
  ShopifyGraphqlOrderNode,
} from "./shopify-orders-graphql-types";

const INCLUDED_FINANCIAL: ReadonlySet<ShopifyDisplayFinancialStatus> = new Set([
  "PAID",
  "PARTIALLY_PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

const PROVISIONAL_FINANCIAL: ReadonlySet<ShopifyDisplayFinancialStatus> = new Set([
  "AUTHORIZED",
  "PENDING",
]);

const EXCLUDED_FINANCIAL: ReadonlySet<ShopifyDisplayFinancialStatus> = new Set([
  "VOIDED",
  "EXPIRED",
]);

export function pushGraphqlIssue(
  issues: ShopifyGraphqlImportIssue[],
  severity: ShopifyGraphqlImportIssueSeverity,
  code: string,
  message: string,
): void {
  issues.push({ severity, code, message });
}

export function parseShopMoneyAmount(money: ShopifyGraphqlMoneyV2 | undefined | null): number | null {
  if (!money || typeof money.amount !== "string") return null;
  const n = Number(money.amount);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function shopMoneyFromBag(bag: ShopifyGraphqlMoneyBag | undefined | null): number {
  return parseShopMoneyAmount(bag?.shopMoney) ?? 0;
}

export function currencyFromBag(bag: ShopifyGraphqlMoneyBag | undefined | null): string | null {
  const code = bag?.shopMoney?.currencyCode?.trim();
  return code && code.length > 0 ? code : null;
}

export function toShopifyOrderId(gid: string): string {
  return `shopify:order:${gid}`;
}

export function toShopifyCustomerId(gid: string): string {
  return `shopify:customer:${gid}`;
}

export function toShopifyProductId(gid: string): string {
  return `shopify:product:${gid}`;
}

export function toShopifyVariantId(gid: string): string {
  return `shopify:variant:${gid}`;
}

export function toShopifyLineItemId(gid: string): string {
  return `shopify:line_item:${gid}`;
}

export function isIncludedFinancialStatus(status: ShopifyDisplayFinancialStatus): boolean {
  return INCLUDED_FINANCIAL.has(status);
}

export function isProvisionalFinancialStatus(status: ShopifyDisplayFinancialStatus): boolean {
  return PROVISIONAL_FINANCIAL.has(status);
}

export function isExcludedFinancialStatus(status: ShopifyDisplayFinancialStatus): boolean {
  return EXCLUDED_FINANCIAL.has(status);
}

/** Prefer later updatedAt; GID ascending tie-break when equal. */
export function compareOrdersForRefresh(a: ShopifyGraphqlOrderNode, b: ShopifyGraphqlOrderNode): number {
  if (a.updatedAt < b.updatedAt) return -1;
  if (a.updatedAt > b.updatedAt) return 1;
  return a.id.localeCompare(b.id, "en");
}

/**
 * Multi-product first-order attribution (parity with CSV / product-quality):
 * chronological first order by orderedAt ASC, then order id ASC;
 * firstProductId = firstOrder.lineItems[0].productId (line order as adapted).
 */
export function sortTrustedOrdersForCustomer(
  orders: ReadonlyArray<{ id: string; orderedAt: string }>,
): Array<{ id: string; orderedAt: string }> {
  return [...orders].sort((a, b) => {
    if (a.orderedAt < b.orderedAt) return -1;
    if (a.orderedAt > b.orderedAt) return 1;
    return a.id.localeCompare(b.id, "en");
  });
}
