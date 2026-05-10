/**
 * Canonical CSV onboarding for RetentionOS (Sprint 3A).
 *
 * **Not wired to UI, APIs, or persistence.** Use these helpers when implementing upload flows:
 * `importCombinedOrderCsvFromText` → `Customer[]` / `Order[]` / `Product[]` compatible with `/lib/metrics`.
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
