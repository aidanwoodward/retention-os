/**
 * Thin machine-checkable linkage from contracted MetricIds to engine / UI / tests.
 * Formula prose lives in docs/METRIC_CONTRACTS.md — do not duplicate it here.
 */

import type { MetricId } from "./metric-definitions";

/** Contracted MetricIds for Sprint 5U-B (excludes appendix-only `aov`). */
export const CONTRACTED_METRIC_IDS = [
  "gross_revenue",
  "discounts",
  "refunds",
  "net_revenue",
  "repeat_purchase_rate",
  "first_to_second_conversion",
  "cohort_retention",
  "revenue_ltv",
  "contribution_ltv",
  "cac",
  "blended_cac",
  "revenue_ltv_cac",
  "contribution_ltv_cac",
  "payback",
  "product_quality",
  "revenue_durability_posture",
  "marketing_spend_assumption",
] as const;

export type ContractedMetricId = (typeof CONTRACTED_METRIC_IDS)[number];

export interface MetricContractIndexEntry {
  readonly id: ContractedMetricId;
  /** Anchor under docs/METRIC_CONTRACTS.md (heading slug). */
  readonly docAnchor: string;
  readonly engineEntrypoints: readonly string[];
  readonly viewModelBuilders: readonly string[];
  readonly uiRoutes: readonly string[];
  readonly existingTests: readonly string[];
}

const DOC = "docs/METRIC_CONTRACTS.md";

export const METRIC_CONTRACT_INDEX: Readonly<Record<ContractedMetricId, MetricContractIndexEntry>> = {
  gross_revenue: {
    id: "gross_revenue",
    docAnchor: `${DOC}#gross_revenue`,
    engineEntrypoints: ["Order.grossRevenue", "lib/metrics/utils.ts::netOrderRevenue"],
    viewModelBuilders: ["buildDataPageViewModelFromDataset", "import review / preview"],
    uiRoutes: ["/data"],
    existingTests: [
      "lib/metrics/metric-definitions.test.ts",
      "lib/import/shopify/shopify-orders-csv.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  discounts: {
    id: "discounts",
    docAnchor: `${DOC}#discounts`,
    engineEntrypoints: ["Order.discounts", "lib/metrics/utils.ts::netOrderRevenue"],
    viewModelBuilders: ["buildDataPageViewModelFromDataset", "calculateFirstProductCustomerQuality"],
    uiRoutes: ["/data", "/products"],
    existingTests: [
      "lib/metrics/metric-definitions.test.ts",
      "lib/metrics/product-quality.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  refunds: {
    id: "refunds",
    docAnchor: `${DOC}#refunds`,
    engineEntrypoints: ["Order.refunds", "lib/metrics/utils.ts::netOrderRevenue"],
    viewModelBuilders: ["buildDataPageViewModelFromDataset", "calculateFirstProductCustomerQuality"],
    uiRoutes: ["/data", "/products"],
    existingTests: [
      "lib/metrics/metric-definitions.test.ts",
      "lib/metrics/product-quality.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  net_revenue: {
    id: "net_revenue",
    docAnchor: `${DOC}#net_revenue`,
    engineEntrypoints: ["lib/metrics/utils.ts::netOrderRevenue", "lib/metrics/cohorts.ts::calculateCohorts"],
    viewModelBuilders: [
      "buildDashboardExecutiveViewModelFromDataset",
      "buildCohortsPageViewModelFromDataset",
      "buildLTVPageViewModelFromDataset",
    ],
    uiRoutes: ["/dashboard", "/cohorts", "/ltv", "/data"],
    existingTests: [
      "lib/metrics/demo-sanity-check.test.ts",
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/metric-definitions.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  repeat_purchase_rate: {
    id: "repeat_purchase_rate",
    docAnchor: `${DOC}#repeat_purchase_rate`,
    engineEntrypoints: ["lib/metrics/repeat-purchase.ts::calculateRepeatPurchaseRate"],
    viewModelBuilders: [
      "buildDashboardExecutiveViewModelFromDataset",
      "buildRetentionPageViewModelFromDataset",
      "buildInsightsPageViewModelFromDataset",
    ],
    uiRoutes: ["/dashboard", "/retention", "/insights"],
    existingTests: [
      "lib/metrics/demo-sanity-check.test.ts",
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/revenue-durability-status.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  first_to_second_conversion: {
    id: "first_to_second_conversion",
    docAnchor: `${DOC}#first_to_second_conversion`,
    engineEntrypoints: ["lib/metrics/repeat-purchase.ts::calculateFirstToSecondOrderConversion"],
    viewModelBuilders: [
      "buildDashboardExecutiveViewModelFromDataset",
      "buildRetentionPageViewModelFromDataset",
      "buildInsightsPageViewModelFromDataset",
      "calculateFirstProductCustomerQuality",
    ],
    uiRoutes: ["/dashboard", "/retention", "/insights", "/products"],
    existingTests: [
      "lib/metrics/demo-sanity-check.test.ts",
      "lib/metrics/product-quality.test.ts",
      "lib/metrics/revenue-durability-status.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  cohort_retention: {
    id: "cohort_retention",
    docAnchor: `${DOC}#cohort_retention`,
    engineEntrypoints: ["lib/metrics/retention.ts::calculateRetentionByCohort"],
    viewModelBuilders: [
      "buildRetentionPageViewModelFromDataset",
      "buildCohortsPageViewModelFromDataset",
      "buildCohortMatrixFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
      "buildInsightsPageViewModelFromDataset",
    ],
    uiRoutes: ["/retention", "/cohorts", "/dashboard", "/insights"],
    existingTests: [
      "lib/metrics/demo-sanity-check.test.ts",
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/revenue-durability-status.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  revenue_ltv: {
    id: "revenue_ltv",
    docAnchor: `${DOC}#revenue_ltv`,
    engineEntrypoints: ["lib/metrics/ltv.ts::calculateLTVByCohort"],
    viewModelBuilders: [
      "buildLTVPageViewModelFromDataset",
      "buildCohortMatrixFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
      "buildAcquisitionPageViewModelFromDataset",
      "buildInsightsPageViewModelFromDataset",
    ],
    uiRoutes: ["/ltv", "/cohorts", "/dashboard", "/acquisition", "/insights"],
    existingTests: [
      "lib/metrics/demo-sanity-check.test.ts",
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  contribution_ltv: {
    id: "contribution_ltv",
    docAnchor: `${DOC}#contribution_ltv`,
    engineEntrypoints: [
      "lib/metrics/utils.ts::orderContribution",
      "lib/metrics/ltv.ts::calculateLTVByCohort",
    ],
    viewModelBuilders: [
      "buildLTVPageViewModelFromDataset",
      "buildCohortMatrixFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
      "buildAcquisitionPageViewModelFromDataset",
      "buildInsightsPageViewModelFromDataset",
    ],
    uiRoutes: ["/ltv", "/cohorts", "/dashboard", "/acquisition", "/insights"],
    existingTests: [
      "lib/metrics/demo-sanity-check.test.ts",
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  cac: {
    id: "cac",
    docAnchor: `${DOC}#cac`,
    engineEntrypoints: ["lib/metrics/acquisition.ts::calculateCACByMonth"],
    viewModelBuilders: [
      "buildAcquisitionPageViewModelFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
    ],
    uiRoutes: ["/acquisition", "/dashboard", "/data"],
    existingTests: [
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/data-source/resolve-marketing-spend.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  blended_cac: {
    id: "blended_cac",
    docAnchor: `${DOC}#blended_cac`,
    engineEntrypoints: ["lib/metrics/acquisition.ts::calculateBlendedCAC"],
    viewModelBuilders: [
      "buildAcquisitionPageViewModelFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
      "mapDashboardAcquisitionExecutive",
    ],
    uiRoutes: ["/acquisition", "/dashboard"],
    existingTests: [
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  revenue_ltv_cac: {
    id: "revenue_ltv_cac",
    docAnchor: `${DOC}#revenue_ltv_cac`,
    engineEntrypoints: ["lib/metrics/acquisition.ts::calculateLtvToCac"],
    viewModelBuilders: [
      "buildAcquisitionPageViewModelFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
      "mapDashboardAcquisitionExecutive",
    ],
    uiRoutes: ["/acquisition", "/dashboard"],
    existingTests: [
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  contribution_ltv_cac: {
    id: "contribution_ltv_cac",
    docAnchor: `${DOC}#contribution_ltv_cac`,
    engineEntrypoints: ["lib/metrics/acquisition.ts::calculateLtvToCac"],
    viewModelBuilders: [
      "buildAcquisitionPageViewModelFromDataset",
      "mapDashboardAcquisitionExecutive",
    ],
    uiRoutes: ["/acquisition", "/dashboard"],
    existingTests: [
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  payback: {
    id: "payback",
    docAnchor: `${DOC}#payback`,
    engineEntrypoints: ["lib/metrics/acquisition.ts::calculatePaybackPeriod"],
    viewModelBuilders: [
      "buildAcquisitionPageViewModelFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
      "mapDashboardAcquisitionExecutive",
    ],
    uiRoutes: ["/acquisition", "/dashboard"],
    existingTests: [
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  product_quality: {
    id: "product_quality",
    docAnchor: `${DOC}#product_quality`,
    engineEntrypoints: [
      "lib/metrics/product-quality.ts::calculateFirstProductCustomerQuality",
      "lib/metrics/product-quality.ts::calculateFirstProductCustomerQualityFromDataset",
    ],
    viewModelBuilders: [
      "buildProductsPageViewModelFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
      "mapDashboardProductQualityExecutive",
    ],
    uiRoutes: ["/products", "/dashboard"],
    existingTests: [
      "lib/metrics/product-quality.test.ts",
      "lib/metrics/dashboard-view-model.test.ts",
      "lib/metrics/golden-reconciliation.test.ts",
    ],
  },
  revenue_durability_posture: {
    id: "revenue_durability_posture",
    docAnchor: `${DOC}#revenue_durability_posture`,
    engineEntrypoints: ["lib/metrics/revenue-durability-status.ts::evaluateRevenueDurabilityStatus"],
    viewModelBuilders: [
      "buildDashboardExecutiveViewModelFromDataset",
      "buildInsightsPageViewModelFromDataset",
    ],
    uiRoutes: ["/dashboard", "/insights"],
    existingTests: [
      "lib/metrics/revenue-durability-status.test.ts",
      "lib/metrics/dashboard-view-model.test.ts",
    ],
  },
  marketing_spend_assumption: {
    id: "marketing_spend_assumption",
    docAnchor: `${DOC}#marketing_spend_assumption`,
    engineEntrypoints: [
      "lib/data-source spend resolution",
      "lib/metrics/acquisition.ts (consumes MarketingSpend[])",
    ],
    viewModelBuilders: [
      "buildAcquisitionPageViewModelFromDataset",
      "buildDataPageViewModelFromDataset",
      "buildDashboardExecutiveViewModelFromDataset",
    ],
    uiRoutes: ["/data", "/acquisition", "/dashboard"],
    existingTests: [
      "lib/data-source/synthesize-marketing-spend-assumption.test.ts",
      "lib/data-source/marketing-spend-assumption-session.test.ts",
      "lib/data-source/resolve-marketing-spend.test.ts",
    ],
  },
};

export function getMetricContractIndexEntry(id: ContractedMetricId): MetricContractIndexEntry {
  const entry = METRIC_CONTRACT_INDEX[id];
  if (!entry) {
    throw new Error(`Unknown contracted metric id: ${id}`);
  }
  return entry;
}

/** Type guard: MetricId is in the contracted set (excludes appendix-only ids such as aov). */
export function isContractedMetricId(id: MetricId): id is ContractedMetricId {
  return (CONTRACTED_METRIC_IDS as readonly string[]).includes(id);
}
