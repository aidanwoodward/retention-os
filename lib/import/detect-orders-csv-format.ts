/**
 * Detect supported orders CSV formats before routing to a single importer (Sprint 4I-C).
 *
 * Fail-closed: unsupported headers never fall through to a second parser.
 */

import { COMBINED_ORDER_CSV_COLUMNS, COMBINED_ORDER_CSV_REQUIRED_COLUMNS } from "./csv-schema";
import type { CombineOrderCsvImportResult } from "./import-types";
import { importCombinedOrderCsvFromText, parseCsvTextToMatrix } from "./normalise-orders";
import { normaliseShopifyHeaderName } from "./shopify/shopify-orders-helpers";
import { importShopifyOrdersCsvFromText } from "./shopify/import-shopify-orders-csv";
import {
  SHOPIFY_ORDERS_ORDER_ID_HEADERS,
  SHOPIFY_ORDERS_REQUIRED_HEADERS,
} from "./shopify/shopify-orders-schema";

export type OrdersCsvImportFormat = "shopify_orders" | "retentionos_template" | "unsupported";

export interface OrdersCsvImportOutcome {
  readonly format: OrdersCsvImportFormat;
  readonly result: CombineOrderCsvImportResult;
}

const UNSUPPORTED_ORDERS_MESSAGE =
  "This file is not a supported orders CSV. Export Orders from Shopify Admin (Orders → Export → Orders), or use the RetentionOS combined template (docs/sample-retentionos-orders.csv).";

function headerKeysFromFirstRow(csvText: string): Set<string> {
  const matrix = parseCsvTextToMatrix(csvText);
  if (matrix.length === 0) return new Set();
  const keys = new Set<string>();
  for (const cell of matrix[0]) {
    const name = normaliseShopifyHeaderName(cell);
    if (name) keys.add(name);
  }
  return keys;
}

function matchesShopifyOrdersExport(headers: Set<string>): boolean {
  for (const req of SHOPIFY_ORDERS_REQUIRED_HEADERS) {
    if (!headers.has(normaliseShopifyHeaderName(req))) return false;
  }
  return SHOPIFY_ORDERS_ORDER_ID_HEADERS.some((h) => headers.has(normaliseShopifyHeaderName(h)));
}

function matchesRetentionOsTemplate(headers: Set<string>): boolean {
  for (const req of COMBINED_ORDER_CSV_REQUIRED_COLUMNS) {
    if (!headers.has(req)) return false;
  }
  const allowed = new Set<string>(COMBINED_ORDER_CSV_COLUMNS as unknown as string[]);
  for (const key of headers) {
    if (!allowed.has(key)) return false;
  }
  return true;
}

/** Classify CSV header row — Shopify primary, RetentionOS template secondary. */
export function detectOrdersCsvImportFormat(csvText: string): OrdersCsvImportFormat {
  const headers = headerKeysFromFirstRow(csvText);
  if (headers.size === 0) return "unsupported";
  if (matchesShopifyOrdersExport(headers)) return "shopify_orders";
  if (matchesRetentionOsTemplate(headers)) return "retentionos_template";
  return "unsupported";
}

function buildUnsupportedOrdersCsvImportResult(): CombineOrderCsvImportResult {
  return {
    customers: [],
    orders: [],
    products: [],
    errors: [
      {
        severity: "error",
        code: "UNSUPPORTED_ORDERS_CSV_FORMAT",
        message: UNSUPPORTED_ORDERS_MESSAGE,
      },
    ],
    warnings: [],
    summary: {
      rawRowCount: 0,
      customerCount: 0,
      orderCount: 0,
      lineItemCount: 0,
      productCount: 0,
      errorCount: 1,
      warningCount: 0,
    },
  };
}

/** Detect format and import via exactly one pipeline — never tries both importers. */
export function importOrdersCsvFromText(csvText: string): OrdersCsvImportOutcome {
  const format = detectOrdersCsvImportFormat(csvText);
  switch (format) {
    case "shopify_orders":
      return { format, result: importShopifyOrdersCsvFromText(csvText) };
    case "retentionos_template":
      return { format, result: importCombinedOrderCsvFromText(csvText) };
    case "unsupported":
      return { format, result: buildUnsupportedOrdersCsvImportResult() };
  }
}

/** Compact unlock notes for the /data upload preview (no metric engine changes). */
export function buildOrdersImportUnlockNotes(
  result: CombineOrderCsvImportResult,
  format: OrdersCsvImportFormat,
): readonly string[] {
  if (format === "unsupported" || result.errors.length > 0) return [];
  const notes: string[] = [
    "After save: Dashboard, Cohorts, Retention, LTV, and Insights use net merchandise revenue from this upload.",
  ];
  if (result.summary.lineItemCount > 0) {
    notes.push("Products: unlocked when line items carry product identifiers.");
  }
  notes.push("Acquisition (CAC / payback): locked until marketing spend is added on this page.");
  if (format === "shopify_orders") {
    notes.push("Contribution LTV: configure margin % below after save (Shopify exports omit contribution dollars).");
  } else {
    notes.push(
      "Contribution LTV: unlocked when every order row includes contribution_margin, or after margin % is saved.",
    );
  }
  return notes;
}

export function ordersCsvFormatLabel(format: OrdersCsvImportFormat): string {
  switch (format) {
    case "shopify_orders":
      return "Shopify Orders CSV";
    case "retentionos_template":
      return "RetentionOS template";
    case "unsupported":
      return "Unsupported format";
  }
}
