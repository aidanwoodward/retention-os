import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import {
  calculateFirstProductCustomerQualityFromDataset,
  type FirstProductQualityRow,
  type ProductQualitySignal,
} from "./product-quality";

/** Visible near the first-product quality table — attribution honesty. */
export const FIRST_PRODUCT_ATTRIBUTION_CAVEAT =
  "First product means the first line item on the customer's chronological first order. Discount/refund drag is order-level customer economics attributed by first product, not proof that the SKU caused the refund or discount." as const;

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

export interface FirstProductTableRowView {
  readonly productId: string;
  readonly productTitle: string;
  readonly sku: string | null;
  readonly customerCount: number;
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
  readonly tableRows: readonly FirstProductTableRowView[];
  readonly engineWarnings: readonly string[];
  readonly attributionCaveat: string;
  readonly revenueContributionCaveat: string | null;
  readonly missingLineItemCoverage: boolean;
}

function resolveProductTitle(row: FirstProductQualityRow): string {
  return row.productTitle?.trim() || row.productId;
}

function mapTableRow(row: FirstProductQualityRow): FirstProductTableRowView {
  return {
    productId: row.productId,
    productTitle: resolveProductTitle(row),
    sku: row.sku?.trim() || null,
    customerCount: row.customerCount,
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

export function buildProductsPageViewModelFromDataset(
  dataset: RetentionOSDataset,
): ProductsPageViewModel {
  const result = calculateFirstProductCustomerQualityFromDataset(dataset);
  const tableRows = result.rows.map(mapTableRow);

  const revenueContributionCaveat = result.hasContributionCoverage
    ? "Average revenue LTV and average contribution LTV measure different economics — do not treat net revenue per customer as retained margin."
    : "Contribution LTV is unavailable without imported contribution_margin on orders or margin assumptions saved on /data. Revenue LTV still reflects customer quality; do not infer margin strength without a contribution path.";

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
