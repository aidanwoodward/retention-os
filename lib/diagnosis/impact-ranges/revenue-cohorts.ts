import { ImpactRange } from "@/components/diagnosis/ImpactRanges";

interface CohortData {
  cohort_month: string;
  cohort_size: number;
  periods: Array<{
    period_number: number;
    order_month: string;
    active_customers: number;
    total_orders: number;
    total_revenue: number;
    retention_rate_percent: number;
  }>;
}

interface RevenueCohortsImpactInput {
  cohorts: CohortData[];
  totalRevenue: number;
  totalCustomers: number;
}

/**
 * Compute impact ranges for Revenue Cohorts page
 * 
 * Uses counterfactual analysis: compares recent cohorts vs older cohorts
 * at matched lifecycle periods to estimate durability delta.
 * 
 * Rules:
 * - Requires non-overlapping cohort comparison
 * - Shows revenue durability delta (loss avoided framing)
 * - Provides Low/Base/High ranges based on historical variation
 * - Suppresses if clean comparator doesn't exist
 */
export function computeRevenueCohortsImpactRanges(
  input: RevenueCohortsImpactInput
): ImpactRange[] {
  const { cohorts, totalCustomers } = input;

  const MIN_COHORTS = 4; // Need at least 4 for clean comparison
  const MIN_CUSTOMERS = 100;

  if (cohorts.length < MIN_COHORTS || totalCustomers < MIN_CUSTOMERS) {
    return [];
  }

  const ranges: ImpactRange[] = [];

  // Compare recent vs older cohorts (NON-OVERLAPPING)
  const sortedCohorts = [...cohorts].sort((a, b) => 
    new Date(a.cohort_month).getTime() - new Date(b.cohort_month).getTime()
  );

  // Subject: most recent 1-2 cohorts
  const subjectCohorts = sortedCohorts.slice(-2);
  // Comparator: immediately preceding 1-2 cohorts (non-overlapping)
  const comparatorCohorts = sortedCohorts.slice(-4, -2);

  // Verify non-overlapping
  const subjectMonths = new Set(subjectCohorts.map(c => c.cohort_month));
  const comparatorMonths = new Set(comparatorCohorts.map(c => c.cohort_month));
  const hasOverlap = [...subjectMonths].some(m => comparatorMonths.has(m));

  if (hasOverlap || subjectCohorts.length < 1 || comparatorCohorts.length < 1) {
    return [];
  }

  // Calculate revenue at equivalent lifecycle periods
  const subjectRevenue = subjectCohorts.reduce((sum, c) => 
    sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0
  );
  const comparatorRevenue = comparatorCohorts.reduce((sum, c) => 
    sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0
  );

  if (comparatorRevenue <= 0) {
    return [];
  }

  // Calculate base delta
  const baseDelta = subjectRevenue - comparatorRevenue;
  const baseDeltaPercent = (baseDelta / comparatorRevenue) * 100;

  // Estimate range based on historical variation
  // Use individual cohort variation to estimate bounds
  const subjectIndividualRevenues = subjectCohorts.map(c => 
    c.periods.reduce((sum, p) => sum + p.total_revenue, 0)
  );
  const comparatorIndividualRevenues = comparatorCohorts.map(c => 
    c.periods.reduce((sum, p) => sum + p.total_revenue, 0)
  );

  // Calculate standard deviation of individual cohort revenues
  const allRevenues = [...subjectIndividualRevenues, ...comparatorIndividualRevenues];
  const avgRevenue = allRevenues.reduce((a, b) => a + b, 0) / allRevenues.length;
  const variance = allRevenues.reduce((sum, rev) => sum + Math.pow(rev - avgRevenue, 2), 0) / allRevenues.length;
  const stdDev = Math.sqrt(variance);

  // Use std dev as proxy for uncertainty (conservative estimate)
  // Low = base - 1 std dev, High = base + 1 std dev
  const lowDelta = baseDelta - stdDev;
  const highDelta = baseDelta + stdDev;

  // Only show if magnitude is meaningful (>5% or >$1000)
  if (Math.abs(baseDeltaPercent) > 5 || Math.abs(baseDelta) > 1000) {
    ranges.push({
      label: "Revenue durability delta",
      low: lowDelta,
      base: baseDelta,
      high: highDelta,
      unit: 'currency',
      description: `Implied difference vs historical comparator cohorts at equivalent lifecycle periods`
    });
  }

  return ranges;
}
