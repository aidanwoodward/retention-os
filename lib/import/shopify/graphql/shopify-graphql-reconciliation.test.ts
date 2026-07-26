import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { netOrderRevenue } from "../../../metrics/utils";
import { adaptShopifyGraphqlOrdersFixture } from "./adapt-shopify-orders-graphql";
import {
  fixtureF02,
  fixtureF04,
  fixtureF13After,
  fixtureF13Before,
  fixtureF14,
  fixtureF16,
  fixtureF17,
  fixtureF18Pending,
  fixtureTaxInclusiveWithTrustedCompanion,
} from "./fixtures/f01-f19";
import {
  CUST_A,
  lineItem,
  merchandiseRefund,
  order,
  PROD_SERUM,
  shippingOnlyRefund,
} from "./fixtures/fixture-builders";

describe("Shopify GraphQL reconciliation R1–R12", () => {
  it("R1: simple merchandise order", () => {
    const r = adaptShopifyGraphqlOrdersFixture({
      orders: [
        order({
          id: "r1",
          createdAt: "2024-01-01T00:00:00.000Z",
          customerId: CUST_A,
          discounts: 10,
          lines: [
            lineItem({
              id: "r1-li",
              amount: 100,
              productId: PROD_SERUM,
              category: { id: "tax1" },
            }),
          ],
        }),
      ],
    });
    const o = r.entities!.orders[0]!;
    assert.equal(o.grossRevenue, 100);
    assert.equal(o.discounts, 10);
    assert.equal(o.refunds, 0);
    assert.equal(netOrderRevenue(o), 90);
    assert.equal(r.orderDispositions[0]!.kind, "trusted");
    assert.equal(r.status, "ok");
  });

  it("R2: partial merchandise refund — order-centric", () => {
    const r = adaptShopifyGraphqlOrdersFixture({
      orders: [
        order({
          id: "r2",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z",
          customerId: CUST_A,
          discounts: 10,
          displayFinancialStatus: "PARTIALLY_REFUNDED",
          lines: [
            lineItem({
              id: "r2-li",
              amount: 100,
              productId: PROD_SERUM,
              category: { id: "tax1" },
            }),
          ],
          refunds: [merchandiseRefund("r2-ref", 20)],
        }),
      ],
    });
    const o = r.entities!.orders[0]!;
    assert.equal(o.refunds, 20);
    assert.equal(netOrderRevenue(o), 70);
    assert.equal(o.orderedAt, "2024-01-01T00:00:00.000Z");
  });

  it("R3: shipping refund must not inflate Order.refunds", () => {
    const r = adaptShopifyGraphqlOrdersFixture({
      orders: [
        order({
          id: "r3",
          createdAt: "2024-01-01T00:00:00.000Z",
          customerId: CUST_A,
          totalRefunded: 15,
          lines: [
            lineItem({
              id: "r3-li",
              amount: 100,
              productId: PROD_SERUM,
              category: { id: "tax1" },
            }),
          ],
          refunds: [shippingOnlyRefund("r3-ship", 15)],
        }),
      ],
    });
    const o = r.entities!.orders[0]!;
    assert.equal(o.refunds, 0);
    assert.equal(netOrderRevenue(o), 100);
  });

  it("R4: cancelled excluded from trusted population", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF04() });
    assert.equal(r.entities!.orders.length, 0);
    assert.equal(r.completeness.excludedCount, 1);
    assert.equal(r.orderDispositions[0]!.kind, "excluded");
  });

  it("R5: gift card line excluded from gross", () => {
    const r = adaptShopifyGraphqlOrdersFixture({
      orders: [
        order({
          id: "r5",
          createdAt: "2024-01-01T00:00:00.000Z",
          customerId: CUST_A,
          lines: [
            lineItem({
              id: "r5-gc",
              amount: 50,
              isGiftCard: true,
              productId: PROD_SERUM,
              category: { id: "tax1" },
            }),
            lineItem({
              id: "r5-merch",
              amount: 80,
              productId: PROD_SERUM,
              category: { id: "tax1" },
            }),
          ],
        }),
      ],
    });
    assert.equal(r.entities!.orders[0]!.grossRevenue, 80);
  });

  it("R6: late refund after refresh — single GID row", () => {
    const r = adaptShopifyGraphqlOrdersFixture({
      orders: [...fixtureF13Before(), ...fixtureF13After()],
    });
    assert.equal(r.entities!.orders.length, 1);
    assert.equal(r.entities!.orders[0]!.refunds, 25);
    assert.equal(netOrderRevenue(r.entities!.orders[0]!), 65);
  });

  it("R7: edited order unsupported / limited — not trusted §3.1", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF16() });
    assert.equal(r.status, "accepted_with_limitations");
    assert.equal(r.entities!.orders.length, 0);
    assert.equal(r.completeness.unsupportedEditedCount, 1);
    assert.equal(r.orderDispositions[0]!.kind, "unsupported_edited");
  });

  it("R8: guest order — order-level revenue; Unidentified; identity coverage", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF02() });
    assert.equal(r.status, "accepted_with_limitations");
    assert.equal(r.entities!.customers.length, 0);
    assert.equal(r.entities!.orders[0]!.customerId, null);
    const net = netOrderRevenue(r.entities!.orders[0]!);
    assert.equal(net, 45);
    assert.equal(r.completeness.unidentifiedTrustedNetRevenue, net);
    assert.equal(r.completeness.customerIdentityCoverageByNetRevenue, 0);
    assert.equal(r.completeness.trustedOrderCount, 1);
  });

  it("R9: tax-inclusive whole-fixture blocked", () => {
    const solo = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF14() });
    assert.equal(solo.status, "blocked");
    assert.equal(solo.entities, null);
    assert.ok(solo.issues.some((i) => i.code === "SHOPIFY_GRAPHQL_TAX_INCLUSIVE_BLOCKED"));

    const withPeer = adaptShopifyGraphqlOrdersFixture({
      orders: fixtureTaxInclusiveWithTrustedCompanion(),
    });
    assert.equal(withPeer.status, "blocked");
    assert.equal(withPeer.entities, null);
  });

  it("R10: voided excluded with provenance", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF17() });
    assert.equal(r.entities!.orders.length, 0);
    assert.equal(r.completeness.excludedCount, 1);
    assert.equal(r.orderDispositions[0]!.kind, "excluded");
  });

  it("R11: pending provisional — excluded from trusted", () => {
    const r = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF18Pending() });
    assert.equal(r.completeness.provisionalCount, 1);
    assert.equal(r.entities!.orders.length, 0);
    assert.equal(r.orderDispositions[0]!.kind, "provisional");
    assert.equal(r.status, "accepted_with_limitations");
  });

  it("R12: fully refunded discounted — engine floor", () => {
    const r = adaptShopifyGraphqlOrdersFixture({
      orders: [
        order({
          id: "r12",
          createdAt: "2024-01-01T00:00:00.000Z",
          customerId: CUST_A,
          discounts: 10,
          displayFinancialStatus: "REFUNDED",
          lines: [
            lineItem({
              id: "r12-li",
              amount: 100,
              productId: PROD_SERUM,
              category: { id: "tax1" },
            }),
          ],
          refunds: [merchandiseRefund("r12-ref", 90)],
        }),
      ],
    });
    const o = r.entities!.orders[0]!;
    assert.equal(o.grossRevenue, 100);
    assert.equal(o.discounts, 10);
    assert.equal(o.refunds, 90);
    assert.equal(netOrderRevenue(o), 0);
    assert.equal(r.orderDispositions[0]!.kind, "trusted");
  });
});
