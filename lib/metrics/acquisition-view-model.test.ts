import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Customer } from "../types/customer";
import type { MarketingSpend } from "../types/marketing";
import type { MarginAssumptions } from "../types/scenario";
import type { Order } from "../types/order";
import { buildGoldenRetentionOSDataset } from "./golden/golden-dataset";
import { GOLDEN_CAC, GOLDEN_PAYBACK } from "./golden/golden-expected";
import { calculateLTVByCohort } from "./ltv";
import {
  buildAcquisitionPageViewModelFromDataset,
  formatPaybackDisplay,
  spendSourceLabel,
} from "./acquisition-view-model";

function identifiedOrder(
  id: string,
  customerId: string,
  orderedAt: string,
  grossRevenue = 100,
  contributionMargin?: number,
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue,
    discounts: 0,
    refunds: 0,
    lineItems: [],
    ...(contributionMargin !== undefined ? { contributionMargin } : {}),
  };
}

function customer(id: string, firstOrderAt: string): Customer {
  return { id, firstOrderAt };
}

const MARGIN: MarginAssumptions = {
  contributionMarginPct: 0.4,
  netRevenueMultiplier: 1,
};

describe("acquisition-view-model", () => {
  it("A: full marketing spend produces canonical monthly CAC rows", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    assert.equal(vm.monthRows.length, 2);
    assert.equal(vm.monthRows[0]!.monthlyCac, GOLDEN_CAC["2024-12"]);
    assert.equal(vm.monthRows[1]!.monthlyCac, GOLDEN_CAC["2025-01"]);
  });

  it("B: acquisition months remain chronologically ordered", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    const months = vm.monthRows.map((r) => r.month);
    assert.deepEqual(months, [...months].sort());
  });

  it("C: multiple spend rows in one month aggregate per canonical engine", () => {
    const customers = [customer("c1", "2025-01-05T12:00:00.000Z")];
    const orders = [identifiedOrder("o1", "c1", "2025-01-05T12:00:00.000Z", 100, 40)];
    const spend: MarketingSpend[] = [
      { month: "2025-01", channel: "meta", spend: 40 },
      { month: "2025-01", channel: "google", spend: 60 },
    ];
    const vm = buildAcquisitionPageViewModelFromDataset(customers, orders, MARGIN, spend, "actual_csv");
    assert.equal(vm.monthRows.length, 1);
    assert.equal(vm.monthRows[0]!.marketingSpend, 100);
    assert.equal(vm.monthRows[0]!.monthlyCac, 100);
  });

  it("D: missing spend produces unavailable CAC and locked payback rather than zero", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      [],
      undefined,
    );
    assert.equal(vm.summary.hasSpend, false);
    assert.equal(vm.monthRows.length, 0);
    assert.equal(vm.summary.monthsWithCalculableCac, 0);
    assert.equal(vm.summary.cohortsReachingPayback, 0);
  });

  it("E: zero spend produces null CAC, not $0 CAC", () => {
    const customers = [customer("c1", "2025-01-05T12:00:00.000Z")];
    const orders = [identifiedOrder("o1", "c1", "2025-01-05T12:00:00.000Z")];
    const spend: MarketingSpend[] = [{ month: "2025-01", spend: 0 }];
    const vm = buildAcquisitionPageViewModelFromDataset(customers, orders, MARGIN, spend, "actual_csv");
    assert.equal(vm.monthRows[0]!.monthlyCac, null);
    assert.equal(formatPaybackDisplay(vm.monthRows[0]!.payback), "—");
  });

  it("F: spend with zero acquired customers produces null CAC", () => {
    const spend: MarketingSpend[] = [{ month: "2025-03", spend: 500 }];
    const vm = buildAcquisitionPageViewModelFromDataset([], [], MARGIN, spend, "actual_csv");
    assert.equal(vm.monthRows[0]!.newCustomers, 0);
    assert.equal(vm.monthRows[0]!.monthlyCac, null);
  });

  it("G: assumption-backed spend preserves estimated/source state", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "assumption",
    );
    assert.equal(vm.summary.spendIsEstimated, true);
    assert.equal(vm.summary.spendSourceLabel, spendSourceLabel("assumption"));
  });

  it("H: months-with-calculable-CAC count uses finite canonical CAC only", () => {
    const customers = [
      customer("c1", "2025-01-05T12:00:00.000Z"),
      customer("c2", "2025-02-05T12:00:00.000Z"),
    ];
    const orders = [
      identifiedOrder("o1", "c1", "2025-01-05T12:00:00.000Z", 100, 40),
      identifiedOrder("o2", "c2", "2025-02-05T12:00:00.000Z", 100, 40),
    ];
    const spend: MarketingSpend[] = [
      { month: "2025-01", spend: 100 },
      { month: "2025-02", spend: 0 },
    ];
    const vm = buildAcquisitionPageViewModelFromDataset(customers, orders, MARGIN, spend, "actual_csv");
    assert.equal(vm.summary.acquisitionMonthsRepresented, 2);
    assert.equal(vm.summary.monthsWithCalculableCac, 1);
    assert.equal(vm.summary.monthsWithCalculableCac, vm.summary.cohortMonthsWithCac);
  });

  it("I: payback achieved renders Pays back by M+N", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    const dec = vm.monthRows.find((r) => r.month === "2024-12");
    assert.ok(dec);
    assert.equal(dec.payback.kind, "achieved");
    assert.equal(dec.paybackLabel, "Pays back by M+1");
    assert.equal(GOLDEN_PAYBACK["2024-12"], 1);
  });

  it("J: payback integer is preserved exactly with no fractional transformation", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    const dec = vm.monthRows.find((r) => r.month === "2024-12");
    assert.ok(dec);
    assert.equal(dec.payback.offset, 1);
    assert.ok(!dec.paybackLabel.includes("."));
    assert.ok(!dec.paybackLabel.toLowerCase().includes("month"));
  });

  it("K: valid CAC + contribution but no achieved payback produces Not reached through M+K observed", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    const jan = vm.monthRows.find((r) => r.month === "2025-01");
    assert.ok(jan);
    assert.equal(jan.payback.kind, "not_reached");
    assert.match(jan.paybackLabel, /^Not reached through M\+\d+ observed$/);
    assert.equal(GOLDEN_PAYBACK["2025-01"], null);
  });

  it("L: observation K comes from canonical contribution staircase tail", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const ltvPoints = calculateLTVByCohort(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
    );
    const janPoints = ltvPoints.filter(
      (p) =>
        p.cohortKey === "2025-01" &&
        p.cumulativeAvgContribution != null &&
        Number.isFinite(p.cumulativeAvgContribution),
    );
    const expectedK = Math.max(...janPoints.map((p) => p.offset));
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    const jan = vm.monthRows.find((r) => r.month === "2025-01");
    assert.ok(jan);
    assert.equal(jan.payback.offset, expectedK);
    assert.equal(jan.paybackLabel, `Not reached through M+${expectedK} observed`);
  });

  it("M: missing contribution path makes payback unavailable, not not-reached", () => {
    const customers = [customer("c1", "2025-01-05T12:00:00.000Z")];
    const orders = [identifiedOrder("o1", "c1", "2025-01-05T12:00:00.000Z", 100)];
    const spend: MarketingSpend[] = [{ month: "2025-01", spend: 100 }];
    const vm = buildAcquisitionPageViewModelFromDataset(customers, orders, undefined, spend, "actual_csv");
    assert.equal(vm.summary.hasContributionEconomics, false);
    assert.equal(vm.monthRows[0]!.payback.kind, "unavailable_no_contribution");
    assert.notEqual(vm.monthRows[0]!.payback.kind, "not_reached");
  });

  it("N: missing CAC makes payback unavailable", () => {
    const customers = [customer("c1", "2025-01-05T12:00:00.000Z")];
    const orders = [identifiedOrder("o1", "c1", "2025-01-05T12:00:00.000Z", 100, 40)];
    const spend: MarketingSpend[] = [{ month: "2025-01", spend: 0 }];
    const vm = buildAcquisitionPageViewModelFromDataset(customers, orders, MARGIN, spend, "actual_csv");
    assert.equal(vm.monthRows[0]!.monthlyCac, null);
    assert.equal(vm.monthRows[0]!.payback.kind, "unavailable_no_cac");
  });

  it("O: mixed payback population counts only CAC+contribution eligible cohorts", () => {
    const customers = [
      customer("cA", "2025-01-05T12:00:00.000Z"),
      customer("cB", "2025-02-05T12:00:00.000Z"),
      customer("cC", "2025-03-05T12:00:00.000Z"),
      customer("cD", "2025-04-05T12:00:00.000Z"),
    ];
    const orders = [
      identifiedOrder("oA", "cA", "2025-01-05T12:00:00.000Z", 100, 60),
      identifiedOrder("oB", "cB", "2025-02-05T12:00:00.000Z", 100, 40),
      identifiedOrder("oC", "cC", "2025-03-05T12:00:00.000Z", 100),
      identifiedOrder("oD", "cD", "2025-04-05T12:00:00.000Z", 100, 40),
    ];
    const spend: MarketingSpend[] = [
      { month: "2025-01", spend: 50 },
      { month: "2025-02", spend: 200 },
      { month: "2025-03", spend: 100 },
      { month: "2025-04", spend: 0 },
    ];
    const vm = buildAcquisitionPageViewModelFromDataset(customers, orders, undefined, spend, "actual_csv");

    const jan = vm.monthRows.find((r) => r.month === "2025-01");
    const feb = vm.monthRows.find((r) => r.month === "2025-02");
    const mar = vm.monthRows.find((r) => r.month === "2025-03");
    const apr = vm.monthRows.find((r) => r.month === "2025-04");
    assert.ok(jan);
    assert.ok(feb);
    assert.ok(mar);
    assert.ok(apr);
    assert.equal(jan.payback.kind, "achieved");
    assert.equal(feb.payback.kind, "not_reached");
    assert.equal(mar.payback.kind, "unavailable_no_contribution");
    assert.equal(apr.payback.kind, "unavailable_no_cac");

    assert.equal(vm.summary.cohortsReachingPayback, 1);
    assert.equal(vm.summary.paybackEligibleCohortCount, 2);
    assert.equal(vm.summary.hasContributionEconomics, true);
  });

  it("O2: payback coverage card denominator is the approved usable cohort population", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    assert.equal(vm.summary.paybackEligibleCohortCount, 2);
    assert.equal(vm.summary.cohortsReachingPayback, 1);
    assert.equal(vm.summary.hasContributionEconomics, true);
  });

  it("P: no Infinity / 0.0x / fractional payback leakage", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    for (const row of vm.monthRows) {
      assert.ok(!row.paybackLabel.includes("Infinity"));
      assert.ok(!row.paybackLabel.match(/^0\.\d+x$/));
      if (row.payback.kind === "achieved" || row.payback.kind === "not_reached") {
        assert.ok(Number.isInteger(row.payback.offset));
      }
    }
    const previewJson = JSON.stringify(vm.preview);
    assert.ok(!previewJson.includes("Infinity"));
  });

  it("Q: terminal LTV:CAC remains in legacy preview but is not used by month row contract", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    assert.ok(vm.preview.ltvCac.rows.length > 0);
    for (const row of vm.monthRows) {
      assert.ok(!("revenueLtvToCac" in row));
      assert.ok(!("contributionLtvToCac" in row));
    }
  });

  it("R: empty dataset", () => {
    const vm = buildAcquisitionPageViewModelFromDataset([], [], undefined, [], undefined);
    assert.equal(vm.summary.hasSpend, false);
    assert.equal(vm.monthRows.length, 0);
    assert.equal(vm.summary.customerCount, 0);
  });

  it("S: input reorder determinism", () => {
    const customers = [
      customer("c2", "2025-02-05T12:00:00.000Z"),
      customer("c1", "2025-01-05T12:00:00.000Z"),
    ];
    const orders = [
      identifiedOrder("o2", "c2", "2025-02-05T12:00:00.000Z", 100, 40),
      identifiedOrder("o1", "c1", "2025-01-05T12:00:00.000Z", 100, 40),
    ];
    const spend: MarketingSpend[] = [
      { month: "2025-02", spend: 80 },
      { month: "2025-01", spend: 100 },
    ];
    const vm = buildAcquisitionPageViewModelFromDataset(customers, orders, MARGIN, spend, "actual_csv");
    assert.deepEqual(
      vm.monthRows.map((r) => r.month),
      ["2025-01", "2025-02"],
    );
  });

  it("T: input not mutated", () => {
    const customers = [customer("c1", "2025-01-05T12:00:00.000Z")];
    const orders = [identifiedOrder("o1", "c1", "2025-01-05T12:00:00.000Z", 100, 40)];
    const spend: MarketingSpend[] = [{ month: "2025-01", spend: 100 }];
    const customersBefore = structuredClone(customers);
    const ordersBefore = structuredClone(orders);
    const spendBefore = structuredClone(spend);
    buildAcquisitionPageViewModelFromDataset(customers, orders, MARGIN, spend, "actual_csv");
    assert.deepEqual(customers, customersBefore);
    assert.deepEqual(orders, ordersBefore);
    assert.deepEqual(spend, spendBefore);
  });
});
