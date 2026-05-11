/**
 * Browser session persistence for an uploaded `RetentionOSDataset` (Sprint 3F).
 * Session-only — no Supabase, no command-centre wiring yet.
 */

import type {
  RetentionOSDataset,
  RetentionOSDatasetSummary,
  RetentionOSSourceMetadata,
} from "./dataset-types";
import { getDatasetSummary } from "./dataset-helpers";

const STORAGE_KEY = "retentionos:uploadedDataset:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isCustomerLike(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  return typeof v.id === "string" && typeof v.firstOrderAt === "string";
}

function isLineItemLike(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  return typeof v.id === "string" && typeof v.quantity === "number" && Number.isFinite(v.quantity);
}

function isOrderLike(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  if (typeof v.id !== "string" || typeof v.customerId !== "string" || typeof v.orderedAt !== "string") {
    return false;
  }
  if (
    typeof v.grossRevenue !== "number" ||
    typeof v.discounts !== "number" ||
    typeof v.refunds !== "number" ||
    !Number.isFinite(v.grossRevenue) ||
    !Number.isFinite(v.discounts) ||
    !Number.isFinite(v.refunds)
  ) {
    return false;
  }
  if (!Array.isArray(v.lineItems) || !v.lineItems.every(isLineItemLike)) return false;
  return true;
}

function isProductLike(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  return typeof v.id === "string" && typeof v.title === "string";
}

function parseMeta(meta: unknown): RetentionOSSourceMetadata | null {
  if (!isPlainObject(meta)) return null;
  if (meta.sourceType !== "uploaded_csv") return null;
  if (meta.isUploaded !== true || meta.isDemo !== false) return null;
  if (typeof meta.sourceLabel !== "string") return null;

  const errorCount = meta.errorCount;
  if (errorCount != null && errorCount !== 0) return null;

  for (const k of ["customerCount", "orderCount", "productCount", "lineItemCount"] as const) {
    const n = meta[k];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  }

  return meta as unknown as RetentionOSSourceMetadata;
}

/**
 * Best-effort revive of a serialised dataset. Returns null if JSON or shape is unusable.
 */
function parseStoredDatasetJson(rawJson: string): RetentionOSDataset | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;

  const customers = parsed.customers;
  const orders = parsed.orders;
  const products = parsed.products;
  if (!Array.isArray(customers) || !Array.isArray(orders) || !Array.isArray(products)) return null;
  if (!customers.every(isCustomerLike) || !orders.every(isOrderLike) || !products.every(isProductLike)) {
    return null;
  }

  const meta = parseMeta(parsed.meta);
  if (!meta) return null;

  if (
    meta.customerCount !== customers.length ||
    meta.orderCount !== orders.length ||
    meta.productCount !== products.length
  ) {
    return null;
  }

  const lineItemCount = (orders as { lineItems: unknown[] }[]).reduce((n, o) => n + o.lineItems.length, 0);
  if (meta.lineItemCount !== lineItemCount) return null;

  if (parsed.marketingSpend !== undefined && !Array.isArray(parsed.marketingSpend)) return null;
  if (parsed.marginAssumptions !== undefined && !isPlainObject(parsed.marginAssumptions)) return null;

  const dataset: RetentionOSDataset = {
    customers,
    orders,
    products,
    meta,
    ...(parsed.marketingSpend !== undefined
      ? { marketingSpend: parsed.marketingSpend as RetentionOSDataset["marketingSpend"] }
      : {}),
    ...(parsed.marginAssumptions !== undefined
      ? { marginAssumptions: parsed.marginAssumptions as unknown as RetentionOSDataset["marginAssumptions"] }
      : {}),
  };

  return dataset;
}

function assertSavableUpload(dataset: RetentionOSDataset): void {
  const m = dataset.meta;
  if (m.sourceType !== "uploaded_csv" || !m.isUploaded || m.isDemo) {
    throw new Error("Only uploaded CSV datasets may be stored in session.");
  }
  if (m.errorCount != null && m.errorCount !== 0) {
    throw new Error("Cannot save a dataset with import errors.");
  }
}

/**
 * Persist a valid uploaded dataset for this browser tab's session (`sessionStorage`).
 * No-op on the server. Throws on quota / private-mode failures — callers may catch.
 */
export function saveUploadedRetentionOSDataset(dataset: RetentionOSDataset): void {
  assertSavableUpload(dataset);
  if (!isBrowser()) return;
  const json = JSON.stringify(dataset);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Browser storage quota exceeded — try a smaller CSV or clear other session data."
        : "Could not write to session storage (private mode or browser blocked storage).";
    throw new Error(msg);
  }
}

/** Load the session-stored uploaded dataset, or null if missing / invalid / server. */
export function loadUploadedRetentionOSDataset(): RetentionOSDataset | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw == null || raw.length === 0) return null;
  return parseStoredDatasetJson(raw);
}

/** Remove the session-stored uploaded dataset. No-op on the server. */
export function clearUploadedRetentionOSDataset(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Summary for trust UI — null when nothing valid is in session. */
export function getUploadedDatasetSessionSummary(): RetentionOSDatasetSummary | null {
  const ds = loadUploadedRetentionOSDataset();
  return ds ? getDatasetSummary(ds) : null;
}
