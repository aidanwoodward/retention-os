/**
 * Canonical UTC instant / period validation for analysis context.
 * MVP calendar basis is UTC only — no merchant-timezone support.
 */

import { addMonthsToMonthKey, parseMonthKey, utcMonthKeyFromIso } from "../metrics/utils";
import type { AnalysisPeriod } from "./types";

/** Strict canonical UTC instant: `YYYY-MM-DDTHH:mm:ss.sssZ` with valid calendar round-trip. */
const CANONICAL_UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function assertCanonicalUtcInstant(iso: string, label = "instant"): number {
  if (typeof iso !== "string" || !CANONICAL_UTC_INSTANT.test(iso)) {
    throw new RangeError(
      `Invalid ${label}: expected canonical UTC ISO instant (YYYY-MM-DDTHH:mm:ss.sssZ), got "${iso}"`,
    );
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new RangeError(`Invalid ${label}: unparseable "${iso}"`);
  }
  if (new Date(ms).toISOString() !== iso) {
    throw new RangeError(
      `Invalid ${label}: non-canonical or ambiguous calendar value "${iso}"`,
    );
  }
  return ms;
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer, got ${String(value)}`);
  }
}

/** First UTC instant of a YYYY-MM cohort month: `YYYY-MM-01T00:00:00.000Z`. */
export function utcMonthStartInstant(monthKey: string): string {
  parseMonthKey(monthKey);
  return `${monthKey}-01T00:00:00.000Z`;
}

export function assertValidHalfOpenPeriod(period: AnalysisPeriod, label: string): void {
  const startMs = assertCanonicalUtcInstant(period.startDate, `${label}.startDate`);
  const endMs = assertCanonicalUtcInstant(period.endDateExclusive, `${label}.endDateExclusive`);
  if (!(startMs < endMs)) {
    throw new RangeError(
      `Invalid ${label}: startDate must be strictly before endDateExclusive (${period.startDate} / ${period.endDateExclusive})`,
    );
  }
}

/**
 * Acquisition periods must start and end at the first instant of UTC months.
 * Coverage is the half-open set of YYYY-MM keys in [start, endExclusive).
 */
export function assertMonthAlignedAcquisitionPeriod(period: AnalysisPeriod): void {
  assertValidHalfOpenPeriod(period, "acquisitionPeriod");
  const startKey = utcMonthKeyFromIso(period.startDate);
  const endKey = utcMonthKeyFromIso(period.endDateExclusive);
  if (period.startDate !== utcMonthStartInstant(startKey)) {
    throw new RangeError(
      `acquisitionPeriod.startDate must be the first UTC instant of a month, got "${period.startDate}"`,
    );
  }
  if (period.endDateExclusive !== utcMonthStartInstant(endKey)) {
    throw new RangeError(
      `acquisitionPeriod.endDateExclusive must be the first UTC instant of a month, got "${period.endDateExclusive}"`,
    );
  }
}

export function isInstantInHalfOpenPeriod(iso: string, period: AnalysisPeriod): boolean {
  const t = assertCanonicalUtcInstant(iso, "orderedAt");
  const startMs = assertCanonicalUtcInstant(period.startDate, "period.startDate");
  const endMs = assertCanonicalUtcInstant(period.endDateExclusive, "period.endDateExclusive");
  return startMs <= t && t < endMs;
}

/** UTC YYYY-MM keys covered by a month-aligned acquisition period. */
export function monthKeysCoveredByAcquisitionPeriod(period: AnalysisPeriod): string[] {
  assertMonthAlignedAcquisitionPeriod(period);
  const startKey = utcMonthKeyFromIso(period.startDate);
  const endKey = utcMonthKeyFromIso(period.endDateExclusive);
  const keys: string[] = [];
  let cursor = startKey;
  while (cursor !== endKey) {
    keys.push(cursor);
    cursor = addMonthsToMonthKey(cursor, 1);
    // Guard pathological loops if keys somehow do not advance toward endKey
    if (keys.length > 1200) {
      throw new RangeError("acquisitionPeriod month coverage exceeds safety limit");
    }
  }
  return keys;
}
