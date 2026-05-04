import { EnhancedDiagnosisResult } from "./types";
import { SeverityInfo } from "@/components/diagnosis/SeverityIndicator";
import { CausalityFactor } from "@/components/diagnosis/CausalitySection";

interface RepeatPurchaseData {
  purchaseCount: number;
  purchaseCountLabel: string;
  customersReaching: number;
  percentOfOriginal: number;
  dropOffVsPrevious: number | null;
}

interface RepeatRatesDiagnosisInput {
  repeatData: Array<RepeatPurchaseData>;
  secondPurchaseRate: number;
  medianPurchases: number;
  customersWith3PlusPurchases: number;
  totalCustomers: number;
}

/**
 * Generate consulting-grade action-title diagnosis for Repeat Purchase Rates page
 * 
 * Structure: Primary fact → Comparator → Structural implication
 * - Primary fact: What changed, magnitude, where
 * - Comparator: Relative to what, at matched lifecycle periods
 * - Structural implication: Why this matters economically (explicit dimension)
 * 
 * Rules:
 * - Single sentence, 30-50 words
 * - Explicit structural dimensions (no vague phrases)
 * - No prescriptive language, forecasts, or evaluative wording
 */
export function diagnoseRepeatRates(input: RepeatRatesDiagnosisInput): string | null {
  const { repeatData, secondPurchaseRate, medianPurchases, customersWith3PlusPurchases, totalCustomers } = input;

  const MIN_CUSTOMERS = 100;
  const MIN_DATA_POINTS = 3;

  if (totalCustomers < MIN_CUSTOMERS || repeatData.length < MIN_DATA_POINTS) {
    return null;
  }

  const findings: Array<{ magnitude: number; confidence: 'high' | 'medium'; text: string }> = [];

  // Second purchase rate analysis
  if (secondPurchaseRate > 0) {
    const firstToSecondDrop = 100 - secondPurchaseRate;
    
    if (firstToSecondDrop > 30) {
      findings.push({
        magnitude: firstToSecondDrop,
        confidence: firstToSecondDrop > 50 ? 'high' : 'medium',
        text: `${firstToSecondDrop.toFixed(0)}% of customers do not make a second purchase, leaving ${secondPurchaseRate.toFixed(1)}% who reach their second purchase, as shown in the Second Purchase Rate KPI and Repeat Purchase Depth chart, driven by early lifecycle decay`
      });
    }
  }

  // Drop-off rate between purchases
  if (repeatData.length >= 2) {
    const firstToSecond = repeatData.find(d => d.purchaseCount === 2);
    const secondToThird = repeatData.find(d => d.purchaseCount === 3);
    
    if (firstToSecond && secondToThird && firstToSecond.percentOfOriginal > 0) {
      const dropOff2to3 = ((firstToSecond.percentOfOriginal - secondToThird.percentOfOriginal) / firstToSecond.percentOfOriginal) * 100;
      
      if (dropOff2to3 > 20) {
        findings.push({
          magnitude: dropOff2to3,
          confidence: dropOff2to3 > 30 ? 'high' : 'medium',
          text: `${dropOff2to3.toFixed(0)}% drop-off occurs between second and third purchases (from ${firstToSecond.percentOfOriginal.toFixed(1)}% to ${secondToThird.percentOfOriginal.toFixed(1)}% of original cohort), visible in the Repeat Purchase Depth chart, driven by early lifecycle decay`
        });
      }
    }
  }

  // Median purchases analysis
  if (medianPurchases > 0 && totalCustomers >= MIN_CUSTOMERS) {
    if (medianPurchases < 2) {
      findings.push({
        magnitude: 2 - medianPurchases, // Higher magnitude for lower median
        confidence: medianPurchases < 1.5 ? 'high' : 'medium',
        text: `Median purchases per customer is ${medianPurchases.toFixed(1)}, as shown in the Median Purchases KPI, compared to the ${(100 - secondPurchaseRate).toFixed(0)}% first-purchase-only rate visible in the repeat purchase breakdown table, driven by early lifecycle decay`
      });
    }
  }

  // Compare second purchase rate to third purchase rate
  if (repeatData.length >= 3) {
    const secondPurchase = repeatData.find(d => d.purchaseCount === 2);
    const thirdPurchase = repeatData.find(d => d.purchaseCount === 3);
    
    if (secondPurchase && thirdPurchase && secondPurchase.percentOfOriginal > 0) {
      const secondToThirdRetention = (thirdPurchase.percentOfOriginal / secondPurchase.percentOfOriginal) * 100;
      
      if (secondToThirdRetention < 60) {
        findings.push({
          magnitude: 100 - secondToThirdRetention,
          confidence: secondToThirdRetention < 50 ? 'high' : 'medium',
          text: `${secondToThirdRetention.toFixed(0)}% of second-purchase customers reach a third purchase (${thirdPurchase.percentOfOriginal.toFixed(1)}% of original cohort), as shown in the Repeat Purchase Depth chart, compared to the ${secondPurchaseRate.toFixed(1)}% second-purchase rate, driven by retention durability`
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
 * Enhanced diagnosis with severity and causality for Repeat Purchase Rates page
 * Returns diagnosis sentence, severity indicator, and causality factors
 */
export function diagnoseRepeatRatesEnhanced(input: RepeatRatesDiagnosisInput): EnhancedDiagnosisResult {
  const sentence = diagnoseRepeatRates(input);
  
  if (!sentence) {
    return {
      sentence: null,
      severity: null,
      causality: [],
    };
  }

  const { repeatData, secondPurchaseRate, medianPurchases, totalCustomers } = input;

  let severity: SeverityInfo | null = null;
  const causalityFactors: CausalityFactor[] = [];

  // Detect structural vs promotional behavior
  const firstToSecondDrop = 100 - secondPurchaseRate;
  
  if (firstToSecondDrop > 50) {
    severity = {
      level: 'critical',
      label: 'Critical',
      description: 'Critical: More than half of customers never make a second purchase - behavior is not structural',
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
      icon: null,
    };
    
    causalityFactors.push({
      factor: 'Non-Structural Repeat Behavior',
      explanation: 'The majority of customers do not make a second purchase, suggesting repeat behavior is not structural or habitual. This could indicate customers are being "bribed" to return with discounts, or the product doesn\'t naturally drive repeat engagement.',
      evidence: `${firstToSecondDrop.toFixed(0)}% of customers never make a second purchase`,
    });
  } else if (firstToSecondDrop > 30) {
    severity = {
      level: 'high',
      label: 'High',
      description: 'High: Significant portion of customers do not repeat purchase - behavior may be promotional rather than structural',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 border-orange-200',
      icon: null,
    };
    
    causalityFactors.push({
      factor: 'Weak Structural Behavior',
      explanation: 'A large portion of customers do not naturally return for a second purchase. This suggests repeat behavior may be driven by promotions rather than genuine habit formation or product value.',
      evidence: `${firstToSecondDrop.toFixed(0)}% of customers never make a second purchase`,
    });
  }

  // Detect drop-off patterns
  if (repeatData.length >= 2) {
    const firstToSecond = repeatData.find(d => d.purchaseCount === 2);
    const secondToThird = repeatData.find(d => d.purchaseCount === 3);
    
    if (firstToSecond && secondToThird && firstToSecond.percentOfOriginal > 0) {
      const dropOff2to3 = ((firstToSecond.percentOfOriginal - secondToThird.percentOfOriginal) / firstToSecond.percentOfOriginal) * 100;
      
      if (dropOff2to3 > 30) {
        causalityFactors.push({
          factor: 'Early Lifecycle Drop-Off',
          explanation: 'Even customers who make a second purchase often don\'t reach a third purchase. This suggests the product or experience doesn\'t create strong enough habits or value to sustain repeat behavior beyond the initial purchase.',
          evidence: `${dropOff2to3.toFixed(0)}% drop-off between second and third purchases`,
        });
      }
    }
  }

  // Detect median purchases pattern
  if (medianPurchases < 2) {
    causalityFactors.push({
      factor: 'Low Purchase Frequency',
      explanation: 'The median customer makes less than 2 purchases, indicating that repeat behavior is not the norm. This could suggest the product is more of a one-time purchase, or that customers aren\'t finding enough value to return.',
      evidence: `Median purchases is ${medianPurchases.toFixed(1)}`,
    });
  }

  // Default causality if none detected
  if (causalityFactors.length === 0 && sentence) {
    causalityFactors.push({
      factor: 'Repeat Behavior Patterns',
      explanation: 'Repeat purchase patterns are influenced by product value, habit formation, lifecycle communication, offer strategy, and customer expectations.',
      evidence: 'Observed through repeat purchase rate analysis',
    });
  }

  return {
    sentence,
    severity,
    causality: causalityFactors,
  };
}
