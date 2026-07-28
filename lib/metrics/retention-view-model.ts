import { inferConservativeAsOfDateFromDataset } from "../analysis-context";
import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import { averageCompletedCohortRetentionAtOffset } from "./completed-cohort-retention";
import { calculateCohorts, type CohortSummary } from "./cohorts";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { calculateRetentionByCohort, type RetentionByCohortSeries } from "./retention";

export interface RetentionPageSummaryView {
  totalCustomers: number;
  /** Customers with ≥2 orders / all customers (fraction). */
  allTimeRepeatPurchaseRate: number;
  /** Second order within 90 days of first / all customers (fraction). */
  firstToSecondWithin90DaysRate: number;
  averageDaysToSecondOrder: number | null;
  medianDaysToSecondOrder: number | null;
  /** Unweighted mean of completed cohort Month +1 active rates (fraction); null when none complete. */
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

/** Adapter: command-centre dataset + `/lib/metrics` → `/retention` props (rates as fractions). */
export function buildRetentionPageViewModelFromDataset(dataset: RetentionOSDataset): RetentionPageViewModel {
  const { customers, orders, marginAssumptions } = dataset;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retention = calculateRetentionByCohort(customers, orders);
  const repeat = calculateRepeatPurchaseRate(customers, orders);
  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);
  const asOfDate = inferConservativeAsOfDateFromDataset(dataset);

  return {
    summary: {
      totalCustomers: repeat.totalCustomers,
      allTimeRepeatPurchaseRate: repeat.repeatPurchaseRate,
      firstToSecondWithin90DaysRate: f2.conversionRateWithinWindow,
      averageDaysToSecondOrder: f2.averageDaysToSecondOrder,
      medianDaysToSecondOrder: f2.medianDaysToSecondOrder,
      averageMonthPlus1ActiveRate:
        asOfDate == null ? null : averageCompletedCohortRetentionAtOffset(retention, 1, asOfDate),
      averageMonthPlus2ActiveRate:
        asOfDate == null ? null : averageCompletedCohortRetentionAtOffset(retention, 2, asOfDate),
      averageMonthPlus3ActiveRate:
        asOfDate == null ? null : averageCompletedCohortRetentionAtOffset(retention, 3, asOfDate),
    },
    cohortRows: buildCohortTableRows(cohortSummaries, retention),
  };
}

export function buildRetentionPageViewModel(seed?: number): RetentionPageViewModel {
  return buildRetentionPageViewModelFromDataset(buildDemoRetentionOSDataset(seed));
}
