/**
 * Maturity-gated unweighted mean of cohort retention rates at a requested Month+N offset.
 *
 * Commercial meaning: Month+N active-customer retention of the typical fully observed cohort.
 * Equal cohort weight (not customer-count-weighted). Completed zeros included; partial/unavailable excluded.
 */

import {
  assertCanonicalUtcInstant,
  assertNonNegativeInteger,
  isCompletedMaturityOffsetAvailable,
} from "../analysis-context";
import type { RetentionByCohortSeries } from "./retention";
import { safeDivide } from "./utils";

function retentionPointAtOffset(
  series: RetentionByCohortSeries,
  offset: number,
): { retentionRate: number } | null {
  let found: { retentionRate: number } | null = null;
  for (const point of series.points) {
    if (point.offset !== offset) continue;
    if (found != null) {
      throw new RangeError(
        `Duplicate retention points for cohort "${series.cohortPeriod}" at offset ${offset}`,
      );
    }
    found = { retentionRate: point.retentionRate };
  }
  return found;
}

/**
 * Unweighted arithmetic mean of completed cohort retention rates at `offset`.
 * Returns null when no eligible completed cohorts exist.
 */
export function averageCompletedCohortRetentionAtOffset(
  retentionByCohort: readonly RetentionByCohortSeries[],
  offset: number,
  asOfDate: string,
): number | null {
  assertNonNegativeInteger(offset, "offset");
  assertCanonicalUtcInstant(asOfDate, "asOfDate");

  const seenPeriods = new Set<string>();
  const rates: number[] = [];

  for (const series of retentionByCohort) {
    const period = series.cohortPeriod;
    if (seenPeriods.has(period)) {
      throw new RangeError(`Duplicate cohort period in retention series: "${period}"`);
    }
    seenPeriods.add(period);

    if (!isCompletedMaturityOffsetAvailable(period, offset, asOfDate)) {
      continue;
    }

    const point = retentionPointAtOffset(series, offset);
    if (point == null) {
      continue;
    }

    const rate = point.retentionRate;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new RangeError(
        `Invalid completed retentionRate for cohort "${period}" at offset ${offset}: ${String(rate)}`,
      );
    }

    rates.push(rate);
  }

  if (rates.length === 0) {
    return null;
  }

  return safeDivide(
    rates.reduce((sum, r) => sum + r, 0),
    rates.length,
  );
}
