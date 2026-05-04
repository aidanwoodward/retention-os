import type { MarginAssumptions } from "../types";

/**
 * Single-lever contribution model: ~38¢ per merchandise dollar after COGS + variable selling costs.
 * Matches believable blended CPG skincare economics for investor-style diagnostics (not audited).
 */
export const DEMO_MARGIN_ASSUMPTIONS: MarginAssumptions = {
  contributionMarginPct: 0.38,
  netRevenueMultiplier: 1,
};
