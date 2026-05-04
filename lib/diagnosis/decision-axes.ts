import { DecisionAxis } from "@/components/diagnosis/DecisionAxes";

/**
 * Map diagnosis sentence to relevant decision axes
 * 
 * Returns 0-3 axes based on the diagnosis patterns observed.
 * Returns empty array if no clear mapping exists (silence > filler).
 */
export function getDecisionAxesForDiagnosis(
  sentence: string | null,
  pageType: 'revenue-cohorts' | 'retention-curves' | 'ltv-curves' | 'repeat-rates'
): DecisionAxis[] {
  if (!sentence || sentence.trim().length === 0) {
    return [];
  }
  
  // Extract key patterns from diagnosis sentence
  const allText = sentence.toLowerCase();
  
  // Page-specific axis mapping
  switch (pageType) {
    case 'revenue-cohorts':
      return getRevenueCohortsAxes(allText);
    
    case 'retention-curves':
      return getRetentionCurvesAxes(allText);
    
    case 'ltv-curves':
      return getLTVAxes(allText);
    
    case 'repeat-rates':
      return getRepeatRatesAxes(allText);
    
    default:
      return [];
  }
}

function getRevenueCohortsAxes(
  text: string
): DecisionAxis[] {
  const axes: DecisionAxis[] = [];
  
  // Check for revenue change patterns
  const hasRevenueChange = text.includes('revenue') && (
    text.includes('increased') || text.includes('decreased')
  );
  
  // Check for customer count change patterns
  const hasCustomerChange = text.includes('customer count') || text.includes('customers');
  
  // Check for cohort concentration patterns
  const hasConcentration = text.includes('cohort represents') || text.includes('top cohort');
  
  // Check for cohort performance differences
  const hasCohortComparison = text.includes('recent cohorts') || text.includes('prior cohorts');
  
  // Pricing Strategy axis
  if (hasRevenueChange || hasCustomerChange) {
      axes.push({
        name: "Pricing Strategy",
        influences: "Average order value and revenue per customer across cohorts",
        directionalEffect: "Higher prices typically increase revenue per customer but may reduce customer count; lower prices typically increase volume but reduce per-customer revenue",
        tradeoffs: "Price increases can improve revenue from existing customers but may reduce acquisition volume; price decreases can drive volume but compress margins"
      });
  }
  
  // Acquisition Mix axis
  if (hasCustomerChange || hasCohortComparison) {
      axes.push({
        name: "Acquisition Mix",
        influences: "The composition of channels, segments, and customer types acquired over time",
        directionalEffect: "Different acquisition sources typically exhibit different retention and revenue patterns, affecting cohort performance",
        tradeoffs: "High-value acquisition channels often have higher costs and lower volume; volume-focused channels may have lower retention and revenue per customer"
      });
  }
  
  // Retention Investment axis
  if (hasConcentration || hasCohortComparison) {
      axes.push({
        name: "Retention Investment",
        influences: "Resources allocated to maintaining and deepening relationships with existing customers",
        directionalEffect: "Increased investment typically improves retention and repeat purchase rates but requires upfront costs",
        tradeoffs: "Over-investment in retention can reduce resources for acquisition; under-investment can lead to higher churn and lower lifetime value"
      });
  }
  
  return axes.slice(0, 3); // Max 3 axes
}

function getRetentionCurvesAxes(
  text: string
): DecisionAxis[] {
  const axes: DecisionAxis[] = [];
  
  // Check for retention decline patterns
  const hasRetentionDrop = text.includes('retention drops') || text.includes('retention decreases');
  
  // Check for stabilization patterns
  const hasStabilization = text.includes('stabilizes') || text.includes('stabilization');
  
  // Check for cohort comparison patterns
  const hasCohortComparison = text.includes('recent cohorts') || text.includes('prior cohorts');
  
  // Check for revenue vs customer retention gap
  const hasRetentionGap = text.includes('revenue retention') && text.includes('customer retention');
  
  // Onboarding Quality axis
  if (hasRetentionDrop || hasCohortComparison) {
      axes.push({
        name: "Onboarding Quality",
        influences: "The initial customer experience and activation process in the first few periods",
        directionalEffect: "Stronger onboarding typically improves early retention rates and reduces first-period drop-off",
        tradeoffs: "Comprehensive onboarding requires more resources and can delay time-to-value; minimal onboarding may reduce costs but increase early churn"
      });
  }
  
  // Product Engagement axis
  if (hasRetentionDrop || hasStabilization) {
      axes.push({
        name: "Product Engagement",
        influences: "How frequently and deeply customers interact with core product features over time",
        directionalEffect: "Higher engagement typically correlates with improved retention rates and reduced churn",
        tradeoffs: "Driving engagement requires product development investment and may not suit all customer segments; over-engagement can lead to fatigue"
      });
  }
  
  // Lifecycle Communication axis
  if (hasRetentionGap || hasCohortComparison) {
      axes.push({
        name: "Lifecycle Communication",
        influences: "The timing, frequency, and relevance of communications throughout the customer journey",
        directionalEffect: "Well-timed communications typically improve retention and reactivation rates at key decision points",
        tradeoffs: "Too frequent communication can lead to unsubscribes and fatigue; too infrequent can result in missed re-engagement opportunities"
      });
  }
  
  return axes.slice(0, 3); // Max 3 axes
}

function getLTVAxes(
  text: string
): DecisionAxis[] {
  const axes: DecisionAxis[] = [];
  
  // Check for LTV growth patterns
  const hasLTVGrowth = text.includes('ltv increases') || text.includes('ltv growth');
  
  // Check for CLR comparison patterns
  const hasCLRComparison = text.includes('recent cohorts') && text.includes('clr');
  
  // Check for stabilization patterns
  const hasStabilization = text.includes('stabilizes') || text.includes('stabilization');
  
  // Acquisition Quality axis
  if (hasCLRComparison || hasLTVGrowth) {
      axes.push({
        name: "Acquisition Quality",
        influences: "The initial fit and value alignment between customers and the product at acquisition",
        directionalEffect: "Higher-quality acquisition typically leads to faster LTV growth and higher CLR values",
        tradeoffs: "Quality-focused acquisition often has higher costs and lower volume; volume-focused acquisition may have lower initial LTV but broader reach"
      });
  }
  
  // Retention Investment axis
  if (hasLTVGrowth || hasStabilization) {
      axes.push({
        name: "Retention Investment",
        influences: "Resources allocated to maintaining relationships and encouraging repeat purchases over time",
        directionalEffect: "Increased investment typically accelerates LTV growth and extends the active customer lifetime",
        tradeoffs: "Over-investment can reduce profitability per customer; under-investment can limit LTV growth and shorten customer lifetime"
      });
  }
  
  // Pricing Strategy axis
  if (hasLTVGrowth || hasStabilization) {
      axes.push({
        name: "Pricing Strategy",
        influences: "The pricing model, structure, and changes over the customer lifecycle",
        directionalEffect: "Strategic pricing adjustments can influence both acquisition volume and LTV growth trajectory",
        tradeoffs: "Price increases can boost LTV but may reduce acquisition and retention; price decreases can drive volume but compress margins"
      });
  }
  
  return axes.slice(0, 3); // Max 3 axes
}

function getRepeatRatesAxes(
  text: string
): DecisionAxis[] {
  const axes: DecisionAxis[] = [];
  
  // Check for second purchase rate patterns
  const hasSecondPurchase = text.includes('second purchase') || text.includes('do not make a second purchase');
  
  // Check for drop-off patterns
  const hasDropOff = text.includes('drop-off') || text.includes('drop off');
  
  // Check for median purchases patterns
  const hasMedianPurchases = text.includes('median purchases');
  
  // Check for conversion patterns
  const hasConversion = text.includes('reach a third purchase') || text.includes('second-purchase customers');
  
  // Lifecycle Investment axis
  if (hasSecondPurchase || hasDropOff || hasConversion) {
      axes.push({
        name: "Lifecycle Investment",
        influences: "Resources allocated to nurturing customers through key transition points in their journey",
        directionalEffect: "Targeted investment at critical moments typically improves conversion rates between purchase stages",
        tradeoffs: "Over-investment in lifecycle can reduce acquisition budgets; under-investment can result in missed conversion opportunities"
      });
  }
  
  // Offer Strategy axis
  if (hasSecondPurchase || hasDropOff) {
      axes.push({
        name: "Offer Strategy",
        influences: "The timing, value, and targeting of promotional offers and incentives throughout the customer lifecycle",
        directionalEffect: "Well-timed offers typically improve repeat purchase rates and reduce drop-off between purchases",
        tradeoffs: "Over-reliance on offers can erode margins and train customers to wait for discounts; under-use can miss re-engagement opportunities"
      });
  }
  
  // Onboarding Quality axis
  if (hasSecondPurchase || hasMedianPurchases) {
      axes.push({
        name: "Onboarding Quality",
        influences: "The initial customer experience and early value delivery that sets expectations for future interactions",
        directionalEffect: "Stronger onboarding typically improves the likelihood of second and subsequent purchases",
        tradeoffs: "Comprehensive onboarding requires more resources upfront; minimal onboarding may reduce costs but decrease repeat purchase probability"
      });
  }
  
  return axes.slice(0, 3); // Max 3 axes
}
