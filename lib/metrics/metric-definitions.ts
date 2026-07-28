/**
 * Central metric definitions for MVP command-centre tooltips.
 * Revenue-related Shopify copy is paraphrased from official Help Center pages only.
 */

export type MetricDataQuality = "actual" | "estimated" | "partial" | "unavailable";

export type MetricId =
  | "net_revenue"
  | "gross_revenue"
  | "discounts"
  | "refunds"
  | "aov"
  | "repeat_purchase_rate"
  | "first_to_second_conversion"
  | "cohort_retention"
  | "cohort_revenue_contribution"
  | "revenue_ltv"
  | "contribution_ltv"
  | "cac"
  | "blended_cac"
  | "revenue_ltv_cac"
  | "contribution_ltv_cac"
  | "payback"
  | "product_quality"
  | "revenue_durability_posture"
  | "marketing_spend_assumption";

export interface MetricDefinition {
  readonly id: MetricId;
  readonly name: string;
  readonly meaning: string;
  readonly shopifyDefinition?: string;
  readonly shopifySourceUrls?: readonly string[];
  readonly retentionOsBasis: string;
  readonly caveat?: string;
  readonly defaultDataQuality: MetricDataQuality;
  readonly dataQualityNotes?: Partial<Record<MetricDataQuality, string>>;
}

export interface MetricTooltipSection {
  readonly label: string;
  readonly body: string;
}

export const SHOPIFY_HELP = {
  salesReports:
    "https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/sales-report",
  analyticsFields:
    "https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/analytics-fields",
  financeReports:
    "https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/finances-report",
  profitReports:
    "https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/profit-reports",
  marketingPerformance:
    "https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/marketing-performance",
} as const;

const RETENTIONOS_NET_DIVERGENCE =
  "RetentionOS uses net merchandise revenue for customer economics. Tax and shipping are excluded. Shopify Total sales is not used for LTV, CAC, payback, or contribution LTV because it includes pass-through tax, shipping, duties, and fees";

export const ALL_METRIC_IDS: readonly MetricId[] = [
  "net_revenue",
  "gross_revenue",
  "discounts",
  "refunds",
  "aov",
  "repeat_purchase_rate",
  "first_to_second_conversion",
  "cohort_retention",
  "cohort_revenue_contribution",
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

/** Revenue metrics that require official Shopify Help Center alignment. */
export const REVENUE_METRIC_IDS: readonly MetricId[] = [
  "gross_revenue",
  "discounts",
  "refunds",
  "net_revenue",
  "aov",
  "revenue_ltv",
  "contribution_ltv",
] as const;

export const METRIC_DEFINITIONS: Readonly<Record<MetricId, MetricDefinition>> = {
  gross_revenue: {
    id: "gross_revenue",
    name: "Gross sales",
    meaning: "Merchandise sold at full line price before discounts and returns",
    shopifyDefinition: "Product price x quantity before taxes, shipping, discounts, and returns",
    shopifySourceUrls: [SHOPIFY_HELP.salesReports, SHOPIFY_HELP.analyticsFields],
    retentionOsBasis:
      "Line-derived gross merchandise revenue per order (`order.grossRevenue` from combined order + line-item CSV)",
    caveat:
      "CSV totals may differ from Shopify Admin if parsing, test orders, or timing differ. Compare-at price is not treated as a discount",
    defaultDataQuality: "actual",
  },

  discounts: {
    id: "discounts",
    name: "Discounts",
    meaning: "Price reductions applied at checkout before tax",
    shopifyDefinition:
      "Line-item discounts plus each line's share of order-level discounts. Created via discount codes, not compare-at price",
    shopifySourceUrls: [SHOPIFY_HELP.salesReports, SHOPIFY_HELP.financeReports],
    retentionOsBasis: "Order-level `order.discounts` from import, subtracted before net merchandise revenue",
    caveat: "Export allocation gaps can diverge from Shopify Analytics Discounts",
    defaultDataQuality: "actual",
  },

  refunds: {
    id: "refunds",
    name: "Returns / refunds",
    meaning: "Merchandise value reversed after the original sale",
    shopifyDefinition:
      "Returns: value of goods returned. Sales reversals (broader): any order adjustment with negative value, including cancellations and edits to shipping, tax, fees, and discounts",
    shopifySourceUrls: [SHOPIFY_HELP.salesReports, SHOPIFY_HELP.analyticsFields],
    retentionOsBasis: "Order-level `order.refunds` from import, subtracted in net merchandise revenue",
    caveat:
      "RetentionOS refunds are narrower than Shopify sales reversals (no shipping/tax/fee reversal layer). Return timing in CSV may differ from Shopify finance reports",
    defaultDataQuality: "actual",
  },

  net_revenue: {
    id: "net_revenue",
    name: "Net merchandise revenue",
    meaning: "Merchandise revenue after discounts and refunds, the customer economics revenue base",
    shopifyDefinition:
      "Net sales = gross sales - discounts - sales reversals (returns). Excludes shipping and tax. Preferred over gross sales for most analyses",
    shopifySourceUrls: [SHOPIFY_HELP.salesReports, SHOPIFY_HELP.analyticsFields, SHOPIFY_HELP.financeReports],
    retentionOsBasis:
      "Net merchandise revenue = line-derived gross revenue - order discounts - order refunds (`netOrderRevenue`). Used for portfolio totals and LTV staircases",
    caveat: `${RETENTIONOS_NET_DIVERGENCE}. Negative per-order nets are floored to zero in the engine`,
    defaultDataQuality: "actual",
  },

  aov: {
    id: "aov",
    name: "Average order value (AOV)",
    meaning: "Average merchandise value per order before post-order adjustments",
    shopifyDefinition:
      "(Gross sales - discounts) / number of orders, excluding post-order adjustments such as returns and order edits",
    shopifySourceUrls: [
      SHOPIFY_HELP.salesReports,
      SHOPIFY_HELP.analyticsFields,
      SHOPIFY_HELP.marketingPerformance,
    ],
    retentionOsBasis:
      "Not computed in the metric engine this sprint. Target basis when added: (sum line-derived gross - sum discounts) / order count, not Total sales / orders",
    caveat: "Legacy API routes may use total_price-based AOV; MVP command-centre does not display AOV yet",
    defaultDataQuality: "unavailable",
  },

  repeat_purchase_rate: {
    id: "repeat_purchase_rate",
    name: "Repeat purchase rate",
    meaning: "Share of customers who placed at least two qualifying orders in the snapshot",
    retentionOsBasis: "Customers with >=2 orders / all customers in the dataset (`calculateRepeatPurchaseRate`)",
    defaultDataQuality: "actual",
  },

  first_to_second_conversion: {
    id: "first_to_second_conversion",
    name: "First-to-second conversion",
    meaning: "Share of customers whose second order falls within the conversion window after their first order",
    retentionOsBasis:
      "Second order within 90 calendar days of first order timestamp / all customers (`calculateFirstToSecondOrderConversion`)",
    caveat: "Journey timing metric, not the same as calendar Month +N cohort retention",
    defaultDataQuality: "actual",
  },

  cohort_retention: {
    id: "cohort_retention",
    name: "Cohort retention (Month +N active)",
    meaning: "Share of a first-order cohort with at least one order in calendar month M+N",
    retentionOsBasis:
      "Active customers in offset month / cohort size, where cohort month M is UTC month of first order (`calculateRetentionByCohort`)",
    caveat: "Calendar-month breadth, not interchangeable with first-to-second journey timing",
    defaultDataQuality: "actual",
  },

  cohort_revenue_contribution: {
    id: "cohort_revenue_contribution",
    name: "Acquisition cohort revenue contribution",
    meaning:
      "Each acquisition cohort's share of selected reporting-period trusted net revenue, with absolute support and explicit identity/scope residuals",
    retentionOsBasis:
      "Sum netOrderRevenue(reportingOrders) attributed by utcMonthKeyFromIso(customer.firstOrderAt); residuals unidentified_customer / outside_selected_acquisition_period / unresolved_customer (calculateCohortRevenueContribution). Not cumulative LTV",
    caveat:
      "Period portfolio share, not cohort LTV. Guest and unresolved revenue stay in the denominator via residual rows. Planned UI destinations: /cohorts and /dashboard (not wired in MET-SHARE)",
    defaultDataQuality: "actual",
  },

  revenue_ltv: {
    id: "revenue_ltv",
    name: "Revenue LTV",
    meaning: "Average cumulative net merchandise revenue per cohort customer through a staircase age",
    shopifyDefinition:
      "Built on Shopify net sales concept: merchandise revenue after discounts and reversals, excluding tax and shipping",
    shopifySourceUrls: [SHOPIFY_HELP.analyticsFields, SHOPIFY_HELP.salesReports],
    retentionOsBasis:
      "Sum net merchandise revenue through cohort-age month / cohort size (`calculateLTVByCohort`). Terminal value = latest available staircase tail",
    caveat: `${RETENTIONOS_NET_DIVERGENCE}. Engine field \`cumulativeAvgGrossRevenue\` stores this net value despite the gross name`,
    defaultDataQuality: "actual",
  },

  contribution_ltv: {
    id: "contribution_ltv",
    name: "Contribution LTV",
    meaning: "Average cumulative contribution dollars per cohort customer through a staircase age",
    shopifyDefinition:
      "Shopify gross profit = net sales - cost of goods sold; gross margin = gross profit / net sales. Requires COGS in Shopify",
    shopifySourceUrls: [SHOPIFY_HELP.analyticsFields, SHOPIFY_HELP.profitReports, SHOPIFY_HELP.salesReports],
    retentionOsBasis:
      "Same LTV staircase using `orderContribution`: imported contribution_margin when present, else net merchandise revenue x margin assumptions",
    caveat:
      "Modeled contribution, not Shopify Profit reports unless margin assumptions map to your COGS. Unavailable without margin data or assumptions",
    defaultDataQuality: "partial",
    dataQualityNotes: {
      partial: "Contribution path uses margin assumptions or partial order-level contribution data",
      unavailable: "No imported contribution margin and no saved margin assumptions on /data",
    },
  },

  cac: {
    id: "cac",
    name: "CAC (monthly)",
    meaning: "Customer acquisition cost for customers acquired in a given first-order month",
    retentionOsBasis: "Monthly marketing spend / new customers (first-order month) (`calculateCACByMonth`)",
    caveat: "Requires marketing spend aligned to acquisition months",
    defaultDataQuality: "actual",
    dataQualityNotes: {
      estimated: "Spend is synthesized from a % of net revenue assumption, not imported spend CSV",
      unavailable: "Locked until marketing spend data or an assumption is saved on /data",
    },
  },

  blended_cac: {
    id: "blended_cac",
    name: "Blended CAC",
    meaning: "Total marketing spend divided across all customers in the snapshot",
    retentionOsBasis: "Total spend in file / all customers (`calculateBlendedCAC`)",
    caveat: "Deliberately blunt, not a strict calendar-matched cohort CAC unless spend and customer windows align",
    defaultDataQuality: "actual",
    dataQualityNotes: {
      estimated: "Spend is synthesized from a % of net revenue assumption, not imported spend CSV",
      unavailable: "Locked until marketing spend data or an assumption is saved on /data",
    },
  },

  revenue_ltv_cac: {
    id: "revenue_ltv_cac",
    name: "Revenue LTV:CAC",
    meaning: "Terminal revenue LTV divided by cohort-month CAC",
    retentionOsBasis: "Terminal net revenue LTV for cohort month / CAC for that month (`calculateLtvToCac`)",
    caveat: "Revenue lens only, uses net merchandise LTV, not contribution",
    defaultDataQuality: "actual",
    dataQualityNotes: {
      estimated: "CAC uses assumption-based spend, not imported spend CSV",
      unavailable: "Requires unlocked acquisition economics",
    },
  },

  contribution_ltv_cac: {
    id: "contribution_ltv_cac",
    name: "Contribution LTV:CAC",
    meaning: "Terminal contribution LTV divided by cohort-month CAC",
    retentionOsBasis: "Terminal contribution LTV for cohort month / CAC for that month",
    caveat: "Requires a contribution path (imported margin or assumptions)",
    defaultDataQuality: "partial",
    dataQualityNotes: {
      partial: "Contribution LTV uses margin assumptions or partial order-level data",
      estimated: "CAC uses assumption-based spend, not imported spend CSV",
      unavailable: "No contribution staircase or no marketing spend",
    },
  },

  payback: {
    id: "payback",
    name: "Payback",
    meaning: "First cohort-age month when cumulative average contribution LTV meets or exceeds CAC",
    retentionOsBasis:
      "First offset where cumulative avg contribution LTV >= cohort-month CAC (`calculatePaybackPeriod`)",
    caveat: "Contribution payback only, not revenue payback",
    defaultDataQuality: "partial",
    dataQualityNotes: {
      partial: "Requires contribution LTV staircase and positive CAC",
      estimated: "CAC uses assumption-based spend, not imported spend CSV",
      unavailable: "Locked without spend, contribution path, or achievable payback",
    },
  },

  product_quality: {
    id: "product_quality",
    name: "Product quality",
    meaning: "Whether customers acquired through a first product show durable repeat, conversion, and LTV signals",
    retentionOsBasis:
      "Segments by first line item on chronological first order; compares repeat, F2S, and LTV vs portfolio baselines (`calculateFirstProductCustomerQuality`)",
    caveat:
      "First-product attribution only, not full basket or multi-product journeys. Segments below minimum customer count are insufficient data, not weak/strong verdicts",
    defaultDataQuality: "partial",
    dataQualityNotes: {
      partial: "Requires line items with product identifiers",
      unavailable: "Locked without line-item product data",
    },
  },

  revenue_durability_posture: {
    id: "revenue_durability_posture",
    name: "Revenue durability posture",
    meaning: "Informal Healthy / Mixed / Watch label from repeatable portfolio threshold checks",
    retentionOsBasis:
      "Vote heuristic on repeat rate, first-to-second within 90 days, Month +1 active, and LTV cohort spread (`evaluateRevenueDurabilityStatus`)",
    caveat: "Posture label only, not a numeric durability score, composite index, or finance-grade durability metric",
    defaultDataQuality: "actual",
  },

  marketing_spend_assumption: {
    id: "marketing_spend_assumption",
    name: "Marketing spend",
    meaning: "Marketing spend attached to acquisition economics, imported or estimated",
    shopifyDefinition:
      "Shopify net sales is the revenue base for spend-as-% assumptions; Total sales includes tax and shipping for cash-flow views",
    shopifySourceUrls: [SHOPIFY_HELP.analyticsFields, SHOPIFY_HELP.salesReports],
    retentionOsBasis:
      "Imported: marketing spend CSV rows by month. Estimated: % x sum(net merchandise revenue by UTC order month) synthesized into spend rows",
    caveat: RETENTIONOS_NET_DIVERGENCE,
    defaultDataQuality: "estimated",
    dataQualityNotes: {
      actual: "Spend from imported marketing spend CSV saved in session",
      estimated: "Spend synthesized from % of net revenue assumption, not imported spend data",
      unavailable: "No spend CSV or assumption saved on /data",
    },
  },
};

export function getMetricDefinition(id: MetricId): MetricDefinition {
  const def = METRIC_DEFINITIONS[id];
  if (!def) {
    throw new Error(`Unknown metric id: ${id}`);
  }
  return def;
}

const DATA_QUALITY_LABELS: Record<MetricDataQuality, string> = {
  actual: "Actual",
  estimated: "Estimated",
  partial: "Partial",
  unavailable: "Unavailable",
};

/** Collect user-facing copy strings from a definition (for tests and lint-style checks). */
export function collectMetricDefinitionCopy(def: MetricDefinition): string[] {
  const out = [def.name, def.meaning, def.retentionOsBasis];
  if (def.shopifyDefinition) out.push(def.shopifyDefinition);
  if (def.caveat) out.push(def.caveat);
  if (def.dataQualityNotes) {
    out.push(...Object.values(def.dataQualityNotes));
  }
  return out;
}

export function formatMetricDefinitionTooltip(
  def: MetricDefinition,
  dataQuality?: MetricDataQuality,
): MetricTooltipSection[] {
  const sections: MetricTooltipSection[] = [{ label: "Meaning", body: def.meaning }];

  if (def.shopifyDefinition) {
    sections.push({ label: "Shopify", body: def.shopifyDefinition });
  }

  sections.push({ label: "RetentionOS", body: def.retentionOsBasis });

  if (def.caveat) {
    sections.push({ label: "Caveat", body: def.caveat });
  }

  const quality = dataQuality ?? def.defaultDataQuality;
  const note = def.dataQualityNotes?.[quality];
  if (note || quality !== def.defaultDataQuality) {
    const prefix = DATA_QUALITY_LABELS[quality];
    sections.push({
      label: "Data quality",
      body: note ?? `This value is ${prefix.toLowerCase()} for the current data source`,
    });
  }

  return sections;
}
