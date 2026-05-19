import type { Customer, LTVPoint, MarginAssumptions } from "../types";
import type { Order } from "../types/order";
import {
  addMonthsToMonthKey,
  calendarMonthIndexFromKey,
  netOrderRevenue,
  orderContribution,
  safeDivide,
  utcMonthKeyFromIso,
} from "./utils";

export interface CalculateLTVOptions {
  /** Largest month offset from acquisition month included in cumulative totals (inclusive). */
  maxOffset?: number;
}

function customerCohortPeriod(c: Customer): string {
  return utcMonthKeyFromIso(c.firstOrderAt);
}

/**
 * Average cumulative cohort economics by calendar-month age.
 *
 * `LTVPoint.cumulativeAvgGrossRevenue` is populated with **net merchandise revenue**
 * accumulated through the end of month `cohortPeriod + offset` (per MVP spec), even though the
 * canonical field name mentions “gross”.
 *
 * `cumulativeAvgContribution` appears when contribution can be inferred from order-level
 * `contributionMargin` rows and/or the supplied margin assumptions fallback.
 */
export function calculateLTVByCohort(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions?: MarginAssumptions,
  options?: CalculateLTVOptions,
): LTVPoint[] {
  if (customers.length === 0) {
    return [];
  }

  const knownIds = new Set(customers.map((c) => c.id));

  const ordersByCustomer = new Map<string, Order[]>();
  for (const c of customers) {
    ordersByCustomer.set(c.id, []);
  }
  for (const o of orders) {
    const bucket = ordersByCustomer.get(o.customerId);
    if (bucket) {
      bucket.push(o);
    }
  }
  for (const list of ordersByCustomer.values()) {
    list.sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
  }

  const cohortMembers = new Map<string, Customer[]>();
  for (const c of customers) {
    const p = customerCohortPeriod(c);
    const group = cohortMembers.get(p);
    if (group) {
      group.push(c);
    } else {
      cohortMembers.set(p, [c]);
    }
  }

  let globalMaxOrderMonthIdx = 0;
  for (const o of orders) {
    if (!knownIds.has(o.customerId)) {
      continue;
    }
    globalMaxOrderMonthIdx = Math.max(
      globalMaxOrderMonthIdx,
      calendarMonthIndexFromKey(utcMonthKeyFromIso(o.orderedAt)),
    );
  }

  const out: LTVPoint[] = [];
  const cohortPeriods = [...cohortMembers.keys()].sort();

  for (const cohortPeriod of cohortPeriods) {
    const members = cohortMembers.get(cohortPeriod) ?? [];
    const cohortSize = members.length;
    if (cohortSize === 0) {
      continue;
    }

    const cohortKey = cohortPeriod;
    const cohortStartIdx = calendarMonthIndexFromKey(cohortPeriod);
    const impliedMaxOffset = Math.max(0, globalMaxOrderMonthIdx - cohortStartIdx);
    const maxOffset = options?.maxOffset != null ? Math.min(options.maxOffset, impliedMaxOffset) : impliedMaxOffset;

    for (let offset = 0; offset <= maxOffset; offset++) {
      const endMonth = addMonthsToMonthKey(cohortPeriod, offset);
      const endIdx = calendarMonthIndexFromKey(endMonth);

      let cohortNet = 0;
      let cohortContrib = 0;

      for (const member of members) {
        for (const o of ordersByCustomer.get(member.id) ?? []) {
          const orderMonthIdx = calendarMonthIndexFromKey(utcMonthKeyFromIso(o.orderedAt));
          if (orderMonthIdx <= endIdx) {
            cohortNet += netOrderRevenue(o);
            cohortContrib += orderContribution(o, marginAssumptions);
          }
        }
      }

      const point: LTVPoint = {
        cohortKey,
        offset,
        cumulativeAvgGrossRevenue: safeDivide(cohortNet, cohortSize),
      };

      const includeContribution = marginAssumptions != null || cohortContrib > 0;
      if (includeContribution) {
        point.cumulativeAvgContribution = safeDivide(cohortContrib, cohortSize);
      }

      out.push(point);
    }
  }

  return out;
}
