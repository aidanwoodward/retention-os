/**
 * Types for marketing spend CSV → canonical `MarketingSpend` shapes.
 */

import type { MarketingSpend } from "../types";
import type { CsvImportIssue } from "./import-types";

/** Import row aligned with `MarketingSpend`; optional attribution dimensions when columns exist. */
export interface MarketingSpendImported extends MarketingSpend {
  readonly month: string;
  /** Required in the spend CSV contract; populated on every successful row. */
  readonly channel: string;
  readonly spend: number;
  readonly platform?: string;
  readonly campaign?: string;
  readonly country?: string;
  readonly objective?: string;
  readonly ad_account?: string;
}

export interface MarketingSpendCsvImportSummary {
  readonly rawRowCount: number;
  /** Row count after validation and month×channel aggregation. */
  readonly spendRowCount: number;
  readonly monthCount: number;
  readonly channelCount: number;
  readonly totalSpend: number;
  /** YYYY-MM — earliest month among accepted rows. */
  readonly firstMonth?: string;
  /** YYYY-MM — latest month among accepted rows. */
  readonly lastMonth?: string;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface MarketingSpendCsvImportResult {
  readonly marketingSpend: MarketingSpendImported[];
  readonly warnings: CsvImportIssue[];
  readonly errors: CsvImportIssue[];
  readonly summary: MarketingSpendCsvImportSummary;
}
