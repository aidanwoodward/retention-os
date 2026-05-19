import type { Customer, RetentionPoint } from "../types";
import type { Order } from "../types/order";
import {
  addMonthsToMonthKey,
  calendarMonthIndexFromKey,
  netOrderRevenue,
  safeDivide,
  utcMonthKeyFromIso,
} from "./utils";

export interface RetentionByCohortSeries {
  cohortPeriod: string;
  cohortKey: string;
  cohortSize: number;
  points: RetentionPoint[];
}

export interface CalculateRetentionOptions {
  /** Largest month offset from acquisition month to emit (inclusive). When omitted, derived from latest order month. */
  maxOffset?: number;
}

function customerCohortPeriod(c: Customer): string {
  return utcMonthKeyFromIso(c.firstOrderAt);
}

function monthKeysForOrders(orders: readonly Order[], knownCustomerIds: ReadonlySet<string>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const o of orders) {
    if (!knownCustomerIds.has(o.customerId)) {
      continue;
    }
    const mk = utcMonthKeyFromIso(o.orderedAt);
    let set = map.get(o.customerId);
    if (!set) {
      set = new Set();
      map.set(o.customerId, set);
    }
    set.add(mk);
  }
  return map;
}

/**
 * Cohort survival / repurchase by calendar month offset from `Customer.firstOrderAt` month (UTC).
 *
 * Offset `k` asks: “Of customers whose first order fell in cohort month `M`, how many placed ≥1 order
 * in calendar month `M + k`?” Denominator is always the cohort size in the dataset.
 */
export function calculateRetentionByCohort(
  customers: readonly Customer[],
  orders: readonly Order[],
  options?: CalculateRetentionOptions,
): RetentionByCohortSeries[] {
  const knownIds = new Set(customers.map((c) => c.id));

  const cohortPeriodByCustomerId = new Map<string, string>();
  for (const c of customers) {
    cohortPeriodByCustomerId.set(c.id, customerCohortPeriod(c));
  }

  const orderMonthsByCustomer = monthKeysForOrders(orders, knownIds);

  let globalMaxOrderMonthIdx = 0;
  for (const o of orders) {
    if (!knownIds.has(o.customerId)) {
      continue;
    }
    const mk = utcMonthKeyFromIso(o.orderedAt);
    globalMaxOrderMonthIdx = Math.max(globalMaxOrderMonthIdx, calendarMonthIndexFromKey(mk));
  }

  const cohortToMembers = new Map<string, Customer[]>();
  for (const c of customers) {
    const p = customerCohortPeriod(c);
    const list = cohortToMembers.get(p);
    if (list) {
      list.push(c);
    } else {
      cohortToMembers.set(p, [c]);
    }
  }

  const cohortPeriods = [...cohortToMembers.keys()].sort();

  const series: RetentionByCohortSeries[] = [];

  for (const cohortPeriod of cohortPeriods) {
    const members = cohortToMembers.get(cohortPeriod) ?? [];
    const cohortSize = members.length;
    const cohortKey = cohortPeriod;

    const cohortStartIdx = calendarMonthIndexFromKey(cohortPeriod);
    const impliedMaxOffset = Math.max(0, globalMaxOrderMonthIdx - cohortStartIdx);
    const maxOffset = options?.maxOffset != null ? Math.min(options.maxOffset, impliedMaxOffset) : impliedMaxOffset;

    const points: RetentionPoint[] = [];

    for (let offset = 0; offset <= maxOffset; offset++) {
      const targetMonth = addMonthsToMonthKey(cohortPeriod, offset);
      let activeCustomers = 0;
      let revenueInPeriod = 0;

      for (const member of members) {
        if (orderMonthsByCustomer.get(member.id)?.has(targetMonth)) {
          activeCustomers += 1;
        }
      }

      for (const o of orders) {
        if (!knownIds.has(o.customerId)) {
          continue;
        }
        if (cohortPeriodByCustomerId.get(o.customerId) !== cohortPeriod) {
          continue;
        }
        if (utcMonthKeyFromIso(o.orderedAt) !== targetMonth) {
          continue;
        }
        revenueInPeriod += netOrderRevenue(o);
      }

      points.push({
        cohortKey,
        offset,
        retentionRate: safeDivide(activeCustomers, cohortSize),
        activeCustomers,
        revenueInPeriod,
      });
    }

    series.push({ cohortPeriod, cohortKey, cohortSize, points });
  }

  return series;
}
