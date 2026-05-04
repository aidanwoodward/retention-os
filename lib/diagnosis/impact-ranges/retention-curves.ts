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

interface RetentionCurvesImpactInput {
  cohorts: CohortData[];
  cohortCurvesData: Array<{
    cohortLabel: string;
    cohortMonth: string;
    cohortSize: number;
    periods: Array<{
      period: number;
      periodLabel: string;
      customerRetention: number;
      revenueRetention: number;
    }>;
  }>;
  retentionType: 'customer' | 'revenue';
}

/**
 * Compute impact ranges for Retention Curves page
 * 
 * Uses counterfactual analysis: compares recent cohorts vs older cohorts
 * at matched lifecycle periods to estimate retention durability delta.
 * 
 * Rules:
 * - Requires non-overlapping cohort comparison
 * - Shows retained customers delta or revenue retention delta
 * - Provides Low/Base/High ranges based on historical variation
 * - Suppresses if clean comparator doesn't exist
 */
export function computeRetentionCurvesImpactRanges(
  input: RetentionCurvesImpactInput
): ImpactRange[] {
  const { cohorts, cohortCurvesData, retentionType } = input;

  const MIN_COHORTS = 4; // Need at least 4 for clean comparison
  const MIN_CUSTOMERS = 100;

  if (cohorts.length < MIN_COHORTS || cohortCurvesData.length < 4) {
    return [];
  }

  const ranges: ImpactRange[] = [];

  // Compare recent vs older cohorts (NON-OVERLAPPING)
  const sortedCohorts = [...cohortCurvesData].sort((a, b) => 
    new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime()
  );

  // Subject: most recent 1-2 cohorts
  const subjectCohorts = sortedCohorts.slice(-2);
  // Comparator: immediately preceding 1-2 cohorts (non-overlapping)
  const comparatorCohorts = sortedCohorts.slice(-4, -2);

  // Verify non-overlapping
  const subjectMonths = new Set(subjectCohorts.map(c => c.cohortMonth));
  const comparatorMonths = new Set(comparatorCohorts.map(c => c.cohortMonth));
  const hasOverlap = [...subjectMonths].some(m => comparatorMonths.has(m));

  if (hasOverlap || subjectCohorts.length < 1 || comparatorCohorts.length < 1) {
    return [];
  }

  // Calculate retention at period 1 (early lifecycle)
  const subjectRetentions = subjectCohorts
    .map(c => {
      const period1 = c.periods.find(p => p.period === 1);
      return period1 ? (retentionType === 'customer' ? period1.customerRetention : period1.revenueRetention) : null;
    })
    .filter((r): r is number => r !== null);

  const comparatorRetentions = comparatorCohorts
    .map(c => {
      const period1 = c.periods.find(p => p.period === 1);
      return period1 ? (retentionType === 'customer' ? period1.customerRetention : period1.revenueRetention) : null;
    })
    .filter((r): r is number => r !== null);

  if (subjectRetentions.length === 0 || comparatorRetentions.length === 0) {
    return [];
  }

  const subjectAvgRetention = subjectRetentions.reduce((a, b) => a + b, 0) / subjectRetentions.length;
  const comparatorAvgRetention = comparatorRetentions.reduce((a, b) => a + b, 0) / comparatorRetentions.length;

  if (comparatorAvgRetention <= 0) {
    return [];
  }

  // Calculate base delta (percentage points)
  const baseDelta = subjectAvgRetention - comparatorAvgRetention;
  const baseDeltaPercent = (baseDelta / comparatorAvgRetention) * 100;

  // Estimate range based on historical variation
  const allRetentions = [...subjectRetentions, ...comparatorRetentions];
  const avgRetention = allRetentions.reduce((a, b) => a + b, 0) / allRetentions.length;
  const variance = allRetentions.reduce((sum, ret) => sum + Math.pow(ret - avgRetention, 2), 0) / allRetentions.length;
  const stdDev = Math.sqrt(variance);

  // Use std dev as proxy for uncertainty
  const lowDelta = baseDelta - stdDev;
  const highDelta = baseDelta + stdDev;

  // Only show if magnitude is meaningful (>5 percentage points or >10% relative)
  if (Math.abs(baseDelta) > 5 || Math.abs(baseDeltaPercent) > 10) {
    const metricLabel = retentionType === 'customer' ? 'Retained customers delta' : 'Revenue retention delta';
    ranges.push({
      label: metricLabel,
      low: lowDelta,
      base: baseDelta,
      high: highDelta,
      unit: 'percentage',
      description: `Implied difference in ${retentionType === 'customer' ? 'customer' : 'revenue'} retention at period 1 vs historical comparator cohorts`
    });
  }

  return ranges;
}
