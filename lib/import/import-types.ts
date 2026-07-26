/**
 * Types for the MVP CSV → canonical model import pipeline.
 *
 * This layer is intentionally UI-agnostic: there is no upload widget, persistence, or API wiring yet.
 * Callers (future Sprint 3+) can parse a CSV file into `RawOrderLineCsvRow[]` or use `parseCombinedOrderCsvText`.
 */

import type { Customer, Order, Product } from "../types";

/** `error` is fatal (fail-closed). `limitation` / `notice` / `warning` keep valid rows. */
export type CsvImportSeverity = "error" | "warning" | "limitation" | "notice";

/** Structured validation / reconciliation message with optional 1-based human row index (data rows only; header is row 0). */
export interface CsvImportIssue {
  readonly severity: CsvImportSeverity;
  readonly code: string;
  readonly message: string;
  /** 1-based index among data rows (first data row after header = 1). */
  readonly row?: number;
}

/**
 * One logical line of the combined order + line-item CSV (one exported spreadsheet row).
 * String fields hold raw cell text before numeric/date coercion.
 */
export interface RawOrderLineCsvRow {
  readonly order_id: string;
  readonly customer_id: string;
  readonly ordered_at: string;
  readonly gross_revenue: string;
  readonly discounts: string;
  readonly refunds: string;
  /** Empty string if absent in source. */
  readonly contribution_margin: string;
  /** Empty string if absent in source. */
  readonly channel: string;
  readonly product_id: string;
  readonly product_name: string;
  /** Empty string if absent in source. */
  readonly sku: string;
  readonly quantity: string;
  readonly unit_price: string;
  readonly line_total: string;
}

export interface CombineOrderCsvImportSummary {
  readonly rawRowCount: number;
  readonly customerCount: number;
  readonly orderCount: number;
  readonly lineItemCount: number;
  readonly productCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  /** ISO 8601 — earliest `orderedAt` across accepted orders; omitted if no orders. */
  readonly firstOrderAt?: string;
  /** ISO 8601 — latest `orderedAt` across accepted orders; omitted if no orders. */
  readonly lastOrderAt?: string;
}

export interface CombineOrderCsvImportResult {
  readonly customers: Customer[];
  readonly orders: Order[];
  readonly products: Product[];
  readonly warnings: CsvImportIssue[];
  readonly errors: CsvImportIssue[];
  readonly summary: CombineOrderCsvImportSummary;
}
