/**
 * Derive blended monthly marketing spend from a net-revenue percentage assumption (Sprint 5D).
 * Pure — no session, no acquisition math.
 */

import type { Order } from "../types/order";
import type { MarketingSpendAssumptions } from "../types/scenario";
import type { MarketingSpend } from "../types/marketing";
import { netOrderRevenue, utcMonthKeyFromIso } from "../metrics/utils";

/** Sum net merchandise revenue by UTC order month, then apply the spend percentage. */
export function synthesizeMarketingSpendFromAssumption(
  orders: readonly Order[],
  assumption: MarketingSpendAssumptions,
): readonly MarketingSpend[] {
  const pct = assumption.marketingSpendPctOfNetRevenue;
  if (!Number.isFinite(pct) || pct < 0 || pct > 1) return [];

  const netByMonth = new Map<string, number>();
  for (const order of orders) {
    const month = utcMonthKeyFromIso(order.orderedAt);
    if (!month) continue;
    netByMonth.set(month, (netByMonth.get(month) ?? 0) + netOrderRevenue(order));
  }

  const months = [...netByMonth.keys()].sort();
  return months.map((month) => ({
    month,
    spend: (netByMonth.get(month) ?? 0) * pct,
  }));
}
