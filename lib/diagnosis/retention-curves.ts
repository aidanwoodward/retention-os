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

interface RetentionCurvesDiagnosisInput {
  cohorts: CohortData[];
  retentionCurveData: Array<{
    period: number;
    periodLabel: string;
    cohortSize: number;
    activeCustomers: number;
    retentionRate: number;
    revenue: number;
    revenueRetention: number;
  }>;
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
 * Generate consulting-grade action-title diagnosis for Retention Curves page
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
export function diagnoseRetentionCurves(input: RetentionCurvesDiagnosisInput): string | null {
  const { cohorts, retentionCurveData, cohortCurvesData, retentionType } = input;

  const MIN_COHORTS = 3;
  const MIN_PERIODS = 3;
  const MIN_CUSTOMERS = 100;

  if (cohorts.length < MIN_COHORTS || retentionCurveData.length < MIN_PERIODS) {
    return null;
  }

  const findings: Array<{ magnitude: number; confidence: 'high' | 'medium'; text: string }> = [];

  // Check aggregated retention curve decline rate
  if (retentionCurveData.length >= MIN_PERIODS) {
    const period0Retention = retentionCurveData[0]?.retentionRate || 0;
    const period1Retention = retentionCurveData[1]?.retentionRate || 0;
    
    if (period0Retention > 0 && period1Retention > 0) {
      const firstPeriodDrop = ((period0Retention - period1Retention) / period0Retention) * 100;
      
      if (firstPeriodDrop > 20) {
        const metricType = retentionType === 'customer' ? 'customer retention' : 'revenue retention';
        findings.push({
          magnitude: firstPeriodDrop,
          confidence: firstPeriodDrop > 30 ? 'high' : 'medium',
          text: `Aggregated ${metricType} drops ${firstPeriodDrop.toFixed(0)}% from ${retentionCurveData[0].periodLabel} (${period0Retention.toFixed(1)}%) to ${retentionCurveData[1].periodLabel} (${period1Retention.toFixed(1)}%), visible in the aggregated retention curve chart, driven by early lifecycle decay`
        });
      }
    }

    // Check if retention stabilizes after initial drop
    if (retentionCurveData.length >= 4 && period1Retention > 0) {
      const period2Retention = retentionCurveData[2]?.retentionRate || 0;
      if (period2Retention > 0) {
        const secondPeriodChange = ((period2Retention - period1Retention) / period1Retention) * 100;
        const firstPeriodDrop = period0Retention > 0 ? ((period0Retention - period1Retention) / period0Retention) * 100 : 0;
        
        if (Math.abs(secondPeriodChange) < 5 && firstPeriodDrop > 15) {
          const metricType = retentionType === 'customer' ? 'customer retention' : 'revenue retention';
          findings.push({
            magnitude: 15, // Medium priority
            confidence: 'medium',
            text: `Aggregated ${metricType} stabilizes at ${period1Retention.toFixed(1)}% after an initial ${firstPeriodDrop.toFixed(0)}% drop from ${retentionCurveData[0].periodLabel}, as shown in the retention curve chart, demonstrating retention durability`
          });
        }
      }
    }
  }

  // Compare recent vs older cohorts (NON-OVERLAPPING)
  // Subject cohorts = most recent 1-2 cohorts
  // Comparator cohorts = immediately preceding 1-2 cohorts (distinct, non-overlapping)
  if (cohortCurvesData.length >= 4) {
    const sortedCohorts = [...cohortCurvesData].sort((a, b) => 
      new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime()
    );
    
    // Subject: most recent 1-2 cohorts
    const subjectCohorts = sortedCohorts.slice(-2);
    // Comparator: immediately preceding 1-2 cohorts (non-overlapping)
    const comparatorCohorts = sortedCohorts.slice(-4, -2);
    
    // Verify non-overlapping: subject and comparator must be distinct
    const subjectMonths = new Set(subjectCohorts.map(c => c.cohortMonth));
    const comparatorMonths = new Set(comparatorCohorts.map(c => c.cohortMonth));
    const hasOverlap = [...subjectMonths].some(m => comparatorMonths.has(m));
    
    if (!hasOverlap && subjectCohorts.length >= 1 && comparatorCohorts.length >= 1) {
      const recentPeriod1Retention = subjectCohorts
        .map(c => c.periods.find(p => p.period === 1))
        .filter(Boolean)
        .map(p => retentionType === 'customer' ? p!.customerRetention : p!.revenueRetention);
      
      const olderPeriod1Retention = comparatorCohorts
        .map(c => c.periods.find(p => p.period === 1))
        .filter(Boolean)
        .map(p => retentionType === 'customer' ? p!.customerRetention : p!.revenueRetention);
      
      if (recentPeriod1Retention.length > 0 && olderPeriod1Retention.length > 0) {
        const recentAvg = recentPeriod1Retention.reduce((a, b) => a + b, 0) / recentPeriod1Retention.length;
        const olderAvg = olderPeriod1Retention.reduce((a, b) => a + b, 0) / olderPeriod1Retention.length;
        
        if (olderAvg > 0) {
          const retentionDelta = ((recentAvg - olderAvg) / olderAvg) * 100;
          
          if (Math.abs(retentionDelta) > 10) {
            const subjectLabels = subjectCohorts.map(c => c.cohortLabel).join(' and ');
            const comparatorLabels = comparatorCohorts.map(c => c.cohortLabel).join(' and ');
            const metricType = retentionType === 'customer' ? 'customer retention' : 'revenue retention';
            
            // Determine structural dimension: positive delta suggests cohort quality, negative suggests early lifecycle decay
            const structuralDimension = retentionDelta > 0 ? 'cohort quality' : 'early lifecycle decay';
            
            findings.push({
              magnitude: Math.abs(retentionDelta),
              confidence: Math.abs(retentionDelta) > 20 ? 'high' : 'medium',
              text: `The ${subjectLabels} cohorts show ${retentionDelta > 0 ? '+' : ''}${retentionDelta.toFixed(1)}% ${metricType} at period 1 compared to the ${comparatorLabels} cohorts (${recentAvg.toFixed(1)}% vs ${olderAvg.toFixed(1)}%), visible in the cohort-by-cohort retention curves, driven by ${structuralDimension}`
            });
          }
        }
      }
    }
  }

  // Revenue vs customer retention comparison
  if (retentionType === 'customer' && retentionCurveData.length >= 2) {
    const period0CustomerRetention = retentionCurveData[0]?.retentionRate || 0;
    const period0RevenueRetention = retentionCurveData[0]?.revenueRetention || 0;
    
    if (period0CustomerRetention > 0 && period0RevenueRetention > 0) {
      const retentionGap = period0RevenueRetention - period0CustomerRetention;
      
      if (Math.abs(retentionGap) > 5) {
        findings.push({
          magnitude: Math.abs(retentionGap),
          confidence: Math.abs(retentionGap) > 10 ? 'high' : 'medium',
          text: `Revenue retention is ${retentionGap > 0 ? 'higher' : 'lower'} than customer retention by ${Math.abs(retentionGap).toFixed(1)} percentage points at ${retentionCurveData[0].periodLabel}, as shown in the aggregated retention curve chart, driven by lifecycle monetisation`
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
 * Enhanced diagnosis with severity and causality for Retention Curves page
 * Returns diagnosis sentence, severity indicator, and causality factors
 */
export function diagnoseRetentionCurvesEnhanced(input: RetentionCurvesDiagnosisInput): EnhancedDiagnosisResult {
  const sentence = diagnoseRetentionCurves(input);
  
  if (!sentence) {
    return {
      sentence: null,
      severity: null,
      causality: [],
    };
  }

  const { retentionCurveData, cohortCurvesData, retentionType } = input;

  let severity: SeverityInfo | null = null;
  const causalityFactors: CausalityFactor[] = [];

  // Detect cliff vs gradual decay pattern
  if (retentionCurveData.length >= 2) {
    const period0Retention = retentionCurveData[0]?.retentionRate || 0;
    const period1Retention = retentionCurveData[1]?.retentionRate || 0;
    
    if (period0Retention > 0 && period1Retention > 0) {
      const firstPeriodDrop = ((period0Retention - period1Retention) / period0Retention) * 100;
      
      // Cliff pattern: >30% drop in first period
      if (firstPeriodDrop > 30) {
        severity = {
          level: firstPeriodDrop > 50 ? 'critical' : 'high',
          label: firstPeriodDrop > 50 ? 'Critical' : 'High',
          description: firstPeriodDrop > 50
            ? 'Critical: Retention falls off a cliff in the first period, indicating severe early lifecycle issues'
            : 'High: Retention drops sharply in the first period, suggesting early lifecycle problems',
          color: firstPeriodDrop > 50 ? 'text-red-700' : 'text-orange-700',
          bgColor: firstPeriodDrop > 50 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200',
          icon: null,
        };
        
        causalityFactors.push({
          factor: 'Early Lifecycle Decay',
          explanation: 'Customers are being lost very early in their lifecycle, often before they fully experience the product value. This suggests issues with onboarding, initial value delivery, or product-market fit.',
          evidence: `${firstPeriodDrop.toFixed(0)}% drop from ${period0Retention.toFixed(1)}% to ${period1Retention.toFixed(1)}% in the first period`,
        });
      } else if (firstPeriodDrop > 20) {
        severity = {
          level: 'medium',
          label: 'Medium',
          description: 'Moderate concern: Significant early retention drop detected',
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-50 border-yellow-200',
          icon: null,
        };
      }
    }
  }

  // Detect irreversibility (retention stabilizes low after initial drop)
  if (retentionCurveData.length >= 4) {
    const period0Retention = retentionCurveData[0]?.retentionRate || 0;
    const period1Retention = retentionCurveData[1]?.retentionRate || 0;
    const period2Retention = retentionCurveData[2]?.retentionRate || 0;
    
    if (period0Retention > 0 && period1Retention > 0 && period2Retention > 0) {
      const firstPeriodDrop = ((period0Retention - period1Retention) / period0Retention) * 100;
      const secondPeriodChange = ((period2Retention - period1Retention) / period1Retention) * 100;
      
      // Irreversible loss: big drop then stabilizes low
      if (firstPeriodDrop > 20 && Math.abs(secondPeriodChange) < 5 && period1Retention < 40) {
        if (!severity || severity.level === 'low' || severity.level === 'medium') {
          severity = {
            level: 'high',
            label: 'High',
            description: 'High: Loss becomes irreversible after initial drop - cohorts never recover',
            color: 'text-orange-700',
            bgColor: 'bg-orange-50 border-orange-200',
            icon: null,
          };
        }
        
        causalityFactors.push({
          factor: 'Irreversible Loss Pattern',
          explanation: 'Once customers drop off in the first period, they rarely return. This suggests the initial experience creates a lasting negative impression or the product fails to deliver core value early enough.',
          evidence: `Retention drops ${firstPeriodDrop.toFixed(0)}% then stabilizes at ${period1Retention.toFixed(1)}%`,
        });
      }
    }
  }

  // Compare recent vs older cohorts
  if (cohortCurvesData.length >= 4) {
    const sortedCohorts = [...cohortCurvesData].sort((a, b) => 
      new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime()
    );
    
    const recentCohorts = sortedCohorts.slice(-2);
    const olderCohorts = sortedCohorts.slice(-4, -2);
    
    if (recentCohorts.length > 0 && olderCohorts.length > 0) {
      const recentPeriod1Retention = recentCohorts
        .map(c => c.periods.find(p => p.period === 1))
        .filter(Boolean)
        .map(p => retentionType === 'customer' ? p!.customerRetention : p!.revenueRetention);
      
      const olderPeriod1Retention = olderCohorts
        .map(c => c.periods.find(p => p.period === 1))
        .filter(Boolean)
        .map(p => retentionType === 'customer' ? p!.customerRetention : p!.revenueRetention);
      
      if (recentPeriod1Retention.length > 0 && olderPeriod1Retention.length > 0) {
        const recentAvg = recentPeriod1Retention.reduce((a, b) => a + b, 0) / recentPeriod1Retention.length;
        const olderAvg = olderPeriod1Retention.reduce((a, b) => a + b, 0) / olderPeriod1Retention.length;
        
        if (olderAvg > 0) {
          const retentionDelta = ((recentAvg - olderAvg) / olderAvg) * 100;
          
          if (retentionDelta < -15) {
            causalityFactors.push({
              factor: 'Deteriorating Cohort Quality',
              explanation: 'Recent cohorts are retaining worse than older cohorts at the same lifecycle stage. This could indicate changes in acquisition channels, product changes, competitive pressure, or shifting customer expectations.',
              evidence: `Recent cohorts show ${Math.abs(retentionDelta).toFixed(1)}% lower retention at period 1`,
            });
          }
        }
      }
    }
  }

  // Default causality if none detected
  if (causalityFactors.length === 0 && sentence) {
    causalityFactors.push({
      factor: 'Retention Pattern Variation',
      explanation: 'Retention patterns can be influenced by onboarding quality, product engagement, lifecycle communication, competitive landscape, and customer expectations.',
      evidence: 'Observed through retention curve analysis',
    });
  }

  return {
    sentence,
    severity,
    causality: causalityFactors,
  };
}
