/**
 * Single source of truth for Revenue Durability posture (Healthy / Mixed / Watch).
 * MVP vote heuristic — not a formal composite durability index.
 */

export type RevenueDurabilityStatus = "Healthy" | "Mixed" | "Watch";

/** Fraction: portfolio share with ≥2 orders. */
export const REPEAT_PURCHASE_WATCH = 0.28;
export const REPEAT_PURCHASE_HEALTHY = 0.37;

/** Fraction: first-to-second within 90 calendar days vs all customers. */
export const FIRST_TO_SECOND_90_WATCH = 0.24;
export const FIRST_TO_SECOND_90_HEALTHY = 0.31;

/** Fraction: mean cohort Month +1 active rate across cohorts that have offset +1 data. */
export const MONTH_PLUS_1_ACTIVE_WATCH = 0.065;
export const MONTH_PLUS_1_ACTIVE_HEALTHY = 0.092;

/** USD: strongest minus weakest cohort terminal net revenue LTV (material dispersion). */
export const LTV_COHORT_SPREAD_MATERIAL_USD = 52;

const LTV_SPREAD_HEALTHY_BAND_USD = LTV_COHORT_SPREAD_MATERIAL_USD * 0.45;

export interface RevenueDurabilityStatusInputs {
  repeatPurchaseRate: number;
  firstToSecond90Rate: number;
  avgMonthPlus1ActiveRate: number | null;
  /** Null when cohort spread is not meaningful (single cohort / flat). */
  spreadUsdLike: number | null;
}

export function evaluateRevenueDurabilityStatus(
  inputs: RevenueDurabilityStatusInputs,
): RevenueDurabilityStatus {
  const { repeatPurchaseRate, firstToSecond90Rate, avgMonthPlus1ActiveRate, spreadUsdLike } = inputs;

  let watchVotes = 0;
  let healthyVotes = 0;

  if (repeatPurchaseRate < REPEAT_PURCHASE_WATCH) watchVotes += 2;
  else if (repeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY) healthyVotes += 1;

  if (firstToSecond90Rate < FIRST_TO_SECOND_90_WATCH) watchVotes += 2;
  else if (firstToSecond90Rate >= FIRST_TO_SECOND_90_HEALTHY) healthyVotes += 1;

  if (avgMonthPlus1ActiveRate != null) {
    if (avgMonthPlus1ActiveRate < MONTH_PLUS_1_ACTIVE_WATCH) watchVotes += 1;
    else if (avgMonthPlus1ActiveRate >= MONTH_PLUS_1_ACTIVE_HEALTHY) healthyVotes += 1;
  }

  if (spreadUsdLike != null) {
    if (spreadUsdLike >= LTV_COHORT_SPREAD_MATERIAL_USD) watchVotes += 1;
    else if (spreadUsdLike < LTV_SPREAD_HEALTHY_BAND_USD) healthyVotes += 1;
  }

  if (watchVotes >= 3) return "Watch";
  if (watchVotes <= 1 && healthyVotes >= 2) return "Healthy";
  return "Mixed";
}
