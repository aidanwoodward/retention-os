import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { importCombinedOrderCsvFromText } from "./normalise-orders";
import { importMarketingSpendCsvFromText } from "./normalise-marketing-spend";
import { buildImportReviewViewModel } from "./import-review-view-model";
import {
  NEGATIVE_CALCULATED_NET_LIMITATION_CODE,
  NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE,
} from "./import-trust";
import { COMBINED_ORDER_CSV_COLUMNS } from "./csv-schema";

const HEADER = COMBINED_ORDER_CSV_COLUMNS.join(",");

function templateRow(overrides: Partial<Record<(typeof COMBINED_ORDER_CSV_COLUMNS)[number], string>> = {}): string {
  const base: Record<(typeof COMBINED_ORDER_CSV_COLUMNS)[number], string> = {
    order_id: "o1",
    customer_id: "c1",
    ordered_at: "2024-01-15T12:00:00.000Z",
    gross_revenue: "100",
    discounts: "0",
    refunds: "0",
    contribution_margin: "40",
    channel: "paid",
    product_id: "p1",
    product_name: "Widget",
    sku: "SKU1",
    quantity: "1",
    unit_price: "100",
    line_total: "100",
  };
  return COMBINED_ORDER_CSV_COLUMNS.map((c) => overrides[c] ?? base[c]).join(",");
}

describe("import trust — orders", () => {
  it("line_total mismatch is fatal and blocks review save", () => {
    const csv = `${HEADER}\n${templateRow({ line_total: "50" })}`;
    const result = importCombinedOrderCsvFromText(csv);
    assert.ok(result.errors.some((e) => e.code === "LINE_TOTAL_VS_QTY_PRICE"));
    assert.equal(result.orders.length, 0);
    const vm = buildImportReviewViewModel({ format: "retentionos_template", result });
    assert.equal(vm.kind, "blocked");
    if (vm.kind !== "blocked") return;
    assert.equal(vm.canSave, false);
    assert.equal(vm.readiness, "blocked");
  });

  it("negative absolute contribution_margin accepts with limitation (not notice, not ready)", () => {
    const csv = `${HEADER}\n${templateRow({ contribution_margin: "-12" })}`;
    const result = importCombinedOrderCsvFromText(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.orders.length, 1);
    assert.equal(result.orders[0]!.contributionMargin, -12);
    assert.ok(result.warnings.some((w) => w.code === NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE && w.severity === "limitation"));
    assert.ok(!result.warnings.some((w) => w.code === NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE && w.severity === "notice"));

    const vm = buildImportReviewViewModel({
      format: "retentionos_template",
      result,
      sessionContext: { hasSavedMarketingSpendCsv: true },
    });
    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(vm.canSave, true);
    assert.equal(vm.readiness, "accepted_with_limitations");
    assert.notEqual(vm.readiness, "ready");
    assert.ok(vm.limitations.some((l) => l.code === NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE));
    assert.ok(!vm.notices.some((n) => n.code === NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE));
    const contrib = vm.metrics.find((m) => m.id === "contribution_ltv");
    assert.ok(contrib);
    assert.ok(contrib!.status === "partial" || contrib!.status === "locked");
    assert.match(contrib!.detail, /floors negative contribution/i);
  });

  it("calculated net below zero accepts with limitation", () => {
    const csv = `${HEADER}\n${templateRow({ gross_revenue: "50", discounts: "20", refunds: "40", unit_price: "50", line_total: "50" })}`;
    const result = importCombinedOrderCsvFromText(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.orders.length, 1);
    assert.ok(result.warnings.some((w) => w.code === NEGATIVE_CALCULATED_NET_LIMITATION_CODE && w.severity === "limitation"));

    const vm = buildImportReviewViewModel({ format: "retentionos_template", result });
    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(vm.canSave, true);
    assert.equal(vm.readiness, "accepted_with_limitations");
    assert.ok(vm.limitations.some((l) => l.code === NEGATIVE_CALCULATED_NET_LIMITATION_CODE));
  });

  it("malformed contribution_margin is fatal", () => {
    const csv = `${HEADER}\n${templateRow({ contribution_margin: "not-a-number" })}`;
    const result = importCombinedOrderCsvFromText(csv);
    assert.ok(result.errors.some((e) => e.code === "INVALID_CONTRIBUTION_MARGIN"));
    assert.equal(result.orders.length, 0);
  });

  it("small valid dataset is not forced unready solely by customer/order counts", () => {
    // 2 customers, 2 orders — below old global 5/10 gate; with spend + positive CM still may have product-quality limitation.
    const rows = [
      templateRow({
        order_id: "o1",
        customer_id: "c1",
        ordered_at: "2024-01-10T00:00:00.000Z",
        contribution_margin: "30",
      }),
      templateRow({
        order_id: "o2",
        customer_id: "c2",
        ordered_at: "2024-02-10T00:00:00.000Z",
        contribution_margin: "30",
      }),
    ];
    const result = importCombinedOrderCsvFromText(`${HEADER}\n${rows.join("\n")}`);
    assert.equal(result.errors.length, 0);
    assert.equal(result.orders.length, 2);

    const vm = buildImportReviewViewModel({
      format: "retentionos_template",
      result,
      sessionContext: { hasSavedMarketingSpendCsv: true },
    });
    assert.equal(vm.kind, "review");
    if (vm.kind !== "review") return;
    assert.equal(vm.canSave, true);
    // Must not invent a global 5/10 blocked/unready rule; product quality may still be limited via metric logic.
    assert.ok(vm.readiness === "accepted_with_limitations" || vm.readiness === "ready");
    const pq = vm.metrics.find((m) => m.id === "product_quality");
    assert.ok(pq);
    if (pq!.status !== "unlocked") {
      assert.equal(vm.readiness, "accepted_with_limitations");
    }
  });
});

describe("import trust — marketing spend fail-closed", () => {
  it("one bad spend row empties spend model (no silent partial keep)", () => {
    const csv = [
      "month,channel,spend",
      "2024-01,paid,100",
      "2024-02,paid,not-money",
    ].join("\n");
    const result = importMarketingSpendCsvFromText(csv);
    assert.ok(result.errors.length > 0);
    assert.equal(result.marketingSpend.length, 0);
  });

  it("valid spend file still aggregates duplicate month×channel with notice/warning", () => {
    const csv = [
      "month,channel,spend",
      "2024-01,paid,50",
      "2024-01,paid,25",
    ].join("\n");
    const result = importMarketingSpendCsvFromText(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.marketingSpend.length, 1);
    assert.equal(result.marketingSpend[0]!.spend, 75);
    assert.ok(result.warnings.some((w) => w.code === "DUPLICATE_MONTH_CHANNEL_AGGREGATED"));
  });
});
