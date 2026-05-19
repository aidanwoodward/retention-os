/**
 * Parse and normalise marketing spend CSV text into `MarketingSpendImported[]`.
 *
 * **Duplicates:** rows with the same normalised month + channel have spend **summed** and a warning is emitted
 * (safer than failing on messy exports; operators still see that consolidation happened).
 *
 * **Unknown columns:** lenient — extra headers produce a warning per unknown header name and are ignored.
 *
 * **Partial rows:** rows with validation errors are skipped and listed in `errors`; valid rows are still imported and aggregated.
 */

import {
  MARKETING_SPEND_CSV_COLUMNS,
  MARKETING_SPEND_CSV_REQUIRED_COLUMNS,
  type MarketingSpendCsvColumn,
} from "./marketing-spend-schema";
import type {
  MarketingSpendCsvImportResult,
  MarketingSpendCsvImportSummary,
  MarketingSpendImported,
} from "./marketing-spend-types";
import type { CsvImportIssue } from "./import-types";
import { parseCsvTextToMatrix } from "./normalise-orders";
import { parseMoneyCell, pushError, pushWarning } from "./validate-csv";

function dataRowNum(matrixRowIndex: number): number {
  return matrixRowIndex;
}

function normaliseHeaderName(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Normalise month cell to `YYYY-MM` (UTC interpretation for date strings). */
export function normaliseMarketingSpendMonthKey(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const ym = /^(\d{4})-(\d{2})$/.exec(t);
  if (ym) {
    const mo = Number(ym[2]);
    if (mo >= 1 && mo <= 12) return `${ym[1]}-${String(mo).padStart(2, "0")}`;
    return null;
  }

  const ymPrefix = /^(\d{4})-(\d{2})-\d{2}/.exec(t);
  if (ymPrefix) {
    const mo = Number(ymPrefix[2]);
    if (mo >= 1 && mo <= 12) return `${ymPrefix[1]}-${String(mo).padStart(2, "0")}`;
  }

  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Normalise a marketing spend bucket (`YYYY-MM`, `YYYY-MM-DD`, or parseable date) to the cohort key `YYYY-MM`.
 * Use when aligning spend rows to first-order cohort months.
 */
export function spendBucketToCohortMonthKey(raw: string): string | null {
  return normaliseMarketingSpendMonthKey(raw);
}

interface HeaderParseOk {
  ok: true;
  colIndex: Record<string, number>;
}

interface HeaderParseFail {
  ok: false;
  issues: CsvImportIssue[];
}

function parseHeaderRow(cells: string[], warnings: CsvImportIssue[]): HeaderParseOk | HeaderParseFail {
  const localFatal: CsvImportIssue[] = [];
  const colIndex: Record<string, number> = {};
  const seen = new Set<string>();

  for (let idx = 0; idx < cells.length; idx++) {
    const raw = cells[idx] ?? "";
    const name = normaliseHeaderName(raw);
    if (!name) continue;
    if (seen.has(name)) {
      pushError(localFatal, "HEADER_DUPLICATE", `Duplicate header column "${raw}".`);
      continue;
    }
    seen.add(name);
    colIndex[name] = idx;
  }

  for (const req of MARKETING_SPEND_CSV_REQUIRED_COLUMNS) {
    if (colIndex[req] === undefined) {
      pushError(localFatal, "HEADER_MISSING_REQUIRED", `Missing required column "${req}" in header row.`);
    }
  }

  if (localFatal.length > 0) {
    return { ok: false, issues: localFatal };
  }

  const allowed = new Set<string>(MARKETING_SPEND_CSV_COLUMNS as unknown as string[]);
  for (const key of Object.keys(colIndex)) {
    if (!allowed.has(key)) {
      pushWarning(warnings, "HEADER_UNKNOWN_COLUMN_IGNORED", `Unknown column "${key}" — ignored for this release.`);
    }
  }

  return { ok: true, colIndex };
}

function cellAt(cells: string[], colIndex: Record<string, number>, key: string, defaultValue = ""): string {
  const i = colIndex[key];
  if (i === undefined) return defaultValue;
  return cells[i] ?? defaultValue;
}

interface ValidatedRow {
  readonly row: number;
  readonly monthKey: string;
  readonly channel: string;
  readonly spend: number;
  readonly platform?: string;
  readonly campaign?: string;
  readonly country?: string;
  readonly objective?: string;
  readonly ad_account?: string;
}

function buildSummary(
  rawRowCount: number,
  marketingSpend: readonly MarketingSpendImported[],
  errors: readonly CsvImportIssue[],
  warnings: readonly CsvImportIssue[],
): MarketingSpendCsvImportSummary {
  const months = new Set<string>();
  const channels = new Set<string>();
  let totalSpend = 0;
  for (const r of marketingSpend) {
    months.add(r.month);
    if (r.channel) channels.add(r.channel);
    totalSpend += r.spend;
  }
  const sortedMonths = [...months].sort();
  return {
    rawRowCount,
    spendRowCount: marketingSpend.length,
    monthCount: months.size,
    channelCount: channels.size,
    totalSpend,
    firstMonth: sortedMonths[0],
    lastMonth: sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : undefined,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}

export interface ParseMarketingSpendCsvTextResult {
  readonly validatedRows: ValidatedRow[];
  readonly errors: CsvImportIssue[];
  readonly warnings: CsvImportIssue[];
  readonly rawRowCount: number;
}

/**
 * Parse CSV text into per-row validated rows (no aggregation).
 * Fatal header issues return empty validated rows and populate `errors`.
 */
export function parseMarketingSpendCsvText(text: string): ParseMarketingSpendCsvTextResult {
  const errors: CsvImportIssue[] = [];
  const warnings: CsvImportIssue[] = [];
  const matrix = parseCsvTextToMatrix(text);
  if (matrix.length === 0) {
    pushError(errors, "CSV_EMPTY", "CSV has no rows.");
    return { validatedRows: [], errors, warnings, rawRowCount: 0 };
  }

  const header = parseHeaderRow(matrix[0], warnings);
  if (!header.ok) {
    errors.push(...header.issues);
    return { validatedRows: [], errors, warnings, rawRowCount: 0 };
  }

  const { colIndex } = header;
  const width = matrix[0].length;
  const validatedRows: ValidatedRow[] = [];
  let rawRowCount = 0;

  const optionalKeys: MarketingSpendCsvColumn[] = ["platform", "campaign", "country", "objective", "ad_account"];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const rowLabel = dataRowNum(r);
    if (cells.length !== width) {
      pushError(errors, "ROW_WIDTH_MISMATCH", `Expected ${width} columns; found ${cells.length}.`, rowLabel);
      continue;
    }

    const allEmpty = cells.every((c) => c.trim() === "");
    if (allEmpty) {
      pushWarning(warnings, "ROW_SKIPPED_BLANK", "Skipped blank row.", rowLabel);
      continue;
    }

    rawRowCount += 1;

    const monthRaw = cellAt(cells, colIndex, "month");
    const monthKey = normaliseMarketingSpendMonthKey(monthRaw);
    if (!monthKey) {
      pushError(
        errors,
        "INVALID_MONTH",
        monthRaw.trim() === "" ? "Missing month." : `Invalid month "${monthRaw.trim()}". Use YYYY-MM or a parseable date.`,
        rowLabel,
      );
      continue;
    }

    const channelRaw = cellAt(cells, colIndex, "channel").trim();
    if (!channelRaw) {
      pushError(errors, "MISSING_CHANNEL", "Missing channel.", rowLabel);
      continue;
    }

    const spendRaw = cellAt(cells, colIndex, "spend");
    if (spendRaw.trim() === "") {
      pushError(errors, "MISSING_SPEND", "Missing spend.", rowLabel);
      continue;
    }
    const spend = parseMoneyCell(spendRaw);
    if (!Number.isFinite(spend)) {
      pushError(errors, "INVALID_SPEND", `Invalid spend "${spendRaw.trim()}".`, rowLabel);
      continue;
    }
    if (spend < 0) {
      pushError(errors, "NEGATIVE_SPEND", `Negative spend (${spend}) is not allowed.`, rowLabel);
      continue;
    }

    const ext: {
      platform?: string;
      campaign?: string;
      country?: string;
      objective?: string;
      ad_account?: string;
    } = {};
    for (const k of optionalKeys) {
      const v = cellAt(cells, colIndex, k, "").trim();
      if (!v) continue;
      if (k === "platform") ext.platform = v;
      if (k === "campaign") ext.campaign = v;
      if (k === "country") ext.country = v;
      if (k === "objective") ext.objective = v;
      if (k === "ad_account") ext.ad_account = v;
    }

    validatedRows.push({
      row: rowLabel,
      monthKey,
      channel: channelRaw,
      spend,
      ...ext,
    });
  }

  return { validatedRows, errors, warnings, rawRowCount };
}

function aggregateRows(rows: readonly ValidatedRow[], warnings: CsvImportIssue[]): MarketingSpendImported[] {
  const map = new Map<string, { spend: number; rows: number[]; sample: ValidatedRow }>();

  for (const row of rows) {
    const key = `${row.monthKey}\t${row.channel}`;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { spend: row.spend, rows: [row.row], sample: row });
    } else {
      cur.spend += row.spend;
      cur.rows.push(row.row);
    }
  }

  const out: MarketingSpendImported[] = [];
  for (const [, agg] of map) {
    if (agg.rows.length > 1) {
      const sorted = [...new Set(agg.rows)].sort((a, b) => a - b);
      pushWarning(
        warnings,
        "DUPLICATE_MONTH_CHANNEL_AGGREGATED",
        `Aggregated ${agg.rows.length} rows for month ${agg.sample.monthKey} / channel "${agg.sample.channel}" into one spend total (rows: ${sorted.join(", ")}).`,
      );
    }
    const s = agg.sample;
    out.push({
      month: s.monthKey,
      channel: s.channel,
      spend: agg.spend,
      ...(s.platform ? { platform: s.platform } : {}),
      ...(s.campaign ? { campaign: s.campaign } : {}),
      ...(s.country ? { country: s.country } : {}),
      ...(s.objective ? { objective: s.objective } : {}),
      ...(s.ad_account ? { ad_account: s.ad_account } : {}),
    });
  }

  out.sort((a, b) => (a.month === b.month ? a.channel.localeCompare(b.channel) : a.month.localeCompare(b.month)));
  return out;
}

/** Full pipeline: parse, validate, aggregate — preview-safe, no I/O, no persistence. */
export function importMarketingSpendCsvFromText(text: string): MarketingSpendCsvImportResult {
  const { validatedRows, errors, warnings, rawRowCount } = parseMarketingSpendCsvText(text);
  const aggregateWarnings: CsvImportIssue[] = [...warnings];
  const marketingSpend =
    validatedRows.length > 0 ? aggregateRows(validatedRows, aggregateWarnings) : [];

  const summary = buildSummary(rawRowCount, marketingSpend, errors, aggregateWarnings);

  return {
    marketingSpend,
    errors,
    warnings: aggregateWarnings,
    summary,
  };
}
