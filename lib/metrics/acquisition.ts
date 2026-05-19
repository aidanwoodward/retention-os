/**
 * Pure acquisition economics helpers — CAC, LTV:CAC, payback previews (Sprint 4D).
 *
 * No silent spend inference: callers must supply `marketingSpend`; functions emit explicit warnings when
 * months or contribution LTV do not support a metric.
 */

import type { Customer } from "../types/customer";
import type { LTVPoint } from "../types/metrics";
import type { MarketingSpend } from "../types/marketing";
import type { Order } from "../types/order";
import type { MarginAssumptions } from "../types/scenario";
import { spendBucketToCohortMonthKey } from "../import/normalise-marketing-spend";
import { calculateLTVByCohort } from "./ltv";
import { safeDivide, utcMonthKeyFromIso } from "./utils";

export interface CacByMonthRow {
  readonly month: string;
  readonly monthlySpend: number;
  readonly acquiredCustomers: number;
  /** Null when spend or acquisitions do not support a finite ratio (no inferred CAC). */
  readonly cac: number | null;
}

export interface CacByMonthResult {
  readonly rows: readonly CacByMonthRow[];
  readonly warnings: readonly string[];
}

export interface BlendedCacResult {
  readonly blendedCac: number | null;
  readonly totalSpend: number;
  readonly customerCount: number;
  readonly warnings: readonly string[];
}

export interface LtvCacRow {
  readonly cohortMonth: string;
  readonly cac: number | null;
  readonly terminalOffset: number;
  readonly avgRevenueLtv: number;
  readonly avgContributionLtv: number | null;
  readonly revenueLtvToCac: number | null;
  readonly contributionLtvToCac: number | null;
}

export interface LtvCacResult {
  readonly rows: readonly LtvCacRow[];
  readonly warnings: readonly string[];
}

export interface PaybackPreviewRow {
  readonly cohortMonth: string;
  readonly cac: number | null;
  /** Months since acquisition (offset) when cumulative contribution LTV first meets or exceeds CAC. */
  readonly monthsToPayback: number | null;
  readonly offsetAchieved: number | null;
}

export interface PaybackPreviewResult {
  readonly rows: readonly PaybackPreviewRow[];
  readonly warnings: readonly string[];
}

export interface AcquisitionPreviewModel {
  readonly hasSpend: boolean;
  readonly spendRowCount: number;
  readonly totalSpend: number;
  readonly spendMonths: readonly string[];
  readonly spendChannels: readonly string[];
  readonly cohortMonths: readonly string[];
  readonly calendarOverlapWarnings: readonly string[];
  readonly cacByMonth: CacByMonthResult;
  readonly blendedCac: BlendedCacResult;
  readonly ltvCac: LtvCacResult;
  readonly payback: PaybackPreviewResult;
}

function sumSpendByCohortMonth(spend: readonly MarketingSpend[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of spend) {
    const ck = spendBucketToCohortMonthKey(row.month);
    if (!ck) continue;
    m.set(ck, (m.get(ck) ?? 0) + row.spend);
  }
  return m;
}

function newCustomersByMonth(customers: readonly Customer[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of customers) {
    const month = utcMonthKeyFromIso(c.firstOrderAt);
    m.set(month, (m.get(month) ?? 0) + 1);
  }
  return m;
}

/**
 * Monthly spend ÷ new customers (first-order month). Rows include all months that appear in spend or acquisitions.
 */
export function calculateCACByMonth(
  customers: readonly Customer[],
  marketingSpend: readonly MarketingSpend[],
): CacByMonthResult {
  const warnings: string[] = [];
  if (marketingSpend.length === 0) {
    warnings.push("No marketing spend provided — CAC is not calculated without Layer 4 spend.");
    return { rows: [], warnings };
  }

  const acquired = newCustomersByMonth(customers);
  const spendByMonth = sumSpendByCohortMonth(marketingSpend);
  const months = new Set([...acquired.keys(), ...spendByMonth.keys()]);
  const sorted = [...months].sort();

  const rows: CacByMonthRow[] = [];
  for (const month of sorted) {
    const n = acquired.get(month) ?? 0;
    const s = spendByMonth.get(month) ?? 0;
    let cac: number | null = null;
    if (n > 0 && s > 0) {
      cac = safeDivide(s, n);
    } else if (n > 0 && s === 0) {
      warnings.push(
        `Month ${month}: ${n} new customer(s) in dataset but $0 spend — CAC not computed (no inferred spend).`,
      );
    } else if (n === 0 && s > 0) {
      warnings.push(
        `Month ${month}: $${s.toLocaleString()} spend but no first-order customers in dataset — CAC denominator is zero.`,
      );
    }
    rows.push({ month, monthlySpend: s, acquiredCustomers: n, cac });
  }

  return { rows, warnings };
}

/** Build month → CAC map for months with a positive finite CAC. */
export function cacMapFromRows(rows: readonly CacByMonthRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r.cac != null && Number.isFinite(r.cac) && r.cac > 0) {
      m.set(r.month, r.cac);
    }
  }
  return m;
}

/**
 * Total spend ÷ customer count — a deliberately blunt blended; see warnings for calendar alignment.
 */
export function calculateBlendedCAC(
  customers: readonly Customer[],
  marketingSpend: readonly MarketingSpend[],
): BlendedCacResult {
  const warnings: string[] = [];
  const customerCount = customers.length;
  let totalSpend = 0;
  for (const r of marketingSpend) {
    totalSpend += r.spend;
  }

  if (marketingSpend.length === 0) {
    warnings.push("No marketing spend — blended CAC unavailable.");
    return { blendedCac: null, totalSpend: 0, customerCount, warnings };
  }
  if (customerCount === 0) {
    warnings.push("No customers in dataset — blended CAC unavailable.");
    return { blendedCac: null, totalSpend, customerCount: 0, warnings };
  }

  const blended = safeDivide(totalSpend, customerCount);
  warnings.push(
    "Blended CAC = total spend in file ÷ all customers in the selected snapshot — not a strict calendar-matched cohort CAC unless windows align.",
  );

  return {
    blendedCac: Number.isFinite(blended) && blended > 0 ? blended : null,
    totalSpend,
    customerCount,
    warnings,
  };
}

function terminalLtvByCohort(ltvPoints: readonly LTVPoint[]): Map<string, LTVPoint> {
  const by = new Map<string, LTVPoint[]>();
  for (const p of ltvPoints) {
    const list = by.get(p.cohortKey) ?? [];
    list.push(p);
    by.set(p.cohortKey, list);
  }
  const out = new Map<string, LTVPoint>();
  for (const [k, list] of by) {
    const sorted = [...list].sort((a, b) => a.offset - b.offset);
    const tail = sorted[sorted.length - 1];
    if (tail) out.set(k, tail);
  }
  return out;
}

/**
 * Terminal average revenue / contribution LTV per cohort month vs CAC for that acquisition month.
 */
export function calculateLtvToCac(
  ltvPoints: readonly LTVPoint[],
  cacByMonth: ReadonlyMap<string, number>,
): LtvCacResult {
  const warnings: string[] = [];

  const terminal = terminalLtvByCohort(ltvPoints);
  const rows: LtvCacRow[] = [];
  const cohortMonths = [...terminal.keys()].sort();
  let missingCacCount = 0;

  for (const cohortMonth of cohortMonths) {
    const pt = terminal.get(cohortMonth);
    if (!pt) continue;
    const cac = cacByMonth.get(cohortMonth) ?? null;
    const avgRevenueLtv = pt.cumulativeAvgGrossRevenue;
    const avgContributionLtv = pt.cumulativeAvgContribution ?? null;
    const revenueLtvToCac =
      cac != null && cac > 0 && Number.isFinite(avgRevenueLtv) ? avgRevenueLtv / cac : null;
    const contributionLtvToCac =
      cac != null && cac > 0 && avgContributionLtv != null && Number.isFinite(avgContributionLtv) ?
        avgContributionLtv / cac
      : null;

    if (cac == null) {
      missingCacCount += 1;
    }

    rows.push({
      cohortMonth,
      cac,
      terminalOffset: pt.offset,
      avgRevenueLtv,
      avgContributionLtv,
      revenueLtvToCac,
      contributionLtvToCac,
    });
  }

  if (cacByMonth.size === 0) {
    warnings.push("No month-level CAC values — LTV:CAC needs overlapping spend and acquisitions.");
  } else if (missingCacCount > 0) {
    warnings.push(
      `${missingCacCount} cohort month(s) have terminal LTV but no CAC for that acquisition month — check spend overlap.`,
    );
  }

  return { rows, warnings };
}

/**
 * First cohort-age month where cumulative average contribution LTV ≥ CAC. Unavailable without contribution staircase.
 */
export function calculatePaybackPeriod(
  ltvPoints: readonly LTVPoint[],
  cacByMonth: ReadonlyMap<string, number>,
): PaybackPreviewResult {
  const warnings: string[] = [];
  const byCohort = new Map<string, LTVPoint[]>();
  for (const p of ltvPoints) {
    const list = byCohort.get(p.cohortKey) ?? [];
    list.push(p);
    byCohort.set(p.cohortKey, list);
  }

  const rows: PaybackPreviewRow[] = [];
  const cohortMonths = [...byCohort.keys()].sort();

  for (const cohortMonth of cohortMonths) {
    const cac = cacByMonth.get(cohortMonth) ?? null;
    const list = [...(byCohort.get(cohortMonth) ?? [])].sort((a, b) => a.offset - b.offset);

    if (cac == null || cac <= 0 || !Number.isFinite(cac)) {
      rows.push({ cohortMonth, cac, monthsToPayback: null, offsetAchieved: null });
      if (cac == null) {
        warnings.push(`Payback skipped for ${cohortMonth} — no positive CAC for that acquisition month.`);
      }
      continue;
    }

    const hasContrib = list.some(
      (p) => p.cumulativeAvgContribution != null && Number.isFinite(p.cumulativeAvgContribution),
    );
    if (!hasContrib) {
      warnings.push(`Payback unavailable for ${cohortMonth} — no cumulative contribution LTV in the ladder.`);
      rows.push({ cohortMonth, cac, monthsToPayback: null, offsetAchieved: null });
      continue;
    }

    let monthsToPayback: number | null = null;
    let offsetAchieved: number | null = null;
    for (const p of list) {
      const contrib = p.cumulativeAvgContribution;
      if (contrib != null && contrib >= cac) {
        monthsToPayback = p.offset;
        offsetAchieved = p.offset;
        break;
      }
    }
    rows.push({ cohortMonth, cac, monthsToPayback, offsetAchieved });
  }

  return { rows, warnings };
}

function uniqueSortedMonthsFromCustomers(customers: readonly Customer[]): string[] {
  const s = new Set<string>();
  for (const c of customers) {
    s.add(utcMonthKeyFromIso(c.firstOrderAt));
  }
  return [...s].sort();
}

function uniqueSortedMonthsFromSpend(spend: readonly MarketingSpend[]): string[] {
  const s = new Set<string>();
  for (const r of spend) {
    const ck = spendBucketToCohortMonthKey(r.month);
    if (ck) s.add(ck);
  }
  return [...s].sort();
}

function uniqueChannels(spend: readonly MarketingSpend[]): string[] {
  const ch = new Set<string>();
  for (const r of spend) {
    if (r.channel) ch.add(r.channel);
  }
  return [...ch].sort();
}

function buildCalendarOverlapWarnings(
  cohortMonths: readonly string[],
  spendMonths: readonly string[],
): string[] {
  const warnings: string[] = [];
  const cSet = new Set(cohortMonths);
  const sSet = new Set(spendMonths);

  if (cohortMonths.length === 0 || spendMonths.length === 0) {
    return warnings;
  }

  const intersection = cohortMonths.filter((m) => sSet.has(m));
  if (intersection.length === 0) {
    warnings.push(
      "No overlap between first-order cohort months in the dataset and calendar months in the spend file — month-level CAC and LTV:CAC will be sparse or empty.",
    );
    return warnings;
  }

  const cohortWithoutSpend = cohortMonths.filter((m) => !sSet.has(m));
  const spendWithoutCohort = spendMonths.filter((m) => !cSet.has(m));
  if (cohortWithoutSpend.length > 0) {
    warnings.push(
      `${cohortWithoutSpend.length} cohort month(s) have no spend bucket in the file (e.g. ${cohortWithoutSpend[0]}).`,
    );
  }
  if (spendWithoutCohort.length > 0) {
    warnings.push(
      `${spendWithoutCohort.length} spend month(s) have no first-order acquisitions in the selected dataset (e.g. ${spendWithoutCohort[0]}).`,
    );
  }
  return warnings;
}

/**
 * Bundle acquisition diagnostics for `/data` previews (browser may pass session spend + command-centre dataset).
 */
export function buildAcquisitionPreviewFromDataset(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions: MarginAssumptions | undefined,
  marketingSpend: readonly MarketingSpend[],
): AcquisitionPreviewModel {
  const cohortMonths = uniqueSortedMonthsFromCustomers(customers);
  const spendMonths = uniqueSortedMonthsFromSpend(marketingSpend);
  const spendChannels = uniqueChannels(marketingSpend);
  let totalSpend = 0;
  for (const r of marketingSpend) {
    totalSpend += r.spend;
  }

  const calendarOverlapWarnings = buildCalendarOverlapWarnings(cohortMonths, spendMonths);

  if (marketingSpend.length === 0) {
    return {
      hasSpend: false,
      spendRowCount: 0,
      totalSpend: 0,
      spendMonths: [],
      spendChannels: [],
      cohortMonths,
      calendarOverlapWarnings: [
        ...calendarOverlapWarnings,
        "Add and save a marketing spend CSV to preview CAC, LTV:CAC, and payback.",
      ],
      cacByMonth: { rows: [], warnings: ["No spend — CAC not calculated."] },
      blendedCac: calculateBlendedCAC(customers, marketingSpend),
      ltvCac: { rows: [], warnings: ["No spend — LTV:CAC not calculated."] },
      payback: { rows: [], warnings: ["No spend — payback not calculated."] },
    };
  }

  const cacByMonth = calculateCACByMonth(customers, marketingSpend);
  const blendedCac = calculateBlendedCAC(customers, marketingSpend);
  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);
  const cacMap = cacMapFromRows(cacByMonth.rows);
  const ltvCac = calculateLtvToCac(ltvPoints, cacMap);
  const payback = calculatePaybackPeriod(ltvPoints, cacMap);

  const contribGaps = ltvCac.rows.filter((r) => r.cac != null && r.cac > 0 && r.avgContributionLtv == null).length;
  const mergedCalendarWarnings = [...calendarOverlapWarnings];
  if (contribGaps > 0) {
    mergedCalendarWarnings.push(
      `${contribGaps} cohort month(s) have CAC but no cumulative contribution LTV — add order-level contribution_margin or margin assumptions for contribution LTV:CAC and payback previews.`,
    );
  }

  return {
    hasSpend: true,
    spendRowCount: marketingSpend.length,
    totalSpend,
    spendMonths,
    spendChannels,
    cohortMonths,
    calendarOverlapWarnings: mergedCalendarWarnings,
    cacByMonth,
    blendedCac,
    ltvCac,
    payback,
  };
}
