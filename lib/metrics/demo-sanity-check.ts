import type { Order } from "../types/order";
import { getDemoDataset } from "../demo";
import { calculateCohorts } from "./cohorts";
import { calculateLTVByCohort } from "./ltv";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { calculateRetentionByCohort } from "./retention";

/** Top-line sanity output for the deterministic demo dataset + core metrics. */
export interface DemoMetricSanityCheckResult {
  customerCount: number;
  orderCount: number;
  productCount: number;
  marketingSpendRowCount: number;
  cohortCount: number;
  firstCohort: string | null;
  lastCohort: string | null;
  largestCohort: { cohortPeriod: string; cohortSize: number } | null;
  totalRepeatPurchaseRate: number;
  firstToSecondConversionRate: number;
  firstToSecondWithin90DaysRate: number;
  averageDaysToSecondOrder: number | null;
  medianDaysToSecondOrder: number | null;
  averageMonth1Retention: number | null;
  latestAverageRevenueLTV: number | null;
  latestAverageContributionLTV: number | null;
  /** True when cumulative net-revenue LTV never drops as offset increases inside each cohort curve. */
  ltvNonDecreasingByCohort: boolean;
  warnings: string[];
}

function rawNetMerchandise(order: Order): number {
  return order.grossRevenue - order.discounts - order.refunds;
}

function checkFraction(label: string, value: number, warnings: string[]): void {
  if (value < 0 || value > 1 || Number.isNaN(value)) {
    warnings.push(`${label} outside [0, 1] or NaN: ${value}`);
  }
}

/**
 * Runs canonical demo data through the MVP metric engine and summarizes plausibility signals.
 *
 * Not a substitute for unit tests — quick smoke / regression guard before UI wiring.
 */
export function runDemoMetricSanityCheck(seed?: number): DemoMetricSanityCheckResult {
  const warnings: string[] = [];
  const ds = getDemoDataset(seed);
  const { customers, orders, products, marketingSpend, marginAssumptions } = ds;

  const customerCount = customers.length;
  const orderCount = orders.length;
  const productCount = products.length;
  const marketingSpendRowCount = marketingSpend.length;

  if (customerCount === 0) {
    warnings.push("No customers in demo dataset.");
  }
  if (orderCount === 0) {
    warnings.push("No orders in demo dataset.");
  }

  for (const o of orders) {
    const raw = rawNetMerchandise(o);
    if (raw < 0) {
      warnings.push(`Order ${o.id} has negative raw net merchandise (${raw}).`);
    }
    if (o.contributionMargin != null && o.contributionMargin < 0) {
      warnings.push(`Order ${o.id} has negative contributionMargin (${o.contributionMargin}).`);
    }
  }

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const cohortCount = cohortSummaries.length;

  if (cohortCount === 0 && customerCount > 0) {
    warnings.push("Cohort table empty while customers exist.");
  }

  let firstCohort: string | null = null;
  let lastCohort: string | null = null;
  let largestCohort: { cohortPeriod: string; cohortSize: number } | null = null;

  if (cohortSummaries.length > 0) {
    firstCohort = cohortSummaries[0]!.cohortPeriod;
    lastCohort = cohortSummaries[cohortSummaries.length - 1]!.cohortPeriod;
    let largest: { cohortPeriod: string; cohortSize: number } | null = null;
    for (const row of cohortSummaries) {
      if (!largest || row.cohortSize > largest.cohortSize) {
        largest = { cohortPeriod: row.cohortPeriod, cohortSize: row.cohortSize };
      }
    }
    largestCohort = largest;
  }

  const repeat = calculateRepeatPurchaseRate(customers, orders);
  checkFraction("repeatPurchaseRate", repeat.repeatPurchaseRate, warnings);

  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);
  checkFraction("firstToSecondConversionRate", f2.conversionRate, warnings);
  checkFraction("firstToSecondWithin90DaysRate", f2.conversionRateWithinWindow, warnings);

  const retentionSeries = calculateRetentionByCohort(customers, orders);
  for (const row of retentionSeries) {
    for (const p of row.points) {
      checkFraction(`retention cohort=${row.cohortPeriod} offset=${p.offset}`, p.retentionRate, warnings);
      if (p.revenueInPeriod != null && p.revenueInPeriod < 0) {
        warnings.push(
          `Negative retention revenueInPeriod cohort=${row.cohortPeriod} offset=${p.offset}: ${p.revenueInPeriod}`,
        );
      }
    }
  }

  let averageMonth1Retention: number | null = null;
  {
    let sum = 0;
    let n = 0;
    for (const row of retentionSeries) {
      const p1 = row.points.find((p) => p.offset === 1);
      if (p1) {
        sum += p1.retentionRate;
        n += 1;
      }
    }
    if (n > 0) {
      averageMonth1Retention = sum / n;
    }
  }

  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);

  for (const pt of ltvPoints) {
    if (pt.cumulativeAvgGrossRevenue < 0 || Number.isNaN(pt.cumulativeAvgGrossRevenue)) {
      warnings.push(
        `Negative or NaN cumulative revenue LTV cohort=${pt.cohortKey} offset=${pt.offset}: ${pt.cumulativeAvgGrossRevenue}`,
      );
    }
    if (pt.cumulativeAvgContribution != null) {
      const c = pt.cumulativeAvgContribution;
      if (c < 0 || Number.isNaN(c)) {
        warnings.push(`Negative or NaN contribution LTV cohort=${pt.cohortKey} offset=${pt.offset}: ${c}`);
      }
    }
  }

  const byCohortLtv = new Map<string, typeof ltvPoints>();
  for (const pt of ltvPoints) {
    const list = byCohortLtv.get(pt.cohortKey);
    if (list) {
      list.push(pt);
    } else {
      byCohortLtv.set(pt.cohortKey, [pt]);
    }
  }

  let ltvNonDecreasingByCohort = true;
  for (const [, curve] of byCohortLtv) {
    const sorted = [...curve].sort((a, b) => a.offset - b.offset);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!.cumulativeAvgGrossRevenue;
      const curr = sorted[i]!.cumulativeAvgGrossRevenue;
      if (curr + 1e-9 < prev) {
        ltvNonDecreasingByCohort = false;
        warnings.push(
          `Revenue LTV decreased within cohort ${sorted[i]!.cohortKey}: offset ${sorted[i - 1]!.offset} (${prev}) → offset ${sorted[i]!.offset} (${curr})`,
        );
      }
    }
  }

  let latestAverageRevenueLTV: number | null = null;
  let latestAverageContributionLTV: number | null = null;
  {
    const terminalRevenue: number[] = [];
    const terminalContribution: number[] = [];
    for (const [, curve] of byCohortLtv) {
      const sorted = [...curve].sort((a, b) => a.offset - b.offset);
      const tail = sorted[sorted.length - 1];
      if (!tail) continue;
      terminalRevenue.push(tail.cumulativeAvgGrossRevenue);
      if (tail.cumulativeAvgContribution != null) {
        terminalContribution.push(tail.cumulativeAvgContribution);
      }
    }
    if (terminalRevenue.length > 0) {
      latestAverageRevenueLTV =
        terminalRevenue.reduce((a, b) => a + b, 0) / terminalRevenue.length;
    }
    if (terminalContribution.length > 0) {
      latestAverageContributionLTV =
        terminalContribution.reduce((a, b) => a + b, 0) / terminalContribution.length;
    }
  }

  if (!ltvNonDecreasingByCohort) {
    warnings.push("LTV curve check failed: at least one cohort shows decreasing cumulative net-revenue LTV.");
  }

  return {
    customerCount,
    orderCount,
    productCount,
    marketingSpendRowCount,
    cohortCount,
    firstCohort,
    lastCohort,
    largestCohort,
    totalRepeatPurchaseRate: repeat.repeatPurchaseRate,
    firstToSecondConversionRate: f2.conversionRate,
    firstToSecondWithin90DaysRate: f2.conversionRateWithinWindow,
    averageDaysToSecondOrder: f2.averageDaysToSecondOrder,
    medianDaysToSecondOrder: f2.medianDaysToSecondOrder,
    averageMonth1Retention,
    latestAverageRevenueLTV,
    latestAverageContributionLTV,
    ltvNonDecreasingByCohort,
    warnings,
  };
}
