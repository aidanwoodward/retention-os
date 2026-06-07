/**
 * Parse Shopify Admin Orders CSV export → `RawOrderLineCsvRow[]`.
 *
 * Handles continuation-row forward-fill, order-level revenue derivation, and adapter-level validation.
 * Does not call `normaliseCombinedOrderCsv` — use `importShopifyOrdersCsvFromText` for full import.
 */

import type { CsvImportIssue, RawOrderLineCsvRow } from "../import-types";
import { parseCsvTextToMatrix } from "../normalise-orders";
import { parseMoneyCell, parseQuantityCell, pushError, pushWarning } from "../validate-csv";
import {
  formatDerivedMoney,
  hasLineitemFields,
  hasOrderAnchorFields,
  isBlankCell,
  normalizeShopifyCustomerEmail,
  normaliseShopifyHeaderName,
  resolveShopifyOrderId,
  resolveShopifyProductId,
  shopifyMoneyCellOrZero,
} from "./shopify-orders-helpers";
import {
  SHOPIFY_ORDERS_OPTIONAL_SKU_HEADER,
  SHOPIFY_ORDERS_ORDER_ID_HEADERS,
  SHOPIFY_ORDERS_REQUIRED_HEADERS,
  SHOPIFY_ORDERS_TOTAL_HEADER,
} from "./shopify-orders-schema";

export interface ParseShopifyOrdersCsvResult {
  readonly rows: RawOrderLineCsvRow[];
  readonly errors: CsvImportIssue[];
  readonly warnings: CsvImportIssue[];
}

interface OrderAnchor {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: string;
  readonly discountAmount: string;
  readonly refundedAmount: string;
  readonly source: string;
}

interface MaterialisedLine {
  readonly rowNum: number;
  readonly orderId: string;
  readonly customerId: string;
  readonly orderedAt: string;
  readonly discounts: string;
  readonly refunds: string;
  readonly channel: string;
  readonly productName: string;
  readonly skuRaw: string;
  readonly quantity: string;
  readonly unitPrice: string;
}

interface HeaderParseOk {
  readonly ok: true;
  readonly colIndex: Record<string, number>;
  readonly hasSkuHeader: boolean;
  readonly hasTotalHeader: boolean;
}

interface HeaderParseFail {
  readonly ok: false;
  readonly issues: CsvImportIssue[];
}

function dataRowNum(matrixRowIndex: number): number {
  return matrixRowIndex;
}

function cellAt(cells: string[], colIndex: Record<string, number>, key: string, defaultValue = ""): string {
  const i = colIndex[key];
  if (i === undefined) return defaultValue;
  return cells[i] ?? defaultValue;
}

function parseShopifyHeaderRow(cells: string[]): HeaderParseOk | HeaderParseFail {
  const issues: CsvImportIssue[] = [];
  const colIndex: Record<string, number> = {};
  const seen = new Set<string>();

  cells.forEach((raw, idx) => {
    const name = normaliseShopifyHeaderName(raw);
    if (!name) return;
    if (seen.has(name)) {
      pushError(issues, "HEADER_DUPLICATE", `Duplicate header column "${raw}".`);
      return;
    }
    seen.add(name);
    colIndex[name] = idx;
  });

  for (const req of SHOPIFY_ORDERS_REQUIRED_HEADERS) {
    const key = normaliseShopifyHeaderName(req);
    if (colIndex[key] === undefined) {
      pushError(issues, "SHOPIFY_HEADER_MISSING_REQUIRED", `Missing required Shopify column "${req}" in header row.`);
    }
  }

  const hasOrderId =
    colIndex[normaliseShopifyHeaderName("Id")] !== undefined ||
    colIndex[normaliseShopifyHeaderName("Name")] !== undefined;

  if (!hasOrderId) {
    pushError(
      issues,
      "SHOPIFY_HEADER_MISSING_REQUIRED",
      `Missing required Shopify order identity column — need at least one of: ${SHOPIFY_ORDERS_ORDER_ID_HEADERS.join(", ")}.`,
    );
  }

  if (issues.length > 0) return { ok: false, issues };

  const hasSkuHeader = colIndex[normaliseShopifyHeaderName(SHOPIFY_ORDERS_OPTIONAL_SKU_HEADER)] !== undefined;
  const hasTotalHeader = colIndex[normaliseShopifyHeaderName(SHOPIFY_ORDERS_TOTAL_HEADER)] !== undefined;

  return { ok: true, colIndex, hasSkuHeader, hasTotalHeader };
}

function readOrderAnchor(cells: string[], colIndex: Record<string, number>): OrderAnchor {
  return {
    id: cellAt(cells, colIndex, "id"),
    name: cellAt(cells, colIndex, "name"),
    email: cellAt(cells, colIndex, "email"),
    createdAt: cellAt(cells, colIndex, "created_at"),
    discountAmount: cellAt(cells, colIndex, "discount_amount"),
    refundedAmount: cellAt(cells, colIndex, "refunded_amount"),
    source: cellAt(cells, colIndex, "source"),
  };
}

function mergeWithAnchor(cells: string[], colIndex: Record<string, number>, anchor: OrderAnchor): OrderAnchor {
  const row = readOrderAnchor(cells, colIndex);
  return {
    id: isBlankCell(row.id) ? anchor.id : row.id,
    name: isBlankCell(row.name) ? anchor.name : row.name,
    email: isBlankCell(row.email) ? anchor.email : row.email,
    createdAt: isBlankCell(row.createdAt) ? anchor.createdAt : row.createdAt,
    discountAmount: isBlankCell(row.discountAmount) ? anchor.discountAmount : row.discountAmount,
    refundedAmount: isBlankCell(row.refundedAmount) ? anchor.refundedAmount : row.refundedAmount,
    source: isBlankCell(row.source) ? anchor.source : row.source,
  };
}

/**
 * Parse Shopify Orders CSV text into canonical row objects ready for `normaliseCombinedOrderCsv`.
 */
export function parseShopifyOrdersCsvText(text: string): ParseShopifyOrdersCsvResult {
  const errors: CsvImportIssue[] = [];
  const warnings: CsvImportIssue[] = [];
  const matrix = parseCsvTextToMatrix(text);

  if (matrix.length === 0) {
    pushError(errors, "CSV_EMPTY", "CSV has no rows.");
    return { rows: [], errors, warnings };
  }

  const header = parseShopifyHeaderRow(matrix[0]);
  if (!header.ok) {
    return { rows: [], errors: header.issues, warnings };
  }

  const { colIndex, hasSkuHeader, hasTotalHeader } = header;
  const width = matrix[0].length;
  const materialised: MaterialisedLine[] = [];
  let currentAnchor: OrderAnchor | null = null;
  let emailWarningEmitted = false;

  if (!hasSkuHeader) {
    pushWarning(
      warnings,
      "SHOPIFY_SKU_HEADER_MISSING_FALLBACK_TO_NAME",
      "Lineitem SKU column absent — product_id will use normalised Lineitem name for all rows.",
    );
  }

  if (hasTotalHeader) {
    pushWarning(
      warnings,
      "SHOPIFY_TOTAL_NOT_USED_FOR_LTV",
      "Shopify Total column is present but ignored — LTV uses line-derived gross revenue minus discounts and refunds.",
    );
  }

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

    if (cells.every((c) => isBlankCell(c))) {
      pushWarning(warnings, "ROW_SKIPPED_BLANK", "Skipped blank row.", rowLabel);
      continue;
    }

    const idRaw = cellAt(cells, colIndex, "id");
    const nameRaw = cellAt(cells, colIndex, "name");
    const quantityRaw = cellAt(cells, colIndex, "lineitem_quantity");
    const lineNameRaw = cellAt(cells, colIndex, "lineitem_name");
    const priceRaw = cellAt(cells, colIndex, "lineitem_price");
    const skuRaw = hasSkuHeader ? cellAt(cells, colIndex, "lineitem_sku") : "";

    const isAnchorRow = hasOrderAnchorFields(idRaw, nameRaw);
    const hasLine = hasLineitemFields(quantityRaw, lineNameRaw, priceRaw);

    if (isAnchorRow) {
      currentAnchor = readOrderAnchor(cells, colIndex);
    }

    if (!hasLine) {
      if (isAnchorRow) {
        pushError(
          errors,
          "SHOPIFY_ORDER_ONLY_EXPORT",
          "Order row has no line-item fields — order-only exports are not supported.",
          rowLabel,
        );
      }
      continue;
    }

    if (!isAnchorRow) {
      if (currentAnchor === null) {
        pushError(
          errors,
          "SHOPIFY_CONTINUATION_WITHOUT_ORDER",
          "Line-item row without a preceding order anchor row.",
          rowLabel,
        );
        continue;
      }
    }

    const merged = isAnchorRow ? readOrderAnchor(cells, colIndex) : mergeWithAnchor(cells, colIndex, currentAnchor!);

    const orderId = resolveShopifyOrderId(merged.id, merged.name);
    if (!orderId) {
      pushError(errors, "SHOPIFY_MISSING_ORDER_ID", "Could not resolve order_id from Id or Name.", rowLabel);
      continue;
    }

    const email = merged.email.trim();
    if (!email) {
      pushError(errors, "SHOPIFY_MISSING_EMAIL", "Email is required on the order anchor row.", rowLabel);
      continue;
    }

    const customerId = normalizeShopifyCustomerEmail(email);
    if (!emailWarningEmitted) {
      pushWarning(
        warnings,
        "SHOPIFY_EMAIL_AS_CUSTOMER_ID",
        "Email is used as temporary browser-session customer_id.",
      );
      emailWarningEmitted = true;
    }

    const productName = lineNameRaw.trim();
    if (!productName) {
      pushError(errors, "SHOPIFY_MISSING_LINEITEM_NAME", "Lineitem name is required.", rowLabel);
      continue;
    }

    if (hasSkuHeader && isBlankCell(skuRaw)) {
      pushWarning(
        warnings,
        "SHOPIFY_SKU_FALLBACK_TO_NAME",
        `Lineitem SKU blank — product_id derived from normalised name "${productName}".`,
        rowLabel,
      );
    }

    materialised.push({
      rowNum: rowLabel,
      orderId,
      customerId,
      orderedAt: merged.createdAt.trim(),
      discounts: shopifyMoneyCellOrZero(merged.discountAmount),
      refunds: shopifyMoneyCellOrZero(merged.refundedAmount),
      channel: merged.source.trim(),
      productName,
      skuRaw,
      quantity: quantityRaw.trim(),
      unitPrice: priceRaw.trim(),
    });
  }

  if (materialised.length === 0 && errors.length === 0) {
    pushError(errors, "NO_DATA_ROWS", "No data rows after header.");
    return { rows: [], errors, warnings };
  }

  if (errors.length > 0) {
    return { rows: [], errors, warnings };
  }

  const byOrder = new Map<string, MaterialisedLine[]>();
  for (const line of materialised) {
    const list = byOrder.get(line.orderId) ?? [];
    list.push(line);
    byOrder.set(line.orderId, list);
  }

  const rows: RawOrderLineCsvRow[] = [];

  for (const [, lines] of byOrder) {
    let grossRevenue = 0;
    const lineTotals: number[] = [];

    for (const line of lines) {
      const qty = parseQuantityCell(line.quantity);
      const price = parseMoneyCell(line.unitPrice);
      if (Number.isNaN(qty) || Number.isNaN(price)) {
        pushError(
          errors,
          "SHOPIFY_INVALID_LINEITEM",
          `Invalid line-item quantity or price on order ${line.orderId}.`,
          line.rowNum,
        );
        continue;
      }
      const lineTotal = qty * price;
      lineTotals.push(lineTotal);
      grossRevenue += lineTotal;
    }

    if (errors.length > 0) break;

    const grossStr = formatDerivedMoney(grossRevenue);
    const first = lines[0]!;

    lines.forEach((line, idx) => {
      const { productId, sku } = resolveShopifyProductId(line.skuRaw, line.productName);
      rows.push({
        order_id: line.orderId,
        customer_id: line.customerId,
        ordered_at: line.orderedAt,
        gross_revenue: grossStr,
        discounts: first.discounts,
        refunds: first.refunds,
        contribution_margin: "",
        channel: first.channel,
        product_id: productId,
        product_name: line.productName,
        sku,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: formatDerivedMoney(lineTotals[idx] ?? 0),
      });
    });
  }

  if (errors.length > 0) {
    return { rows: [], errors, warnings };
  }

  return { rows, errors, warnings };
}
