/**
 * MET-FIRST-PRODUCT-RULE — deriveFirstProductAttribution tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Customer } from "../types/customer";
import type { Order, OrderLineItem } from "../types/order";
import {
  deriveFirstProductAttribution,
  isVariantFallbackProductIdentity,
} from "./first-product-attribution";

const T0 = "2024-01-01T12:00:00.000Z";
const T1 = "2024-01-15T12:00:00.000Z";
const T2 = "2024-02-01T12:00:00.000Z";
const AS_OF = "2024-06-01T00:00:00.000Z";

function customer(id: string, firstOrderAt: string): Customer {
  return { id, firstOrderAt };
}

function line(opts: {
  id?: string;
  productId?: string;
  variantId?: string;
  title?: string;
  sku?: string;
  quantity?: number;
  lineTotal?: number;
}): OrderLineItem {
  return {
    id: opts.id ?? `li_${opts.productId ?? "x"}`,
    productId: opts.productId,
    variantId: opts.variantId,
    title: opts.title,
    sku: opts.sku,
    quantity: opts.quantity ?? 1,
    lineTotal: opts.lineTotal,
  };
}

function order(
  id: string,
  customerId: string | null,
  orderedAt: string,
  lineItems: OrderLineItem[],
  overrides: Partial<Pick<Order, "grossRevenue" | "discounts" | "refunds">> = {},
): Order {
  const gross =
    overrides.grossRevenue ??
    lineItems.reduce((s, li) => s + (li.lineTotal != null && Number.isFinite(li.lineTotal) ? li.lineTotal : 0), 0);
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue: gross,
    discounts: overrides.discounts ?? 0,
    refunds: overrides.refunds ?? 0,
    lineItems,
  };
}

describe("deriveFirstProductAttribution — chronology", () => {
  it("1: earliest canonical order is selected", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o2", "c1", T1, [line({ productId: "prod_b", lineTotal: 50 })]),
      order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 100 })]),
    ];
    const r = deriveFirstProductAttribution(c, orders);
    assert.deepEqual(r, { attributionStatus: "single_product", firstProductId: "prod_a" });
  });

  it("2: input order does not affect identity", () => {
    const c = customer("c1", T0);
    const a = [
      order("o2", "c1", T1, [line({ productId: "prod_b", lineTotal: 50 })]),
      order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 100 })]),
    ];
    const b = [...a].reverse();
    assert.deepEqual(deriveFirstProductAttribution(c, a), deriveFirstProductAttribution(c, b));
  });

  it("3: equal timestamps use stable order-ID tie-break", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o_z", "c1", T0, [line({ productId: "prod_z", lineTotal: 10 })]),
      order("o_a", "c1", T0, [line({ productId: "prod_a", lineTotal: 10 })]),
    ];
    const r = deriveFirstProductAttribution(c, orders);
    assert.deepEqual(r, { attributionStatus: "single_product", firstProductId: "prod_a" });
  });

  it("4: observed order before firstOrderAt throws RangeError", () => {
    const c = customer("c1", T1);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 10 })])];
    assert.throws(() => deriveFirstProductAttribution(c, orders), RangeError);
  });

  it("5: earliest observed after firstOrderAt returns unknown", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T1, [line({ productId: "prod_a", lineTotal: 10 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "unknown",
      firstProductId: null,
    });
  });

  it("6: orders at or after asOfDate are excluded", () => {
    const c = customer("c1", T0);
    const asOf = "2024-01-10T00:00:00.000Z";
    const orders = [
      order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 10 })]),
      order("o2", "c1", T1, [line({ productId: "prod_b", lineTotal: 10 })]),
    ];
    const r = deriveFirstProductAttribution(c, orders, { asOfDate: asOf });
    assert.deepEqual(r, { attributionStatus: "single_product", firstProductId: "prod_a" });
  });

  it("7: later orders cannot repair missing first history", () => {
    const c = customer("c1", T0);
    const orders = [
      // History gap at T0 — only later order present
      order("o2", "c1", T2, [
        line({ productId: "prod_a", lineTotal: 10 }),
        line({ productId: "prod_b", lineTotal: 10 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "unknown",
      firstProductId: null,
    });
  });

  it("8: no matching orders returns unknown", () => {
    const c = customer("c1", T0);
    assert.deepEqual(deriveFirstProductAttribution(c, []), {
      attributionStatus: "unknown",
      firstProductId: null,
    });
    const other = [order("o1", "c2", T0, [line({ productId: "prod_a", lineTotal: 10 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, other), {
      attributionStatus: "unknown",
      firstProductId: null,
    });
  });

  it("9: inputs are not mutated", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o2", "c1", T1, [line({ productId: "prod_b", lineTotal: 50 })]),
      order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 100 })]),
    ];
    const before = orders.map((o) => o.id);
    deriveFirstProductAttribution(c, orders);
    assert.deepEqual(
      orders.map((o) => o.id),
      before,
    );
  });

  it("10: invalid asOfDate follows canonical validation", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 10 })])];
    assert.throws(
      () => deriveFirstProductAttribution(c, orders, { asOfDate: "2024-01-01T00:00:00Z" }),
      RangeError,
    );
  });
});

describe("deriveFirstProductAttribution — single_product", () => {
  it("11: one reliable product", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 100 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("12: multiple quantities remain single_product", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [line({ productId: "prod_a", quantity: 5, lineTotal: 500 })]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("13: repeated lines remain single_product", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 40 }),
        line({ id: "l2", productId: "prod_a", lineTotal: 60 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("14: several variants sharing one canonical productId remain single_product", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", variantId: "var_1", lineTotal: 40 }),
        line({ id: "l2", productId: "prod_a", variantId: "var_2", lineTotal: 60 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("15: product titles do not split one product ID", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", title: "Title A", lineTotal: 40 }),
        line({ id: "l2", productId: "prod_a", title: "Title B", lineTotal: 60 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("16: missing product catalogue metadata does not change reliable identity", () => {
    // Helper takes no products[] — reliable id alone is enough.
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "gone", lineTotal: 55 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "gone",
    });
  });

  it("17: fully refunded valid first order retains attribution", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 100 })], {
        grossRevenue: 100,
        refunds: 100,
      }),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("18: zero-net valid first order retains attribution", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 100 })], {
        grossRevenue: 100,
        discounts: 100,
      }),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("19: reliable zero-value product remains single_product", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 0 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });

  it("missing lineTotal with reliable id remains single_product", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a" })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });
});

describe("deriveFirstProductAttribution — multi_product", () => {
  it("20: two canonical products", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 30 }),
        line({ id: "l2", productId: "prod_b", lineTotal: 70 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "multi_product",
      firstProductId: null,
    });
  });

  it("21: three or more canonical products", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "a", lineTotal: 10 }),
        line({ id: "l2", productId: "b", lineTotal: 10 }),
        line({ id: "l3", productId: "c", lineTotal: 10 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "multi_product",
      firstProductId: null,
    });
  });

  it("22: one positive and one zero-value reliable product", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 100 }),
        line({ id: "l2", productId: "prod_b", lineTotal: 0 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "multi_product",
      firstProductId: null,
    });
  });

  it("23-25: line order / revenue / quantity do not select a product", () => {
    const c = customer("c1", T0);
    const forward = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", quantity: 1, lineTotal: 10 }),
        line({ id: "l2", productId: "prod_b", quantity: 99, lineTotal: 999 }),
      ]),
    ];
    const reverse = [
      order("o1", "c1", T0, [
        line({ id: "l2", productId: "prod_b", quantity: 99, lineTotal: 999 }),
        line({ id: "l1", productId: "prod_a", quantity: 1, lineTotal: 10 }),
      ]),
    ];
    const a = deriveFirstProductAttribution(c, forward);
    const b = deriveFirstProductAttribution(c, reverse);
    assert.deepEqual(a, { attributionStatus: "multi_product", firstProductId: null });
    assert.deepEqual(b, a);
  });

  it("26: no firstProductId for multi_product", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 30 }),
        line({ id: "l2", productId: "prod_b", lineTotal: 70 }),
      ]),
    ];
    const r = deriveFirstProductAttribution(c, orders);
    assert.equal(r.attributionStatus, "multi_product");
    assert.equal(r.firstProductId, null);
  });
});

describe("deriveFirstProductAttribution — unknown", () => {
  it("27: empty line items", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("28: missing productId", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ title: "Nameless", lineTotal: 10 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("29: one reliable plus unresolved line", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 50 }),
        line({ id: "l2", title: "Unknown", lineTotal: 50 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("30: one reliable plus unresolved zero-value line", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 50 }),
        line({ id: "l2", title: "Free sample", lineTotal: 0 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("31: variant fallback equal-id returns unknown", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ productId: "var_x", variantId: "var_x", lineTotal: 70 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("32: variant fallback alongside reliable product returns unknown", () => {
    const c = customer("c1", T0);
    const gid = "gid://shopify/ProductVariant/123";
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 50 }),
        line({
          id: "l2",
          productId: `shopify:variant:${gid}`,
          variantId: gid,
          lineTotal: 50,
        }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("33: all unresolved lines return unknown", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", title: "A", lineTotal: 10 }),
        line({ id: "l2", title: "B", lineTotal: 10 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("34: negative lineTotal returns unknown", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: -5 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("35: non-finite lineTotal returns unknown", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: Number.NaN })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
    const ordersInf = [
      order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: Number.POSITIVE_INFINITY })]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, ordersInf), UNKNOWN_EQ());
  });

  it("36: history gap returns unknown", () => {
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T2, [line({ productId: "prod_a", lineTotal: 10 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("37: gift-empty first order returns unknown", () => {
    // After GraphQL import exclusion, gift-only baskets have empty lineItems.
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [], { grossRevenue: 0 })];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("38: no synthetic title or SKU identity is created", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ title: "Serum", sku: "SERUM-1", lineTotal: 80 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("shopify:variant: namespace without matching variantId is unknown", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ productId: "shopify:variant:gid://shopify/ProductVariant/9", lineTotal: 40 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });
});

describe("deriveFirstProductAttribution — determinism", () => {
  it("39: different product IDs with identical titles remain distinct", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", title: "Same", lineTotal: 10 }),
        line({ id: "l2", productId: "prod_b", title: "Same", lineTotal: 10 }),
      ]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), {
      attributionStatus: "multi_product",
      firstProductId: null,
    });
  });

  it("40: product and line reordering does not alter output", () => {
    const c = customer("c1", T0);
    const a = deriveFirstProductAttribution(c, [
      order("o1", "c1", T0, [
        line({ id: "l1", productId: "prod_a", lineTotal: 10 }),
        line({ id: "l2", productId: "prod_b", lineTotal: 20 }),
      ]),
    ]);
    const b = deriveFirstProductAttribution(c, [
      order("o1", "c1", T0, [
        line({ id: "l2", productId: "prod_b", lineTotal: 20 }),
        line({ id: "l1", productId: "prod_a", lineTotal: 10 }),
      ]),
    ]);
    assert.deepEqual(a, b);
  });

  it("41: variantId alone never creates canonical product identity", () => {
    const c = customer("c1", T0);
    const orders = [
      order("o1", "c1", T0, [line({ variantId: "var_only", title: "X", lineTotal: 10 })]),
    ];
    assert.deepEqual(deriveFirstProductAttribution(c, orders), UNKNOWN_EQ());
  });

  it("42: locale comparator used for order tie-breaks", () => {
    const c = customer("c1", T0);
    // localeCompare("en"): "o_9" vs "o_10" — "o_10" < "o_9" under string compare
    const orders = [
      order("o_9", "c1", T0, [line({ productId: "prod_9", lineTotal: 10 })]),
      order("o_10", "c1", T0, [line({ productId: "prod_10", lineTotal: 10 })]),
    ];
    const expectedId = ["o_9", "o_10"].sort((a, b) => a.localeCompare(b, "en"))[0]!;
    const r = deriveFirstProductAttribution(c, orders);
    assert.equal(r.attributionStatus, "single_product");
    assert.equal(r.firstProductId, expectedId === "o_10" ? "prod_10" : "prod_9");
  });

  it("43: helper has no product catalogue first-wins behaviour", () => {
    // No products param — attribution ignores catalogue entirely.
    assert.equal(typeof isVariantFallbackProductIdentity, "function");
    const c = customer("c1", T0);
    const orders = [order("o1", "c1", T0, [line({ productId: "prod_a", lineTotal: 10 })])];
    assert.deepEqual(deriveFirstProductAttribution(c, orders, { asOfDate: AS_OF }), {
      attributionStatus: "single_product",
      firstProductId: "prod_a",
    });
  });
});

describe("isVariantFallbackProductIdentity", () => {
  it("detects equal productId/variantId", () => {
    assert.equal(
      isVariantFallbackProductIdentity(line({ productId: "var_x", variantId: "var_x" })),
      true,
    );
  });

  it("detects GraphQL encoded shopify:variant:${gid}", () => {
    const gid = "gid://shopify/ProductVariant/1";
    assert.equal(
      isVariantFallbackProductIdentity(
        line({ productId: `shopify:variant:${gid}`, variantId: gid }),
      ),
      true,
    );
  });

  it("detects shopify:variant: namespace", () => {
    assert.equal(
      isVariantFallbackProductIdentity(line({ productId: "shopify:variant:anything" })),
      true,
    );
  });

  it("does not treat genuine productId with distinct variantId as fallback", () => {
    assert.equal(
      isVariantFallbackProductIdentity(
        line({ productId: "shopify:product:gid://shopify/Product/1", variantId: "gid://shopify/ProductVariant/1" }),
      ),
      false,
    );
  });
});

function UNKNOWN_EQ() {
  return { attributionStatus: "unknown" as const, firstProductId: null };
}
