/**
 * Durable active-source control / provenance (Sprint 5V-B).
 * localStorage metadata only — never stores order/customer/line payloads.
 */

import type { RetentionOSDataset, RetentionOSUploadFormat } from "./dataset-types";

export const ACTIVE_SOURCE_CONTROL_KEY = "retentionos:activeSourceControl:v1";
export const ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION = 1 as const;

export type ActiveSourceIntent = "demo" | "uploaded";

/** Non-sensitive durable control record. */
export interface ActiveSourceControlRecord {
  readonly schemaVersion: typeof ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION;
  readonly activeSource: ActiveSourceIntent;
  readonly sourceLabel?: string;
  readonly importedAt?: string;
  readonly uploadFormat?: RetentionOSUploadFormat;
  readonly customerCount?: number;
  readonly orderCount?: number;
  readonly productCount?: number;
  readonly lineItemCount?: number;
  readonly firstOrderAt?: string;
  readonly lastOrderAt?: string;
}

export type ActiveSourceControlLoadResult =
  | { readonly kind: "missing" }
  | { readonly kind: "valid"; readonly record: ActiveSourceControlRecord }
  | {
      readonly kind: "corrupt";
      /** True when activeSource=uploaded can still be read from a partially valid blob. */
      readonly uploadedIntentEstablished: boolean;
      readonly partialLabel?: string;
      readonly partialImportedAt?: string;
    };

function isBrowserLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isUploadFormat(v: unknown): v is RetentionOSUploadFormat {
  return v === "shopify_orders" || v === "retentionos_template";
}

function optionalNonNegInt(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || !Number.isInteger(v)) return undefined;
  return v;
}

function optionalIsoString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Parse control JSON. Distinguishes missing, valid, and corrupt (with optional uploaded intent). */
export function parseActiveSourceControlLoad(raw: string | null): ActiveSourceControlLoadResult {
  if (raw == null || raw.length === 0) return { kind: "missing" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { kind: "corrupt", uploadedIntentEstablished: false };
  }

  if (!isPlainObject(parsed)) {
    return { kind: "corrupt", uploadedIntentEstablished: false };
  }

  const activeSource = parsed.activeSource;
  const uploadedIntentEstablished = activeSource === "uploaded";
  const partialLabel = optionalIsoString(parsed.sourceLabel);
  const partialImportedAt = optionalIsoString(parsed.importedAt);

  if (parsed.schemaVersion !== ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION) {
    return {
      kind: "corrupt",
      uploadedIntentEstablished,
      ...(partialLabel !== undefined ? { partialLabel } : {}),
      ...(partialImportedAt !== undefined ? { partialImportedAt } : {}),
    };
  }

  if (activeSource !== "demo" && activeSource !== "uploaded") {
    return {
      kind: "corrupt",
      uploadedIntentEstablished: false,
      ...(partialLabel !== undefined ? { partialLabel } : {}),
      ...(partialImportedAt !== undefined ? { partialImportedAt } : {}),
    };
  }

  const uploadFormat = parsed.uploadFormat;
  if (uploadFormat !== undefined && !isUploadFormat(uploadFormat)) {
    return {
      kind: "corrupt",
      uploadedIntentEstablished,
      ...(partialLabel !== undefined ? { partialLabel } : {}),
      ...(partialImportedAt !== undefined ? { partialImportedAt } : {}),
    };
  }

  const record: ActiveSourceControlRecord = {
    schemaVersion: ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION,
    activeSource,
    ...(partialLabel !== undefined ? { sourceLabel: partialLabel } : {}),
    ...(partialImportedAt !== undefined ? { importedAt: partialImportedAt } : {}),
    ...(isUploadFormat(uploadFormat) ? { uploadFormat } : {}),
    ...(optionalNonNegInt(parsed.customerCount) !== undefined
      ? { customerCount: optionalNonNegInt(parsed.customerCount) }
      : {}),
    ...(optionalNonNegInt(parsed.orderCount) !== undefined
      ? { orderCount: optionalNonNegInt(parsed.orderCount) }
      : {}),
    ...(optionalNonNegInt(parsed.productCount) !== undefined
      ? { productCount: optionalNonNegInt(parsed.productCount) }
      : {}),
    ...(optionalNonNegInt(parsed.lineItemCount) !== undefined
      ? { lineItemCount: optionalNonNegInt(parsed.lineItemCount) }
      : {}),
    ...(optionalIsoString(parsed.firstOrderAt) !== undefined
      ? { firstOrderAt: optionalIsoString(parsed.firstOrderAt) }
      : {}),
    ...(optionalIsoString(parsed.lastOrderAt) !== undefined
      ? { lastOrderAt: optionalIsoString(parsed.lastOrderAt) }
      : {}),
  };

  return { kind: "valid", record };
}

export function buildControlFromUploadedDataset(dataset: RetentionOSDataset): ActiveSourceControlRecord {
  const m = dataset.meta;
  return {
    schemaVersion: ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION,
    activeSource: "uploaded",
    sourceLabel: m.sourceLabel,
    ...(m.importedAt !== undefined ? { importedAt: m.importedAt } : {}),
    ...(m.uploadFormat !== undefined ? { uploadFormat: m.uploadFormat } : {}),
    customerCount: m.customerCount,
    orderCount: m.orderCount,
    productCount: m.productCount,
    lineItemCount: m.lineItemCount,
    ...(m.firstOrderAt !== undefined ? { firstOrderAt: m.firstOrderAt } : {}),
    ...(m.lastOrderAt !== undefined ? { lastOrderAt: m.lastOrderAt } : {}),
  };
}

export function buildDemoActiveSourceControl(): ActiveSourceControlRecord {
  return {
    schemaVersion: ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION,
    activeSource: "demo",
  };
}

export function loadActiveSourceControl(): ActiveSourceControlLoadResult {
  if (!isBrowserLocalStorage()) return { kind: "missing" };
  try {
    return parseActiveSourceControlLoad(window.localStorage.getItem(ACTIVE_SOURCE_CONTROL_KEY));
  } catch {
    return { kind: "corrupt", uploadedIntentEstablished: false };
  }
}

export function saveActiveSourceControl(record: ActiveSourceControlRecord): void {
  if (!isBrowserLocalStorage()) return;
  if (record.schemaVersion !== ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION) {
    throw new Error("Unsupported active-source control schemaVersion.");
  }
  try {
    window.localStorage.setItem(ACTIVE_SOURCE_CONTROL_KEY, JSON.stringify(record));
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Browser storage quota exceeded while saving source control."
        : "Could not write active-source control to local storage.";
    throw new Error(msg);
  }
}

/** Reset durable control to explicit demo. Never throws. */
export function resetActiveSourceControlToDemo(): void {
  if (!isBrowserLocalStorage()) return;
  try {
    window.localStorage.setItem(
      ACTIVE_SOURCE_CONTROL_KEY,
      JSON.stringify(buildDemoActiveSourceControl()),
    );
  } catch {
    try {
      window.localStorage.removeItem(ACTIVE_SOURCE_CONTROL_KEY);
    } catch {
      /* ignore */
    }
  }
}
