import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adaptShopifyGraphqlOrdersFixture } from "./adapt-shopify-orders-graphql";
import {
  fixtureEditedWithTrusted,
  fixtureF01,
  fixtureF02,
  fixtureF04,
  fixtureF05,
  fixtureF06,
  fixtureF07,
  fixtureF08,
  fixtureF09,
  fixtureF10,
  fixtureF11,
  fixtureF13After,
  fixtureF13Before,
  fixtureF14,
  fixtureF15,
  fixtureF16,
  fixtureF17,
  fixtureF18Authorized,
  fixtureF18Pending,
  fixtureF19,
  fixtureMixedCurrency,
  fixtureTaxInclusiveWithTrustedCompanion,
} from "./fixtures/f01-f19";
import { PROD_CREAM, PROD_SERUM, VAR_SERUM } from "./fixtures/fixture-builders";

describe("adaptShopifyGraphqlOrdersFixture — F01–F19", () => {
  it("F01: repeat identifiable customer shares shopify:customer id", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF01() });
    assert.equal(r.status, "ok");
    assert.ok(r.entities);
    assert.equal(r.entities!.customers.length, 1);
    assert.equal(r.entities!.customers[0]!.id, "shopify:customer:gid://shopify/Customer/100");
    assert.equal(r.entities!.orders.length, 2);
    assert.ok(r.entities!.orders.every((o) => o.customerId === r.entities!.customers[0]!.id));
  });

  it("F02: guest order — null customerId, no synthetic customer, Unidentified coverage", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF02() });
    assert.equal(r.status, "accepted_with_limitations");
    assert.ok(r.entities);
    assert.equal(r.entities!.customers.length, 0);
    assert.equal(r.entities!.orders.length, 1);
    assert.equal(r.entities!.orders[0]!.customerId, null);
    assert.equal(r.completeness.unidentifiedTrustedOrderCount, 1);
    assert.ok(r.completeness.unidentifiedTrustedNetRevenue > 0);
    assert.equal(r.completeness.customerIdentityCoverageByOrderCount, 0);
    assert.ok(r.issues.some((i) => i.code === "SHOPIFY_GRAPHQL_UNIDENTIFIED_CUSTOMER"));
  });

  it("F04: cancelled excluded", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF04() });
    assert.ok(r.entities);
    assert.equal(r.entities!.orders.length, 0);
    assert.equal(r.completeness.excludedCount, 1);
    assert.equal(r.orderDispositions[0]!.kind, "excluded");
  });

  it("F05: test excluded", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF05() });
    assert.ok(r.entities);
    assert.equal(r.entities!.orders.length, 0);
    assert.equal(r.completeness.excludedCount, 1);
  });

  it("F06: multi-product first order — firstProductId is lineItems[0] (CSV parity)", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF06() });
    assert.ok(r.entities);
    const c = r.entities!.customers[0]!;
    assert.equal(c.firstProductId, `shopify:product:${PROD_CREAM}`);
    assert.equal(r.entities!.orders[0]!.lineItems[0]!.productId, `shopify:product:${PROD_CREAM}`);
    assert.equal(r.entities!.orders[0]!.lineItems[1]!.productId, `shopify:product:${PROD_SERUM}`);
  });

  it("F07: variant GID and SKU preserved", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF07() });
    const li = r.entities!.orders[0]!.lineItems[0]!;
    assert.equal(li.variantId, VAR_SERUM);
    assert.equal(li.sku, "SKU-SERUM-XL");
  });

  it("F08: vendor present on product", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF08() });
    const p = r.entities!.products.find((x) => x.id === `shopify:product:${PROD_SERUM}`);
    assert.ok(p);
    assert.equal(p!.vendor, "Acme Brand");
  });

  it("F09: missing taxonomy — notice, no silent drop", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF09() });
    assert.ok(r.entities);
    assert.equal(r.entities!.orders.length, 1);
    assert.ok(r.issues.some((i) => i.code === "SHOPIFY_GRAPHQL_MISSING_TAXONOMY"));
    assert.equal(r.orderDispositions[0]!.missingTaxonomy, true);
  });

  it("F10: shopMoney used (presentment ignored) — gross 100 discounts 10", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF10() });
    const o = r.entities!.orders[0]!;
    assert.equal(o.grossRevenue, 100);
    assert.equal(o.discounts, 10);
  });

  it("F11: deleted product — title/SKU retained; product marked missing", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF11() });
    const o = r.entities!.orders[0]!;
    assert.equal(o.lineItems[0]!.title, "Deleted Product Title");
    assert.equal(o.lineItems[0]!.sku, "GONE-1");
    assert.equal(o.lineItems[0]!.productId, `shopify:variant:${VAR_SERUM}`);
    const p = r.entities!.products[0]!;
    assert.equal(p.isDeletedOrMissing, true);
  });

  it("F13: late updatedAt refresh replaces by GID", () => {
    const before = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF13Before() });
    assert.equal(before.entities!.orders[0]!.refunds, 0);
    const after = adaptShopifyGraphqlOrdersFixture({
      orders: [...fixtureF13Before(), ...fixtureF13After()],
    });
    assert.equal(after.entities!.orders.length, 1);
    assert.equal(after.entities!.orders[0]!.refunds, 25);
    assert.equal(after.entities!.orders[0]!.orderedAt, "2024-01-25T09:00:00.000Z");
  });

  it("F14: taxesIncluded blocks whole fixture", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF14() });
    assert.equal(r.status, "blocked");
    assert.equal(r.entities, null);
    assert.equal(r.completeness.blockedTaxInclusiveCount, 1);
    assert.ok(r.issues.some((i) => i.severity === "error" && i.code === "SHOPIFY_GRAPHQL_TAX_INCLUSIVE_BLOCKED"));
  });

  it("F14 companion: tax-inclusive with trusted peer still whole-fixture blocked", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureTaxInclusiveWithTrustedCompanion() });
    assert.equal(r.status, "blocked");
    assert.equal(r.entities, null);
    assert.ok(r.completeness.blockedTaxInclusiveCount >= 1);
  });

  it("F15: shipping-only refund does not inflate merchandise refunds", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF15() });
    const o = r.entities!.orders[0]!;
    assert.equal(o.refunds, 0);
    assert.equal(o.grossRevenue, 80);
  });

  it("F16: edited unsupported individually; companion trusted may remain", () => {
    const solo = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF16() });
    assert.equal(solo.status, "accepted_with_limitations");
    assert.equal(solo.entities!.orders.length, 0);
    assert.equal(solo.completeness.unsupportedEditedCount, 1);

    const mixed = adaptShopifyGraphqlOrdersFixture({ orders: fixtureEditedWithTrusted() });
    assert.equal(mixed.status, "accepted_with_limitations");
    assert.equal(mixed.entities!.orders.length, 1);
    assert.equal(mixed.completeness.unsupportedEditedCount, 1);
    assert.equal(mixed.entities!.orders[0]!.grossRevenue, 50);
  });

  it("F17: VOIDED excluded with provenance", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF17() });
    assert.equal(r.entities!.orders.length, 0);
    assert.equal(r.completeness.excludedCount, 1);
  });

  it("F18: PENDING and AUTHORIZED provisional", () => {
    const pending = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF18Pending() });
    assert.equal(pending.completeness.provisionalCount, 1);
    assert.equal(pending.entities!.orders.length, 0);
    const auth = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF18Authorized() });
    assert.equal(auth.completeness.provisionalCount, 1);
  });

  it("F19: fully refunded discounted order — deterministic nets", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF19() });
    const o = r.entities!.orders[0]!;
    assert.equal(o.grossRevenue, 100);
    assert.equal(o.discounts, 10);
    assert.equal(o.refunds, 90);
  });

  it("mixed shop currency blocks whole fixture", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureMixedCurrency() });
    assert.equal(r.status, "blocked");
    assert.equal(r.entities, null);
    assert.equal(r.completeness.shopCurrencyState, "mixed");
  });

  it("adapter does not invent dataset meta / demo provenance", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF01() });
    assert.ok(r.entities);
    assert.equal("meta" in r, false);
    assert.ok(!("sourceType" in (r.entities as object)));
  });
});
