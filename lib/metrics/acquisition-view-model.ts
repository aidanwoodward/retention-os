import type { Customer } from "../types/customer";
import type { MarketingSpend } from "../types/marketing";
import type { Order } from "../types/order";
import type { MarginAssumptions } from "../types/scenario";
import type { LTVPoint } from "../types/metrics";
import type { MarketingSpendSource } from "../data-source/dataset-types";
import { buildAcquisitionPreviewFromDataset, type AcquisitionPreviewModel } from "./acquisition";
import { calculateLTVByCohort } from "./ltv";

export type PaybackDisplayKind =
  | "unavailable_no_spend"
  | "unavailable_no_cac"
  | "unavailable_no_contribution"
  | "achieved"
  | "not_reached";

export interface PaybackDisplayState {
  readonly kind: PaybackDisplayKind;
  /** Achieved payback offset, or latest observed contribution offset for not_reached. */
  readonly offset?: number;
}

export interface AcquisitionMonthRowView {
  readonly month: string;
  readonly newCustomers: number;
  readonly marketingSpend: number;
  readonly monthlyCac: number | null;
  readonly payback: PaybackDisplayState;
  readonly paybackLabel: string;
}

export interface AcquisitionPageSummaryView {
  readonly totalSpend: number;
  readonly blendedCac: number | null;
  readonly spendRowCount: number;
  readonly hasSpend: boolean;
  readonly spendSource?: MarketingSpendSource;
  readonly spendIsEstimated: boolean;
  readonly spendSourceLabel: string;
  readonly cohortMonthsWithCac: number;
  readonly cohortMonthsWithPayback: number;
  readonly customerCount: number;
  /** Acquisition months represented on the economics surface (denominator for CAC coverage). */
  readonly acquisitionMonthsRepresented: number;
  readonly monthsWithCalculableCac: number;
  /** Cohorts with positive finite monthly CAC and usable contribution economics. */
  readonly paybackEligibleCohortCount: number;
  readonly cohortsReachingPayback: number;
  readonly hasContributionEconomics: boolean;
}

export interface AcquisitionPageViewModel {
  readonly summary: AcquisitionPageSummaryView;
  readonly monthRows: readonly AcquisitionMonthRowView[];
  readonly preview: AcquisitionPreviewModel;
}

function isFinitePositiveCac(cac: number | null | undefined): cac is number {
  return cac != null && Number.isFinite(cac) && cac > 0;
}

export function spendSourceLabel(source: MarketingSpendSource | undefined): string {
  switch (source) {
    case "actual_csv":
      return "CSV upload";
    case "assumption":
      return "Assumption-based estimate";
    case "fixture":
      return "Demo fixture";
    default:
      return "Not attached";
  }
}

export function formatPaybackDisplay(state: PaybackDisplayState): string {
  switch (state.kind) {
    case "unavailable_no_spend":
    case "unavailable_no_cac":
    case "unavailable_no_contribution":
      return "—";
    case "achieved":
      return `Pays back by M+${state.offset}`;
    case "not_reached":
      return `Not reached through M+${state.offset} observed`;
  }
}

function cohortHasContributionPath(
  ltvPoints: readonly LTVPoint[],
  cohortMonth: string,
): boolean {
  return ltvPoints.some(
    (p) =>
      p.cohortKey === cohortMonth &&
      p.cumulativeAvgContribution != null &&
      Number.isFinite(p.cumulativeAvgContribution),
  );
}

function maxObservedContributionOffset(
  ltvPoints: readonly LTVPoint[],
  cohortMonth: string,
): number | null {
  let max: number | null = null;
  for (const p of ltvPoints) {
    if (p.cohortKey !== cohortMonth) continue;
    if (p.cumulativeAvgContribution == null || !Number.isFinite(p.cumulativeAvgContribution)) continue;
    if (max == null || p.offset > max) {
      max = p.offset;
    }
  }
  return max;
}

function derivePaybackDisplayState(
  hasSpend: boolean,
  monthlyCac: number | null,
  monthsToPayback: number | null,
  ltvPoints: readonly LTVPoint[],
  cohortMonth: string,
): PaybackDisplayState {
  if (!hasSpend) {
    return { kind: "unavailable_no_spend" };
  }
  if (!isFinitePositiveCac(monthlyCac)) {
    return { kind: "unavailable_no_cac" };
  }
  if (!cohortHasContributionPath(ltvPoints, cohortMonth)) {
    return { kind: "unavailable_no_contribution" };
  }
  if (monthsToPayback != null && Number.isFinite(monthsToPayback)) {
    return { kind: "achieved", offset: monthsToPayback };
  }
  const maxObserved = maxObservedContributionOffset(ltvPoints, cohortMonth);
  if (maxObserved == null) {
    return { kind: "unavailable_no_contribution" };
  }
  return { kind: "not_reached", offset: maxObserved };
}

function buildMonthRows(
  preview: AcquisitionPreviewModel,
  ltvPoints: readonly LTVPoint[],
): AcquisitionMonthRowView[] {
  const paybackByMonth = new Map(preview.payback.rows.map((r) => [r.cohortMonth, r.monthsToPayback]));

  return preview.cacByMonth.rows.map((row) => {
    const payback = derivePaybackDisplayState(
      preview.hasSpend,
      row.cac,
      paybackByMonth.get(row.month) ?? null,
      ltvPoints,
      row.month,
    );
    return {
      month: row.month,
      newCustomers: row.acquiredCustomers,
      marketingSpend: row.monthlySpend,
      monthlyCac: row.cac,
      payback,
      paybackLabel: formatPaybackDisplay(payback),
    };
  });
}

function countPaybackEligibleCohorts(
  preview: AcquisitionPreviewModel,
  ltvPoints: readonly LTVPoint[],
): number {
  if (!preview.hasSpend) return 0;
  let count = 0;
  for (const row of preview.cacByMonth.rows) {
    if (!isFinitePositiveCac(row.cac)) continue;
    if (!cohortHasContributionPath(ltvPoints, row.month)) continue;
    count += 1;
  }
  return count;
}

export function buildAcquisitionPageViewModelFromDataset(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions: MarginAssumptions | undefined,
  marketingSpend: readonly MarketingSpend[],
  spendSource?: MarketingSpendSource,
): AcquisitionPageViewModel {
  const preview = buildAcquisitionPreviewFromDataset(customers, orders, marginAssumptions, marketingSpend);
  const ltvPoints =
    preview.hasSpend ? calculateLTVByCohort(customers, orders, marginAssumptions) : [];

  const monthRows = buildMonthRows(preview, ltvPoints);
  const acquisitionMonthsRepresented = monthRows.length;
  const monthsWithCalculableCac = monthRows.filter((r) => isFinitePositiveCac(r.monthlyCac)).length;
  const hasContributionEconomics = ltvPoints.some(
    (p) => p.cumulativeAvgContribution != null && Number.isFinite(p.cumulativeAvgContribution),
  );
  const paybackEligibleCohortCount = countPaybackEligibleCohorts(preview, ltvPoints);
  const cohortsReachingPayback = preview.payback.rows.filter(
    (r) => r.monthsToPayback != null && isFinitePositiveCac(r.cac),
  ).length;

  return {
    summary: {
      totalSpend: preview.totalSpend,
      blendedCac: preview.blendedCac.blendedCac,
      spendRowCount: preview.spendRowCount,
      hasSpend: preview.hasSpend,
      spendSource,
      spendIsEstimated: spendSource === "assumption",
      spendSourceLabel: spendSourceLabel(spendSource),
      cohortMonthsWithCac: monthsWithCalculableCac,
      cohortMonthsWithPayback: cohortsReachingPayback,
      customerCount: customers.length,
      acquisitionMonthsRepresented,
      monthsWithCalculableCac,
      paybackEligibleCohortCount,
      cohortsReachingPayback,
      hasContributionEconomics,
    },
    monthRows,
    preview,
  };
}
