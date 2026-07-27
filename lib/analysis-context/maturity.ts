/**
 * Monthly cohort maturity — completed / partial / unavailable.
 *
 * Advisory future contract only this sprint; does not rewrite lib/metrics maturity.
 */

import { addMonthsToMonthKey, parseMonthKey } from "../metrics/utils";
import {
  assertCanonicalUtcInstant,
  assertNonNegativeInteger,
  utcMonthStartInstant,
} from "./period";
import type { MaturityStatus } from "./types";

/**
 * Fully completed Month+N only (status === "complete").
 * Month+N is complete when the first instant of Month+(N+1) is <= asOfDate.
 */
export function isCompletedMaturityOffsetAvailable(
  cohortMonthKey: string,
  offset: number,
  asOfDate: string,
  maturityHorizonMonths?: number,
): boolean {
  return (
    getMonthlyCohortMaturityStatus(cohortMonthKey, offset, asOfDate, maturityHorizonMonths) ===
    "complete"
  );
}

/**
 * Explicit maturity status for cohort month M at Month+N.
 *
 * - unavailable: Month+N has not started, or offset exceeds maturityHorizonMonths
 * - partial: Month+N started but first instant of Month+(N+1) is after asOfDate
 * - complete: first instant of Month+(N+1) <= asOfDate
 *
 * Partial is not "missing" — later UI may show it; like-for-like / RDS / signals
 * must exclude partial (consumers not implemented in this sprint).
 */
export function getMonthlyCohortMaturityStatus(
  cohortMonthKey: string,
  offset: number,
  asOfDate: string,
  maturityHorizonMonths?: number,
): MaturityStatus {
  parseMonthKey(cohortMonthKey);
  assertNonNegativeInteger(offset, "offset");
  const asOfMs = assertCanonicalUtcInstant(asOfDate, "asOfDate");

  if (maturityHorizonMonths !== undefined) {
    assertNonNegativeInteger(maturityHorizonMonths, "maturityHorizonMonths");
    if (offset > maturityHorizonMonths) {
      return "unavailable";
    }
  }

  const periodStartMs = assertCanonicalUtcInstant(
    utcMonthStartInstant(addMonthsToMonthKey(cohortMonthKey, offset)),
    "month+N start",
  );
  const periodCompleteMs = assertCanonicalUtcInstant(
    utcMonthStartInstant(addMonthsToMonthKey(cohortMonthKey, offset + 1)),
    "month+(N+1) start",
  );

  if (asOfMs < periodStartMs) {
    return "unavailable";
  }
  if (periodCompleteMs <= asOfMs) {
    return "complete";
  }
  return "partial";
}
