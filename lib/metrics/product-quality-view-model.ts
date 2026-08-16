import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import {
  calculateFirstProductCustomerQualityFromDataset,
  type FirstProductQualityRow,
  type ProductQualitySignal,
} from "./product-quality";

/** Visible near the first-product quality table — attribution honesty. */
export const FIRST_PRODUCT_ATTRIBUTION_CAVEAT =
  "First product means a single_product canonical first order (all-time for product quality). Multi-product first baskets and unknown first-product attribution are excluded from product rows. Discount/refund drag is order-level customer economics attributed by first product, not proof that the SKU caused the refund or discount. Imported Customer.firstProductId is denormalised interim data and is not the engine source of truth." as const;

/** Coverage strip — populations reconcile to snapshot customers. */
export const ATTRIBUTION_COVERAGE_TRUST_COPY =
  "Product comparisons below include customers with a reliable single-product first order. Multi-product and unknown first orders remain visible here but are not forced into a product ranking." as const;

/** Secondary contribution column — conservative trust copy. */
export const CONTRIBUTION_LTV_TRUST_COPY =
  "Contribution LTV may use order-level contribution values and/or the saved margin assumption. Revenue LTV remains available when contribution inputs are incomplete." as const;

/** Overall quality leader card methodology. */
export const OVERALL_QUALITY_LEADER_METHODOLOGY_COPY =
  "Based on repeat purchase, 90-day first-to-second conversion and relative Revenue LTV among products with sufficient customer volume" as const;

export interface ProductsPageSummaryView {
  readonly totalCustomers: number;
  readonly productCount: number;
  readonly groupsWithEnoughCustomers: number;
  readonly unassignedCustomerCount: number;
  readonly strongestProductId: string | null;
  readonly strongestProductTitle: string | null;
  readonly weakestProductId: string | null;
  readonly weakestProductTitle: string | null;
  readonly hasLineItemCoverage: boolean;
  readonly hasContributionCoverage: boolean;
  readonly withinDays: number;
}

export interface AttributionCoverageView {
  readonly singleProductCustomerCount: number;
  readonly multiProductCustomerCount: number;
  readonly unknownFirstProductCustomerCount: number;
  readonly singleProductShare: number;
  readonly multiProductShare: number;
  readonly unknownShare: number;
}

export interface OverallQualityLeaderView {
  readonly productId: string | null;
  readonly productTitle: string | null;
  readonly qualitySignal: ProductQualitySignal | null;
  readonly sufficient: boolean;
}

export interface HighestRepeatRateView {
  readonly productId: string | null;
  readonly productTitle: string | null;
  readonly repeatPurchaseRate: number | null;
  readonly sufficient: boolean;
}

export interface HighestRevenueLtvView {
  readonly productId: string | null;
  readonly productTitle: string | null;
  readonly avgRevenueLtv: number | null;
  readonly sufficient: boolean;
}

export interface ProductsExecutiveView {
  readonly overallQualityLeader: OverallQualityLeaderView;
  readonly highestRepeatRate: HighestRepeatRateView;
  readonly highestRevenueLtv: HighestRevenueLtvView;
  readonly hasSufficientSegments: boolean;
}

export interface FirstProductTableRowView {
  readonly productId: string;
  readonly productTitle: string;
  readonly sku: string | null;
  readonly customerCount: number;
  readonly shareOfSnapshotCustomers: number;
  readonly qualitySignal: ProductQualitySignal;
  readonly repeatPurchaseRate: number;
  readonly firstToSecondWithinWindowRate: number;
  readonly thirdPurchaseRate: number;
  readonly avgOrdersPerCustomer: number;
  readonly avgRevenueLtv: number;
  readonly avgContributionLtv: number | null;
  readonly contributionGapPerCustomer: number | null;
  readonly discountDragRate: number;
  readonly refundDragRate: number;
}

export interface ProductsPageViewModel {
  readonly summary: ProductsPageSummaryView;
  readonly attributionCoverage: AttributionCoverageView;
  readonly executive: ProductsExecutiveView;
  readonly tableRows: readonly FirstProductTableRowView[];
  readonly engineWarnings: readonly string[];
  readonly attributionCaveat: string;
  readonly revenueContributionCaveat: string | null;
  readonly missingLineItemCoverage: boolean;
}

function resolveProductTitle(row: FirstProductQualityRow): string {
  return row.productTitle?.trim() || row.productId;
}

function isSufficientForExecutive(signal: ProductQualitySignal): boolean {
  return signal !== "insufficient_data";
}

function mapTableRow(row: FirstProductQualityRow, totalCustomers: number): FirstProductTableRowView {
  return {
    productId: row.productId,
    productTitle: resolveProductTitle(row),
    sku: row.sku?.trim() || null,
    customerCount: row.customerCount,
    shareOfSnapshotCustomers: totalCustomers > 0 ? row.customerCount / totalCustomers : 0,
    qualitySignal: row.qualitySignal,
    repeatPurchaseRate: row.repeatPurchaseRate,
    firstToSecondWithinWindowRate: row.firstToSecondWithinWindowRate,
    thirdPurchaseRate: row.thirdPurchaseRate,
    avgOrdersPerCustomer: row.avgOrdersPerCustomer,
    avgRevenueLtv: row.avgRevenueLtv,
    avgContributionLtv: row.avgContributionLtv,
    contributionGapPerCustomer: row.contributionGapPerCustomer,
    discountDragRate: row.discountDragRate,
    refundDragRate: row.refundDragRate,
  };
}

function resolveTitleById(
  rows: readonly FirstProductTableRowView[],
  productId: string | null,
): string | null {
  if (!productId) return null;
  const match = rows.find((r) => r.productId === productId);
  return match?.productTitle ?? productId;
}

function sufficientRows(rows: readonly FirstProductTableRowView[]): FirstProductTableRowView[] {
  return rows.filter((r) => isSufficientForExecutive(r.qualitySignal));
}

function pickHighestRepeat(rows: readonly FirstProductTableRowView[]): FirstProductTableRowView | null {
  const eligible = sufficientRows(rows);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, row) => {
    if (row.repeatPurchaseRate > best.repeatPurchaseRate) return row;
    if (row.repeatPurchaseRate < best.repeatPurchaseRate) return best;
    return row.productId.localeCompare(best.productId, "en") < 0 ? row : best;
  });
}

function pickHighestRevenueLtv(rows: readonly FirstProductTableRowView[]): FirstProductTableRowView | null {
  const eligible = sufficientRows(rows);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, row) => {
    if (row.avgRevenueLtv > best.avgRevenueLtv) return row;
    if (row.avgRevenueLtv < best.avgRevenueLtv) return best;
    return row.productId.localeCompare(best.productId, "en") < 0 ? row : best;
  });
}

function buildAttributionCoverage(
  totalCustomers: number,
  multiProductCustomerCount: number,
  unknownFirstProductCustomerCount: number,
): AttributionCoverageView {
  const singleProductCustomerCount =
    totalCustomers - multiProductCustomerCount - unknownFirstProductCustomerCount;
  const denom = totalCustomers > 0 ? totalCustomers : 1;
  return {
    singleProductCustomerCount,
    multiProductCustomerCount,
    unknownFirstProductCustomerCount,
    singleProductShare: singleProductCustomerCount / denom,
    multiProductShare: multiProductCustomerCount / denom,
    unknownShare: unknownFirstProductCustomerCount / denom,
  };
}

function buildExecutiveView(
  tableRows: readonly FirstProductTableRowView[],
  strongestProductId: string | null,
): ProductsExecutiveView {
  const eligible = sufficientRows(tableRows);
  const hasSufficientSegments = eligible.length > 0;

  const overallRow =
    hasSufficientSegments && strongestProductId
      ? tableRows.find((r) => r.productId === strongestProductId)
      : undefined;

  const highestRepeat = pickHighestRepeat(tableRows);
  const highestLtv = pickHighestRevenueLtv(tableRows);

  return {
    hasSufficientSegments,
    overallQualityLeader: {
      productId: overallRow?.productId ?? null,
      productTitle: overallRow?.productTitle ?? null,
      qualitySignal: overallRow?.qualitySignal ?? null,
      sufficient: overallRow != null && isSufficientForExecutive(overallRow.qualitySignal),
    },
    highestRepeatRate: {
      productId: highestRepeat?.productId ?? null,
      productTitle: highestRepeat?.productTitle ?? null,
      repeatPurchaseRate: highestRepeat?.repeatPurchaseRate ?? null,
      sufficient: highestRepeat != null,
    },
    highestRevenueLtv: {
      productId: highestLtv?.productId ?? null,
      productTitle: highestLtv?.productTitle ?? null,
      avgRevenueLtv: highestLtv?.avgRevenueLtv ?? null,
      sufficient: highestLtv != null,
    },
  };
}

export function buildProductsPageViewModelFromDataset(
  dataset: RetentionOSDataset,
): ProductsPageViewModel {
  const result = calculateFirstProductCustomerQualityFromDataset(dataset);
  const tableRows = result.rows.map((row) => mapTableRow(row, result.totalCustomers));

  const revenueContributionCaveat = result.hasContributionCoverage
    ? "Average revenue LTV and average contribution LTV measure different economics — do not treat net revenue per customer as retained margin."
    : "Contribution LTV is unavailable without imported contribution_margin on orders or margin assumptions saved on /data. Revenue LTV still reflects customer quality; do not infer margin strength without a contribution path.";

  const attributionCoverage = buildAttributionCoverage(
    result.totalCustomers,
    result.multiProductCustomerCount,
    result.unknownFirstProductCustomerCount,
  );

  return {
    summary: {
      totalCustomers: result.totalCustomers,
      productCount: result.productCount,
      groupsWithEnoughCustomers: result.groupsWithEnoughCustomers,
      unassignedCustomerCount: result.unassignedCustomerCount,
      strongestProductId: result.strongestProduct,
      strongestProductTitle: resolveTitleById(tableRows, result.strongestProduct),
      weakestProductId: result.weakestProduct,
      weakestProductTitle: resolveTitleById(tableRows, result.weakestProduct),
      hasLineItemCoverage: result.hasLineItemCoverage,
      hasContributionCoverage: result.hasContributionCoverage,
      withinDays: result.withinDays,
    },
    attributionCoverage,
    executive: buildExecutiveView(tableRows, result.strongestProduct),
    tableRows,
    engineWarnings: result.warnings,
    attributionCaveat: FIRST_PRODUCT_ATTRIBUTION_CAVEAT,
    revenueContributionCaveat: result.hasLineItemCoverage ? revenueContributionCaveat : null,
    missingLineItemCoverage: !result.hasLineItemCoverage,
  };
}

export function buildProductsPageViewModel(seed?: number): ProductsPageViewModel {
  return buildProductsPageViewModelFromDataset(buildDemoRetentionOSDataset(seed));
}
