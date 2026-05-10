/**
 * Normalise combined order + line-item CSV rows into canonical `Customer`, `Order`, `OrderLineItem`, `Product`.
 *
 * Sprint 3A only: no `getDemoDataset()` mutation, no `/lib/metrics` changes, no UI upload.
 * Output is ready for a future adapter that swaps `getDemoDataset()` for imported data.
 */

import type { Customer, Order, OrderLineItem, Product } from "../types";
import {
  COMBINED_ORDER_CSV_COLUMNS,
  COMBINED_ORDER_CSV_REQUIRED_COLUMNS,
} from "./csv-schema";
import type {
  CombineOrderCsvImportResult,
  CombineOrderCsvImportSummary,
  CsvImportIssue,
  RawOrderLineCsvRow,
} from "./import-types";
import {
  MONEY_EPSILON,
  moneyClose,
  parseMoneyCell,
  parseOrderedAtIso,
  parseQuantityCell,
  pushError,
  pushWarning,
} from "./validate-csv";

function dataRowNum(matrixRowIndex: number): number {
  return matrixRowIndex;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

export function parseCsvTextToMatrix(text: string): string[][] {
  const stripped = text.replace(/^\uFEFF/, "");
  const lines = stripped.split(/\r?\n/).filter((line) => line.length > 0);
  return lines.map((line) => parseCsvLine(line));
}

function normaliseHeaderName(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, "_");
}

interface HeaderParseOk {
  ok: true;
  colIndex: Record<string, number>;
}

interface HeaderParseFail {
  ok: false;
  issues: CsvImportIssue[];
}

function parseHeaderRow(cells: string[]): HeaderParseOk | HeaderParseFail {
  const issues: CsvImportIssue[] = [];
  const colIndex: Record<string, number> = {};
  const seen = new Set<string>();

  cells.forEach((raw, idx) => {
    const name = normaliseHeaderName(raw);
    if (!name) return;
    if (seen.has(name)) {
      pushError(issues, "HEADER_DUPLICATE", `Duplicate header column "${raw}".`);
      return;
    }
    seen.add(name);
    colIndex[name] = idx;
  });

  for (const req of COMBINED_ORDER_CSV_REQUIRED_COLUMNS) {
    if (colIndex[req] === undefined) {
      pushError(issues, "HEADER_MISSING_REQUIRED", `Missing required column "${req}" in header row.`);
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const allowed = new Set<string>(COMBINED_ORDER_CSV_COLUMNS as unknown as string[]);
  for (const key of Object.keys(colIndex)) {
    if (!allowed.has(key)) {
      pushError(issues, "HEADER_UNKNOWN_COLUMN", `Unknown column "${key}" — remove or rename to match the contract.`);
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  return { ok: true, colIndex };
}

function cellAt(
  cells: string[],
  colIndex: Record<string, number>,
  key: string,
  defaultValue = "",
): string {
  const i = colIndex[key];
  if (i === undefined) return defaultValue;
  return cells[i] ?? defaultValue;
}

export interface ParseCombinedCsvTextResult {
  readonly rows: RawOrderLineCsvRow[];
  readonly errors: CsvImportIssue[];
  readonly warnings: CsvImportIssue[];
}

/**
 * Parse raw spreadsheet text into row objects. Validates header and row width.
 * Does not validate business rules — use `normaliseCombinedOrderCsv` next.
 */
export function parseCombinedOrderCsvText(text: string): ParseCombinedCsvTextResult {
  const errors: CsvImportIssue[] = [];
  const warnings: CsvImportIssue[] = [];
  const matrix = parseCsvTextToMatrix(text);
  if (matrix.length === 0) {
    pushError(errors, "CSV_EMPTY", "CSV has no rows.");
    return { rows: [], errors, warnings };
  }

  const header = parseHeaderRow(matrix[0]);
  if (!header.ok) {
    return { rows: [], errors: header.issues, warnings };
  }

  const { colIndex } = header;
  const width = matrix[0].length;
  const rows: RawOrderLineCsvRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const rowLabel = dataRowNum(r);
    if (cells.length !== width) {
      pushError(
        errors,
        "ROW_WIDTH_MISMATCH",
        `Expected ${width} columns; found ${cells.length}.`,
        rowLabel,
      );
      continue;
    }

    const allEmpty = cells.every((c) => c.trim() === "");
    if (allEmpty) {
      pushWarning(warnings, "ROW_SKIPPED_BLANK", "Skipped blank row.", rowLabel);
      continue;
    }

    rows.push({
      order_id: cellAt(cells, colIndex, "order_id"),
      customer_id: cellAt(cells, colIndex, "customer_id"),
      ordered_at: cellAt(cells, colIndex, "ordered_at"),
      gross_revenue: cellAt(cells, colIndex, "gross_revenue"),
      discounts: cellAt(cells, colIndex, "discounts"),
      refunds: cellAt(cells, colIndex, "refunds"),
      contribution_margin: cellAt(cells, colIndex, "contribution_margin", ""),
      channel: cellAt(cells, colIndex, "channel", ""),
      product_id: cellAt(cells, colIndex, "product_id"),
      product_name: cellAt(cells, colIndex, "product_name"),
      sku: cellAt(cells, colIndex, "sku", ""),
      quantity: cellAt(cells, colIndex, "quantity"),
      unit_price: cellAt(cells, colIndex, "unit_price"),
      line_total: cellAt(cells, colIndex, "line_total"),
    });
  }

  return { rows, errors, warnings };
}

interface ParsedOrderLine {
  readonly row: number;
  readonly orderId: string;
  readonly customerId: string;
  readonly orderedAtIso: string;
  readonly grossRevenue: number;
  readonly discounts: number;
  readonly refunds: number;
  readonly contributionMargin?: number;
  readonly channel?: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

function validateAndCoerceRow(
  raw: RawOrderLineCsvRow,
  row: number,
  errors: CsvImportIssue[],
  warnings: CsvImportIssue[],
): ParsedOrderLine | null {
  const orderId = raw.order_id.trim();
  const customerId = raw.customer_id.trim();
  const productId = raw.product_id.trim();
  const productName = raw.product_name.trim();

  if (!orderId) {
    pushError(errors, "MISSING_ORDER_ID", "`order_id` is required.", row);
    return null;
  }
  if (!customerId) {
    pushError(errors, "MISSING_CUSTOMER_ID", "`customer_id` is required.", row);
    return null;
  }
  if (!raw.ordered_at.trim()) {
    pushError(errors, "MISSING_ORDERED_AT", "`ordered_at` is required.", row);
    return null;
  }
  const orderedAtIso = parseOrderedAtIso(raw.ordered_at);
  if (!orderedAtIso) {
    pushError(errors, "INVALID_ORDERED_AT", `Could not parse date from "${raw.ordered_at}".`, row);
    return null;
  }
  if (!productId) {
    pushError(errors, "MISSING_PRODUCT_ID", "`product_id` is required.", row);
    return null;
  }
  if (!productName) {
    pushError(errors, "MISSING_PRODUCT_NAME", "`product_name` is required.", row);
    return null;
  }

  const grossRevenue = parseMoneyCell(raw.gross_revenue);
  const discounts = parseMoneyCell(raw.discounts);
  const refunds = parseMoneyCell(raw.refunds);
  const quantity = parseQuantityCell(raw.quantity);
  const unitPrice = parseMoneyCell(raw.unit_price);
  const lineTotal = parseMoneyCell(raw.line_total);

  if (Number.isNaN(grossRevenue)) {
    pushError(errors, "INVALID_GROSS_REVENUE", `Invalid numeric gross_revenue "${raw.gross_revenue}".`, row);
    return null;
  }
  if (Number.isNaN(discounts)) {
    pushError(errors, "INVALID_DISCOUNTS", `Invalid numeric discounts "${raw.discounts}".`, row);
    return null;
  }
  if (Number.isNaN(refunds)) {
    pushError(errors, "INVALID_REFUNDS", `Invalid numeric refunds "${raw.refunds}".`, row);
    return null;
  }
  if (Number.isNaN(quantity)) {
    pushError(errors, "INVALID_QUANTITY", `Invalid numeric quantity "${raw.quantity}".`, row);
    return null;
  }
  if (Number.isNaN(unitPrice)) {
    pushError(errors, "INVALID_UNIT_PRICE", `Invalid numeric unit_price "${raw.unit_price}".`, row);
    return null;
  }
  if (Number.isNaN(lineTotal)) {
    pushError(errors, "INVALID_LINE_TOTAL", `Invalid numeric line_total "${raw.line_total}".`, row);
    return null;
  }

  if (grossRevenue < 0) {
    pushError(errors, "NEGATIVE_GROSS_REVENUE", "`gross_revenue` cannot be negative.", row);
    return null;
  }
  if (discounts < 0) {
    pushError(errors, "NEGATIVE_DISCOUNTS", "`discounts` cannot be negative (use positive dollars-off).", row);
    return null;
  }
  if (refunds < 0) {
    pushError(errors, "NEGATIVE_REFUNDS", "`refunds` cannot be negative (use positive refund amount).", row);
    return null;
  }
  if (quantity < 0) {
    pushError(errors, "NEGATIVE_QUANTITY", "`quantity` cannot be negative.", row);
    return null;
  }
  if (unitPrice < 0) {
    pushError(errors, "NEGATIVE_UNIT_PRICE", "`unit_price` cannot be negative.", row);
    return null;
  }
  if (lineTotal < 0) {
    pushError(errors, "NEGATIVE_LINE_TOTAL", "`line_total` cannot be negative.", row);
    return null;
  }

  let contributionMargin: number | undefined;
  const cmRaw = raw.contribution_margin.trim();
  if (cmRaw !== "") {
    const cm = parseMoneyCell(raw.contribution_margin);
    if (Number.isNaN(cm)) {
      pushError(errors, "INVALID_CONTRIBUTION_MARGIN", `Invalid contribution_margin "${raw.contribution_margin}".`, row);
      return null;
    }
    contributionMargin = cm;
  }

  const channelRaw = raw.channel.trim();
  const channel = channelRaw === "" ? undefined : channelRaw;

  const skuRaw = raw.sku.trim();
  const sku = skuRaw === "" ? undefined : skuRaw;

  const impliedLine = quantity * unitPrice;
  if (!moneyClose(impliedLine, lineTotal, MONEY_EPSILON) && quantity > 0 && unitPrice > 0) {
    pushWarning(
      warnings,
      "LINE_TOTAL_VS_QTY_PRICE",
      `line_total (${lineTotal}) differs from quantity × unit_price (${impliedLine.toFixed(2)}) beyond tolerance.`,
      row,
    );
  }

  return {
    row,
    orderId,
    customerId,
    orderedAtIso,
    grossRevenue,
    discounts,
    refunds,
    contributionMargin,
    channel,
    productId,
    productName,
    sku,
    quantity,
    unitPrice,
    lineTotal,
  };
}

function assertOrderGroupConsistency(
  orderId: string,
  lines: ParsedOrderLine[],
  errors: CsvImportIssue[],
): void {
  const first = lines[0];
  const fields: Array<{
    label: string;
    same: (a: ParsedOrderLine, b: ParsedOrderLine) => boolean;
    describe: (l: ParsedOrderLine) => string;
  }> = [
    {
      label: "customer_id",
      same: (a, b) => a.customerId === b.customerId,
      describe: (l) => l.customerId,
    },
    {
      label: "ordered_at",
      same: (a, b) => a.orderedAtIso === b.orderedAtIso,
      describe: (l) => l.orderedAtIso,
    },
    {
      label: "gross_revenue",
      same: (a, b) => moneyClose(a.grossRevenue, b.grossRevenue),
      describe: (l) => String(l.grossRevenue),
    },
    {
      label: "discounts",
      same: (a, b) => moneyClose(a.discounts, b.discounts),
      describe: (l) => String(l.discounts),
    },
    {
      label: "refunds",
      same: (a, b) => moneyClose(a.refunds, b.refunds),
      describe: (l) => String(l.refunds),
    },
    {
      label: "contribution_margin",
      same: (a, b) =>
        (a.contributionMargin === undefined && b.contributionMargin === undefined) ||
        (a.contributionMargin !== undefined &&
          b.contributionMargin !== undefined &&
          moneyClose(a.contributionMargin, b.contributionMargin)),
      describe: (l) => (l.contributionMargin === undefined ? "" : String(l.contributionMargin)),
    },
    {
      label: "channel",
      same: (a, b) => a.channel === b.channel,
      describe: (l) => l.channel ?? "",
    },
  ];

  for (const line of lines) {
    for (const f of fields) {
      if (!f.same(first, line)) {
        pushError(
          errors,
          "ORDER_LEVEL_CONFLICT",
          `Order "${orderId}" has conflicting ${f.label}: "${f.describe(first)}" vs "${f.describe(line)}".`,
          line.row,
        );
      }
    }
  }
}

function buildSummary(
  rawRowCount: number,
  customers: Customer[],
  orders: Order[],
  products: Product[],
  errors: CsvImportIssue[],
  warnings: CsvImportIssue[],
): CombineOrderCsvImportSummary {
  let lineItemCount = 0;
  for (const o of orders) lineItemCount += o.lineItems.length;

  const orderedTs = orders.map((o) => o.orderedAt).sort();
  const firstOrderAt = orderedTs[0];
  const lastOrderAt = orderedTs[orderedTs.length - 1];

  return {
    rawRowCount,
    customerCount: customers.length,
    orderCount: orders.length,
    lineItemCount,
    productCount: products.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    firstOrderAt,
    lastOrderAt,
  };
}

/** Any error yields empty model arrays (fail closed). */
export function normaliseCombinedOrderCsv(
  rows: readonly RawOrderLineCsvRow[],
  dataRowCount: number = rows.length,
): CombineOrderCsvImportResult {
  const errors: CsvImportIssue[] = [];
  const warnings: CsvImportIssue[] = [];
  const customers: Customer[] = [];
  const orders: Order[] = [];
  const products: Product[] = [];

  if (rows.length === 0) {
    pushError(errors, "NO_DATA_ROWS", "No rows to import.");
    return {
      customers,
      orders,
      products,
      warnings,
      errors,
      summary: buildSummary(dataRowCount, customers, orders, products, errors, warnings),
    };
  }

  const parsed: ParsedOrderLine[] = [];
  rows.forEach((raw, i) => {
    const rowNum = i + 1;
    const p = validateAndCoerceRow(raw, rowNum, errors, warnings);
    if (p) parsed.push(p);
  });

  if (errors.length > 0) {
    return {
      customers,
      orders,
      products,
      warnings,
      errors,
      summary: buildSummary(dataRowCount, customers, orders, products, errors, warnings),
    };
  }

  const byOrder = new Map<string, ParsedOrderLine[]>();
  for (const line of parsed) {
    const list = byOrder.get(line.orderId) ?? [];
    list.push(line);
    byOrder.set(line.orderId, list);
  }

  for (const [orderId, lines] of byOrder) {
    assertOrderGroupConsistency(orderId, lines, errors);
  }

  if (errors.length > 0) {
    return {
      customers,
      orders,
      products,
      warnings,
      errors,
      summary: buildSummary(dataRowCount, customers, orders, products, errors, warnings),
    };
  }

  const productMap = new Map<string, Product>();
  for (const line of parsed) {
    const existing = productMap.get(line.productId);
    if (!existing) {
      productMap.set(line.productId, {
        id: line.productId,
        title: line.productName,
        sku: line.sku,
      });
    } else {
      if (existing.title !== line.productName) {
        pushError(
          errors,
          "PRODUCT_TITLE_CONFLICT",
          `Product "${line.productId}" has conflicting product_name "${existing.title}" vs "${line.productName}".`,
          line.row,
        );
      }
      const prevSku = existing.sku ?? "";
      const nextSku = line.sku ?? "";
      if (prevSku !== "" && nextSku !== "" && prevSku !== nextSku) {
        pushError(
          errors,
          "PRODUCT_SKU_CONFLICT",
          `Product "${line.productId}" has conflicting sku values.`,
          line.row,
        );
      } else if (prevSku === "" && nextSku !== "") {
        existing.sku = line.sku;
      }
    }
  }

  if (errors.length > 0) {
    return {
      customers,
      orders,
      products,
      warnings,
      errors,
      summary: buildSummary(dataRowCount, customers, orders, products, errors, warnings),
    };
  }

  const orderList: Order[] = [];
  for (const [orderId, lines] of byOrder) {
    lines.sort((a, b) => a.row - b.row);
    const head = lines[0];
    const lineItems: OrderLineItem[] = lines.map((ln, idx) => ({
      id: `${orderId}#${idx}`,
      productId: ln.productId,
      sku: ln.sku,
      title: ln.productName,
      quantity: ln.quantity,
      unitPrice: ln.unitPrice,
      lineTotal: ln.lineTotal,
    }));

    orderList.push({
      id: orderId,
      customerId: head.customerId,
      orderedAt: head.orderedAtIso,
      grossRevenue: head.grossRevenue,
      discounts: head.discounts,
      refunds: head.refunds,
      contributionMargin: head.contributionMargin,
      channel: head.channel,
      lineItems,
    });
  }

  orderList.sort((a, b) => (a.orderedAt < b.orderedAt ? -1 : a.orderedAt > b.orderedAt ? 1 : 0));

  const customerIds = new Set<string>();
  for (const o of orderList) customerIds.add(o.customerId);

  for (const cid of customerIds) {
    const custOrders = orderList
      .filter((o) => o.customerId === cid)
      .sort((a, b) => {
        if (a.orderedAt < b.orderedAt) return -1;
        if (a.orderedAt > b.orderedAt) return 1;
        return a.id.localeCompare(b.id, "en");
      });
    if (custOrders.length === 0) continue;
    const firstOrder = custOrders[0];
    const lastOrder = custOrders[custOrders.length - 1];
    const firstLine = firstOrder.lineItems[0];
    customers.push({
      id: cid,
      firstOrderAt: firstOrder.orderedAt,
      lastOrderAt: lastOrder.orderedAt,
      acquisitionChannel: firstOrder.channel,
      firstProductId: firstLine?.productId,
    });
  }

  customers.sort((a, b) => a.id.localeCompare(b.id, "en"));
  orders.push(...orderList);
  products.push(...[...productMap.values()].sort((a, b) => a.id.localeCompare(b.id, "en")));

  return {
    customers,
    orders,
    products,
    warnings,
    errors,
    summary: buildSummary(dataRowCount, customers, orders, products, errors, warnings),
  };
}

/**
 * Parse + normalise in one call. Fails closed when parse or business validation errors exist.
 */
export function importCombinedOrderCsvFromText(csvText: string): CombineOrderCsvImportResult {
  const pr = parseCombinedOrderCsvText(csvText);
  const mergeErrors: CsvImportIssue[] = [...pr.errors];
  const mergeWarnings: CsvImportIssue[] = [...pr.warnings];

  if (mergeErrors.length > 0) {
    return {
      customers: [],
      orders: [],
      products: [],
      errors: mergeErrors,
      warnings: mergeWarnings,
      summary: buildSummary(0, [], [], [], mergeErrors, mergeWarnings),
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
      summary: buildSummary(0, [], [], [], mergeErrors, mergeWarnings),
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
    summary: buildSummary(
      pr.rows.length,
      failed ? [] : norm.customers,
      failed ? [] : norm.orders,
      failed ? [] : norm.products,
      errors,
      warnings,
    ),
  };
}
