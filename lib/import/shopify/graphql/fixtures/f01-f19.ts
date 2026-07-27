/**
 * Authoritative F01–F19 Shopify GraphQL fixture cases (contract §14).
 */

import type { ShopifyGraphqlOrderNode } from "../shopify-orders-graphql-types";
import {
  CUST_A,
  CUST_B,
  lineItem,
  merchandiseRefund,
  money,
  order,
  PROD_CREAM,
  PROD_SERUM,
  shippingOnlyRefund,
  VAR_CREAM,
  VAR_SERUM,
} from "./fixture-builders";

/** F01 — Repeat identifiable customer (2+ trusted orders). */
export function fixtureF01(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "1001",
      createdAt: "2024-01-10T10:00:00.000Z",
      customerId: CUST_A,
      discounts: 0,
      lines: [
        lineItem({
          id: "li-1001-1",
          amount: 80,
          title: "Serum",
          sku: "SERUM-1",
          productId: PROD_SERUM,
          variantId: VAR_SERUM,
          vendor: "Lumin",
          category: { id: "gid://shopify/TaxonomyCategory/1", name: "Beauty" },
        }),
      ],
    }),
    order({
      id: "1002",
      createdAt: "2024-02-05T10:00:00.000Z",
      customerId: CUST_A,
      discounts: 0,
      lines: [
        lineItem({
          id: "li-1002-1",
          amount: 60,
          title: "Cream",
          sku: "CREAM-1",
          productId: PROD_CREAM,
          variantId: VAR_CREAM,
          vendor: "Lumin",
          category: { id: "gid://shopify/TaxonomyCategory/1", name: "Beauty" },
        }),
      ],
    }),
  ];
}

/** F02 — Guest order (customer: null). */
export function fixtureF02(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "2001",
      createdAt: "2024-01-15T12:00:00.000Z",
      customerId: null,
      discounts: 5,
      lines: [
        lineItem({
          id: "li-2001-1",
          amount: 50,
          title: "Guest Serum",
          productId: PROD_SERUM,
          variantId: VAR_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F03 — Refund after original order. */
export function fixtureF03(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "3001",
      createdAt: "2024-01-20T09:00:00.000Z",
      updatedAt: "2024-02-01T09:00:00.000Z",
      customerId: CUST_B,
      discounts: 10,
      totalRefunded: 20,
      displayFinancialStatus: "PARTIALLY_REFUNDED",
      lines: [
        lineItem({
          id: "li-3001-1",
          amount: 100,
          title: "Serum",
          productId: PROD_SERUM,
          variantId: VAR_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
      refunds: [merchandiseRefund("r-3001", 20)],
    }),
  ];
}

/** F04 — Cancelled order. */
export function fixtureF04(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "4001",
      createdAt: "2024-01-21T09:00:00.000Z",
      cancelledAt: "2024-01-21T10:00:00.000Z",
      customerId: CUST_B,
      discounts: 0,
      lines: [
        lineItem({
          id: "li-4001-1",
          amount: 40,
          title: "Cancelled",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F05 — Test order. */
export function fixtureF05(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "5001",
      createdAt: "2024-01-22T09:00:00.000Z",
      test: true,
      customerId: CUST_B,
      lines: [
        lineItem({
          id: "li-5001-1",
          amount: 40,
          title: "Test",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/**
 * F06 — Multi-product first identifiable order.
 * Line order in edges is intentional: first line = Cream (firstProductId parity with CSV lineItems[0]).
 */
export function fixtureF06(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "6001",
      createdAt: "2024-03-01T08:00:00.000Z",
      customerId: CUST_B,
      lines: [
        lineItem({
          id: "li-6001-1",
          amount: 30,
          title: "Cream",
          sku: "CREAM-1",
          productId: PROD_CREAM,
          variantId: VAR_CREAM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
        lineItem({
          id: "li-6001-2",
          amount: 70,
          title: "Serum",
          sku: "SERUM-1",
          productId: PROD_SERUM,
          variantId: VAR_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F07 — Variant + SKU. */
export function fixtureF07(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "7001",
      createdAt: "2024-03-02T08:00:00.000Z",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-7001-1",
          amount: 45,
          title: "Serum",
          sku: "SKU-SERUM-XL",
          productId: PROD_SERUM,
          variantId: VAR_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F08 — Vendor present. */
export function fixtureF08(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "8001",
      createdAt: "2024-03-03T08:00:00.000Z",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-8001-1",
          amount: 55,
          title: "Serum",
          productId: PROD_SERUM,
          productVendor: "Acme Brand",
          vendor: "Acme Brand",
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F09 — Missing taxonomy category. */
export function fixtureF09(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "9001",
      createdAt: "2024-03-04T08:00:00.000Z",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-9001-1",
          amount: 35,
          title: "No Taxonomy",
          productId: PROD_SERUM,
          category: null,
        }),
      ],
    }),
  ];
}

/** F10 — Presentment currency differs; metrics must use shopMoney. */
export function fixtureF10(): ShopifyGraphqlOrderNode[] {
  const line = lineItem({
    id: "li-10001-1",
    amount: 100,
    title: "Shop Money Line",
    productId: PROD_SERUM,
    category: { id: "gid://shopify/TaxonomyCategory/1" },
  });
  // Force presentment divergence on the line bag
  const withPresentment: typeof line = {
    ...line,
    originalTotalSet: money(100, "USD"),
  };
  return [
    order({
      id: "10001",
      createdAt: "2024-03-05T08:00:00.000Z",
      customerId: CUST_A,
      discounts: 10,
      lines: [withPresentment],
    }),
  ];
}

/** F11 — Deleted product reference (product null; variant retained). */
export function fixtureF11(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "11001",
      createdAt: "2024-03-06T08:00:00.000Z",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-11001-1",
          amount: 40,
          title: "Deleted Product Title",
          sku: "GONE-1",
          productId: null,
          variantId: VAR_SERUM,
          category: null,
        }),
      ],
    }),
  ];
}

/** F12 — Missing customer identity (same as F02). */
export function fixtureF12(): ShopifyGraphqlOrderNode[] {
  return fixtureF02();
}

/** F13 — Late updatedAt refresh (same GID, higher refund). Pair: before + after. */
export function fixtureF13Before(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "13001",
      createdAt: "2024-01-25T09:00:00.000Z",
      updatedAt: "2024-01-25T09:00:00.000Z",
      customerId: CUST_A,
      discounts: 10,
      displayFinancialStatus: "PAID",
      lines: [
        lineItem({
          id: "li-13001-1",
          amount: 100,
          title: "Serum",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

export function fixtureF13After(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "13001",
      createdAt: "2024-01-25T09:00:00.000Z",
      updatedAt: "2024-03-01T09:00:00.000Z",
      customerId: CUST_A,
      discounts: 10,
      totalRefunded: 25,
      displayFinancialStatus: "PARTIALLY_REFUNDED",
      lines: [
        lineItem({
          id: "li-13001-1",
          amount: 100,
          title: "Serum",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
      refunds: [merchandiseRefund("r-13001", 25)],
    }),
  ];
}

/** F14 — taxesIncluded true → whole-fixture blocked. */
export function fixtureF14(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "14001",
      createdAt: "2024-03-07T08:00:00.000Z",
      taxesIncluded: true,
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-14001-1",
          amount: 100,
          title: "Tax Inclusive",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F15 — Shipping + tax + duty refunded; merchandise refunds stay 0. */
export function fixtureF15(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "15001",
      createdAt: "2024-03-08T08:00:00.000Z",
      customerId: CUST_A,
      discounts: 0,
      totalRefunded: 15,
      lines: [
        lineItem({
          id: "li-15001-1",
          amount: 80,
          title: "Serum",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
      refunds: [shippingOnlyRefund("r-15001", 15)],
    }),
  ];
}

/** F16 — edited true. */
export function fixtureF16(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "16001",
      createdAt: "2024-03-09T08:00:00.000Z",
      edited: true,
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-16001-1",
          amount: 90,
          title: "Edited",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F17 — VOIDED. */
export function fixtureF17(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "17001",
      createdAt: "2024-03-10T08:00:00.000Z",
      displayFinancialStatus: "VOIDED",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-17001-1",
          amount: 40,
          title: "Voided",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F18 — PENDING (provisional). */
export function fixtureF18Pending(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "18001",
      createdAt: "2024-03-11T08:00:00.000Z",
      displayFinancialStatus: "PENDING",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-18001-1",
          amount: 40,
          title: "Pending",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F18 — AUTHORIZED (provisional). */
export function fixtureF18Authorized(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "18002",
      createdAt: "2024-03-11T09:00:00.000Z",
      displayFinancialStatus: "AUTHORIZED",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-18002-1",
          amount: 40,
          title: "Authorized",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** F19 — Fully refunded discounted order. */
export function fixtureF19(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "19001",
      createdAt: "2024-03-12T08:00:00.000Z",
      customerId: CUST_A,
      discounts: 10,
      totalRefunded: 90,
      displayFinancialStatus: "REFUNDED",
      lines: [
        lineItem({
          id: "li-19001-1",
          amount: 100,
          title: "Fully Refunded",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
      refunds: [merchandiseRefund("r-19001", 90)],
    }),
  ];
}

/** Mixed shop currencies — whole-fixture block. */
export function fixtureMixedCurrency(): ShopifyGraphqlOrderNode[] {
  return [
    order({
      id: "m1",
      createdAt: "2024-03-13T08:00:00.000Z",
      currencyCode: "USD",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-m1",
          amount: 10,
          currencyCode: "USD",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
    order({
      id: "m2",
      createdAt: "2024-03-13T09:00:00.000Z",
      currencyCode: "GBP",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-m2",
          amount: 10,
          currencyCode: "GBP",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/**
 * Parity pack: identifiable repeat (F01) + guest (F02) + refund (F03) + cancelled/test exclusions
 * + multi-product first order for CUST_B (F06) in a separate month when needed.
 */
export function fixtureMetricParityPack(): ShopifyGraphqlOrderNode[] {
  return [...fixtureF01(), ...fixtureF02(), ...fixtureF03(), ...fixtureF04(), ...fixtureF05(), ...fixtureF06()];
}

/** Edited + trusted companion — edited excluded individually; trusted remains. */
export function fixtureEditedWithTrusted(): ShopifyGraphqlOrderNode[] {
  return [
    ...fixtureF16(),
    order({
      id: "16099",
      createdAt: "2024-03-09T10:00:00.000Z",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-16099-1",
          amount: 50,
          title: "Trusted Companion",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}

/** Tax-inclusive alongside an otherwise trusted order — whole fixture still blocked. */
export function fixtureTaxInclusiveWithTrustedCompanion(): ShopifyGraphqlOrderNode[] {
  return [
    ...fixtureF14(),
    order({
      id: "14099",
      createdAt: "2024-03-07T09:00:00.000Z",
      customerId: CUST_A,
      lines: [
        lineItem({
          id: "li-14099-1",
          amount: 50,
          title: "Would Be Trusted",
          productId: PROD_SERUM,
          category: { id: "gid://shopify/TaxonomyCategory/1" },
        }),
      ],
    }),
  ];
}
