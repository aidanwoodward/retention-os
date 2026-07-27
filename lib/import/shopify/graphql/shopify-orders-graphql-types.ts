/**
 * Shopify GraphQL Admin API–shaped fixture types for the 5W-B adapter (pinned contract 2026-07).
 * Subset only — not a full schema client.
 */

import type { Customer, Order, Product } from "../../../types";

export type ShopifyGraphqlMoneyV2 = {
  readonly amount: string;
  readonly currencyCode: string;
};

export type ShopifyGraphqlMoneyBag = {
  readonly shopMoney: ShopifyGraphqlMoneyV2;
  readonly presentmentMoney?: ShopifyGraphqlMoneyV2;
};

export type ShopifyDisplayFinancialStatus =
  | "PAID"
  | "PARTIALLY_PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "AUTHORIZED"
  | "PENDING"
  | "VOIDED"
  | "EXPIRED";

export type ShopifyGraphqlLineItemNode = {
  readonly id: string;
  readonly originalTotalSet: ShopifyGraphqlMoneyBag;
  readonly quantity: number;
  readonly sku?: string | null;
  readonly title?: string | null;
  readonly name?: string | null;
  readonly vendor?: string | null;
  readonly isGiftCard?: boolean | null;
  readonly product?: {
    readonly id: string;
    readonly title?: string | null;
    readonly vendor?: string | null;
    readonly category?: { readonly id: string; readonly name?: string | null } | null;
    readonly status?: string | null;
  } | null;
  readonly variant?: { readonly id: string; readonly sku?: string | null } | null;
};

export type ShopifyGraphqlRefundLineItemNode = {
  readonly subtotalSet: ShopifyGraphqlMoneyBag;
};

export type ShopifyGraphqlRefundNode = {
  readonly id: string;
  readonly createdAt?: string;
  readonly processedAt?: string;
  readonly refundLineItems: {
    readonly edges: ReadonlyArray<{ readonly node: ShopifyGraphqlRefundLineItemNode }>;
  };
  readonly totalRefundedSet?: ShopifyGraphqlMoneyBag;
};

export type ShopifyGraphqlOrderNode = {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly cancelledAt: string | null;
  readonly test: boolean;
  readonly edited: boolean;
  readonly taxesIncluded: boolean;
  readonly currencyCode: string;
  readonly displayFinancialStatus: ShopifyDisplayFinancialStatus;
  readonly customer: { readonly id: string } | null;
  readonly shippingAddress?: { readonly countryCodeV2?: string | null } | null;
  readonly totalDiscountsSet: ShopifyGraphqlMoneyBag;
  readonly totalRefundedSet?: ShopifyGraphqlMoneyBag;
  readonly lineItems: {
    readonly edges: ReadonlyArray<{ readonly node: ShopifyGraphqlLineItemNode }>;
  };
  readonly refunds: {
    readonly edges: ReadonlyArray<{ readonly node: ShopifyGraphqlRefundNode }>;
  };
};

export type ShopifyGraphqlOrdersFixtureInput = {
  readonly orders: readonly ShopifyGraphqlOrderNode[];
  /** Optional shop currency override; otherwise derived from order.currencyCode / shopMoney. */
  readonly shopCurrency?: string;
};

export type ShopifyGraphqlOrderDispositionKind =
  | "trusted"
  | "provisional"
  | "excluded"
  | "unsupported_edited"
  | "blocked_tax_inclusive";

export type ShopifyGraphqlOrderDisposition = {
  readonly orderGid: string;
  readonly kind: ShopifyGraphqlOrderDispositionKind;
  readonly unidentifiedCustomer: boolean;
  readonly reason: string;
  /** Present when taxonomy category was absent on catalogue lines. */
  readonly missingTaxonomy?: boolean;
};

export type ShopifyGraphqlShopCurrencyState = "resolved" | "mixed" | "unknown";

export type ShopifyGraphqlCompleteness = {
  readonly trustedOrderCount: number;
  readonly trustedNetRevenue: number;
  readonly identifiableTrustedOrderCount: number;
  readonly identifiableTrustedNetRevenue: number;
  readonly unidentifiedTrustedOrderCount: number;
  readonly unidentifiedTrustedNetRevenue: number;
  readonly customerIdentityCoverageByOrderCount: number;
  readonly customerIdentityCoverageByNetRevenue: number;
  readonly provisionalCount: number;
  readonly excludedCount: number;
  readonly unsupportedEditedCount: number;
  readonly blockedTaxInclusiveCount: number;
  readonly shopCurrency: string | null;
  readonly shopCurrencyState: ShopifyGraphqlShopCurrencyState;
};

export type ShopifyGraphqlImportIssueSeverity = "error" | "warning" | "limitation" | "notice";

export type ShopifyGraphqlImportIssue = {
  readonly severity: ShopifyGraphqlImportIssueSeverity;
  readonly code: string;
  readonly message: string;
};

export type ShopifyGraphqlAdaptStatus = "ok" | "accepted_with_limitations" | "blocked";

/** Canonical entities produced by the adapter (before dataset meta wrapping). */
export type ShopifyGraphqlEntityOutput = {
  readonly customers: readonly Customer[];
  readonly orders: readonly Order[];
  readonly products: readonly Product[];
};

export type ShopifyGraphqlAdaptResult = {
  readonly status: ShopifyGraphqlAdaptStatus;
  readonly entities: ShopifyGraphqlEntityOutput | null;
  readonly issues: readonly ShopifyGraphqlImportIssue[];
  readonly completeness: ShopifyGraphqlCompleteness;
  readonly orderDispositions: readonly ShopifyGraphqlOrderDisposition[];
};
