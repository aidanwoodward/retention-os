import { ImpactRange } from "@/components/diagnosis/ImpactRanges";

interface RepeatPurchaseData {
  purchaseCount: number;
  purchaseCountLabel: string;
  customersReaching: number;
  percentOfOriginal: number;
  dropOffVsPrevious: number | null;
}

interface RepeatRatesImpactInput {
  repeatData: Array<RepeatPurchaseData>;
  secondPurchaseRate: number;
  totalCustomers: number;
}

/**
 * Compute impact ranges for Repeat Purchase Rates page
 * 
 * Uses counterfactual analysis: compares current repeat purchase rates
 * against historical patterns to estimate retention durability delta.
 * 
 * Rules:
 * - Shows retained customers delta (loss avoided framing)
 * - Provides Low/Base/High ranges based on historical variation
 * - Suppresses if sample size is insufficient
 */
export function computeRepeatRatesImpactRanges(
  input: RepeatRatesImpactInput
): ImpactRange[] {
  const { repeatData, secondPurchaseRate, totalCustomers } = input;

  const MIN_CUSTOMERS = 100;
  const MIN_DATA_POINTS = 3;

  if (totalCustomers < MIN_CUSTOMERS || repeatData.length < MIN_DATA_POINTS) {
    return [];
  }

  const ranges: ImpactRange[] = [];

  // Calculate second purchase rate delta
  // Use historical variation in drop-off rates as proxy for uncertainty
  const dropOffRates = repeatData
    .filter(d => d.dropOffVsPrevious !== null)
    .map(d => d.dropOffVsPrevious!)
    .filter(rate => rate > 0);

  if (dropOffRates.length < 2) {
    return [];
  }

  // Calculate average drop-off rate and variation
  const avgDropOff = dropOffRates.reduce((a, b) => a + b, 0) / dropOffRates.length;
  const variance = dropOffRates.reduce((sum, rate) => sum + Math.pow(rate - avgDropOff, 2), 0) / dropOffRates.length;
  const stdDev = Math.sqrt(variance);

  // Estimate historically observed downside bound for second purchase rate (higher drop-off = lower retention)
  // Historically observed downside bound: drop-off is 1 std dev higher than average
  const downsideBoundDropOff = Math.min(100, avgDropOff + stdDev);
  const downsideBoundSecondPurchaseRate = Math.max(0, 100 - downsideBoundDropOff);
  
  // Current second purchase rate
  const currentSecondPurchaseRate = secondPurchaseRate;
  
  // Historically observed upside bound: drop-off is 1 std dev lower than average
  const upsideBoundDropOff = Math.max(0, avgDropOff - stdDev);
  const upsideBoundSecondPurchaseRate = Math.min(100, 100 - upsideBoundDropOff);

  // Calculate customers retained at each bound
  const currentCustomersRetained = (currentSecondPurchaseRate / 100) * totalCustomers;
  const downsideBoundCustomersRetained = (downsideBoundSecondPurchaseRate / 100) * totalCustomers;
  const upsideBoundCustomersRetained = (upsideBoundSecondPurchaseRate / 100) * totalCustomers;

  // Show delta vs historically observed downside bound (loss avoided framing)
  // Base: current vs downside bound
  // Low: 0 (no improvement vs downside bound)
  // High: upside bound vs downside bound
  const baseDelta = currentCustomersRetained - downsideBoundCustomersRetained;
  const lowDelta = 0; // Historically observed downside bound: no improvement
  const highDelta = upsideBoundCustomersRetained - downsideBoundCustomersRetained;

  // Only show if magnitude is meaningful (>50 customers or >5% of total)
  if (baseDelta > 50 || (baseDelta / totalCustomers) > 0.05) {
    ranges.push({
      label: "Retained customers delta",
      low: lowDelta,
      base: baseDelta,
      high: highDelta,
      unit: 'count',
      description: `Implied difference in customers reaching second purchase vs historical variation observed`
    });
  }

  return ranges;
}
