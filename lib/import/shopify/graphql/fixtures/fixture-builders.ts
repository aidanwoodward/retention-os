import type {
  ShopifyDisplayFinancialStatus,
  ShopifyGraphqlLineItemNode,
  ShopifyGraphqlMoneyBag,
  ShopifyGraphqlOrderNode,
  ShopifyGraphqlRefundNode,
} from "../shopify-orders-graphql-types";

export function money(amount: number, currencyCode = "USD"): ShopifyGraphqlMoneyBag {
  const shop = { amount: amount.toFixed(2), currencyCode };
  return {
    shopMoney: shop,
    presentmentMoney: { amount: (amount * 1.25).toFixed(2), currencyCode: "EUR" },
  };
}

export function moneyShopOnly(amount: number, currencyCode = "USD"): ShopifyGraphqlMoneyBag {
  return { shopMoney: { amount: amount.toFixed(2), currencyCode } };
}

export type LineOpts = {
  id: string;
  amount: number;
  quantity?: number;
  sku?: string | null;
  title?: string;
  vendor?: string | null;
  isGiftCard?: boolean;
  productId?: string | null;
  productTitle?: string;
  productVendor?: string | null;
  category?: { id: string; name?: string } | null | undefined;
  variantId?: string | null;
  currencyCode?: string;
};

export function lineItem(opts: LineOpts): ShopifyGraphqlLineItemNode {
  const currencyCode = opts.currencyCode ?? "USD";
  const product =
    opts.productId === null
      ? null
      : {
          id: opts.productId ?? `gid://shopify/Product/${opts.id.replace(/\D/g, "") || "1"}`,
          title: opts.productTitle ?? opts.title ?? "Product",
          vendor: opts.productVendor ?? opts.vendor ?? null,
          category:
            opts.category === undefined
              ? null
              : opts.category,
          status: "ACTIVE",
        };

  return {
    id: opts.id.startsWith("gid://") ? opts.id : `gid://shopify/LineItem/${opts.id}`,
    originalTotalSet: moneyShopOnly(opts.amount, currencyCode),
    quantity: opts.quantity ?? 1,
    sku: opts.sku ?? null,
    title: opts.title ?? "Product",
    name: opts.title ?? "Product",
    vendor: opts.vendor ?? null,
    isGiftCard: opts.isGiftCard ?? false,
    product,
    variant:
      opts.variantId === null
        ? null
        : {
            id: opts.variantId ?? `gid://shopify/ProductVariant/${opts.id.replace(/\D/g, "") || "1"}`,
            sku: opts.sku ?? null,
          },
  };
}

export type OrderOpts = {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string | null;
  test?: boolean;
  edited?: boolean;
  taxesIncluded?: boolean;
  currencyCode?: string;
  displayFinancialStatus?: ShopifyDisplayFinancialStatus;
  customerId?: string | null;
  discounts?: number;
  totalRefunded?: number;
  lines: ShopifyGraphqlLineItemNode[];
  refunds?: ShopifyGraphqlRefundNode[];
  countryCodeV2?: string | null;
};

export function order(opts: OrderOpts): ShopifyGraphqlOrderNode {
  const gid = opts.id.startsWith("gid://") ? opts.id : `gid://shopify/Order/${opts.id}`;
  const currencyCode = opts.currencyCode ?? "USD";
  return {
    id: gid,
    name: opts.name ?? `#${opts.id}`,
    createdAt: opts.createdAt,
    updatedAt: opts.updatedAt ?? opts.createdAt,
    cancelledAt: opts.cancelledAt ?? null,
    test: opts.test ?? false,
    edited: opts.edited ?? false,
    taxesIncluded: opts.taxesIncluded ?? false,
    currencyCode,
    displayFinancialStatus: opts.displayFinancialStatus ?? "PAID",
    customer:
      opts.customerId === null
        ? null
        : { id: opts.customerId?.startsWith("gid://") ? opts.customerId : `gid://shopify/Customer/${opts.customerId ?? "1"}` },
    shippingAddress: { countryCodeV2: opts.countryCodeV2 ?? "US" },
    totalDiscountsSet: moneyShopOnly(opts.discounts ?? 0, currencyCode),
    totalRefundedSet: moneyShopOnly(opts.totalRefunded ?? 0, currencyCode),
    lineItems: { edges: opts.lines.map((node) => ({ node })) },
    refunds: { edges: (opts.refunds ?? []).map((node) => ({ node })) },
  };
}

export function merchandiseRefund(
  id: string,
  subtotal: number,
  currencyCode = "USD",
): ShopifyGraphqlRefundNode {
  return {
    id: id.startsWith("gid://") ? id : `gid://shopify/Refund/${id}`,
    createdAt: "2024-02-15T12:00:00.000Z",
    processedAt: "2024-02-15T12:00:00.000Z",
    refundLineItems: {
      edges: [
        {
          node: {
            subtotalSet: moneyShopOnly(subtotal, currencyCode),
          },
        },
      ],
    },
    totalRefundedSet: moneyShopOnly(subtotal, currencyCode),
  };
}

export function shippingOnlyRefund(id: string, shippingAmount: number, currencyCode = "USD"): ShopifyGraphqlRefundNode {
  return {
    id: id.startsWith("gid://") ? id : `gid://shopify/Refund/${id}`,
    createdAt: "2024-02-15T12:00:00.000Z",
    processedAt: "2024-02-15T12:00:00.000Z",
    refundLineItems: { edges: [] },
    totalRefundedSet: moneyShopOnly(shippingAmount, currencyCode),
  };
}

export const CUST_A = "gid://shopify/Customer/100";
export const CUST_B = "gid://shopify/Customer/200";
export const PROD_SERUM = "gid://shopify/Product/10";
export const PROD_CREAM = "gid://shopify/Product/20";
export const VAR_SERUM = "gid://shopify/ProductVariant/101";
export const VAR_CREAM = "gid://shopify/ProductVariant/201";
