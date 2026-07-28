/**
 * Selected-period product / vendor / category revenue concentration (MET-CONCENTRATION).
 *
 * Consumes AnalysisSelection.reportingOrders; requires reportingPeriod.
 * Product amounts are allocated trusted order nets (proportional lineTotal weights),
 * not exact observed line-level net. Category is always unavailable this sprint.
 */

import type { AnalysisSelection } from "../analysis-context/types";
import type { Order } from "../types/order";
import type { Product } from "../types/product";
import {
  ALLOCATION_EPSILON,
  allocateTrustedNetByProduct,
} from "./allocate-trusted-net-by-product";
import { netOrderRevenue } from "./utils";

export type RevenueConcentrationDimension = "product" | "vendor" | "category";

export type RevenueConcentrationRow = {
  readonly key: string;
  readonly label: string;
  readonly revenue: number;
  readonly shareOfAttributedRevenue: number | null;
};

export type RevenueConcentrationBreakdown = {
  readonly dimension: RevenueConcentrationDimension;
  readonly rows: readonly RevenueConcentrationRow[];
  readonly attributedRevenue: number;
  readonly unattributedRevenue: number;
  readonly attributionCoverage: number | null;
  readonly top1ShareOfAttributedRevenue: number | null;
  readonly top3ShareOfAttributedRevenue: number | null;
  readonly top5ShareOfAttributedRevenue: number | null;
  readonly attributedEntityCount: number;
  readonly status: "available" | "unavailable";
};

export type RevenueConcentrationResult = {
  readonly totalReportingRevenue: number;
  readonly reportingOrderCount: number;
  readonly product: RevenueConcentrationBreakdown;
  readonly vendor: RevenueConcentrationBreakdown;
  readonly category: RevenueConcentrationBreakdown;
  readonly status: "available" | "empty";
};

function ratioOrNull(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function compareKeys(a: string, b: string): number {
  return a.localeCompare(b, "en");
}

function normalizeVendorKey(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildProductMap(products: readonly Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const p of products) {
    if (map.has(p.id)) {
      throw new RangeError(
        `calculateRevenueConcentration: duplicate Product.id "${p.id}" in fullDataset.products`,
      );
    }
    map.set(p.id, p);
  }
  return map;
}

/** Variant-fallback identity without a catalog row must not become a product concentration key. */
function isVariantFallbackWithoutProduct(
  productId: string,
  order: Order,
  productMap: ReadonlyMap<string, Product>,
): boolean {
  if (productMap.has(productId)) return false;
  for (const line of order.lineItems) {
    const pid = line.productId?.trim() ?? "";
    if (pid !== productId) continue;
    const vid = line.variantId?.trim() ?? "";
    if (vid.length > 0 && pid === vid) return true;
  }
  return false;
}

function topNShare(revenuesDesc: readonly number[], n: number, attributed: number): number | null {
  if (attributed === 0) return null;
  const take = Math.min(n, revenuesDesc.length);
  let sum = 0;
  for (let i = 0; i < take; i++) sum += revenuesDesc[i]!;
  return sum / attributed;
}

function emptyBreakdown(
  dimension: RevenueConcentrationDimension,
  totalReportingRevenue: number,
): RevenueConcentrationBreakdown {
  return {
    dimension,
    rows: [],
    attributedRevenue: 0,
    unattributedRevenue: totalReportingRevenue,
    attributionCoverage: ratioOrNull(0, totalReportingRevenue),
    top1ShareOfAttributedRevenue: null,
    top3ShareOfAttributedRevenue: null,
    top5ShareOfAttributedRevenue: null,
    attributedEntityCount: 0,
    status: "unavailable",
  };
}

function emptyResult(): RevenueConcentrationResult {
  const emptyDim = (d: RevenueConcentrationDimension): RevenueConcentrationBreakdown => ({
    dimension: d,
    rows: [],
    attributedRevenue: 0,
    unattributedRevenue: 0,
    attributionCoverage: null,
    top1ShareOfAttributedRevenue: null,
    top3ShareOfAttributedRevenue: null,
    top5ShareOfAttributedRevenue: null,
    attributedEntityCount: 0,
    status: "unavailable",
  });
  return {
    totalReportingRevenue: 0,
    reportingOrderCount: 0,
    product: emptyDim("product"),
    vendor: emptyDim("vendor"),
    category: emptyDim("category"),
    status: "empty",
  };
}

function productLabel(
  productId: string,
  productMap: ReadonlyMap<string, Product>,
  lineTitlesByProduct: ReadonlyMap<string, Set<string>>,
): string {
  const catalog = productMap.get(productId);
  const catalogTitle = catalog?.title?.trim() ?? "";
  if (catalogTitle.length > 0) return catalogTitle;

  const titles = [...(lineTitlesByProduct.get(productId) ?? [])].sort(compareKeys);
  if (titles.length > 0) return titles[0]!;
  return "Unknown product";
}

function vendorLabel(candidates: ReadonlySet<string>): string {
  const sorted = [...candidates].sort(compareKeys);
  return sorted[0] ?? "";
}

function buildRows(
  revenueByKey: ReadonlyMap<string, number>,
  labelByKey: ReadonlyMap<string, string>,
  attributedRevenue: number,
): RevenueConcentrationRow[] {
  const entries = [...revenueByKey.entries()]
    .filter(([, revenue]) => revenue > ALLOCATION_EPSILON)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return compareKeys(a[0], b[0]);
    });

  return entries.map(([key, revenue]) => ({
    key,
    label: labelByKey.get(key) ?? key,
    revenue,
    shareOfAttributedRevenue: ratioOrNull(revenue, attributedRevenue),
  }));
}

function breakdownFromRows(
  dimension: RevenueConcentrationDimension,
  rows: readonly RevenueConcentrationRow[],
  totalReportingRevenue: number,
): RevenueConcentrationBreakdown {
  const attributedRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  let unattributedRevenue = totalReportingRevenue - attributedRevenue;
  if (Math.abs(unattributedRevenue) <= ALLOCATION_EPSILON) unattributedRevenue = 0;
  if (unattributedRevenue < -ALLOCATION_EPSILON) {
    throw new RangeError(
      `calculateRevenueConcentration: negative ${dimension} unattributed revenue ${String(unattributedRevenue)}`,
    );
  }
  if (unattributedRevenue < 0) unattributedRevenue = 0;

  const revenuesDesc = rows.map((r) => r.revenue);
  const status: "available" | "unavailable" =
    attributedRevenue > ALLOCATION_EPSILON ? "available" : "unavailable";

  return {
    dimension,
    rows: status === "available" ? rows : [],
    attributedRevenue: status === "available" ? attributedRevenue : 0,
    unattributedRevenue:
      status === "available" ? unattributedRevenue : totalReportingRevenue,
    attributionCoverage: ratioOrNull(
      status === "available" ? attributedRevenue : 0,
      totalReportingRevenue,
    ),
    top1ShareOfAttributedRevenue:
      status === "available" ? topNShare(revenuesDesc, 1, attributedRevenue) : null,
    top3ShareOfAttributedRevenue:
      status === "available" ? topNShare(revenuesDesc, 3, attributedRevenue) : null,
    top5ShareOfAttributedRevenue:
      status === "available" ? topNShare(revenuesDesc, 5, attributedRevenue) : null,
    attributedEntityCount: status === "available" ? rows.length : 0,
    status,
  };
}

/**
 * Selected-period revenue concentration over AnalysisSelection.reportingOrders.
 */
export function calculateRevenueConcentration(
  selection: AnalysisSelection,
): RevenueConcentrationResult {
  if (selection.context.reportingPeriod == null) {
    throw new RangeError(
      "calculateRevenueConcentration requires selection.context.reportingPeriod; all-time concentration is not supported",
    );
  }

  const reportingOrders = selection.reportingOrders;
  const reportingOrderCount = reportingOrders.length;
  if (reportingOrderCount === 0) {
    return emptyResult();
  }

  const productMap = buildProductMap(selection.fullDataset.products);

  let totalReportingRevenue = 0;
  const productRevenue = new Map<string, number>();
  const lineTitlesByProduct = new Map<string, Set<string>>();

  for (const order of reportingOrders) {
    totalReportingRevenue += netOrderRevenue(order);
    const allocation = allocateTrustedNetByProduct(order);

    for (const [productId, revenue] of allocation.byProductId) {
      if (isVariantFallbackWithoutProduct(productId, order, productMap)) {
        continue;
      }
      productRevenue.set(productId, (productRevenue.get(productId) ?? 0) + revenue);

      for (const line of order.lineItems) {
        const pid = line.productId?.trim() ?? "";
        if (pid !== productId) continue;
        const title = line.title?.trim() ?? "";
        if (title.length === 0) continue;
        let set = lineTitlesByProduct.get(productId);
        if (!set) {
          set = new Set();
          lineTitlesByProduct.set(productId, set);
        }
        set.add(title);
      }
    }
  }

  let attributedProductSum = 0;
  for (const revenue of productRevenue.values()) {
    if (revenue > ALLOCATION_EPSILON) attributedProductSum += revenue;
  }
  if (attributedProductSum - totalReportingRevenue > ALLOCATION_EPSILON) {
    throw new RangeError(
      "calculateRevenueConcentration: product attributed exceeds totalReportingRevenue",
    );
  }

  const productLabels = new Map<string, string>();
  for (const productId of productRevenue.keys()) {
    productLabels.set(productId, productLabel(productId, productMap, lineTitlesByProduct));
  }

  const productRows = buildRows(productRevenue, productLabels, attributedProductSum);
  const product = breakdownFromRows("product", productRows, totalReportingRevenue);

  // Vendor: only from attributed product revenue with catalog vendor.
  const vendorRevenue = new Map<string, number>();
  const vendorLabelCandidates = new Map<string, Set<string>>();

  for (const row of product.rows) {
    const catalog = productMap.get(row.key);
    const rawVendor = catalog?.vendor;
    if (rawVendor == null) continue;
    const trimmed = rawVendor.trim();
    if (trimmed.length === 0) continue;
    const key = normalizeVendorKey(trimmed);
    if (key.length === 0) continue;

    vendorRevenue.set(key, (vendorRevenue.get(key) ?? 0) + row.revenue);
    let candidates = vendorLabelCandidates.get(key);
    if (!candidates) {
      candidates = new Set();
      vendorLabelCandidates.set(key, candidates);
    }
    candidates.add(trimmed);
  }

  let vendorAttributed = 0;
  for (const revenue of vendorRevenue.values()) {
    if (revenue > ALLOCATION_EPSILON) vendorAttributed += revenue;
  }
  const vendorLabels = new Map<string, string>();
  for (const [key, candidates] of vendorLabelCandidates) {
    vendorLabels.set(key, vendorLabel(candidates));
  }
  const vendorRows = buildRows(vendorRevenue, vendorLabels, vendorAttributed);
  const vendor = breakdownFromRows("vendor", vendorRows, totalReportingRevenue);

  const category = emptyBreakdown("category", totalReportingRevenue);

  return {
    totalReportingRevenue,
    reportingOrderCount,
    product,
    vendor,
    category,
    status: "available",
  };
}
