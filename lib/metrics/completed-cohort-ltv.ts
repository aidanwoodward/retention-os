/**
 * Maturity-gated unweighted mean of canonical LTV staircase values at a requested Month+N offset.
 *
 * Equal cohort weight (not customer-count-weighted). Completed offsets only; missing engine
 * points and missing contribution fields are skipped (not treated as zero).
 */

import { isCompletedMaturityOffsetAvailable } from "../analysis-context";
import type { LTVPoint } from "../types";
import { safeDivide } from "./utils";

function pointAtOffset(curve: readonly LTVPoint[], offset: number): LTVPoint | null {
  return curve.find((p) => p.offset === offset) ?? null;
}

/**
 * Unweighted arithmetic mean of completed cohort LTV values at `offset`.
 * Returns null when no eligible completed cohorts exist.
 */
export function averageCompletedCohortLtvAtOffset(
  cohortPeriods: readonly string[],
  curvesByCohort: ReadonlyMap<string, LTVPoint[]>,
  offset: number,
  asOfDate: string,
  field: "revenue" | "contribution",
): number | null {
  const values: number[] = [];
  for (const period of cohortPeriods) {
    if (!isCompletedMaturityOffsetAvailable(period, offset, asOfDate)) {
      continue;
    }
    const point = pointAtOffset(curvesByCohort.get(period) ?? [], offset);
    if (!point) {
      continue;
    }
    const raw = field === "revenue" ? point.cumulativeAvgGrossRevenue : point.cumulativeAvgContribution;
    if (raw == null || !Number.isFinite(raw)) {
      continue;
    }
    values.push(raw);
  }
  if (values.length === 0) {
    return null;
  }
  return safeDivide(
    values.reduce((sum, v) => sum + v, 0),
    values.length,
  );
}
