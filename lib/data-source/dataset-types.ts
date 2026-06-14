/**
 * Shared command-centre dataset shape for demo fixtures and future uploaded CSV (Sprint 3D).
 *
 * This module is types + small guards only — no persistence, no routing, no changes to `getDemoDataset()` internals.
 */

import type { Customer, MarginAssumptions, Order, Product } from "../types";
import type { MarketingSpend } from "../types/marketing";

export type RetentionOSSourceType = "demo" | "uploaded_csv";

/** Upload contract used for `/data` ingestion (Sprint 4I-C). Omitted on demo and legacy session blobs. */
export type RetentionOSUploadFormat = "shopify_orders" | "retentionos_template";

/** Provenance and rollups for operator trust surfaces and future source switching. */
export interface RetentionOSSourceMetadata {
  readonly sourceType: RetentionOSSourceType;
  /** Which orders CSV contract produced this upload, when known. */
  readonly uploadFormat?: RetentionOSUploadFormat;
  /** Human-readable label (e.g. demo brand or "Uploaded CSV"). */
  readonly sourceLabel: string;
  readonly isDemo: boolean;
  readonly isUploaded: boolean;
  /** When an upload was accepted (ISO 8601), if known — browser or server clock. */
  readonly importedAt?: string;
  /** Earliest order timestamp in the dataset window (ISO 8601). */
  readonly firstOrderAt?: string;
  /** Latest order timestamp in the dataset window (ISO 8601). */
  readonly lastOrderAt?: string;
  readonly customerCount: number;
  readonly orderCount: number;
  readonly productCount: number;
  readonly lineItemCount: number;
  /** Import pipeline warnings count (uploaded only); optional for demo. */
  readonly warningCount?: number;
  /** Import pipeline errors count — expect 0 when a dataset is materialised from a successful import. */
  readonly errorCount?: number;
}

/**
 * Single shape consumed by `/lib/metrics` and `/lib/insights` in future wiring.
 * Optional `marketingSpend` / `marginAssumptions` mirror `DemoDataset`; uploads omit both unless added later.
 */
export interface RetentionOSDataset {
  readonly customers: readonly Customer[];
  readonly orders: readonly Order[];
  readonly products: readonly Product[];
  readonly marketingSpend?: readonly MarketingSpend[];
  readonly marginAssumptions?: MarginAssumptions;
  readonly meta: RetentionOSSourceMetadata;
}

/** Convenience view combining metadata with common capability flags. */
export interface RetentionOSDatasetSummary extends RetentionOSSourceMetadata {
  readonly hasMarginAssumptions: boolean;
  readonly hasMarketingSpend: boolean;
  readonly hasFullOrderContributionMargin: boolean;
}
