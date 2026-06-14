import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  detectOrdersCsvImportFormat,
  importOrdersCsvFromText,
  ordersCsvFormatLabel,
} from "./detect-orders-csv-format";

const SHOPIFY_FIXTURE = path.resolve(process.cwd(), "docs/sample-shopify-orders-export.csv");
const RETENTIONOS_FIXTURE = path.resolve(process.cwd(), "docs/sample-retentionos-orders.csv");

function readFixture(p: string): string {
  return fs.readFileSync(p, "utf8");
}

describe("detectOrdersCsvImportFormat", () => {
  it("detects Shopify Orders export from sample fixture", () => {
    assert.equal(detectOrdersCsvImportFormat(readFixture(SHOPIFY_FIXTURE)), "shopify_orders");
  });

  it("detects Shopify without Lineitem SKU header", () => {
    const header =
      "Name,Email,Created at,Discount Amount,Refunded Amount,Lineitem quantity,Lineitem name,Lineitem price,Id\n";
    assert.equal(detectOrdersCsvImportFormat(header), "shopify_orders");
  });

  it("detects RetentionOS template from sample fixture", () => {
    assert.equal(detectOrdersCsvImportFormat(readFixture(RETENTIONOS_FIXTURE)), "retentionos_template");
  });

  it("returns unsupported for empty CSV", () => {
    assert.equal(detectOrdersCsvImportFormat(""), "unsupported");
  });

  it("returns unsupported for unrelated headers", () => {
    const csv = "foo,bar,baz\n1,2,3\n";
    assert.equal(detectOrdersCsvImportFormat(csv), "unsupported");
  });

  it("returns unsupported when RetentionOS required columns have extra unknown columns", () => {
    const csv =
      "order_id,customer_id,ordered_at,gross_revenue,discounts,refunds,product_id,product_name,quantity,unit_price,line_total,extra_col\n";
    assert.equal(detectOrdersCsvImportFormat(csv), "unsupported");
  });
});

describe("importOrdersCsvFromText", () => {
  it("routes Shopify fixture to Shopify importer", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(SHOPIFY_FIXTURE));
    assert.equal(format, "shopify_orders");
    assert.equal(result.errors.length, 0);
    assert.ok(result.summary.orderCount > 0);
  });

  it("routes RetentionOS fixture to combined importer", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(RETENTIONOS_FIXTURE));
    assert.equal(format, "retentionos_template");
    assert.equal(result.errors.length, 0);
    assert.ok(result.summary.orderCount > 0);
  });

  it("fail-closed unsupported with UNSUPPORTED_ORDERS_CSV_FORMAT", () => {
    const { format, result } = importOrdersCsvFromText("a,b,c\n1,2,3\n");
    assert.equal(format, "unsupported");
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0]!.code, "UNSUPPORTED_ORDERS_CSV_FORMAT");
    assert.equal(result.customers.length, 0);
    assert.equal(result.orders.length, 0);
  });

  it("does not invoke Shopify importer for RetentionOS-only headers", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(RETENTIONOS_FIXTURE));
    assert.equal(format, "retentionos_template");
    assert.equal(result.warnings.some((w) => w.code === "SHOPIFY_EMAIL_AS_CUSTOMER_ID"), false);
  });
});

describe("ordersCsvFormatLabel", () => {
  it("labels known formats", () => {
    assert.equal(ordersCsvFormatLabel("shopify_orders"), "Shopify Orders CSV");
    assert.equal(ordersCsvFormatLabel("retentionos_template"), "RetentionOS template");
  });
});
