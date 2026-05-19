import type { Cohort, Customer, MarginAssumptions } from "../types";
import type { Order } from "../types/order";
import { netOrderRevenue, orderContribution, utcMonthKeyFromIso } from "./utils";

/**
 * Cohort row from first-order month + commercial rollups for all-time activity in the dataset window.
 *
 * `cohortKey` defaults to `cohortPeriod` (single-key cohorts). Net revenue = Σ (gross − discounts − refunds).
 */
export interface CohortSummary extends Cohort {
  cohortKey: string;
  totalOrders: number;
  netRevenue: number;
  contribution: number;
}

function cohortPeriodForCustomer(c: Customer): string {
  return utcMonthKeyFromIso(c.firstOrderAt);
}

/**
 * Groups customers by first-order month (`YYYY-MM`, UTC) and aggregates order economics for that cohort's members.
 *
 * `contribution` uses each order's `contributionMargin` when present; otherwise `marginAssumptions`
 * (if provided) estimates contribution from net revenue.
 */
export function calculateCohorts(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions?: MarginAssumptions,
): CohortSummary[] {
  const cohortPeriodByCustomer = new Map<string, string>();
  for (const c of customers) {
    cohortPeriodByCustomer.set(c.id, cohortPeriodForCustomer(c));
  }

  const cohortPeriods = new Set<string>();
  for (const c of customers) {
    cohortPeriods.add(cohortPeriodByCustomer.get(c.id)!);
  }

  const cohortSize = new Map<string, number>();
  for (const c of customers) {
    const p = cohortPeriodByCustomer.get(c.id)!;
    cohortSize.set(p, (cohortSize.get(p) ?? 0) + 1);
  }

  const totalOrders = new Map<string, number>();
  const netRevenue = new Map<string, number>();
  const contribution = new Map<string, number>();

  for (const o of orders) {
    const cohortPeriod = cohortPeriodByCustomer.get(o.customerId);
    if (!cohortPeriod) {
      continue;
    }
    totalOrders.set(cohortPeriod, (totalOrders.get(cohortPeriod) ?? 0) + 1);
    netRevenue.set(cohortPeriod, (netRevenue.get(cohortPeriod) ?? 0) + netOrderRevenue(o));
    contribution.set(
      cohortPeriod,
      (contribution.get(cohortPeriod) ?? 0) + orderContribution(o, marginAssumptions),
    );
  }

  const rows: CohortSummary[] = [];
  for (const cohortPeriod of [...cohortPeriods].sort()) {
    rows.push({
      cohortPeriod,
      cohortKey: cohortPeriod,
      cohortSize: cohortSize.get(cohortPeriod) ?? 0,
      totalOrders: totalOrders.get(cohortPeriod) ?? 0,
      netRevenue: netRevenue.get(cohortPeriod) ?? 0,
      contribution: contribution.get(cohortPeriod) ?? 0,
    });
  }

  return rows;
}
