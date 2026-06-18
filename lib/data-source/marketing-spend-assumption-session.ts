/**
 * Session-only marketing spend % assumption for uploaded CSV datasets (Sprint 5D).
 * Separate from CSV row storage and the serialized orders blob.
 */

import type { MarketingSpendAssumptions } from "../types/scenario";

const STORAGE_KEY = "retentionos:uploadedMarketingSpendAssumption:v1";

const PROVENANCE_LABEL = "Browser session · estimated marketing spend (% of net revenue)";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Internal validation for persisted and in-memory assumption objects. */
export function validateUploadedMarketingSpendAssumptions(
  m: MarketingSpendAssumptions | null | undefined,
): MarketingSpendAssumptions | null {
  if (m == null || !isPlainObject(m as unknown as object)) return null;
  const pct = m.marketingSpendPctOfNetRevenue;
  if (typeof pct !== "number" || !Number.isFinite(pct) || pct < 0 || pct > 1) return null;
  return { marketingSpendPctOfNetRevenue: pct };
}

function parseStoredAssumptionJson(raw: string): MarketingSpendAssumptions | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  return validateUploadedMarketingSpendAssumptions({
    marketingSpendPctOfNetRevenue: parsed.marketingSpendPctOfNetRevenue as number,
  });
}

export function loadUploadedMarketingSpendAssumption(): MarketingSpendAssumptions | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw == null || raw.length === 0) return null;
  return parseStoredAssumptionJson(raw);
}

export function saveUploadedMarketingSpendAssumption(assumption: MarketingSpendAssumptions): void {
  const v = validateUploadedMarketingSpendAssumptions(assumption);
  if (!v) {
    throw new Error("Marketing spend percentage must be a finite value between 0% and 100%.");
  }
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Browser storage quota exceeded."
        : "Could not write marketing spend assumption to session storage.";
    throw new Error(msg);
  }
}

export function clearUploadedMarketingSpendAssumption(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface UploadedMarketingSpendAssumptionSummary {
  readonly assumptions: MarketingSpendAssumptions;
  readonly provenanceLabel: typeof PROVENANCE_LABEL;
}

export function getUploadedMarketingSpendAssumptionSummary(): UploadedMarketingSpendAssumptionSummary | null {
  const a = loadUploadedMarketingSpendAssumption();
  if (!a) return null;
  return { assumptions: a, provenanceLabel: PROVENANCE_LABEL };
}
