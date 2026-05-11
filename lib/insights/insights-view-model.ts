import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import type { Insight } from "../types/insight";
import type { RevenueDurabilityStatus } from "./context";
import {
  buildDiagnosticInsightsBundle,
  generateDiagnosticInsights,
} from "./generate-diagnostic-insights";
import { evaluateRevenueDurabilityStatus, methodologyNotesSnapshot } from "./rules";

/**
 * Transparency bullets aligned with the dashboard durability card (`computeDurability` in
 * `dashboard-view-model`) so operators see the same vote inputs in both places.
 */
const DURABILITY_TRANSPARENCY_NOTES = [
  "Snapshot uses MVP fraction thresholds only (portfolio repeat ≥2 orders; first→second ≤90 calendar days vs first order).",
  "Month +1 active rate is cohort calendar-month repurchase breadth — not interchangeable with journey first-to-second timing.",
  "LTV cohort spread compares terminal staircase net revenue LTV only (discounts/refunds removed from merchandise revenue).",
] as const;

export interface InsightsPageViewModel {
  readonly durabilityStatus: RevenueDurabilityStatus;
  /** Same transparency copy as the executive dashboard durability card. */
  readonly durabilityTransparencyNotes: readonly string[];
  /** High-level rules / metric definitions for the insight engine. */
  readonly insightsEngineMethodologyNotes: readonly string[];
  readonly insights: readonly Insight[];
}

/**
 * Command-centre dataset → metrics bundle → deterministic insights. Keeps React free of metric math.
 */
export function buildInsightsPageViewModelFromDataset(dataset: RetentionOSDataset): InsightsPageViewModel {
  const bundle = buildDiagnosticInsightsBundle(
    dataset.customers,
    dataset.orders,
    dataset.marginAssumptions,
  );
  const { recentOffsetLtvComparison, ...input } = bundle;

  const insights = generateDiagnosticInsights(input, recentOffsetLtvComparison);

  const durabilityStatus = evaluateRevenueDurabilityStatus({
    repeatPurchaseRate: input.repeatPurchaseRate,
    firstToSecond90Rate: input.firstToSecondWithin90DaysRate,
    avgMonthPlus1ActiveRate: input.retentionAverages.m1,
    spreadUsdLike: input.terminalNetRevenueSpreadUsd,
  });

  return {
    durabilityStatus,
    durabilityTransparencyNotes: DURABILITY_TRANSPARENCY_NOTES,
    insightsEngineMethodologyNotes: methodologyNotesSnapshot(),
    insights,
  };
}

/**
 * Demo-backed insights page payload: same as {@link buildInsightsPageViewModelFromDataset} with the canonical demo fixture.
 */
export function buildInsightsPageViewModel(seed?: number): InsightsPageViewModel {
  return buildInsightsPageViewModelFromDataset(buildDemoRetentionOSDataset(seed));
}
