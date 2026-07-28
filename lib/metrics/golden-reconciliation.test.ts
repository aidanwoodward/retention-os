/**
 * Sprint 5U-C — golden dataset reconciliation against hand-coded expected values.
 *
 * Expected constants come from golden/GOLDEN_EXPECTED_RESULTS.md (manual arithmetic).
 * Do not snapshot or derive expected values from the production metric engine.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildImportedCsvMetricPreview } from "../import/metric-preview";
import {
  buildGoldenRetentionOSDataset,
  goldenWithoutLineItems,
  goldenWithoutMarginAssumptions,
  goldenWithoutMarketingSpend,
} from "./golden/golden-dataset";
import {
  GOLDEN_CAC,
  GOLDEN_COHORT_REVENUE_CONTRIBUTION_JAN_2025,
  GOLDEN_COHORT_REVENUE_RETENTION_ASOF_2025_05_01,
  GOLDEN_NEW_RETURNING_MIX_JAN_2025,
  GOLDEN_AOV_FREQUENCY_JAN_2025,
  GOLDEN_COHORT_SIZES,
  GOLDEN_CONTRIBUTION_LTV,
  GOLDEN_CSV_PREVIEW,
  GOLDEN_LTV_CAC,
  GOLDEN_ORDER_NETS,
  GOLDEN_PAYBACK,
  GOLDEN_PORTFOLIO,
  GOLDEN_PRODUCT_QUALITY,
  GOLDEN_RETENTION,
  GOLDEN_REVENUE_LTV,
} from "./golden/golden-expected";
import {
  cacMapFromRows,
  calculateBlendedCAC,
  calculateCACByMonth,
  calculateLtvToCac,
  calculatePaybackPeriod,
} from "./acquisition";
import { buildAcquisitionPageViewModelFromDataset } from "./acquisition-view-model";
import { calculateCohorts } from "./cohorts";
import { calculateCohortRevenueContribution } from "./cohort-revenue-contribution";
import { calculateCohortRevenueRetention } from "./cohort-revenue-retention";
import { calculateNewReturningMix } from "./new-returning";
import { calculateAovFrequency } from "./aov-frequency";
import { calculateLTVByCohort } from "./ltv";
import { calculateFirstProductCustomerQualityFromDataset } from "./product-quality";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { calculateRetentionByCohort } from "./retention";
import { netOrderRevenue } from "./utils";
import { buildAnalysisSelection } from "../analysis-context";

function assertClose(actual: number, expected: number, label: string): void {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

describe("5U-C golden reconciliation — order nets", () => {
  it("matches hand-calculated gross/discount/refund/net per order", () => {
    const dataset = buildGoldenRetentionOSDataset();
    for (const order of dataset.orders) {
      const expected = GOLDEN_ORDER_NETS[order.id as keyof typeof GOLDEN_ORDER_NETS];
      assert.ok(expected, `missing expected row for ${order.id}`);
      assert.equal(order.grossRevenue, expected.gross, `${order.id} gross`);
      assert.equal(order.discounts, expected.discounts, `${order.id} discounts`);
      assert.equal(order.refunds, expected.refunds, `${order.id} refunds`);
      assert.equal(netOrderRevenue(order), expected.net, `${order.id} net`);
    }
    const portfolioNet = dataset.orders.reduce((sum, o) => sum + netOrderRevenue(o), 0);
    assert.equal(portfolioNet, GOLDEN_PORTFOLIO.portfolioNetRevenue);
  });
});

describe("5U-C golden reconciliation — portfolio and cohorts", () => {
  it("reconciles cohort sizes, repeat rate, and F2S90", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const cohorts = calculateCohorts(dataset.customers, dataset.orders, dataset.marginAssumptions);
    assert.equal(cohorts.length, 2);
    for (const row of cohorts) {
      const expectedSize = GOLDEN_COHORT_SIZES[row.cohortPeriod as keyof typeof GOLDEN_COHORT_SIZES];
      assert.equal(row.cohortSize, expectedSize, `cohortSize ${row.cohortPeriod}`);
    }

    const repeat = calculateRepeatPurchaseRate(dataset.customers, dataset.orders);
    assert.equal(repeat.totalCustomers, GOLDEN_PORTFOLIO.totalCustomers);
    assert.equal(repeat.repeatCustomers, GOLDEN_PORTFOLIO.repeatCustomers);
    assertClose(repeat.repeatPurchaseRate, GOLDEN_PORTFOLIO.repeatPurchaseRate, "repeatPurchaseRate");

    const f2s = calculateFirstToSecondOrderConversion(dataset.customers, dataset.orders, 90);
    assertClose(
      f2s.conversionRateWithinWindow,
      GOLDEN_PORTFOLIO.firstToSecondWithin90DaysRate,
      "F2S90",
    );
  });
});

describe("5U-C golden reconciliation — retention and LTV staircases", () => {
  it("reconciles full retention staircases for both cohorts", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const series = calculateRetentionByCohort(dataset.customers, dataset.orders);
    assert.equal(series.length, 2);

    for (const s of series) {
      const expected = GOLDEN_RETENTION[s.cohortPeriod];
      assert.ok(expected, `missing retention expected for ${s.cohortPeriod}`);
      assert.equal(s.points.length, expected.length, `retention length ${s.cohortPeriod}`);
      for (const point of s.points) {
        assertClose(
          point.retentionRate,
          expected[point.offset]!,
          `retention ${s.cohortPeriod} M+${point.offset}`,
        );
      }
    }
  });

  it("reconciles revenue and contribution LTV staircases", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const points = calculateLTVByCohort(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
    );

    for (const cohort of ["2024-12", "2025-01"] as const) {
      const rev = GOLDEN_REVENUE_LTV[cohort];
      const contrib = GOLDEN_CONTRIBUTION_LTV[cohort];
      const cohortPoints = points.filter((p) => p.cohortKey === cohort).sort((a, b) => a.offset - b.offset);
      assert.equal(cohortPoints.length, rev.length, `ltv length ${cohort}`);
      for (const p of cohortPoints) {
        assertClose(p.cumulativeAvgGrossRevenue, rev[p.offset]!, `rev LTV ${cohort} M+${p.offset}`);
        assert.ok(p.cumulativeAvgContribution != null, `contrib present ${cohort} M+${p.offset}`);
        assertClose(
          p.cumulativeAvgContribution!,
          contrib[p.offset]!,
          `contrib LTV ${cohort} M+${p.offset}`,
        );
      }
    }
  });
});

describe("5U-C golden reconciliation — CAC, LTV:CAC, payback", () => {
  it("reconciles monthly CAC, blended CAC, ratios, and payback", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const spend = dataset.marketingSpend ?? [];
    const cacByMonth = calculateCACByMonth(dataset.customers, spend);
    const byMonth = new Map(cacByMonth.rows.map((r) => [r.month, r]));

    assert.equal(byMonth.get("2024-12")?.cac, GOLDEN_CAC["2024-12"]);
    assert.equal(byMonth.get("2025-01")?.cac, GOLDEN_CAC["2025-01"]);

    const blended = calculateBlendedCAC(dataset.customers, spend);
    assert.equal(blended.totalSpend, GOLDEN_CAC.totalSpend);
    assert.equal(blended.blendedCac, GOLDEN_CAC.blended);

    const ltvPoints = calculateLTVByCohort(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
    );
    const cacMap = cacMapFromRows(cacByMonth.rows);
    const ltvCac = calculateLtvToCac(ltvPoints, cacMap);
    for (const row of ltvCac.rows) {
      const expected = GOLDEN_LTV_CAC[row.cohortMonth as keyof typeof GOLDEN_LTV_CAC];
      assert.ok(expected, `ltvCac row ${row.cohortMonth}`);
      assertClose(row.avgRevenueLtv, expected.terminalRevenueLtv, `term rev ${row.cohortMonth}`);
      assert.ok(row.avgContributionLtv != null);
      assertClose(
        row.avgContributionLtv!,
        expected.terminalContributionLtv,
        `term contrib ${row.cohortMonth}`,
      );
      assertClose(row.revenueLtvToCac!, expected.revenueLtvToCac, `rev LTV:CAC ${row.cohortMonth}`);
      assertClose(
        row.contributionLtvToCac!,
        expected.contributionLtvToCac,
        `contrib LTV:CAC ${row.cohortMonth}`,
      );
    }

    const payback = calculatePaybackPeriod(ltvPoints, cacMap);
    for (const row of payback.rows) {
      const expected = GOLDEN_PAYBACK[row.cohortMonth as keyof typeof GOLDEN_PAYBACK];
      assert.equal(row.monthsToPayback, expected, `payback ${row.cohortMonth}`);
    }
  });
});

describe("5U-C golden reconciliation — product quality", () => {
  it("reconciles segment rates and insufficient_data signals", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const result = calculateFirstProductCustomerQualityFromDataset(dataset);
    assert.equal(result.hasLineItemCoverage, true);
    assert.equal(result.rows.length, 2);

    for (const row of result.rows) {
      const expected = GOLDEN_PRODUCT_QUALITY[row.productId as keyof typeof GOLDEN_PRODUCT_QUALITY];
      assert.ok(expected, `product segment ${row.productId}`);
      assert.equal(row.customerCount, expected.customerCount);
      assertClose(row.repeatPurchaseRate, expected.repeatPurchaseRate, `${row.productId} repeat`);
      assertClose(
        row.firstToSecondWithinWindowRate,
        expected.firstToSecondWithinWindowRate,
        `${row.productId} f2s`,
      );
      assertClose(row.avgRevenueLtv, expected.avgRevenueLtv, `${row.productId} avgRevLtv`);
      assertClose(row.discountDragRate, expected.discountDragRate, `${row.productId} discDrag`);
      assertClose(row.refundDragRate, expected.refundDragRate, `${row.productId} refundDrag`);
      assert.equal(row.qualitySignal, expected.qualitySignal);
    }
  });
});

describe("5U-C golden reconciliation — CSV preview parity", () => {
  it("matches locked ImportedCsvMetricPreview subset and contribution asymmetry", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const preview = buildImportedCsvMetricPreview(
      dataset.customers,
      dataset.orders,
      dataset.products,
    );

    assert.equal(preview.customerCount, GOLDEN_CSV_PREVIEW.customerCount);
    assert.equal(preview.orderCount, GOLDEN_CSV_PREVIEW.orderCount);
    assert.equal(preview.productCount, GOLDEN_CSV_PREVIEW.productCount);
    assert.equal(preview.cohortCount, GOLDEN_CSV_PREVIEW.cohortCount);
    assert.equal(preview.firstCohort, GOLDEN_CSV_PREVIEW.firstCohort);
    assert.equal(preview.lastCohort, GOLDEN_CSV_PREVIEW.lastCohort);
    assertClose(
      preview.totalRepeatPurchaseRate,
      GOLDEN_CSV_PREVIEW.totalRepeatPurchaseRate,
      "preview repeat",
    );
    assertClose(
      preview.firstToSecondWithin90DaysRate,
      GOLDEN_CSV_PREVIEW.firstToSecondWithin90DaysRate,
      "preview f2s",
    );
    assertClose(
      preview.averageMonth1ActiveRate!,
      GOLDEN_CSV_PREVIEW.averageMonth1ActiveRate,
      "preview M+1",
    );
    assertClose(
      preview.averageMonth2ActiveRate!,
      GOLDEN_CSV_PREVIEW.averageMonth2ActiveRate,
      "preview M+2",
    );
    assertClose(
      preview.averageMonth3ActiveRate!,
      GOLDEN_CSV_PREVIEW.averageMonth3ActiveRate,
      "preview M+3",
    );
    assertClose(
      preview.latestAverageNetRevenueLTV,
      GOLDEN_CSV_PREVIEW.latestAverageNetRevenueLTV,
      "preview terminal rev LTV",
    );
    assert.equal(preview.contributionLTVAvailable, false);
    assert.equal(preview.latestAverageContributionLTV, null);
  });
});

describe("5U-C golden reconciliation — acquisition VM", () => {
  it("surfaces raw unlocked blended CAC from the golden dataset", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const vm = buildAcquisitionPageViewModelFromDataset(
      dataset.customers,
      dataset.orders,
      dataset.marginAssumptions,
      dataset.marketingSpend ?? [],
      "fixture",
    );
    assert.equal(vm.summary.blendedCac, GOLDEN_CAC.blended);
    assert.equal(vm.summary.hasSpend, true);
    assert.equal(vm.summary.spendIsEstimated, false);
  });
});

describe("5U-C golden reconciliation — missing-data mutations", () => {
  it("omits contribution staircase and payback without margin assumptions", () => {
    const base = buildGoldenRetentionOSDataset();
    const dataset = goldenWithoutMarginAssumptions(base);
    const points = calculateLTVByCohort(dataset.customers, dataset.orders, dataset.marginAssumptions);
    for (const p of points) {
      assert.equal(
        p.cumulativeAvgContribution,
        undefined,
        `contrib omitted ${p.cohortKey} M+${p.offset}`,
      );
    }
    const cacByMonth = calculateCACByMonth(dataset.customers, dataset.marketingSpend ?? []);
    const payback = calculatePaybackPeriod(points, cacMapFromRows(cacByMonth.rows));
    for (const row of payback.rows) {
      assert.equal(row.monthsToPayback, null, `payback null ${row.cohortMonth}`);
    }
  });

  it("keeps CAC unavailable (null/empty), not zero, without marketing spend", () => {
    const base = buildGoldenRetentionOSDataset();
    const dataset = goldenWithoutMarketingSpend(base);
    const cacByMonth = calculateCACByMonth(dataset.customers, []);
    assert.equal(cacByMonth.rows.length, 0);
    const blended = calculateBlendedCAC(dataset.customers, []);
    assert.equal(blended.blendedCac, null);
    assert.notEqual(blended.blendedCac, 0);
  });

  it("locks product quality without line-item product ids", () => {
    const base = buildGoldenRetentionOSDataset();
    const dataset = goldenWithoutLineItems(base);
    const result = calculateFirstProductCustomerQualityFromDataset(dataset);
    assert.equal(result.hasLineItemCoverage, false);
    assert.equal(result.rows.length, 0);
  });
});

describe("MET-SHARE golden — Jan 2025 cohort revenue contribution", () => {
  it("matches hand-calculated reporting-period cohort shares", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const selection = buildAnalysisSelection(dataset, {
      asOfDate: "2025-04-30T23:59:59.000Z",
      reportingPeriod: {
        startDate: "2025-01-01T00:00:00.000Z",
        endDateExclusive: "2025-02-01T00:00:00.000Z",
      },
    });
    const result = calculateCohortRevenueContribution(selection);
    const expected = GOLDEN_COHORT_REVENUE_CONTRIBUTION_JAN_2025;

    assert.equal(result.status, expected.status);
    assert.equal(result.reportingOrderCount, expected.reportingOrderCount);
    assertClose(result.totalReportingRevenue, expected.totalReportingRevenue, "totalReportingRevenue");
    assertClose(result.selectedCohortRevenue, expected.selectedCohortRevenue, "selectedCohortRevenue");
    assertClose(
      result.selectedCohortShareOfReportingRevenue!,
      expected.selectedCohortShareOfReportingRevenue,
      "selectedCohortShare",
    );
    assertClose(result.cohortResolvedRevenue, expected.cohortResolvedRevenue, "cohortResolvedRevenue");
    assertClose(
      result.cohortAttributionCoverage!,
      expected.cohortAttributionCoverage,
      "cohortAttributionCoverage",
    );
    assert.equal(result.rows.length, expected.rows.length);
    for (let i = 0; i < expected.rows.length; i++) {
      const row = result.rows[i]!;
      const exp = expected.rows[i]!;
      assert.equal(row.kind, exp.kind, `row ${i} kind`);
      if (row.kind === "cohort" && exp.kind === "cohort") {
        assert.equal(row.cohortMonthKey, exp.cohortMonthKey);
      }
      assertClose(row.revenue, exp.revenue, `row ${i} revenue`);
      assertClose(row.shareOfReportingRevenue!, exp.shareOfReportingRevenue, `row ${i} share`);
      assert.equal(row.orderCount, exp.orderCount, `row ${i} orderCount`);
      assert.equal(row.customerCount, exp.customerCount, `row ${i} customerCount`);
    }
    const shareSum = result.rows.reduce((s, r) => s + (r.shareOfReportingRevenue ?? 0), 0);
    assertClose(shareSum, 1, "shares sum to 1");
  });
});

describe("MET-REV-RETENTION golden — asOf 2025-05-01 cohort revenue retention", () => {
  it("matches hand-calculated period revenue retention matrix", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const selection = buildAnalysisSelection(dataset, {
      asOfDate: "2025-05-01T00:00:00.000Z",
    });
    const result = calculateCohortRevenueRetention(selection);
    const expected = GOLDEN_COHORT_REVENUE_RETENTION_ASOF_2025_05_01;

    assert.equal(result.status, expected.status);
    assert.equal(result.maxOffset, expected.maxOffset);
    assert.equal(result.eligibleCustomerCount, expected.eligibleCustomerCount);
    assert.equal(result.rows.length, expected.rows.length);

    for (let i = 0; i < expected.rows.length; i++) {
      const row = result.rows[i]!;
      const exp = expected.rows[i]!;
      assert.equal(row.cohortMonthKey, exp.cohortMonthKey, `row ${i} cohort`);
      assert.equal(row.cohortCustomerCount, exp.cohortCustomerCount, `row ${i} size`);
      assertClose(row.month0Revenue!, exp.month0Revenue, `row ${i} month0`);
      assert.equal(row.cells.length, exp.cells.length, `row ${i} cells`);
      for (let j = 0; j < exp.cells.length; j++) {
        const cell = row.cells[j]!;
        const ec = exp.cells[j]!;
        assert.equal(cell.offset, ec.offset, `r${i}c${j} offset`);
        assert.equal(cell.periodMonthKey, ec.periodMonthKey, `r${i}c${j} month`);
        assert.equal(cell.maturityStatus, ec.maturityStatus, `r${i}c${j} status`);
        if (ec.revenue == null) {
          assert.equal(cell.revenue, null, `r${i}c${j} revenue null`);
          assert.equal(cell.retentionRate, null, `r${i}c${j} rate null`);
          assert.equal(cell.orderCount, null, `r${i}c${j} orders null`);
          assert.equal(cell.activeCustomerCount, null, `r${i}c${j} customers null`);
        } else {
          assertClose(cell.revenue!, ec.revenue, `r${i}c${j} revenue`);
          assertClose(cell.retentionRate!, ec.retentionRate, `r${i}c${j} rate`);
          assert.equal(cell.orderCount, ec.orderCount, `r${i}c${j} orders`);
          assert.equal(cell.activeCustomerCount, ec.activeCustomerCount, `r${i}c${j} customers`);
        }
      }
    }
  });
});

describe("MET-NEW-RETURN golden reconciliation — Jan 2025 new vs returning mix", () => {
  it("matches hand-calculated January 2025 new/returning mix", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const selection = buildAnalysisSelection(dataset, {
      asOfDate: "2025-04-30T23:59:59.000Z",
      reportingPeriod: {
        startDate: "2025-01-01T00:00:00.000Z",
        endDateExclusive: "2025-02-01T00:00:00.000Z",
      },
    });
    const result = calculateNewReturningMix(selection);
    const expected = GOLDEN_NEW_RETURNING_MIX_JAN_2025;

    assert.equal(result.status, expected.status);
    assert.equal(result.reportingOrderCount, expected.reportingOrderCount);
    assert.equal(result.newCustomerCount, expected.newCustomerCount);
    assert.equal(result.returningCustomerCount, expected.returningCustomerCount);
    assert.equal(result.classifiedActiveCustomerCount, expected.classifiedActiveCustomerCount);
    assertClose(result.newCustomerShare!, expected.newCustomerShare, "newCustomerShare");
    assertClose(result.returningCustomerShare!, expected.returningCustomerShare, "returningCustomerShare");
    assertClose(result.newRevenue, expected.newRevenue, "newRevenue");
    assertClose(result.returningRevenue, expected.returningRevenue, "returningRevenue");
    assertClose(result.unidentifiedRevenue, expected.unidentifiedRevenue, "unidentifiedRevenue");
    assertClose(result.unresolvedRevenue, expected.unresolvedRevenue, "unresolvedRevenue");
    assertClose(result.classifiedRevenue, expected.classifiedRevenue, "classifiedRevenue");
    assertClose(result.totalReportingRevenue, expected.totalReportingRevenue, "totalReportingRevenue");
    assertClose(
      result.newRevenueShareOfClassifiedRevenue!,
      expected.newRevenueShareOfClassifiedRevenue,
      "newRevenueShareOfClassifiedRevenue",
    );
    assertClose(
      result.returningRevenueShareOfClassifiedRevenue!,
      expected.returningRevenueShareOfClassifiedRevenue,
      "returningRevenueShareOfClassifiedRevenue",
    );
    assertClose(
      result.revenueClassificationCoverage!,
      expected.revenueClassificationCoverage,
      "revenueClassificationCoverage",
    );
  });
});

describe("MET-AOV-FREQ golden reconciliation — Jan 2025 AOV and frequency", () => {
  it("matches hand-calculated January 2025 AOV/frequency decomposition", () => {
    const dataset = buildGoldenRetentionOSDataset();
    const selection = buildAnalysisSelection(dataset, {
      asOfDate: "2025-04-30T23:59:59.000Z",
      reportingPeriod: {
        startDate: "2025-01-01T00:00:00.000Z",
        endDateExclusive: "2025-02-01T00:00:00.000Z",
      },
    });
    const result = calculateAovFrequency(selection);
    const expected = GOLDEN_AOV_FREQUENCY_JAN_2025;

    assert.equal(result.status, expected.status);
    assert.equal(result.reportingOrderCount, expected.reportingOrderCount);
    assert.equal(result.activeCustomerCount, expected.activeCustomerCount);
    assert.equal(result.classifiedOrderCount, expected.classifiedOrderCount);
    assert.equal(result.unidentifiedOrderCount, expected.unidentifiedOrderCount);
    assert.equal(result.unresolvedOrderCount, expected.unresolvedOrderCount);
    assertClose(result.totalReportingRevenue, expected.totalReportingRevenue, "totalReportingRevenue");
    assertClose(result.portfolioAverageOrderValue!, expected.portfolioAverageOrderValue, "portfolioAOV");
    assertClose(result.classifiedRevenue, expected.classifiedRevenue, "classifiedRevenue");
    assertClose(result.ordersPerActiveCustomer!, expected.ordersPerActiveCustomer, "ordersPerActiveCustomer");
    assertClose(result.classifiedAverageOrderValue!, expected.classifiedAverageOrderValue, "classifiedAOV");
    assertClose(result.revenuePerActiveCustomer!, expected.revenuePerActiveCustomer, "revenuePerActiveCustomer");
    assertClose(result.unidentifiedRevenue, expected.unidentifiedRevenue, "unidentifiedRevenue");
    assertClose(result.unresolvedRevenue, expected.unresolvedRevenue, "unresolvedRevenue");
    assertClose(
      result.customerIdentityOrderCoverage!,
      expected.customerIdentityOrderCoverage,
      "orderCoverage",
    );
    assertClose(
      result.customerIdentityRevenueCoverage!,
      expected.customerIdentityRevenueCoverage,
      "revenueCoverage",
    );
    assertClose(
      result.activeCustomerCount *
        result.ordersPerActiveCustomer! *
        result.classifiedAverageOrderValue!,
      expected.classifiedRevenue,
      "decomposition 4 x 1.25 x 82",
    );
  });
});
