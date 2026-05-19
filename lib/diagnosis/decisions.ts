import { EnhancedDiagnosisResult } from "./types";

export interface UncomfortableDecision {
  id: string;
  category: 'acquisition' | 'onboarding' | 'promotional' | 'customer-focus';
  title: string;
  description: string;
  evidence: string[];
  impact: 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
  tradeoffs: string;
}

interface DecisionSynthesisInput {
  revenueCohorts?: EnhancedDiagnosisResult;
  retentionCurves?: EnhancedDiagnosisResult;
  ltvCohorts?: EnhancedDiagnosisResult;
  repeatRates?: EnhancedDiagnosisResult;
}

/**
 * Synthesize uncomfortable decisions from all page diagnoses
 * 
 * Aggregates findings across pages and generates specific, actionable,
 * uncomfortable decisions that must be made.
 */
export function synthesizeDecisions(input: DecisionSynthesisInput): UncomfortableDecision[] {
  const decisions: UncomfortableDecision[] = [];
  
  const { revenueCohorts, retentionCurves, ltvCohorts, repeatRates } = input;

  // Decision 1: Stop acquiring segments that look good but decay fast
  if (revenueCohorts?.severity && revenueCohorts.severity.level === 'high' || revenueCohorts?.severity?.level === 'critical') {
    const hasLeakyBucket = revenueCohorts.sentence?.toLowerCase().includes('decay') || 
                           revenueCohorts.sentence?.toLowerCase().includes('deterioration');
    
    if (hasLeakyBucket) {
      decisions.push({
        id: 'stop-acquiring-decay-segments',
        category: 'acquisition',
        title: 'Stop acquiring segments that look good but decay fast',
        description: 'Newer cohorts are performing significantly worse than older ones, indicating you\'re acquiring customers who appear valuable initially but don\'t retain. This creates fragile growth that looks good on paper but erodes over time.',
        evidence: [
          revenueCohorts.sentence || 'Newer cohorts showing faster decay',
          ...revenueCohorts.causality.map(c => c.factor),
        ],
        impact: 'high',
        urgency: revenueCohorts.severity.level === 'critical' ? 'high' : 'medium',
        tradeoffs: 'This may reduce acquisition volume in the short term, but will improve long-term revenue durability and reduce customer acquisition costs.',
      });
    }
  }

  // Decision 2: Rebuild onboarding for a specific cohort age
  if (retentionCurves?.severity && (retentionCurves.severity.level === 'high' || retentionCurves.severity.level === 'critical')) {
    const hasEarlyDrop = retentionCurves.sentence?.toLowerCase().includes('drop') ||
                         retentionCurves.sentence?.toLowerCase().includes('early lifecycle');
    
    if (hasEarlyDrop) {
      decisions.push({
        id: 'rebuild-onboarding-cohort-age',
        category: 'onboarding',
        title: 'Rebuild onboarding for early lifecycle periods',
        description: 'Retention falls off a cliff in the first period, indicating customers are being lost before they fully experience product value. The onboarding experience needs fundamental changes to prevent irreversible early churn.',
        evidence: [
          retentionCurves.sentence || 'Early lifecycle retention drop detected',
          ...retentionCurves.causality.map(c => c.factor),
        ],
        impact: 'high',
        urgency: retentionCurves.severity.level === 'critical' ? 'high' : 'medium',
        tradeoffs: 'Requires significant product and process changes, but early retention improvements compound over the entire customer lifetime.',
      });
    }
  }

  // Decision 3: Kill a promo that boosts revenue but destroys LTV
  if (repeatRates?.severity && (repeatRates.severity.level === 'high' || repeatRates.severity.level === 'critical')) {
    const hasPromotionalBehavior = repeatRates.sentence?.toLowerCase().includes('promotional') ||
                                   repeatRates.sentence?.toLowerCase().includes('discount') ||
                                   repeatRates.causality.some(c => c.factor.toLowerCase().includes('promotional') || c.factor.toLowerCase().includes('discount'));
    
    if (hasPromotionalBehavior || repeatRates.severity.level === 'critical') {
      decisions.push({
        id: 'kill-promo-destroys-ltv',
        category: 'promotional',
        title: 'Kill promotions that boost revenue but destroy LTV',
        description: 'Repeat behavior appears to be driven by promotions rather than structural habits. Customers are being "bribed" to return, which may boost short-term revenue but erodes long-term value and trains customers to wait for discounts.',
        evidence: [
          repeatRates.sentence || 'Repeat behavior appears promotional',
          ...repeatRates.causality.map(c => c.factor),
        ],
        impact: 'high',
        urgency: repeatRates.severity.level === 'critical' ? 'high' : 'medium',
        tradeoffs: 'May see short-term revenue decline, but will improve customer quality, reduce discount dependency, and increase long-term profitability.',
      });
    }
  }

  // Decision 4: Double down on boring but durable customers
  if (ltvCohorts?.severity && ltvCohorts.severity.level === 'high') {
    const hasVolumeQualityTradeoff = ltvCohorts.sentence?.toLowerCase().includes('volume') ||
                                     ltvCohorts.sentence?.toLowerCase().includes('quality') ||
                                     ltvCohorts.causality.some(c => c.factor.toLowerCase().includes('volume') || c.factor.toLowerCase().includes('quality'));
    
    if (hasVolumeQualityTradeoff) {
      decisions.push({
        id: 'double-down-durable-customers',
        category: 'customer-focus',
        title: 'Double down on boring but durable customers',
        description: 'Recent cohorts are larger but have lower lifetime value, indicating a shift toward volume over quality. Small, "boring" cohorts that are insanely durable create more long-term value than large cohorts that decay quickly.',
        evidence: [
          ltvCohorts.sentence || 'Volume vs quality tradeoff detected',
          ...ltvCohorts.causality.map(c => c.factor),
        ],
        impact: 'high',
        urgency: 'medium',
        tradeoffs: 'May reduce acquisition volume and make growth look slower, but will improve revenue durability, reduce churn, and increase customer lifetime value.',
      });
    }
  }

  // Decision 5: Address fragile growth pattern (from revenue cohorts)
  if (revenueCohorts?.causality.some(c => c.factor.toLowerCase().includes('fragile') || c.factor.toLowerCase().includes('dilution'))) {
    decisions.push({
      id: 'address-fragile-growth',
      category: 'acquisition',
      title: 'Address fragile growth - revenue up but customer quality down',
      description: 'Revenue is growing but average revenue per customer is declining, indicating you\'re acquiring more customers but they\'re less valuable. This creates fragile growth that looks good but is unsustainable.',
      evidence: [
        revenueCohorts.sentence || 'Fragile growth pattern detected',
        ...revenueCohorts.causality.filter(c => c.factor.toLowerCase().includes('fragile') || c.factor.toLowerCase().includes('dilution')).map(c => c.factor),
      ],
      impact: 'high',
      urgency: 'high',
      tradeoffs: 'Requires shifting acquisition strategy toward quality, which may reduce volume but improves sustainability.',
    });
  }

  // Sort by urgency (high first) then impact (high first)
  decisions.sort((a, b) => {
    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    const impactOrder = { high: 3, medium: 2, low: 1 };
    
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    }
    return impactOrder[b.impact] - impactOrder[a.impact];
  });

  return decisions;
}
