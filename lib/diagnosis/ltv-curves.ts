import { EnhancedDiagnosisResult } from "./types";
import { SeverityInfo } from "@/components/diagnosis/SeverityIndicator";
import { CausalityFactor } from "@/components/diagnosis/CausalitySection";

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

interface LTVDiagnosisInput {
  cohorts: CohortData[];
  cohortLTVData: CohortLTVData[];
  aggregatedLTVData: Array<{
    bucket: number;
    bucketLabel: string;
    ltv: number | null;
    cohortSize: number;
  }>;
}

/**
 * Generate consulting-grade action-title diagnosis for LTV Curves page
 * 
 * Structure: Primary fact → Comparator → Structural implication
 * - Primary fact: What changed, magnitude, where
 * - Comparator: Relative to what, at matched lifecycle periods
 * - Structural implication: Why this matters economically (explicit dimension)
 * 
 * Rules:
 * - Single sentence, 30-50 words
 * - Non-overlapping cohort comparisons (subject vs comparator)
 * - Explicit structural dimensions (no vague phrases)
 * - No prescriptive language, forecasts, or evaluative wording
 */
export function diagnoseLTVCohorts(input: LTVDiagnosisInput): string | null {
  const { cohorts, cohortLTVData, aggregatedLTVData } = input;

  const MIN_COHORTS = 3;
  const MIN_BUCKETS = 2;

  if (cohorts.length < MIN_COHORTS || aggregatedLTVData.length < MIN_BUCKETS) {
    return null;
  }

  const findings: Array<{ magnitude: number; confidence: 'high' | 'medium'; text: string }> = [];

  // Check LTV growth rate
  if (aggregatedLTVData.length >= MIN_BUCKETS) {
    const bucket0LTV = aggregatedLTVData[0]?.ltv;
    const bucket1LTV = aggregatedLTVData[1]?.ltv;
    
    if (bucket0LTV !== null && bucket1LTV !== null && bucket0LTV > 0) {
      const ltvGrowth = ((bucket1LTV - bucket0LTV) / bucket0LTV) * 100;
      
      if (Math.abs(ltvGrowth) > 10) {
        const bucket0Formatted = bucket0LTV.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
        const bucket1Formatted = bucket1LTV.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
        
        findings.push({
          magnitude: Math.abs(ltvGrowth),
          confidence: Math.abs(ltvGrowth) > 25 ? 'high' : 'medium',
          text: `Aggregated LTV increases ${ltvGrowth > 0 ? '+' : ''}${ltvGrowth.toFixed(1)}% from ${aggregatedLTVData[0].bucketLabel} (${bucket0Formatted}) to ${aggregatedLTVData[1].bucketLabel} (${bucket1Formatted}), visible in the aggregated LTV curve chart, driven by lifecycle monetisation`
        });
      }
    }
  }

  // Compare recent vs older cohorts' CLR (NON-OVERLAPPING)
  // Subject cohorts = most recent 1-2 cohorts
  // Comparator cohorts = immediately preceding 1-2 cohorts (distinct, non-overlapping)
  if (cohortLTVData.length >= 4) {
    const sortedCohorts = [...cohortLTVData].sort((a, b) => 
      new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime()
    );
    
    // Subject: most recent 1-2 cohorts with CLR
    const subjectCohorts = sortedCohorts.slice(-2).filter(c => c.clr !== null);
    // Comparator: immediately preceding 1-2 cohorts with CLR (non-overlapping)
    const comparatorCohorts = sortedCohorts.slice(-4, -2).filter(c => c.clr !== null);
    
    // Verify non-overlapping: subject and comparator must be distinct
    const subjectMonths = new Set(subjectCohorts.map(c => c.cohortMonth));
    const comparatorMonths = new Set(comparatorCohorts.map(c => c.cohortMonth));
    const hasOverlap = [...subjectMonths].some(m => comparatorMonths.has(m));
    
    if (!hasOverlap && subjectCohorts.length >= 1 && comparatorCohorts.length >= 1) {
      const subjectAvgCLR = subjectCohorts.reduce((sum, c) => sum + (c.clr || 0), 0) / subjectCohorts.length;
      const comparatorAvgCLR = comparatorCohorts.reduce((sum, c) => sum + (c.clr || 0), 0) / comparatorCohorts.length;
      
      if (comparatorAvgCLR > 0) {
        const clrDelta = ((subjectAvgCLR - comparatorAvgCLR) / comparatorAvgCLR) * 100;
        
        if (Math.abs(clrDelta) > 10) {
          const subjectLabels = subjectCohorts.map(c => c.cohortLabel).join(' and ');
          const comparatorLabels = comparatorCohorts.map(c => c.cohortLabel).join(' and ');
          const subjectCLRFormatted = subjectAvgCLR.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
          const comparatorCLRFormatted = comparatorAvgCLR.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
          
          // Determine structural dimension: positive delta suggests cohort quality, negative suggests early lifecycle decay
          const structuralDimension = clrDelta > 0 ? 'cohort quality' : 'early lifecycle decay';
          
          findings.push({
            magnitude: Math.abs(clrDelta),
            confidence: Math.abs(clrDelta) > 20 ? 'high' : 'medium',
            text: `The ${subjectLabels} cohorts show ${clrDelta > 0 ? '+' : ''}${clrDelta.toFixed(1)}% CLR compared to the ${comparatorLabels} cohorts (${subjectCLRFormatted} vs ${comparatorCLRFormatted}) at equivalent maturity points, visible in the cohort LTV chart, driven by ${structuralDimension}`
          });
        }
      }
    }
  }

  // Check LTV maturity (how many buckets until LTV stabilizes)
  if (aggregatedLTVData.length >= 4) {
    const lastBucketLTV = aggregatedLTVData[aggregatedLTVData.length - 1]?.ltv;
    const secondLastBucketLTV = aggregatedLTVData[aggregatedLTVData.length - 2]?.ltv;
    
    if (lastBucketLTV !== null && secondLastBucketLTV !== null && secondLastBucketLTV > 0) {
      const finalGrowth = ((lastBucketLTV - secondLastBucketLTV) / secondLastBucketLTV) * 100;
      
      if (Math.abs(finalGrowth) < 5) {
        const ltvFormatted = lastBucketLTV.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
        
        findings.push({
          magnitude: 10, // Medium priority
          confidence: 'medium',
          text: `Aggregated LTV stabilizes at ${ltvFormatted} by bucket ${aggregatedLTVData[aggregatedLTVData.length - 1].bucketLabel}, as shown in the aggregated LTV curve chart, demonstrating retention durability`
        });
      }
    }
  }

  // Select top 1-2 findings by magnitude and confidence
  if (findings.length === 0) {
    return null;
  }

  // Sort by confidence (high first) then magnitude
  findings.sort((a, b) => {
    if (a.confidence === 'high' && b.confidence !== 'high') return -1;
    if (b.confidence === 'high' && a.confidence !== 'high') return 1;
    return b.magnitude - a.magnitude;
  });

  // Only use high-confidence findings, or medium if no high available
  const topFindings = findings.filter(f => f.confidence === 'high');
  const selectedFindings = topFindings.length > 0 ? topFindings.slice(0, 2) : findings.slice(0, 1);

  // Synthesize into single sentence (30-50 words)
  if (selectedFindings.length === 1) {
    const sentence = selectedFindings[0].text;
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount >= 30 && wordCount <= 50) {
      return sentence;
    } else if (wordCount < 30) {
      return null; // Suppress if insufficient detail
    } else {
      return null; // Suppress rather than truncate
    }
  } else if (selectedFindings.length === 2) {
    // Combine top 2 findings with causal connection
    const sentence = `${selectedFindings[0].text}, which aligns with ${selectedFindings[1].text.toLowerCase()}`;
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount >= 30 && wordCount <= 50) {
      return sentence;
    } else {
      // If combined is too long, use only the top finding
      const singleSentence = selectedFindings[0].text;
      const singleWordCount = singleSentence.split(/\s+/).length;
      return singleWordCount >= 30 && singleWordCount <= 50 ? singleSentence : null;
    }
  }

  return null;
}

/**
 * Enhanced diagnosis with severity and causality for LTV Cohorts page
 * Returns diagnosis sentence, severity indicator, and causality factors
 */
export function diagnoseLTVCohortsEnhanced(input: LTVDiagnosisInput): EnhancedDiagnosisResult {
  const sentence = diagnoseLTVCohorts(input);
  
  if (!sentence) {
    return {
      sentence: null,
      severity: null,
      causality: [],
    };
  }

  const { cohortLTVData, aggregatedLTVData } = input;

  let severity: SeverityInfo | null = null;
  const causalityFactors: CausalityFactor[] = [];

  // Detect quality vs volume tradeoff
  if (cohortLTVData.length >= 4) {
    const sortedCohorts = [...cohortLTVData].sort((a, b) => 
      new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime()
    );
    
    const recentCohorts = sortedCohorts.slice(-2).filter(c => c.clr !== null);
    const olderCohorts = sortedCohorts.slice(-4, -2).filter(c => c.clr !== null);
    
    if (recentCohorts.length > 0 && olderCohorts.length > 0) {
      const recentAvgCLR = recentCohorts.reduce((sum, c) => sum + (c.clr || 0), 0) / recentCohorts.length;
      const olderAvgCLR = olderCohorts.reduce((sum, c) => sum + (c.clr || 0), 0) / olderCohorts.length;
      const recentAvgSize = recentCohorts.reduce((sum, c) => sum + c.cohortSize, 0) / recentCohorts.length;
      const olderAvgSize = olderCohorts.reduce((sum, c) => sum + c.cohortSize, 0) / olderCohorts.length;
      
      if (olderAvgCLR > 0) {
        const clrDelta = ((recentAvgCLR - olderAvgCLR) / olderAvgCLR) * 100;
        const sizeDelta = ((recentAvgSize - olderAvgSize) / olderAvgSize) * 100;
        
        // Volume vs quality tradeoff: larger cohorts but lower CLR
        if (sizeDelta > 10 && clrDelta < -10) {
          severity = {
            level: 'high',
            label: 'High',
            description: 'High: Acquiring larger cohorts but with lower lifetime value - prioritizing volume over quality',
            color: 'text-orange-700',
            bgColor: 'bg-orange-50 border-orange-200',
            icon: null,
          };
          
          causalityFactors.push({
            factor: 'Volume vs Quality Tradeoff',
            explanation: 'Recent cohorts are larger in size but have lower Customer Lifetime Revenue (CLR). This suggests a shift toward volume-focused acquisition that may look good initially but creates less durable value over time.',
            evidence: `Recent cohorts are ${sizeDelta.toFixed(0)}% larger but have ${Math.abs(clrDelta).toFixed(1)}% lower CLR`,
          });
        } else if (clrDelta < -15) {
          severity = {
            level: clrDelta < -25 ? 'critical' : 'high',
            label: clrDelta < -25 ? 'Critical' : 'High',
            description: clrDelta < -25
              ? 'Critical: Significant deterioration in cohort quality - newer customers create much less durable value'
              : 'High: Newer cohorts show significantly lower lifetime value',
            color: clrDelta < -25 ? 'text-red-700' : 'text-orange-700',
            bgColor: clrDelta < -25 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200',
            icon: null,
          };
        }
      }
    }
  }

  // Detect durable vs fragile cohorts
  if (aggregatedLTVData.length >= 3) {
    const earlyLTV = aggregatedLTVData[0]?.ltv;
    const midLTV = aggregatedLTVData[Math.floor(aggregatedLTVData.length / 2)]?.ltv;
    const lateLTV = aggregatedLTVData[aggregatedLTVData.length - 1]?.ltv;
    
    if (earlyLTV !== null && midLTV !== null && lateLTV !== null && earlyLTV > 0) {
      const earlyToMidGrowth = ((midLTV - earlyLTV) / earlyLTV) * 100;
      const midToLateGrowth = ((lateLTV - midLTV) / midLTV) * 100;
      
      // Fragile pattern: rapid early growth but then stalls
      if (earlyToMidGrowth > 30 && Math.abs(midToLateGrowth) < 5) {
        causalityFactors.push({
          factor: 'Fragile LTV Growth',
          explanation: 'LTV grows quickly in early periods but then plateaus, suggesting that initial value delivery is strong but long-term engagement or monetization is limited.',
          evidence: `LTV grows ${earlyToMidGrowth.toFixed(0)}% early but then stabilizes`,
        });
      }
    }
  }

  // Default causality if none detected
  if (causalityFactors.length === 0 && sentence) {
    causalityFactors.push({
      factor: 'LTV Pattern Variation',
      explanation: 'LTV patterns reflect the interplay between acquisition quality, retention investment, pricing strategy, and product-market fit over time.',
      evidence: 'Observed through LTV cohort analysis',
    });
  }

  return {
    sentence,
    severity,
    causality: causalityFactors,
  };
}
