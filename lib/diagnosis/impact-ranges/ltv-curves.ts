import { ImpactRange } from "@/components/diagnosis/ImpactRanges";

interface CohortLTVData {
  cohortLabel: string;
  cohortMonth: string;
  cohortSize: number;
  clr: number | null;
  clrBucket: number | null;
  clrBucketLabel: string | null;
  maxObservedBucket: number;
  buckets: Array<{
    bucket: number;
    bucketLabel: string;
    ltv: number | null;
  }>;
}

interface LTVCohortsImpactInput {
  cohortLTVData: CohortLTVData[];
}

/**
 * Compute impact ranges for LTV Curves page
 * 
 * Uses counterfactual analysis: compares recent cohorts vs older cohorts
 * at matched maturity points (CLR) to estimate lifetime value durability delta.
 * 
 * Rules:
 * - Requires non-overlapping cohort comparison
 * - Shows CLR durability delta (loss avoided framing)
 * - Provides Low/Base/High ranges based on historical variation
 * - Suppresses if clean comparator doesn't exist
 */
export function computeLTVCohortsImpactRanges(
  input: LTVCohortsImpactInput
): ImpactRange[] {
  const { cohortLTVData } = input;

  const MIN_COHORTS = 4; // Need at least 4 for clean comparison

  if (cohortLTVData.length < MIN_COHORTS) {
    return [];
  }

  const ranges: ImpactRange[] = [];

  // Filter cohorts with CLR data
  const cohortsWithCLR = cohortLTVData.filter(c => c.clr !== null);
  
  if (cohortsWithCLR.length < 4) {
    return [];
  }

  // Compare recent vs older cohorts (NON-OVERLAPPING)
  const sortedCohorts = [...cohortsWithCLR].sort((a, b) => 
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

  // Calculate average CLR
  const subjectCLRs = subjectCohorts.map(c => c.clr!).filter(clr => clr > 0);
  const comparatorCLRs = comparatorCohorts.map(c => c.clr!).filter(clr => clr > 0);

  if (subjectCLRs.length === 0 || comparatorCLRs.length === 0) {
    return [];
  }

  const subjectAvgCLR = subjectCLRs.reduce((a, b) => a + b, 0) / subjectCLRs.length;
  const comparatorAvgCLR = comparatorCLRs.reduce((a, b) => a + b, 0) / comparatorCLRs.length;

  if (comparatorAvgCLR <= 0) {
    return [];
  }

  // Calculate base delta
  const baseDelta = subjectAvgCLR - comparatorAvgCLR;
  const baseDeltaPercent = (baseDelta / comparatorAvgCLR) * 100;

  // Estimate range based on historical variation
  const allCLRs = [...subjectCLRs, ...comparatorCLRs];
  const avgCLR = allCLRs.reduce((a, b) => a + b, 0) / allCLRs.length;
  const variance = allCLRs.reduce((sum, clr) => sum + Math.pow(clr - avgCLR, 2), 0) / allCLRs.length;
  const stdDev = Math.sqrt(variance);

  // Use std dev as proxy for uncertainty
  const lowDelta = baseDelta - stdDev;
  const highDelta = baseDelta + stdDev;

  // Only show if magnitude is meaningful (>$10 or >5% relative)
  if (Math.abs(baseDelta) > 10 || Math.abs(baseDeltaPercent) > 5) {
    ranges.push({
      label: "Lifetime value durability delta",
      low: lowDelta,
      base: baseDelta,
      high: highDelta,
      unit: 'currency',
      description: `Implied difference in CLR vs historical comparator cohorts at equivalent maturity points`
    });
  }

  return ranges;
}
