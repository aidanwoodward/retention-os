import type { RetentionOSDataset } from "../data-source";
import type { Customer, LTVPoint, MarginAssumptions } from "../types";
import { isIdentifiedOrder, type Order } from "../types/order";
import {
  addMonthsToMonthKey,
  calendarMonthIndexFromKey,
  safeDivide,
  utcMonthKeyFromIso,
} from "./utils";
import { calculateLTVByCohort } from "./ltv";
import { calculateRetentionByCohort, type RetentionByCohortSeries } from "./retention";

/** Matrix metric slice — extend with quarter/year grains later without breaking call sites. */
export type CohortMatrixGrain = "month";

export type CohortMatrixMetricKind =
  | "retention_rate"
  | "active_customers"
  | "revenue_ltv"
  | "contribution_ltv"
  | "orders_per_customer";

export type CohortMatrixCellFormattedType = "percent" | "count" | "currency" | "ratio";

export interface CohortMatrixCell {
  readonly offset: number;
  readonly value: number | null;
  readonly formattedType: CohortMatrixCellFormattedType;
  /** False when offset is beyond observed calendar history for this cohort (triangle upper region). */
  readonly available: boolean;
}

export interface CohortMatrixRow {
  readonly cohortPeriod: string;
  readonly cohortSize: number;
  readonly cells: readonly CohortMatrixCell[];
}

export interface CohortMatrixModel {
  readonly metric: CohortMatrixMetricKind;
  readonly grain: CohortMatrixGrain;
  /** Column headers M0..Mk in cohort-age months. */
  readonly columnOffsets: readonly number[];
  readonly rows: readonly CohortMatrixRow[];
  /** True when contribution LTV can appear in at least one in-window cell (assumptions or order-level margin). */
  readonly contributionLtvSignalPresent: boolean;
  /** Shown when contribution metric is selected but no contribution path exists on the dataset. */
  readonly contributionLtvCaveat: string | null;
}

export interface BuildCohortMatrixOptions {
  readonly metric: CohortMatrixMetricKind;
  readonly maxOffset?: number;
  readonly grain?: CohortMatrixGrain;
}

function customerCohortPeriod(c: Customer): string {
  return utcMonthKeyFromIso(c.firstOrderAt);
}

function hasContributionLtvSignal(
  orders: readonly Order[],
  marginAssumptions: MarginAssumptions | undefined,
): boolean {
  if (marginAssumptions != null) return true;
  return orders.some((o) => o.contributionMargin != null && Number.isFinite(o.contributionMargin));
}

/**
 * Cumulative average orders per cohort customer through each cohort-month offset.
 * Time window matches `calculateLTVByCohort` (orders with calendar month index ≤ end of cohortPeriod + offset).
 */
function cumulativeAvgOrdersPerCustomerByCohort(
  customers: readonly Customer[],
  orders: readonly Order[],
  maxOffsetCap: number | undefined,
): Map<string, Map<number, number>> {
  const out = new Map<string, Map<number, number>>();
  if (customers.length === 0) return out;

  const knownIds = new Set(customers.map((c) => c.id));
  const ordersByCustomer = new Map<string, Order[]>();
  for (const c of customers) {
    ordersByCustomer.set(c.id, []);
  }
  for (const o of orders) {
    if (!isIdentifiedOrder(o)) continue;
    const bucket = ordersByCustomer.get(o.customerId);
    if (bucket) bucket.push(o);
  }
  for (const list of ordersByCustomer.values()) {
    list.sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
  }

  const cohortMembers = new Map<string, Customer[]>();
  for (const c of customers) {
    const p = customerCohortPeriod(c);
    const group = cohortMembers.get(p);
    if (group) group.push(c);
    else cohortMembers.set(p, [c]);
  }

  let globalMaxOrderMonthIdx = 0;
  for (const o of orders) {
    if (!isIdentifiedOrder(o) || !knownIds.has(o.customerId)) continue;
    globalMaxOrderMonthIdx = Math.max(globalMaxOrderMonthIdx, calendarMonthIndexFromKey(utcMonthKeyFromIso(o.orderedAt)));
  }

  const cohortPeriods = [...cohortMembers.keys()].sort();
  for (const cohortPeriod of cohortPeriods) {
    const members = cohortMembers.get(cohortPeriod) ?? [];
    const cohortSize = members.length;
    if (cohortSize === 0) continue;

    const cohortStartIdx = calendarMonthIndexFromKey(cohortPeriod);
    const impliedMaxOffset = Math.max(0, globalMaxOrderMonthIdx - cohortStartIdx);
    const maxOffset =
      maxOffsetCap != null ? Math.min(maxOffsetCap, impliedMaxOffset) : impliedMaxOffset;

    const byOff = new Map<number, number>();
    for (let offset = 0; offset <= maxOffset; offset++) {
      const endMonth = addMonthsToMonthKey(cohortPeriod, offset);
      const endIdx = calendarMonthIndexFromKey(endMonth);
      let orderCount = 0;
      for (const member of members) {
        for (const o of ordersByCustomer.get(member.id) ?? []) {
          const orderMonthIdx = calendarMonthIndexFromKey(utcMonthKeyFromIso(o.orderedAt));
          if (orderMonthIdx <= endIdx) orderCount += 1;
        }
      }
      byOff.set(offset, safeDivide(orderCount, cohortSize));
    }
    out.set(cohortPeriod, byOff);
  }

  return out;
}

function ltvPointMap(points: readonly LTVPoint[]): Map<string, LTVPoint> {
  const m = new Map<string, LTVPoint>();
  for (const p of points) {
    m.set(`${p.cohortKey}:${p.offset}`, p);
  }
  return m;
}

function maxGlobalColumn(retention: readonly RetentionByCohortSeries[]): number {
  let max = 0;
  for (const s of retention) {
    if (s.points.length > 0) {
      max = Math.max(max, s.points[s.points.length - 1]!.offset);
    }
  }
  return max;
}

/**
 * Board-style cohort triangle from the command-centre dataset.
 * Uses `calculateRetentionByCohort` and `calculateLTVByCohort` only — no duplicated retention/LTV math.
 */
export function buildCohortMatrixFromDataset(
  dataset: RetentionOSDataset,
  options: BuildCohortMatrixOptions,
): CohortMatrixModel {
  const grain: CohortMatrixGrain = options.grain ?? "month";
  const { customers, orders, marginAssumptions } = dataset;
  const metric = options.metric;

  const contributionLtvSignalPresent = hasContributionLtvSignal(orders, marginAssumptions);
  const contributionLtvCaveat =
    metric === "contribution_ltv" && !contributionLtvSignalPresent ?
      "Contribution LTV needs order-level contribution_margin on your orders, or an explicit session margin assumption for uploaded CSV data."
    : null;

  if (customers.length === 0) {
    return {
      metric,
      grain,
      columnOffsets: [],
      rows: [],
      contributionLtvSignalPresent,
      contributionLtvCaveat,
    };
  }

  const retention = calculateRetentionByCohort(customers, orders, { maxOffset: options.maxOffset });
  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions, { maxOffset: options.maxOffset });
  const ltvByKey = ltvPointMap(ltvPoints);

  const ordersPerCohort =
    metric === "orders_per_customer" ? cumulativeAvgOrdersPerCustomerByCohort(customers, orders, options.maxOffset) : null;

  const globalMax = maxGlobalColumn(retention);
  const columnOffsets = Array.from({ length: globalMax + 1 }, (_, i) => i);

  const rows: CohortMatrixRow[] = [];

  for (const s of retention) {
    const cohortPeriod = s.cohortPeriod;
    const cohortSize = s.cohortSize;
    const rowMax = s.points.length > 0 ? s.points[s.points.length - 1]!.offset : -1;
    const cells: CohortMatrixCell[] = [];

    for (const offset of columnOffsets) {
      const pastWindow = offset <= rowMax;
      if (!pastWindow) {
        let ft: CohortMatrixCellFormattedType = "ratio";
        if (metric === "retention_rate") ft = "percent";
        else if (metric === "active_customers") ft = "count";
        else if (metric === "revenue_ltv" || metric === "contribution_ltv") ft = "currency";
        cells.push({ offset, value: null, formattedType: ft, available: false });
        continue;
      }

      const ltPt = ltvByKey.get(`${cohortPeriod}:${offset}`);

      switch (metric) {
        case "retention_rate": {
          const rp = s.points.find((p) => p.offset === offset);
          cells.push({
            offset,
            value: rp ? rp.retentionRate : null,
            formattedType: "percent",
            available: true,
          });
          break;
        }
        case "active_customers": {
          const rp = s.points.find((p) => p.offset === offset);
          const n = rp?.activeCustomers;
          cells.push({
            offset,
            value: n != null ? n : null,
            formattedType: "count",
            available: true,
          });
          break;
        }
        case "revenue_ltv": {
          cells.push({
            offset,
            value: ltPt ? ltPt.cumulativeAvgGrossRevenue : null,
            formattedType: "currency",
            available: true,
          });
          break;
        }
        case "contribution_ltv": {
          const v = ltPt?.cumulativeAvgContribution;
          cells.push({
            offset,
            value: v !== undefined ? v : null,
            formattedType: "currency",
            available: true,
          });
          break;
        }
        case "orders_per_customer": {
          const v = ordersPerCohort?.get(cohortPeriod)?.get(offset);
          cells.push({
            offset,
            value: v !== undefined ? v : null,
            formattedType: "ratio",
            available: true,
          });
          break;
        }
        default: {
          const _exhaustive: never = metric;
          throw new Error(`Unknown cohort matrix metric: ${String(_exhaustive)}`);
        }
      }
    }

    rows.push({ cohortPeriod, cohortSize, cells });
  }

  return {
    metric,
    grain,
    columnOffsets,
    rows,
    contributionLtvSignalPresent,
    contributionLtvCaveat,
  };
}
