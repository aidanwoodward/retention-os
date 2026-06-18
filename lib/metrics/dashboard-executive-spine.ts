/**
 * Executive spine summaries for /dashboard — compact slices composed from page view models.
 * No table payloads; acquisition and product drill-downs stay on their routes.
 */

import type { RetentionOSDataset } from "../data-source/dataset-types";
import { getDatasetSummary, hasContributionMarginCoverage } from "../data-source/dataset-helpers";
import type { MarketingSpendSource } from "../data-source/dataset-types";
import type { AcquisitionPageViewModel } from "./acquisition-view-model";
import { MIN_CUSTOMERS_FOR_SIGNAL } from "./product-quality";
import type { ProductsPageViewModel } from "./product-quality-view-model";
import type { ProductQualitySignal } from "./product-quality";

export type PaybackExecutiveStatus =
  | "locked_no_spend"
  | "locked_no_contribution"
  | "none_achieved"
  | "partial"
  | "achieved";

export type ProductQualityExecutiveState =
  | "locked_no_line_items"
  | "insufficient_segments"
  | "ready";

export type DataCompletenessStatus = "unlocked" | "partial" | "locked";

export interface DashboardAcquisitionExecutiveView {
  readonly lockedMissingSpend: boolean;
  readonly spendSource?: MarketingSpendSource;
  readonly spendIsEstimated: boolean;
  readonly blendedCac: number | null;
  readonly revenueLtvToCac: number | null;
  readonly contributionLtvToCac: number | null;
  readonly paybackStatus: PaybackExecutiveStatus;
  readonly paybackLabel: string;
  readonly cohortsWithPayback: number;
  readonly cohortsEligibleForPayback: number;
  readonly medianPaybackMonths: number | null;
}

export interface DashboardProductHighlightView {
  readonly productId: string;
  readonly productTitle: string;
  readonly qualitySignal: ProductQualitySignal;
  readonly repeatPurchaseRate: number;
  readonly firstToSecondWithinWindowRate: number;
  readonly avgRevenueLtv: number;
}

export interface DashboardProductQualityExecutiveView {
  readonly state: ProductQualityExecutiveState;
  readonly segmentCoverageLabel: string;
  readonly productCount: number;
  readonly groupsWithEnoughCustomers: number;
  readonly unassignedCustomerCount: number;
  readonly strongest: DashboardProductHighlightView | null;
  readonly weakest: DashboardProductHighlightView | null;
}

export interface DashboardDataCompletenessRow {
  readonly id: "orders" | "line_items" | "margin_contribution" | "marketing_spend" | "product_quality";
  readonly label: string;
  readonly status: DataCompletenessStatus;
  readonly detail: string;
}

export interface DashboardDataCompletenessView {
  readonly rows: readonly DashboardDataCompletenessRow[];
}

function weightedMeanLtvToCac(
  rows: readonly { cohortMonth: string; revenueLtvToCac: number | null; contributionLtvToCac: number | null }[],
  cacByMonth: ReadonlyMap<string, number>,
  field: "revenueLtvToCac" | "contributionLtvToCac",
): number | null {
  let weightedSum = 0;
  let weight = 0;
  for (const row of rows) {
    const ratio = row[field];
    if (ratio == null || !Number.isFinite(ratio)) continue;
    const w = cacByMonth.get(row.cohortMonth) ?? 0;
    if (w <= 0) continue;
    weightedSum += ratio * w;
    weight += w;
  }
  return weight === 0 ? null : weightedSum / weight;
}

function buildCacWeightMap(
  cacRows: readonly { month: string; acquiredCustomers: number; cac: number | null }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of cacRows) {
    if (r.acquiredCustomers > 0) {
      m.set(r.month, r.acquiredCustomers);
    }
  }
  return m;
}

function derivePaybackExecutive(
  preview: AcquisitionPageViewModel["preview"],
): Pick<
  DashboardAcquisitionExecutiveView,
  "paybackStatus" | "paybackLabel" | "cohortsWithPayback" | "cohortsEligibleForPayback" | "medianPaybackMonths"
> {
  if (!preview.hasSpend) {
    return {
      paybackStatus: "locked_no_spend",
      paybackLabel: "Locked — marketing spend required",
      cohortsWithPayback: 0,
      cohortsEligibleForPayback: 0,
      medianPaybackMonths: null,
    };
  }

  const eligible = preview.payback.rows.filter((r) => r.cac != null && r.cac > 0 && Number.isFinite(r.cac));
  const achieved = eligible.filter((r) => r.monthsToPayback != null);

  const hasContribLadder = preview.ltvCac.rows.some(
    (r) => r.avgContributionLtv != null && Number.isFinite(r.avgContributionLtv),
  );
  if (!hasContribLadder) {
    return {
      paybackStatus: "locked_no_contribution",
      paybackLabel: "Locked — contribution LTV path required for payback",
      cohortsWithPayback: 0,
      cohortsEligibleForPayback: eligible.length,
      medianPaybackMonths: null,
    };
  }

  const paybackMonths = achieved
    .map((r) => r.monthsToPayback)
    .filter((m): m is number => m != null && Number.isFinite(m))
    .sort((a, b) => a - b);
  const medianPaybackMonths =
    paybackMonths.length === 0
      ? null
      : paybackMonths.length % 2 === 1
        ? paybackMonths[(paybackMonths.length - 1) / 2]!
        : (paybackMonths[paybackMonths.length / 2 - 1]! + paybackMonths[paybackMonths.length / 2]!) / 2;

  let paybackStatus: PaybackExecutiveStatus;
  if (eligible.length === 0 || achieved.length === 0) {
    paybackStatus = "none_achieved";
  } else if (achieved.length === eligible.length) {
    paybackStatus = "achieved";
  } else {
    paybackStatus = "partial";
  }

  const medianSuffix = medianPaybackMonths != null ? ` · median M${medianPaybackMonths}` : "";
  const paybackLabel =
    eligible.length === 0
      ? "No cohort months with positive CAC in this snapshot"
      : `${achieved.length} of ${eligible.length} cohorts pay back${medianSuffix}`;

  return {
    paybackStatus,
    paybackLabel,
    cohortsWithPayback: achieved.length,
    cohortsEligibleForPayback: eligible.length,
    medianPaybackMonths,
  };
}

export function mapDashboardAcquisitionExecutive(
  acquisitionVm: AcquisitionPageViewModel,
  avgTerminalNetRevenueLtv: number | null,
  spendSource?: MarketingSpendSource,
): DashboardAcquisitionExecutiveView {
  const { summary, preview } = acquisitionVm;
  const spendIsEstimated = spendSource === "assumption";

  if (!summary.hasSpend) {
    return {
      lockedMissingSpend: true,
      spendSource,
      spendIsEstimated: false,
      blendedCac: null,
      revenueLtvToCac: null,
      contributionLtvToCac: null,
      ...derivePaybackExecutive(preview),
    };
  }

  const cacWeights = buildCacWeightMap(preview.cacByMonth.rows);
  let revenueLtvToCac = weightedMeanLtvToCac(preview.ltvCac.rows, cacWeights, "revenueLtvToCac");
  if (
    revenueLtvToCac == null &&
    summary.blendedCac != null &&
    summary.blendedCac > 0 &&
    avgTerminalNetRevenueLtv != null
  ) {
    revenueLtvToCac = avgTerminalNetRevenueLtv / summary.blendedCac;
  }

  const contributionLtvToCac = weightedMeanLtvToCac(preview.ltvCac.rows, cacWeights, "contributionLtvToCac");

  return {
    lockedMissingSpend: false,
    spendSource,
    spendIsEstimated,
    blendedCac: summary.blendedCac,
    revenueLtvToCac,
    contributionLtvToCac,
    ...derivePaybackExecutive(preview),
  };
}

function mapHighlight(
  productsVm: ProductsPageViewModel,
  productId: string | null,
): DashboardProductHighlightView | null {
  if (!productId) return null;
  const row = productsVm.tableRows.find((r) => r.productId === productId);
  if (!row || row.qualitySignal === "insufficient_data") return null;
  return {
    productId: row.productId,
    productTitle: row.productTitle,
    qualitySignal: row.qualitySignal,
    repeatPurchaseRate: row.repeatPurchaseRate,
    firstToSecondWithinWindowRate: row.firstToSecondWithinWindowRate,
    avgRevenueLtv: row.avgRevenueLtv,
  };
}

export function mapDashboardProductQualityExecutive(
  productsVm: ProductsPageViewModel,
): DashboardProductQualityExecutiveView {
  const { summary } = productsVm;
  const segmentCoverageLabel = `${summary.groupsWithEnoughCustomers} of ${summary.productCount} segments`;

  if (productsVm.missingLineItemCoverage) {
    return {
      state: "locked_no_line_items",
      segmentCoverageLabel,
      productCount: summary.productCount,
      groupsWithEnoughCustomers: summary.groupsWithEnoughCustomers,
      unassignedCustomerCount: summary.unassignedCustomerCount,
      strongest: null,
      weakest: null,
    };
  }

  if (summary.groupsWithEnoughCustomers === 0) {
    return {
      state: "insufficient_segments",
      segmentCoverageLabel,
      productCount: summary.productCount,
      groupsWithEnoughCustomers: 0,
      unassignedCustomerCount: summary.unassignedCustomerCount,
      strongest: null,
      weakest: null,
    };
  }

  return {
    state: "ready",
    segmentCoverageLabel,
    productCount: summary.productCount,
    groupsWithEnoughCustomers: summary.groupsWithEnoughCustomers,
    unassignedCustomerCount: summary.unassignedCustomerCount,
    strongest: mapHighlight(productsVm, summary.strongestProductId),
    weakest: mapHighlight(productsVm, summary.weakestProductId),
  };
}

function ordersHaveAnyLineItems(dataset: RetentionOSDataset): boolean {
  for (const o of dataset.orders) {
    if (o.lineItems.length > 0) return true;
  }
  return false;
}

export function buildDashboardDataCompletenessView(
  dataset: RetentionOSDataset,
  productsVm: ProductsPageViewModel,
): DashboardDataCompletenessView {
  const summary = getDatasetSummary(dataset);
  const hasImportedContribution = hasContributionMarginCoverage(dataset);

  let marginStatus: DataCompletenessStatus = "locked";
  let marginDetail = "Add contribution_margin on orders or save margin assumptions on /data.";
  if (hasImportedContribution) {
    marginStatus = "unlocked";
    marginDetail = "Imported order-level contribution_margin on orders.";
  } else if (summary.hasMarginAssumptions) {
    marginStatus = "partial";
    const pct = dataset.marginAssumptions?.contributionMarginPct;
    marginDetail =
      pct != null
        ? `Assumption-based — user margin assumption (${(pct * 100).toFixed(0)}% contribution) applied; not imported dollars.`
        : "Assumption-based — user margin assumption applied; not imported dollars.";
  }

  let lineItemStatus: DataCompletenessStatus = "locked";
  let lineItemDetail = "Upload combined order + line-item CSV with product_id.";
  if (productsVm.summary.hasLineItemCoverage) {
    lineItemStatus = "unlocked";
    lineItemDetail = "Line items with product_id present.";
  } else if (ordersHaveAnyLineItems(dataset)) {
    lineItemStatus = "partial";
    lineItemDetail = "Line rows exist but product_id coverage is missing.";
  }

  let productQualityStatus: DataCompletenessStatus = "locked";
  let productQualityDetail = "Requires line items with product_id.";
  if (productsVm.missingLineItemCoverage) {
    productQualityStatus = "locked";
  } else if (productsVm.summary.groupsWithEnoughCustomers > 0) {
    productQualityStatus = "unlocked";
    productQualityDetail = `${productsVm.summary.groupsWithEnoughCustomers} segment(s) meet the ≥${MIN_CUSTOMERS_FOR_SIGNAL} customer threshold.`;
  } else {
    productQualityStatus = "partial";
    productQualityDetail = `Line items present but no segment has ≥${MIN_CUSTOMERS_FOR_SIGNAL} customers — insufficient data, not ranked weak/strong.`;
  }

  const spendStatus: DataCompletenessStatus = summary.hasMarketingSpend
    ? summary.marketingSpendSource === "assumption"
      ? "partial"
      : "unlocked"
    : "locked";
  let spendDetail = "Save marketing spend on /data — use a % assumption or import a CSV — to unlock CAC, LTV:CAC, and payback.";
  if (summary.hasMarketingSpend) {
    if (summary.marketingSpendSource === "assumption") {
      const pct = dataset.marketingSpendAssumptions?.marketingSpendPctOfNetRevenue;
      spendDetail =
        pct != null
          ? `Estimated — ${(pct * 100).toFixed(0)}% of net merchandise revenue; not imported spend.`
          : "Estimated — marketing spend derived from your % assumption; not imported spend.";
    } else if (summary.marketingSpendSource === "actual_csv") {
      spendDetail = `${dataset.marketingSpend?.length ?? 0} imported spend row(s) attached to this session source.`;
    } else {
      spendDetail = `${dataset.marketingSpend?.length ?? 0} spend row(s) attached to this snapshot.`;
    }
  }

  return {
    rows: [
      {
        id: "orders",
        label: "Orders",
        status: dataset.orders.length > 0 ? "unlocked" : "locked",
        detail: `${dataset.orders.length.toLocaleString()} order(s) in the selected snapshot.`,
      },
      {
        id: "line_items",
        label: "Line items",
        status: lineItemStatus,
        detail: lineItemDetail,
      },
      {
        id: "margin_contribution",
        label: "Margin / contribution",
        status: marginStatus,
        detail: marginDetail,
      },
      {
        id: "marketing_spend",
        label: "Marketing spend",
        status: spendStatus,
        detail: spendDetail,
      },
      {
        id: "product_quality",
        label: "Product quality",
        status: productQualityStatus,
        detail: productQualityDetail,
      },
    ],
  };
}

export function buildSpineObservationBullets(
  acquisition: DashboardAcquisitionExecutiveView,
  productQuality: DashboardProductQualityExecutiveView,
): readonly string[] {
  const bullets: string[] = [];

  if (!acquisition.lockedMissingSpend && acquisition.revenueLtvToCac != null) {
    bullets.push(
      `Acquisition economics: blended CAC supports a terminal revenue LTV:CAC near ${acquisition.revenueLtvToCac.toFixed(1)}× in this snapshot — drill to /acquisition for month-level CAC and payback tables.`,
    );
  } else if (acquisition.lockedMissingSpend) {
    bullets.push(
      "Acquisition economics stay locked without marketing spend on the active session source — save spend on /data to surface CAC and payback here.",
    );
  }

  if (productQuality.state === "ready" && productQuality.strongest && productQuality.weakest) {
    bullets.push(
      `Entry-product dispersion: strongest anchor "${productQuality.strongest.productTitle}" vs weakest "${productQuality.weakest.productTitle}" — ${productQuality.segmentCoverageLabel} meet the minimum segment size on /products.`,
    );
  } else if (productQuality.state === "insufficient_segments") {
    bullets.push(
      `Product quality segments are below the ${MIN_CUSTOMERS_FOR_SIGNAL}-customer threshold — treat as insufficient data, not weak/strong rankings.`,
    );
  }

  return bullets.slice(0, 2);
}
