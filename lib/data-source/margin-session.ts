/**
 * Session-only margin assumptions for uploaded CSV datasets (Sprint 4A).
 * Separate from the serialized dataset blob so assumptions stay explicit and reversible without re-importing.
 */

import type { MarginAssumptions } from "../types";
import type { RetentionOSDataset } from "./dataset-types";

const STORAGE_KEY = "retentionos:uploadedMarginAssumptions:v1";

const PROVENANCE_LABEL = "Browser session · uploaded CSV contribution fallback";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Internal validation for persisted and in-memory assumption objects. */
export function validateUploadedMarginAssumptions(m: MarginAssumptions | null | undefined): MarginAssumptions | null {
  if (m == null || !isPlainObject(m as unknown as object)) return null;
  const pct = m.contributionMarginPct;
  if (typeof pct !== "number" || !Number.isFinite(pct) || pct < 0 || pct > 1) return null;
  const out: MarginAssumptions = { contributionMarginPct: pct };
  const mult = m.netRevenueMultiplier;
  if (mult !== undefined) {
    if (typeof mult !== "number" || !Number.isFinite(mult) || mult <= 0 || mult > 10) return null;
    out.netRevenueMultiplier = mult;
  }
  return out;
}

function parseStoredMarginJson(raw: string): MarginAssumptions | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  const candidate: MarginAssumptions = {
    contributionMarginPct: parsed.contributionMarginPct as number,
  };
  if (parsed.netRevenueMultiplier !== undefined) {
    candidate.netRevenueMultiplier = parsed.netRevenueMultiplier as number;
  }
  return validateUploadedMarginAssumptions(candidate);
}

/** Load validated session margin assumptions, or null. Never throws. */
export function loadUploadedMarginAssumptions(): MarginAssumptions | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw == null || raw.length === 0) return null;
  return parseStoredMarginJson(raw);
}

/**
 * Persist margin assumptions for this tab. Validates before writing; throws if invalid
 * (callers should validate UX inputs first).
 */
export function saveUploadedMarginAssumptions(marginAssumptions: MarginAssumptions): void {
  const v = validateUploadedMarginAssumptions(marginAssumptions);
  if (!v) {
    throw new Error("Contribution margin must be a finite percentage between 0% and 100%.");
  }
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Browser storage quota exceeded."
        : "Could not write margin assumptions to session storage.";
    throw new Error(msg);
  }
}

/** Remove session margin assumptions. No-op on server. Never throws. */
export function clearUploadedMarginAssumptions(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface UploadedMarginAssumptionsSummary {
  readonly assumptions: MarginAssumptions;
  /** Human-readable provenance for trust UI */
  readonly provenanceLabel: typeof PROVENANCE_LABEL;
}

/** Summary when session assumptions exist; null otherwise. */
export function getUploadedMarginAssumptionsSummary(): UploadedMarginAssumptionsSummary | null {
  const a = loadUploadedMarginAssumptions();
  if (!a) return null;
  return { assumptions: a, provenanceLabel: PROVENANCE_LABEL };
}

/**
 * When session assumptions are set, they override any `marginAssumptions` embedded in the
 * stored upload JSON. Order-level `contributionMargin` on rows remains preferred by the metric engine.
 */
export function applyUploadedSessionMarginAssumptions(dataset: RetentionOSDataset): RetentionOSDataset {
  const m = loadUploadedMarginAssumptions();
  if (m != null) {
    return { ...dataset, marginAssumptions: m };
  }
  return dataset;
}
