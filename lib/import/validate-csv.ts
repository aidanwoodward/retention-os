/**
 * Shared validation helpers for CSV import (pure functions, no I/O).
 *
 * Sprint 3A: validates coerced values and surfaces `CsvImportIssue` messages.
 * Does not persist or call Supabase — contract + normalisation only.
 */

import type { CsvImportIssue } from "./import-types";

export const MONEY_EPSILON = 0.01;

export function pushError(
  errors: CsvImportIssue[],
  code: string,
  message: string,
  row?: number,
): void {
  errors.push({ severity: "error", code, message, row });
}

export function pushWarning(
  warnings: CsvImportIssue[],
  code: string,
  message: string,
  row?: number,
): void {
  warnings.push({ severity: "warning", code, message, row });
}

/** Strip currency noise; returns NaN if not parseable. */
export function parseMoneyCell(raw: string): number {
  const s = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (s === "") return NaN;
  return Number(s);
}

export function parseQuantityCell(raw: string): number {
  const s = raw.trim().replace(/,/g, "");
  if (s === "") return NaN;
  return Number(s);
}

/** Normalise to ISO 8601 in UTC where possible. */
export function parseOrderedAtIso(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export function moneyClose(a: number, b: number, eps = MONEY_EPSILON): boolean {
  return Math.abs(a - b) <= eps;
}
