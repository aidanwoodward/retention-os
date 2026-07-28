import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cacMapFromRows,
  calculateCACByMonth,
  calculatePaybackPeriod,
} from "../../../metrics/acquisition";
import { calculateCohorts } from "../../../metrics/cohorts";
import { calculateLTVByCohort } from "../../../metrics/ltv";
import { calculateFirstProductCustomerQualityFromDataset } from "../../../metrics/product-quality";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "../../../metrics/repeat-purchase";
import { calculateRetentionByCohort } from "../../../metrics/retention";
import { netOrderRevenue } from "../../../metrics/utils";
import { adaptShopifyGraphqlOrdersFixture } from "./adapt-shopify-orders-graphql";
import { buildFixtureRetentionOSDataset, GRAPHQL_FIXTURE_TEST_META } from "./build-fixture-dataset";
import { fixtureF01, fixtureF02, fixtureF06, fixtureMetricParityPack } from "./fixtures/f01-f19";
import { PROD_CREAM } from "./fixtures/fixture-builders";

describe("Shopify GraphQL → metric engine parity", () => {
  it("pipeline: fixture → adapter → RetentionOSDataset → metrics", () => {
    const adapted = adaptShopifyGraphqlOrdersFixture({ orders: fixtureMetricParityPack() });
    assert.ok(adapted.entities);
    const dataset = buildFixtureRetentionOSDataset(adapted.entities!, GRAPHQL_FIXTURE_TEST_META, {
      marginAssumptions: { contributionMarginPct: 0.4, netRevenueMultiplier: 1 },
    });
    assert.equal(dataset.meta.sourceLabel, "Shopify GraphQL fixture (test-only)");
    assert.ok(dataset.orders.length >= 1);
    assert.ok(dataset.customers.length >= 1);
  });

  it("cohort assignment: identifiable only; guests excluded from cohort sizes", () => {
    const adapted = adaptShopifyGraphqlOrdersFixture({
      orders: [...fixtureF01(), ...fixtureF02()],
    });
    const cohorts = calculateCohorts(adapted.entities!.customers, adapted.entities!.orders);
    const jan = cohorts.find((c) => c.cohortPeriod === "2024-01");
    assert.ok(jan);
    assert.equal(jan!.cohortSize, 1);
    // Cohort net = all trusted orders for identifiable cohort members (Jan 80 + Feb 60)
    assert.equal(jan!.netRevenue, 140);
    // Guest net (45) is in portfolio order nets but not in identifiable cohort revenue
    const portfolioNet = adapted.entities!.orders.reduce((s, o) => s + netOrderRevenue(o), 0);
    assert.equal(portfolioNet, 140 + 45);
  });

  it("retention + F2S: repeat identifiable customer; guest excluded", () => {
    const adapted = adaptShopifyGraphqlOrdersFixture({
      orders: [...fixtureF01(), ...fixtureF02()],
    });
    const { customers, orders } = adapted.entities!;
    const retention = calculateRetentionByCohort(customers, orders);
    assert.ok(retention.length >= 1);
    const f2s = calculateFirstToSecondOrderConversion(customers, orders, 90);
    assert.equal(f2s.totalCustomers, 1);
    assert.equal(f2s.customersWithSecondOrder, 1);
    assert.ok(f2s.averageDaysToSecondOrder != null);
    assert.ok(f2s.averageDaysToSecondOrder! >= 25 && f2s.averageDaysToSecondOrder! <= 30);
    const repeat = calculateRepeatPurchaseRate(customers, orders);
    assert.equal(repeat.totalCustomers, 1);
    assert.equal(repeat.repeatCustomers, 1);
  });

  it("revenue LTV and contribution LTV when margin assumption supplied", () => {
    const adapted = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF01() });
    const margin = { contributionMarginPct: 0.4, netRevenueMultiplier: 1 };
    const points = calculateLTVByCohort(adapted.entities!.customers, adapted.entities!.orders, margin);
    assert.ok(points.length >= 1);
    const m0 = points.find((p) => p.cohortKey === "2024-01" && p.offset === 0);
    assert.ok(m0);
    assert.ok(m0!.cumulativeAvgGrossRevenue > 0);
    assert.ok((m0!.cumulativeAvgContribution ?? 0) > 0);
    assert.ok(
      Math.abs((m0!.cumulativeAvgContribution ?? 0) - m0!.cumulativeAvgGrossRevenue * 0.4) < 1e-9,
    );
  });

  it("first-product quality: F06 multi_product — no Cream quality row (engine SoT)", () => {
    const adapted = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF06() });
    const dataset = buildFixtureRetentionOSDataset(adapted.entities!, GRAPHQL_FIXTURE_TEST_META);
    // Denormalised import field may still reflect former first-line Cream — documented drift only.
    assert.equal(
      adapted.entities!.customers[0]!.firstProductId,
      `shopify:product:${PROD_CREAM}`,
    );
    const result = calculateFirstProductCustomerQualityFromDataset(dataset);
    const cream = result.rows.find((r) => r.productId === `shopify:product:${PROD_CREAM}`);
    assert.equal(cream, undefined);
    assert.equal(result.multiProductCustomerCount, 1);
    assert.equal(result.unknownFirstProductCustomerCount, 0);
    assert.equal(result.unassignedCustomerCount, 1);
    assert.equal(result.rows.length, 0);
  });

  it("CAC / payback only when manual spend supplied; guests not in identifiable denominator", () => {
    const adapted = adaptShopifyGraphqlOrdersFixture({
      orders: [...fixtureF01(), ...fixtureF02()],
    });
    const spend = [{ month: "2024-01", spend: 100 }];
    const cac = calculateCACByMonth(adapted.entities!.customers, spend);
    const jan = cac.rows.find((r) => r.month === "2024-01");
    assert.ok(jan);
    assert.equal(jan!.acquiredCustomers, 1);
    assert.equal(jan!.cac, 100);

    const margin = { contributionMarginPct: 0.4, netRevenueMultiplier: 1 };
    const ltv = calculateLTVByCohort(adapted.entities!.customers, adapted.entities!.orders, margin);
    const payback = calculatePaybackPeriod(ltv, cacMapFromRows(cac.rows));
    assert.ok(payback.rows.length >= 1);
  });

  it("portfolio order revenue includes trusted customerId == null", () => {
    const adapted = adaptShopifyGraphqlOrdersFixture({ orders: fixtureF02() });
    const portfolio = adapted.entities!.orders.reduce((s, o) => s + netOrderRevenue(o), 0);
    assert.equal(portfolio, 45);
    const cohorts = calculateCohorts(adapted.entities!.customers, adapted.entities!.orders);
    assert.equal(cohorts.length, 0);
  });
});
