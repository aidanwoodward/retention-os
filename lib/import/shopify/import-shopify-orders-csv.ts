/**
 * Shopify Orders CSV → RetentionOS canonical import (Sprint 4I-B).
 *
 * Parses Shopify export, maps to `RawOrderLineCsvRow[]`, then delegates to `normaliseCombinedOrderCsv`.
 */

import type { CombineOrderCsvImportResult, CsvImportIssue } from "../import-types";
import { normaliseCombinedOrderCsv } from "../normalise-orders";
import { pushError } from "../validate-csv";
import { parseShopifyOrdersCsvText } from "./parse-shopify-orders-csv";

function emptySummary(errors: CsvImportIssue[], warnings: CsvImportIssue[]) {
  return {
    rawRowCount: 0,
    customerCount: 0,
    orderCount: 0,
    lineItemCount: 0,
    productCount: 0,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}

/**
 * Parse + normalise Shopify Orders CSV in one call. Fails closed when parse or business validation errors exist.
 */
export function importShopifyOrdersCsvFromText(csvText: string): CombineOrderCsvImportResult {
  const pr = parseShopifyOrdersCsvText(csvText);
  const mergeErrors: CsvImportIssue[] = [...pr.errors];
  const mergeWarnings: CsvImportIssue[] = [...pr.warnings];

  if (mergeErrors.length > 0) {
    return {
      customers: [],
      orders: [],
      products: [],
      errors: mergeErrors,
      warnings: mergeWarnings,
      summary: emptySummary(mergeErrors, mergeWarnings),
    };
  }

  if (pr.rows.length === 0) {
    pushError(mergeErrors, "NO_DATA_ROWS", "No data rows after header.");
    return {
      customers: [],
      orders: [],
      products: [],
      errors: mergeErrors,
      warnings: mergeWarnings,
      summary: emptySummary(mergeErrors, mergeWarnings),
    };
  }

  const norm = normaliseCombinedOrderCsv(pr.rows, pr.rows.length);
  const errors = [...mergeErrors, ...norm.errors];
  const warnings = [...mergeWarnings, ...norm.warnings];
  const failed = errors.length > 0;

  return {
    customers: failed ? [] : norm.customers,
    orders: failed ? [] : norm.orders,
    products: failed ? [] : norm.products,
    errors,
    warnings,
    summary: failed
      ? { ...norm.summary, errorCount: errors.length, warningCount: warnings.length }
      : norm.summary,
  };
}
