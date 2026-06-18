/**
 * Browser session persistence for uploaded marketing spend (Sprint 4D).
 * Tab-scoped `sessionStorage` — no Supabase; command-centre KPI routes only use spend when merged into an uploaded orders dataset.
 */

import type { MarketingSpend } from "../types/marketing";
import type { MarketingSpendAssumptions } from "../types/scenario";
import { spendBucketToCohortMonthKey } from "../import/normalise-marketing-spend";
import { loadUploadedMarketingSpendAssumption } from "./marketing-spend-assumption-session";
import { synthesizeMarketingSpendFromAssumption } from "./synthesize-marketing-spend-assumption";
import type { RetentionOSDataset } from "./dataset-types";

const STORAGE_KEY = "retentionos:uploadedMarketingSpend:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isMarketingSpendLike(v: unknown): v is MarketingSpend {
  if (!isPlainObject(v)) return false;
  if (typeof v.month !== "string" || v.month.trim() === "") return false;
  if (typeof v.spend !== "number" || !Number.isFinite(v.spend) || v.spend < 0) return false;
  if (v.channel !== undefined && typeof v.channel !== "string") return false;
  return true;
}

function parseStoredMarketingSpendJson(raw: string): MarketingSpend[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const out: MarketingSpend[] = [];
  for (const row of parsed) {
    if (!isMarketingSpendLike(row)) return null;
    const ck = spendBucketToCohortMonthKey(row.month);
    if (!ck) return null;
    out.push({
      month: ck,
      spend: row.spend,
      ...(row.channel != null && row.channel.trim() !== "" ? { channel: row.channel.trim() } : {}),
    });
  }
  return out;
}

/** Normalise rows to canonical `MarketingSpend` for storage (cohort month `YYYY-MM`). */
export function normaliseMarketingSpendForSession(rows: readonly MarketingSpend[]): MarketingSpend[] {
  const out: MarketingSpend[] = [];
  for (const row of rows) {
    const ck = spendBucketToCohortMonthKey(row.month);
    if (!ck || !Number.isFinite(row.spend) || row.spend < 0) {
      throw new Error("Each spend row needs a valid month and a non-negative finite spend.");
    }
    out.push({
      month: ck,
      spend: row.spend,
      ...(row.channel != null && String(row.channel).trim() !== "" ? { channel: String(row.channel).trim() } : {}),
    });
  }
  return out;
}

export function saveUploadedMarketingSpend(marketingSpend: readonly MarketingSpend[]): void {
  const normalised = normaliseMarketingSpendForSession(marketingSpend);
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Browser storage quota exceeded — try fewer rows or clear session data."
        : "Could not write marketing spend to session storage (private mode or blocked storage).";
    throw new Error(msg);
  }
}

export function loadUploadedMarketingSpend(): MarketingSpend[] | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw == null || raw.length === 0) return null;
  return parseStoredMarketingSpendJson(raw);
}

export function clearUploadedMarketingSpend(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface UploadedMarketingSpendSessionSummary {
  readonly rowCount: number;
  readonly monthCount: number;
  readonly channelCount: number;
  readonly totalSpend: number;
  readonly firstMonth?: string;
  readonly lastMonth?: string;
  readonly months: readonly string[];
  readonly channels: readonly string[];
}

export function getUploadedMarketingSpendSessionSummary(): UploadedMarketingSpendSessionSummary | null {
  const rows = loadUploadedMarketingSpend();
  if (rows == null || rows.length === 0) return null;
  const months = new Set<string>();
  const channels = new Set<string>();
  let totalSpend = 0;
  for (const r of rows) {
    const ck = spendBucketToCohortMonthKey(r.month);
    if (ck) months.add(ck);
    if (r.channel) channels.add(r.channel);
    totalSpend += r.spend;
  }
  const sortedMonths = [...months].sort();
  return {
    rowCount: rows.length,
    monthCount: months.size,
    channelCount: channels.size,
    totalSpend,
    firstMonth: sortedMonths[0],
    lastMonth: sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : undefined,
    months: sortedMonths,
    channels: [...channels].sort(),
  };
}

/**
 * Spend rows for acquisition / CAC previews on `/data`.
 * - **Uploaded orders:** use `dataset.marketingSpend` (session-enriched in the command-centre resolver).
 * - **Demo fixture:** use session spend when the operator saved one without an orders upload; otherwise demo fixture spend.
 */
export function getMarketingSpendForAcquisitionPreview(
  isUploadedDataset: boolean,
  marketingSpendFromDataset: readonly MarketingSpend[] | undefined,
): readonly MarketingSpend[] {
  if (isUploadedDataset) {
    return marketingSpendFromDataset ?? [];
  }
  if (typeof window === "undefined") {
    return marketingSpendFromDataset ?? [];
  }
  const session = loadUploadedMarketingSpend();
  if (session != null && session.length > 0) return session;
  return marketingSpendFromDataset ?? [];
}

/**
 * Pure merge for uploaded datasets — CSV rows win; otherwise synthesize from session assumption.
 * Exported for unit tests (no browser session reads).
 */
export function resolveMarketingSpendForUploadedDataset(
  dataset: RetentionOSDataset,
  csvRows: readonly MarketingSpend[] | null,
  assumption: MarketingSpendAssumptions | null,
): RetentionOSDataset {
  if (!dataset.meta.isUploaded) return dataset;

  if (csvRows != null && csvRows.length > 0) {
    return {
      ...dataset,
      marketingSpend: csvRows,
      marketingSpendAssumptions: undefined,
    };
  }

  if (assumption != null) {
    const spend = synthesizeMarketingSpendFromAssumption(dataset.orders, assumption);
    if (spend.length > 0) {
      return {
        ...dataset,
        marketingSpendAssumptions: assumption,
        marketingSpend: spend,
      };
    }
  }

  return { ...dataset, marketingSpendAssumptions: undefined };
}

/**
 * Attach session marketing spend to an uploaded dataset (does not mutate stored orders JSON).
 */
export function applyUploadedSessionMarketingSpend(dataset: RetentionOSDataset): RetentionOSDataset {
  if (!dataset.meta.isUploaded) return dataset;
  const csvRows = loadUploadedMarketingSpend();
  const assumption = loadUploadedMarketingSpendAssumption();
  return resolveMarketingSpendForUploadedDataset(dataset, csvRows, assumption);
}
