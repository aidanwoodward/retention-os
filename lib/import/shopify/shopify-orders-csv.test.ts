import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { importShopifyOrdersCsvFromText } from "./import-shopify-orders-csv";

const FIXTURE_PATH = path.resolve(process.cwd(), "docs/sample-shopify-orders-export.csv");

function readFixture(): string {
  return fs.readFileSync(FIXTURE_PATH, "utf8");
}

function assertOrderRevenue(
  orders: { id: string; grossRevenue: number; discounts: number; refunds: number }[],
  orderId: string,
  gross: number,
  discounts: number,
  refunds: number,
) {
  const order = orders.find((o) => o.id === orderId);
  assert.ok(order, `expected order ${orderId}`);
  assert.equal(order.grossRevenue, gross);
  assert.equal(order.discounts, discounts);
  assert.equal(order.refunds, refunds);
  assert.equal(order.grossRevenue - order.discounts - order.refunds, gross - discounts - refunds);
}

describe("importShopifyOrdersCsvFromText", () => {
  it("imports sample Shopify CSV successfully", () => {
    const result = importShopifyOrdersCsvFromText(readFixture());

    assert.equal(result.errors.length, 0, result.errors.map((e) => e.message).join("; "));
    assert.equal(result.summary.customerCount, 4);
    assert.equal(result.summary.orderCount, 8);
    assert.equal(result.summary.lineItemCount, 12);
    assert.equal(result.summary.errorCount, 0);
  });

  it("forward-fills multi-line orders", () => {
    const result = importShopifyOrdersCsvFromText(readFixture());
    assert.equal(result.errors.length, 0);

    const order1001 = result.orders.filter((o) => o.id === "5001001");
    assert.equal(order1001.length, 1);
    assert.equal(order1001[0]!.lineItems.length, 2);
    assert.equal(order1001[0]!.customerId, "alice@example.com");

    const order1003 = result.orders.find((o) => o.id === "5001003");
    assert.ok(order1003);
    assert.equal(order1003.lineItems.length, 3);

    const order1008 = result.orders.find((o) => o.id === "5001008");
    assert.ok(order1008);
    assert.equal(order1008.lineItems.length, 2);
  });

  it("computes revenue from line items not Shopify Total", () => {
    const result = importShopifyOrdersCsvFromText(readFixture());
    assert.equal(result.errors.length, 0);

    assertOrderRevenue(result.orders, "5001001", 118, 8, 0);
    assertOrderRevenue(result.orders, "5001003", 89.5, 12, 5);
    assertOrderRevenue(result.orders, "5001006", 76, 0, 15);

    const order1001 = result.orders.find((o) => o.id === "5001001")!;
    const lines = order1001.lineItems;
    assert.equal(lines[0]!.quantity, 2);
    assert.equal(lines[0]!.unitPrice, 45);
    assert.equal(lines[0]!.lineTotal, 90);
    assert.equal(lines[1]!.lineTotal, 28);
  });

  it("falls back to normalised product name when SKU blank", () => {
    const csv = [
      "Name,Email,Created at,Discount Amount,Refunded Amount,Id,Lineitem quantity,Lineitem name,Lineitem price,Lineitem SKU",
      "#9001,buyer@test.com,2024-01-01 10:00:00 +0000,0,0,9001,1,Gift Wrap,5.00,",
    ].join("\n");

    const result = importShopifyOrdersCsvFromText(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.products[0]!.id, "gift_wrap");
    assert.ok(
      result.warnings.some((w) => w.code === "SHOPIFY_SKU_FALLBACK_TO_NAME"),
      "expected SHOPIFY_SKU_FALLBACK_TO_NAME",
    );
  });

  it("errors on missing required Shopify header", () => {
    const csv = [
      "Name,Created at,Discount Amount,Refunded Amount,Id,Lineitem quantity,Lineitem name,Lineitem price",
      "#9001,2024-01-01 10:00:00 +0000,0,0,9001,1,Widget,10.00",
    ].join("\n");

    const result = importShopifyOrdersCsvFromText(csv);
    assert.ok(result.errors.some((e) => e.code === "SHOPIFY_HEADER_MISSING_REQUIRED"));
    assert.equal(result.orders.length, 0);
  });

  it("errors on orphan continuation row", () => {
    const csv = [
      "Name,Email,Created at,Discount Amount,Refunded Amount,Id,Lineitem quantity,Lineitem name,Lineitem price",
      ",,,,,,1,Orphan Line,10.00",
    ].join("\n");

    const result = importShopifyOrdersCsvFromText(csv);
    assert.ok(result.errors.some((e) => e.code === "SHOPIFY_CONTINUATION_WITHOUT_ORDER"));
    assert.equal(result.orders.length, 0);
  });

  it("errors on order-only export row", () => {
    const csv = [
      "Name,Email,Created at,Discount Amount,Refunded Amount,Id,Lineitem quantity,Lineitem name,Lineitem price",
      "#9002,buyer@test.com,2024-01-01 10:00:00 +0000,0,0,9002,,,",
    ].join("\n");

    const result = importShopifyOrdersCsvFromText(csv);
    assert.ok(result.errors.some((e) => e.code === "SHOPIFY_ORDER_ONLY_EXPORT"));
    assert.equal(result.orders.length, 0);
  });

  it("warns when Total column present but does not use it for revenue", () => {
    const csv = [
      "Name,Email,Created at,Discount Amount,Refunded Amount,Total,Id,Lineitem quantity,Lineitem name,Lineitem price",
      "#9003,buyer@test.com,2024-01-01 10:00:00 +0000,0,0,999.00,9003,1,Widget,10.00",
    ].join("\n");

    const result = importShopifyOrdersCsvFromText(csv);
    assert.equal(result.errors.length, 0);
    assert.ok(result.warnings.some((w) => w.code === "SHOPIFY_TOTAL_NOT_USED_FOR_LTV"));
    assertOrderRevenue(result.orders, "9003", 10, 0, 0);
  });

  it("warns when Lineitem SKU header is missing", () => {
    const csv = [
      "Name,Email,Created at,Discount Amount,Refunded Amount,Id,Lineitem quantity,Lineitem name,Lineitem price",
      "#9004,buyer@test.com,2024-01-01 10:00:00 +0000,0,0,9004,1,Gift Wrap,5.00",
    ].join("\n");

    const result = importShopifyOrdersCsvFromText(csv);
    assert.equal(result.errors.length, 0);
    assert.ok(
      result.warnings.some((w) => w.code === "SHOPIFY_SKU_HEADER_MISSING_FALLBACK_TO_NAME"),
    );
    assert.equal(result.products[0]!.id, "gift_wrap");
  });
});
