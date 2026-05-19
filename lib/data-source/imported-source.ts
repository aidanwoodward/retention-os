/**
 * Maps a successful CSV import result into `RetentionOSDataset`.
 *
 * **Fail-closed:** if `importResult.errors.length > 0`, returns `{ ok: false, ... }` (no throw) so callers can branch safely.
 * Does not fabricate `marketingSpend`, `marginAssumptions`, or order-level margins.
 */

import type {
  CombineOrderCsvImportResult,
  CombineOrderCsvImportSummary,
  CsvImportIssue,
} from "../import";
import type { RetentionOSDataset, RetentionOSSourceMetadata } from "./dataset-types";
import { countLineItems, inferOrderWindowFromOrders } from "./dataset-helpers";

export interface BuildImportedRetentionOSDatasetOptions {
  /** ISO 8601 instant when the file was accepted (e.g. `new Date().toISOString()`). */
  readonly importedAt?: string;
  /** Override default uploaded label. */
  readonly sourceLabel?: string;
}

export type ImportedDatasetBuildFailure = {
  readonly ok: false;
  readonly code: "IMPORT_HAS_ERRORS";
  readonly errors: readonly CsvImportIssue[];
  readonly warnings: readonly CsvImportIssue[];
  readonly summary: CombineOrderCsvImportSummary;
};

export type ImportedDatasetBuildSuccess = {
  readonly ok: true;
  readonly dataset: RetentionOSDataset;
};

export type ImportedDatasetBuildResult = ImportedDatasetBuildFailure | ImportedDatasetBuildSuccess;

/**
 * Materialise `RetentionOSDataset` only when the import pipeline reported zero errors.
 */
export function buildImportedRetentionOSDataset(
  importResult: CombineOrderCsvImportResult,
  options?: BuildImportedRetentionOSDatasetOptions,
): ImportedDatasetBuildResult {
  if (importResult.errors.length > 0) {
    return {
      ok: false,
      code: "IMPORT_HAS_ERRORS",
      errors: importResult.errors,
      warnings: importResult.warnings,
      summary: importResult.summary,
    };
  }

  const { customers, orders, products, warnings, summary } = importResult;
  const lineItemCount = countLineItems(orders);
  const windowFromOrders = inferOrderWindowFromOrders(orders);
  const firstOrderAt = summary.firstOrderAt ?? windowFromOrders.firstOrderAt;
  const lastOrderAt = summary.lastOrderAt ?? windowFromOrders.lastOrderAt;

  const meta: RetentionOSSourceMetadata = {
    sourceType: "uploaded_csv",
    sourceLabel: options?.sourceLabel ?? "Uploaded CSV (combined order + line items)",
    isDemo: false,
    isUploaded: true,
    importedAt: options?.importedAt,
    firstOrderAt,
    lastOrderAt,
    customerCount: customers.length,
    orderCount: orders.length,
    productCount: products.length,
    lineItemCount,
    warningCount: warnings.length,
    errorCount: 0,
  };

  return {
    ok: true,
    dataset: {
      customers,
      orders,
      products,
      meta,
    },
  };
}
