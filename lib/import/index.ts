/**
 * Canonical CSV onboarding for RetentionOS (Sprint 3A+).
 *
 * `importCombinedOrderCsvFromText` produces `Customer[]` / `Order[]` / `Product[]` compatible with `/lib/metrics`.
 * `buildImportedCsvMetricPreview` runs those shapes through the metric engine for **UI preview only** (no persistence).
 */

export type {
  CombineOrderCsvImportResult,
  CombineOrderCsvImportSummary,
  CsvImportIssue,
  CsvImportSeverity,
  RawOrderLineCsvRow,
} from "./import-types";

export {
  COMBINED_ORDER_CSV_COLUMNS,
  COMBINED_ORDER_CSV_FIELD_HELP,
  COMBINED_ORDER_CSV_REQUIRED_COLUMNS,
  type CombinedOrderCsvColumn,
} from "./csv-schema";

export { MONEY_EPSILON, moneyClose, parseMoneyCell, parseOrderedAtIso, parseQuantityCell } from "./validate-csv";

export {
  importCombinedOrderCsvFromText,
  normaliseCombinedOrderCsv,
  parseCombinedOrderCsvText,
  parseCsvTextToMatrix,
  type ParseCombinedCsvTextResult,
} from "./normalise-orders";

export { buildImportedCsvMetricPreview, type ImportedCsvMetricPreview } from "./metric-preview";

export {
  MARKETING_SPEND_CSV_COLUMNS,
  MARKETING_SPEND_CSV_FIELD_HELP,
  MARKETING_SPEND_CSV_REQUIRED_COLUMNS,
  type MarketingSpendCsvColumn,
} from "./marketing-spend-schema";

export type {
  MarketingSpendCsvImportResult,
  MarketingSpendCsvImportSummary,
  MarketingSpendImported,
} from "./marketing-spend-types";

export {
  importMarketingSpendCsvFromText,
  normaliseMarketingSpendMonthKey,
  parseMarketingSpendCsvText,
  type ParseMarketingSpendCsvTextResult,
} from "./normalise-marketing-spend";
