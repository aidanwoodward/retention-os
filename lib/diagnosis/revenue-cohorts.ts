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

interface RevenueCohortsDiagnosisInput {
  cohorts: CohortData[];
  totalRevenue: number;
  previousRevenue: number;
  totalCustomers: number;
  previousCustomers: number;
  cohortCoverage: {
    activeCount: number;
    topCohortShare: number;
  };
}

/**
 * Generate consulting-grade action-title diagnosis for Revenue Cohorts page
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
export function diagnoseRevenueCohorts(input: RevenueCohortsDiagnosisInput): string | null {
  const { cohorts, totalRevenue, previousRevenue, totalCustomers, previousCustomers, cohortCoverage } = input;

  // Minimum sample size threshold
  const MIN_COHORTS = 3;
  const MIN_CUSTOMERS_FOR_CONFIDENCE = 100;

  // Check if we have sufficient data
  if (cohorts.length < MIN_COHORTS || totalCustomers < MIN_CUSTOMERS_FOR_CONFIDENCE) {
    return null;
  }

  // Helper: Format cohort label from date
  const formatCohortLabel = (cohortMonth: string): string => {
    const date = new Date(cohortMonth);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}Q${Math.ceil(month / 3)}`;
  };

  const findings: Array<{ magnitude: number; confidence: 'high' | 'medium'; text: string }> = [];

  // Calculate revenue change (period-over-period comparison)
  if (previousRevenue > 0) {
    const revenueDelta = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    
    if (Math.abs(revenueDelta) > 5) {
      const revenueDeltaAbs = Math.abs(revenueDelta);
      const revenueFormatted = totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      const prevRevenueFormatted = previousRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      
      findings.push({
        magnitude: revenueDeltaAbs,
        confidence: revenueDeltaAbs > 15 ? 'high' : 'medium',
        text: revenueDelta > 0 
          ? `Current period revenue increased ${revenueDeltaAbs.toFixed(1)}% to ${revenueFormatted} from ${prevRevenueFormatted} in the prior period, as shown in the Revenue KPI card, driven by cohort quality improvements`
          : `Current period revenue decreased ${revenueDeltaAbs.toFixed(1)}% to ${revenueFormatted} from ${prevRevenueFormatted} in the prior period, as shown in the Revenue KPI card, driven by cohort quality deterioration`
      });
    }
  }

  // Calculate customer count change and ARPU shift
  if (previousCustomers > 0 && Math.abs(totalCustomers - previousCustomers) / previousCustomers > 0.05) {
    const customerDelta = ((totalCustomers - previousCustomers) / previousCustomers) * 100;
    const avgRevenuePerCustomer = totalRevenue / totalCustomers;
    const prevAvgRevenuePerCustomer = previousRevenue / previousCustomers;
    const avgRevenueDelta = ((avgRevenuePerCustomer - prevAvgRevenuePerCustomer) / prevAvgRevenuePerCustomer) * 100;

    if (Math.abs(avgRevenueDelta) > 3) {
      const customerDeltaAbs = Math.abs(customerDelta);
      const arpuFormatted = avgRevenuePerCustomer.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      const prevArpuFormatted = prevAvgRevenuePerCustomer.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      
      // Determine structural dimension based on pattern
      let structuralDimension: string;
      if (customerDelta > 0 && avgRevenueDelta > 0) {
        structuralDimension = 'acquisition mix effects';
      } else if (customerDelta < 0 && avgRevenueDelta > 0) {
        structuralDimension = 'lifecycle monetisation';
      } else {
        structuralDimension = 'acquisition mix effects';
      }
      
      findings.push({
        magnitude: customerDeltaAbs + Math.abs(avgRevenueDelta),
        confidence: customerDeltaAbs > 10 && Math.abs(avgRevenueDelta) > 5 ? 'high' : 'medium',
        text: customerDelta > 0
          ? `Customer count increased ${customerDeltaAbs.toFixed(1)}% while average revenue per customer ${avgRevenueDelta > 0 ? 'increased' : 'decreased'} ${Math.abs(avgRevenueDelta).toFixed(1)}% to ${arpuFormatted} from ${prevArpuFormatted}, visible in the Customers KPI card, reflecting ${structuralDimension}`
          : `Customer count decreased ${customerDeltaAbs.toFixed(1)}% while average revenue per customer ${avgRevenueDelta > 0 ? 'increased' : 'decreased'} ${Math.abs(avgRevenueDelta).toFixed(1)}% to ${arpuFormatted} from ${prevArpuFormatted}, visible in the Customers KPI card, reflecting ${structuralDimension}`
      });
    }
  }

  // Cohort concentration
  if (cohortCoverage.activeCount >= MIN_COHORTS && cohortCoverage.topCohortShare > 0.4) {
    const sharePercent = (cohortCoverage.topCohortShare * 100).toFixed(0);
    
    // Get top cohort label
    const sortedCohorts = [...cohorts].sort((a, b) => 
      new Date(a.cohort_month).getTime() - new Date(b.cohort_month).getTime()
    );
    const topCohortLabel = sortedCohorts.length > 0 ? formatCohortLabel(sortedCohorts[sortedCohorts.length - 1].cohort_month) : 'top cohort';
    
    findings.push({
      magnitude: cohortCoverage.topCohortShare,
      confidence: cohortCoverage.topCohortShare > 0.5 ? 'high' : 'medium',
      text: `The ${topCohortLabel} cohort represents ${sharePercent}% of total revenue across ${cohortCoverage.activeCount} active cohorts, as shown in the Cohort Coverage KPI card, demonstrating revenue concentration`
    });
  }

  // Compare recent vs older cohorts (NON-OVERLAPPING)
  // Subject cohorts = most recent 1-2 cohorts
  // Comparator cohorts = immediately preceding 1-2 cohorts (distinct, non-overlapping)
  if (cohorts.length >= 4) {
    const sortedCohorts = [...cohorts].sort((a, b) => 
      new Date(a.cohort_month).getTime() - new Date(b.cohort_month).getTime()
    );
    
    // Subject: most recent 1-2 cohorts
    const subjectCohorts = sortedCohorts.slice(-2);
    // Comparator: immediately preceding 1-2 cohorts (non-overlapping)
    const comparatorCohorts = sortedCohorts.slice(-4, -2);
    
    // Verify non-overlapping: subject and comparator must be distinct
    const subjectMonths = new Set(subjectCohorts.map(c => c.cohort_month));
    const comparatorMonths = new Set(comparatorCohorts.map(c => c.cohort_month));
    const hasOverlap = [...subjectMonths].some(m => comparatorMonths.has(m));
    
    if (!hasOverlap && subjectCohorts.length >= 1 && comparatorCohorts.length >= 1) {
      const subjectTotalRevenue = subjectCohorts.reduce((sum, c) => 
        sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0
      );
      const comparatorTotalRevenue = comparatorCohorts.reduce((sum, c) => 
        sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0
      );
      
      if (comparatorTotalRevenue > 0) {
        const cohortRevenueDelta = ((subjectTotalRevenue - comparatorTotalRevenue) / comparatorTotalRevenue) * 100;
        
        if (Math.abs(cohortRevenueDelta) > 10) {
          const subjectLabels = subjectCohorts.map(c => formatCohortLabel(c.cohort_month)).join(' and ');
          const comparatorLabels = comparatorCohorts.map(c => formatCohortLabel(c.cohort_month)).join(' and ');
          
          // Determine structural dimension: if revenue delta is positive, likely cohort quality; if negative, likely early lifecycle decay
          const structuralDimension = cohortRevenueDelta > 0 ? 'cohort quality' : 'early lifecycle decay';
          
          findings.push({
            magnitude: Math.abs(cohortRevenueDelta),
            confidence: Math.abs(cohortRevenueDelta) > 20 ? 'high' : 'medium',
            text: `The ${subjectLabels} cohorts generate ${cohortRevenueDelta > 0 ? '+' : ''}${cohortRevenueDelta.toFixed(1)}% revenue compared to the ${comparatorLabels} cohorts at equivalent lifecycle periods, visible in the cohort chart, driven by ${structuralDimension}`
          });
        }
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
 * Enhanced diagnosis with severity and causality for Revenue Cohorts page
 * Returns diagnosis sentence, severity indicator, and causality factors
 */
export function diagnoseRevenueCohortsEnhanced(input: RevenueCohortsDiagnosisInput): EnhancedDiagnosisResult {
  const sentence = diagnoseRevenueCohorts(input);
  
  if (!sentence) {
    return {
      sentence: null,
      severity: null,
      causality: [],
    };
  }

  const { cohorts, totalRevenue, previousRevenue, totalCustomers, previousCustomers, cohortCoverage } = input;

  // Determine severity based on patterns
  let severity: SeverityInfo | null = null;
  const causalityFactors: CausalityFactor[] = [];

  // Check for leaky bucket pattern (newer cohorts decaying faster)
  if (cohorts.length >= 4) {
    const sortedCohorts = [...cohorts].sort((a, b) => 
      new Date(a.cohort_month).getTime() - new Date(b.cohort_month).getTime()
    );
    
    const recentCohorts = sortedCohorts.slice(-2);
    const olderCohorts = sortedCohorts.slice(-4, -2);
    
    if (recentCohorts.length > 0 && olderCohorts.length > 0) {
      const recentRevenue = recentCohorts.reduce((sum, c) => 
        sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0
      );
      const olderRevenue = olderCohorts.reduce((sum, c) => 
        sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0
      );
      
      if (olderRevenue > 0) {
        const revenueDelta = ((recentRevenue - olderRevenue) / olderRevenue) * 100;
        
        // Leaky bucket pattern: newer cohorts performing worse
        if (revenueDelta < -15) {
          severity = {
            level: revenueDelta < -30 ? 'critical' : 'high',
            label: revenueDelta < -30 ? 'Critical' : 'High',
            description: revenueDelta < -30 
              ? 'Critical: Newer cohorts are decaying significantly faster than older ones, indicating fragile growth'
              : 'High: Newer cohorts are decaying faster than older ones, suggesting growth may be fragile',
            color: revenueDelta < -30 ? 'text-red-700' : 'text-orange-700',
            bgColor: revenueDelta < -30 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200',
            icon: null, // Will be set by component
          };
          
          causalityFactors.push({
            factor: 'Acquisition Mix Shift',
            explanation: 'Newer customers may be coming from different channels or segments that have lower retention and lifetime value. This could indicate a shift toward volume-focused acquisition at the expense of quality.',
            evidence: `Recent cohorts show ${Math.abs(revenueDelta).toFixed(1)}% lower revenue compared to older cohorts at equivalent lifecycle periods`,
          });
        } else if (revenueDelta < -5) {
          severity = {
            level: 'medium',
            label: 'Medium',
            description: 'Moderate concern: Newer cohorts show slightly lower performance, worth monitoring',
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-50 border-yellow-200',
            icon: null,
          };
        }
      }
    }
  }

  // Check for fragile growth pattern (revenue growth but declining ARPU)
  if (previousRevenue > 0 && previousCustomers > 0) {
    const revenueDelta = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    const customerDelta = ((totalCustomers - previousCustomers) / previousCustomers) * 100;
    const avgRevenuePerCustomer = totalRevenue / totalCustomers;
    const prevAvgRevenuePerCustomer = previousRevenue / previousCustomers;
    const avgRevenueDelta = ((avgRevenuePerCustomer - prevAvgRevenuePerCustomer) / prevAvgRevenuePerCustomer) * 100;
    
    // Fragile growth: revenue up but ARPU down (growing but less valuable customers)
    if (revenueDelta > 5 && avgRevenueDelta < -5 && customerDelta > 5) {
      if (!severity || severity.level === 'low' || severity.level === 'medium') {
        severity = {
          level: 'high',
          label: 'High',
          description: 'High: Revenue is growing but average revenue per customer is declining, indicating fragile growth',
          color: 'text-orange-700',
          bgColor: 'bg-orange-50 border-orange-200',
          icon: null,
        };
      }
      
      causalityFactors.push({
        factor: 'Customer Quality Dilution',
        explanation: 'Growth is being driven by acquiring more customers, but those customers have lower average order values or are less loyal. This suggests a shift toward quantity over quality in acquisition strategy.',
        evidence: `Revenue increased ${revenueDelta.toFixed(1)}% while ARPU decreased ${Math.abs(avgRevenueDelta).toFixed(1)}%`,
      });
    }
  }

  // Add causality for cohort concentration
  if (cohortCoverage.topCohortShare > 0.4) {
    causalityFactors.push({
      factor: 'Revenue Concentration Risk',
      explanation: 'A high concentration of revenue in a single cohort creates vulnerability. If that cohort underperforms or if acquisition patterns change, overall revenue could be significantly impacted.',
      evidence: `Top cohort represents ${(cohortCoverage.topCohortShare * 100).toFixed(0)}% of total revenue`,
    });
  }

  // Default causality if none detected
  if (causalityFactors.length === 0 && sentence) {
    causalityFactors.push({
      factor: 'Cohort Performance Variation',
      explanation: 'Differences in cohort performance can stem from changes in acquisition channels, product-market fit, competitive landscape, or customer expectations over time.',
      evidence: 'Observed through cohort comparison analysis',
    });
  }

  return {
    sentence,
    severity,
    causality: causalityFactors,
  };
}
