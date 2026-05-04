import { getDemoDataset } from "../demo";
import { calculateCohorts, type CohortSummary } from "./cohorts";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { calculateRetentionByCohort, type RetentionByCohortSeries } from "./retention";
import { safeDivide } from "./utils";

export interface RetentionPageSummaryView {
  totalCustomers: number;
  /** Customers with ≥2 orders / all customers (fraction). */
  allTimeRepeatPurchaseRate: number;
  /** Second order within 90 days of first / all customers (fraction). */
  firstToSecondWithin90DaysRate: number;
  averageDaysToSecondOrder: number | null;
  medianDaysToSecondOrder: number | null;
  /** Mean of cohort-level Month +1 active rates where that month exists (fraction). */
  averageMonthPlus1ActiveRate: number | null;
  averageMonthPlus2ActiveRate: number | null;
  averageMonthPlus3ActiveRate: number | null;
}

export interface RetentionCohortTableRowView {
  cohortPeriod: string;
  cohortSize: number;
  monthPlus0ActiveRate: number | null;
  monthPlus1ActiveRate: number | null;
  monthPlus2ActiveRate: number | null;
  monthPlus3ActiveRate: number | null;
  monthPlus6ActiveRate: number | null;
}

export interface RetentionPageViewModel {
  summary: RetentionPageSummaryView;
  cohortRows: RetentionCohortTableRowView[];
}

function retentionRateAtOffset(
  series: readonly RetentionByCohortSeries[],
  cohortPeriod: string,
  offset: number,
): number | null {
  const row = series.find((s) => s.cohortPeriod === cohortPeriod);
  if (!row) {
    return null;
  }
  const p = row.points.find((pt) => pt.offset === offset);
  return p ? p.retentionRate : null;
}

/** Simple mean across cohorts that have a point at `offset` (denominator excludes cohorts too young). */
function averageActiveRateAcrossCohorts(series: readonly RetentionByCohortSeries[], offset: number): number | null {
  let sum = 0;
  let n = 0;
  for (const row of series) {
    const p = row.points.find((pt) => pt.offset === offset);
    if (p) {
      sum += p.retentionRate;
      n += 1;
    }
  }
  return n === 0 ? null : safeDivide(sum, n);
}

function buildCohortTableRows(
  cohortSummaries: readonly CohortSummary[],
  retention: readonly RetentionByCohortSeries[],
): RetentionCohortTableRowView[] {
  return cohortSummaries.map((cohort) => ({
    cohortPeriod: cohort.cohortPeriod,
    cohortSize: cohort.cohortSize,
    monthPlus0ActiveRate: retentionRateAtOffset(retention, cohort.cohortPeriod, 0),
    monthPlus1ActiveRate: retentionRateAtOffset(retention, cohort.cohortPeriod, 1),
    monthPlus2ActiveRate: retentionRateAtOffset(retention, cohort.cohortPeriod, 2),
    monthPlus3ActiveRate: retentionRateAtOffset(retention, cohort.cohortPeriod, 3),
    monthPlus6ActiveRate: retentionRateAtOffset(retention, cohort.cohortPeriod, 6),
  }));
}

/** Adapter: canonical demo dataset + `/lib/metrics` → `/retention` props (rates as fractions). */
export function buildRetentionPageViewModel(seed?: number): RetentionPageViewModel {
  const ds = getDemoDataset(seed);
  const { customers, orders, marginAssumptions } = ds;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retention = calculateRetentionByCohort(customers, orders);
  const repeat = calculateRepeatPurchaseRate(customers, orders);
  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);

  return {
    summary: {
      totalCustomers: repeat.totalCustomers,
      allTimeRepeatPurchaseRate: repeat.repeatPurchaseRate,
      firstToSecondWithin90DaysRate: f2.conversionRateWithinWindow,
      averageDaysToSecondOrder: f2.averageDaysToSecondOrder,
      medianDaysToSecondOrder: f2.medianDaysToSecondOrder,
      averageMonthPlus1ActiveRate: averageActiveRateAcrossCohorts(retention, 1),
      averageMonthPlus2ActiveRate: averageActiveRateAcrossCohorts(retention, 2),
      averageMonthPlus3ActiveRate: averageActiveRateAcrossCohorts(retention, 3),
    },
    cohortRows: buildCohortTableRows(cohortSummaries, retention),
  };
}
