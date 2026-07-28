import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { importOrdersCsvFromText } from "./detect-orders-csv-format";
import { buildImportReviewViewModel } from "./import-review-view-model";
import type { CombineOrderCsvImportResult } from "./import-types";

const SHOPIFY_FIXTURE = path.resolve(process.cwd(), "docs/sample-shopify-orders-export.csv");
const RETENTIONOS_FIXTURE = path.resolve(process.cwd(), "docs/sample-retentionos-orders.csv");

function readFixture(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function metricById(vm: { metrics: readonly { id: string; status: string; detail?: string }[] }, id: string) {
  const row = vm.metrics.find((m) => m.id === id);
  assert.ok(row, `expected metric row ${id}`);
  return row;
}

describe("buildImportReviewViewModel", () => {
  it("Shopify fixture produces review VM with email caveat and locked acquisition/contribution", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(SHOPIFY_FIXTURE));
    const vm = buildImportReviewViewModel({ format, result });

    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(vm.canSave, true);
    assert.equal(vm.formatLabel, "Shopify Orders CSV");
    assert.equal(vm.uploadFormat, "shopify_orders");
    assert.equal(vm.customerIdentity.basis, "shopify_email");
    assert.ok(vm.customerIdentity.caveat?.includes("email"));
    assert.equal(metricById(vm, "acquisition").status, "locked");
    assert.equal(metricById(vm, "contribution_ltv").status, "locked");
    assert.equal(vm.financialSignals.discounts.presence, "detected");
    assert.ok((vm.financialSignals.discounts.orderCount ?? 0) > 0);
    assert.equal(vm.financialSignals.refunds.presence, "detected");
    assert.ok((vm.financialSignals.refunds.orderCount ?? 0) > 0);
    assert.equal(metricById(vm, "cohorts").status, "unlocked");
    assert.equal(metricById(vm, "retention").status, "unlocked");
    assert.equal(metricById(vm, "ltv").status, "unlocked");
  });

  it("RetentionOS template produces template identity without Shopify email caveat", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(RETENTIONOS_FIXTURE));
    const vm = buildImportReviewViewModel({ format, result });

    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(vm.uploadFormat, "retentionos_template");
    assert.equal(vm.customerIdentity.basis, "template_customer_id");
    assert.equal(vm.customerIdentity.caveat, undefined);
  });

  it("unsupported import returns blocked with canSave false", () => {
    const { format, result } = importOrdersCsvFromText("a,b,c\n1,2,3\n");
    const vm = buildImportReviewViewModel({ format, result });

    assert.equal(vm.kind, "blocked");
    if (vm.kind !== "blocked") return;
    assert.equal(vm.canSave, false);
    assert.ok(vm.errors.length > 0);
  });

  it("session context with marketing spend unlocks acquisition", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(SHOPIFY_FIXTURE));
    const vm = buildImportReviewViewModel({
      format,
      result,
      sessionContext: { hasSavedMarketingSpendCsv: true, hasSavedMarketingSpend: true },
    });

    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(metricById(vm, "acquisition").status, "unlocked");
  });

  it("session context with marketing spend assumption marks acquisition Estimated (partial)", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(SHOPIFY_FIXTURE));
    const vm = buildImportReviewViewModel({
      format,
      result,
      sessionContext: { hasSavedMarketingSpendAssumption: true, marketingSpendAssumptionPct: 0.2 },
    });

    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(metricById(vm, "acquisition").status, "partial");
    assert.match(metricById(vm, "acquisition").detail ?? "", /Estimated marketing spend assumption/i);
  });

  it("acquisition stays locked without session spend flag", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(SHOPIFY_FIXTURE));
    const vm = buildImportReviewViewModel({
      format,
      result,
      sessionContext: { hasSavedMarketingSpend: false },
    });

    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(metricById(vm, "acquisition").status, "locked");
  });

  it("session context with margin assumption marks contribution LTV partial", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(SHOPIFY_FIXTURE));
    const vm = buildImportReviewViewModel({
      format,
      result,
      sessionContext: { hasSavedMarginAssumptions: true, marginAssumptionPct: 0.35 },
    });

    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(metricById(vm, "contribution_ltv").status, "partial");
  });

  it("ready only when no source or metric limitations (spend + positive CM + product signal)", () => {
    // firstOrderAt must equal each customer's earliest order (MET-FIRST-PRODUCT-RULE chronology).
    const customers = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      firstOrderAt: "2024-01-15T12:00:00.000Z",
    }));
    const orders = Array.from({ length: 12 }, (_, i) => {
      const customerId = `c${i % 6}`;
      const month = 1 + (i % 5);
      // First order per customer (i < 6) lands on Jan 15 matching firstOrderAt; repeats later.
      const orderedAt =
        i < 6
          ? "2024-01-15T12:00:00.000Z"
          : `2024-0${month}-15T12:00:00.000Z`;
      return {
        id: `o${i}`,
        customerId,
        orderedAt,
        grossRevenue: 100,
        discounts: 0,
        refunds: 0,
        contributionMargin: 40,
        lineItems: [
          {
            id: `li${i}`,
            productId: "p1",
            title: "Product",
            quantity: 1,
            unitPrice: 100,
            lineTotal: 100,
          },
        ],
      };
    });
    const result: CombineOrderCsvImportResult = {
      customers,
      orders,
      products: [{ id: "p1", title: "Product" }],
      errors: [],
      warnings: [],
      summary: {
        rawRowCount: 12,
        customerCount: 6,
        orderCount: 12,
        lineItemCount: 12,
        productCount: 1,
        errorCount: 0,
        warningCount: 0,
        firstOrderAt: orders[0]!.orderedAt,
        lastOrderAt: orders[orders.length - 1]!.orderedAt,
      },
    };

    const withoutSpend = buildImportReviewViewModel({ format: "retentionos_template", result });
    assert.equal(withoutSpend.kind, "review");
    if (withoutSpend.kind !== "review") return;
    assert.equal(withoutSpend.readiness, "accepted_with_limitations");

    const vm = buildImportReviewViewModel({
      format: "retentionos_template",
      result,
      sessionContext: { hasSavedMarketingSpendCsv: true },
    });
    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(vm.readiness, "ready");
    assert.equal(vm.confidence, "ready");
  });

  it("missing spend is a limitation, not blocked", () => {
    const { format, result } = importOrdersCsvFromText(readFixture(RETENTIONOS_FIXTURE));
    const vm = buildImportReviewViewModel({ format, result });
    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(vm.canSave, true);
    assert.equal(vm.readiness, "accepted_with_limitations");
    assert.equal(metricById(vm, "acquisition").status, "locked");
  });
});
