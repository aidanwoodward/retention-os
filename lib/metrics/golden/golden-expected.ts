/**
 * Hard-coded expected values for Sprint 5U-C golden reconciliation.
 *
 * Transcribed by hand from GOLDEN_EXPECTED_RESULTS.md.
 * Do NOT generate these by calling production calculators.
 */

/** Per-order financial worksheet (gross / discounts / refunds / net). */
export const GOLDEN_ORDER_NETS = {
  o1: { gross: 100, discounts: 10, refunds: 0, net: 90 },
  o2: { gross: 80, discounts: 0, refunds: 0, net: 80 },
  o3: { gross: 120, discounts: 20, refunds: 0, net: 100 },
  o4: { gross: 50, discounts: 0, refunds: 0, net: 50 },
  o5: { gross: 200, discounts: 0, refunds: 50, net: 150 },
  o6: { gross: 100, discounts: 0, refunds: 0, net: 100 },
  o7: { gross: 100, discounts: 0, refunds: 0, net: 100 },
  o8: { gross: 60, discounts: 10, refunds: 0, net: 50 },
  o9: { gross: 80, discounts: 0, refunds: 0, net: 80 },
  o10: { gross: 40, discounts: 0, refunds: 0, net: 40 },
} as const;

export const GOLDEN_COHORT_SIZES = {
  "2024-12": 3,
  "2025-01": 3,
} as const;

export const GOLDEN_PORTFOLIO = {
  totalCustomers: 6,
  repeatCustomers: 4,
  repeatPurchaseRate: 4 / 6,
  firstToSecondWithin90DaysRate: 3 / 6,
  portfolioNetRevenue: 840,
} as const;

/** Retention rates by cohort and offset (full staircases). */
export const GOLDEN_RETENTION: Readonly<Record<string, readonly number[]>> = {
  "2024-12": [1, 1 / 3, 0, 0, 1 / 3],
  "2025-01": [1, 1 / 3, 0, 0],
};

/** Revenue LTV (cumulative avg net) by cohort and offset. */
export const GOLDEN_REVENUE_LTV: Readonly<Record<string, readonly number[]>> = {
  "2024-12": [340 / 3, 140, 140, 140, 470 / 3],
  "2025-01": [110, 370 / 3, 370 / 3, 370 / 3],
};

/** Contribution LTV = 0.4 × revenue LTV at each offset. */
export const GOLDEN_CONTRIBUTION_LTV: Readonly<Record<string, readonly number[]>> = {
  "2024-12": [136 / 3, 56, 56, 56, 188 / 3],
  "2025-01": [44, 148 / 3, 148 / 3, 148 / 3],
};

export const GOLDEN_CAC = {
  "2024-12": 50,
  "2025-01": 60,
  blended: 55,
  totalSpend: 330,
} as const;

export const GOLDEN_LTV_CAC = {
  "2024-12": {
    terminalRevenueLtv: 470 / 3,
    terminalContributionLtv: 188 / 3,
    revenueLtvToCac: 470 / 150,
    contributionLtvToCac: 188 / 150,
  },
  "2025-01": {
    terminalRevenueLtv: 370 / 3,
    terminalContributionLtv: 148 / 3,
    revenueLtvToCac: 370 / 180,
    contributionLtvToCac: 148 / 180,
  },
} as const;

export const GOLDEN_PAYBACK = {
  "2024-12": 1 as number | null,
  "2025-01": null as number | null,
};

export const GOLDEN_PRODUCT_QUALITY = {
  prod_a: {
    customerCount: 4,
    repeatPurchaseRate: 3 / 4,
    firstToSecondWithinWindowRate: 3 / 4,
    avgRevenueLtv: 160,
    discountDragRate: 10 / 700,
    refundDragRate: 50 / 700,
    qualitySignal: "insufficient_data" as const,
  },
  prod_b: {
    customerCount: 2,
    repeatPurchaseRate: 1 / 2,
    firstToSecondWithinWindowRate: 0,
    avgRevenueLtv: 100,
    discountDragRate: 30 / 230,
    refundDragRate: 0,
    qualitySignal: "insufficient_data" as const,
  },
} as const;

/** Locked ImportedCsvMetricPreview subset (contribution unavailable without order margins). */
export const GOLDEN_CSV_PREVIEW = {
  customerCount: 6,
  orderCount: 10,
  productCount: 2,
  cohortCount: 2,
  firstCohort: "2024-12",
  lastCohort: "2025-01",
  totalRepeatPurchaseRate: 4 / 6,
  firstToSecondWithin90DaysRate: 3 / 6,
  averageMonth1ActiveRate: 1 / 3,
  averageMonth2ActiveRate: 0,
  averageMonth3ActiveRate: 0,
  latestAverageNetRevenueLTV: 140,
  contributionLTVAvailable: false,
  latestAverageContributionLTV: null,
} as const;

/** MET-SHARE — Jan 2025 reporting window over golden fixture (hand arithmetic). */
export const GOLDEN_COHORT_REVENUE_CONTRIBUTION_JAN_2025 = {
  totalReportingRevenue: 410,
  reportingOrderCount: 5,
  selectedCohortRevenue: 410,
  selectedCohortShareOfReportingRevenue: 1,
  cohortResolvedRevenue: 410,
  cohortAttributionCoverage: 1,
  status: "available" as const,
  rows: [
    {
      kind: "cohort" as const,
      cohortMonthKey: "2024-12",
      revenue: 80,
      shareOfReportingRevenue: 80 / 410,
      orderCount: 1,
      customerCount: 1,
    },
    {
      kind: "cohort" as const,
      cohortMonthKey: "2025-01",
      revenue: 330,
      shareOfReportingRevenue: 330 / 410,
      orderCount: 4,
      customerCount: 3,
    },
  ],
} as const;

/** MET-NEW-RETURN — Jan 2025 reporting window over golden fixture (hand arithmetic). */
export const GOLDEN_NEW_RETURNING_MIX_JAN_2025 = {
  newCustomerCount: 3,
  returningCustomerCount: 1,
  classifiedActiveCustomerCount: 4,
  newCustomerShare: 3 / 4,
  returningCustomerShare: 1 / 4,
  newRevenue: 230,
  returningRevenue: 180,
  unidentifiedRevenue: 0,
  unresolvedRevenue: 0,
  classifiedRevenue: 410,
  totalReportingRevenue: 410,
  newRevenueShareOfClassifiedRevenue: 230 / 410,
  returningRevenueShareOfClassifiedRevenue: 180 / 410,
  revenueClassificationCoverage: 1,
  reportingOrderCount: 5,
  status: "available" as const,
} as const;

/** MET-AOV-FREQ — Jan 2025 reporting period (hand arithmetic; 4 x 1.25 x 82 = 410). */
export const GOLDEN_AOV_FREQUENCY_JAN_2025 = {
  totalReportingRevenue: 410,
  reportingOrderCount: 5,
  portfolioAverageOrderValue: 82,
  activeCustomerCount: 4,
  classifiedOrderCount: 5,
  classifiedRevenue: 410,
  ordersPerActiveCustomer: 1.25,
  classifiedAverageOrderValue: 82,
  revenuePerActiveCustomer: 102.5,
  unidentifiedOrderCount: 0,
  unidentifiedRevenue: 0,
  unresolvedOrderCount: 0,
  unresolvedRevenue: 0,
  customerIdentityOrderCoverage: 1,
  customerIdentityRevenueCoverage: 1,
  status: "available" as const,
} as const;

/** MET-REV-RETENTION — asOf 2025-05-01 over golden fixture (hand arithmetic). */
export const GOLDEN_COHORT_REVENUE_RETENTION_ASOF_2025_05_01 = {
  maxOffset: 4,
  eligibleCustomerCount: 6,
  status: "available" as const,
  rows: [
    {
      cohortMonthKey: "2024-12",
      cohortCustomerCount: 3,
      month0Revenue: 340,
      cells: [
        {
          offset: 0,
          periodMonthKey: "2024-12",
          maturityStatus: "complete" as const,
          revenue: 340,
          retentionRate: 1,
          orderCount: 3,
          activeCustomerCount: 3,
        },
        {
          offset: 1,
          periodMonthKey: "2025-01",
          maturityStatus: "complete" as const,
          revenue: 80,
          retentionRate: 80 / 340,
          orderCount: 1,
          activeCustomerCount: 1,
        },
        {
          offset: 2,
          periodMonthKey: "2025-02",
          maturityStatus: "complete" as const,
          revenue: 0,
          retentionRate: 0,
          orderCount: 0,
          activeCustomerCount: 0,
        },
        {
          offset: 3,
          periodMonthKey: "2025-03",
          maturityStatus: "complete" as const,
          revenue: 0,
          retentionRate: 0,
          orderCount: 0,
          activeCustomerCount: 0,
        },
        {
          offset: 4,
          periodMonthKey: "2025-04",
          maturityStatus: "complete" as const,
          revenue: 50,
          retentionRate: 50 / 340,
          orderCount: 1,
          activeCustomerCount: 1,
        },
      ],
    },
    {
      cohortMonthKey: "2025-01",
      cohortCustomerCount: 3,
      month0Revenue: 330,
      cells: [
        {
          offset: 0,
          periodMonthKey: "2025-01",
          maturityStatus: "complete" as const,
          revenue: 330,
          retentionRate: 1,
          orderCount: 4,
          activeCustomerCount: 3,
        },
        {
          offset: 1,
          periodMonthKey: "2025-02",
          maturityStatus: "complete" as const,
          revenue: 40,
          retentionRate: 40 / 330,
          orderCount: 1,
          activeCustomerCount: 1,
        },
        {
          offset: 2,
          periodMonthKey: "2025-03",
          maturityStatus: "complete" as const,
          revenue: 0,
          retentionRate: 0,
          orderCount: 0,
          activeCustomerCount: 0,
        },
        {
          offset: 3,
          periodMonthKey: "2025-04",
          maturityStatus: "complete" as const,
          revenue: 0,
          retentionRate: 0,
          orderCount: 0,
          activeCustomerCount: 0,
        },
        {
          offset: 4,
          periodMonthKey: "2025-05",
          maturityStatus: "unavailable" as const,
          revenue: null,
          retentionRate: null,
          orderCount: null,
          activeCustomerCount: null,
        },
      ],
    },
  ],
} as const;
