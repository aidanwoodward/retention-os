import { buildDemoRetentionOSDataset, getDatasetSummary, type RetentionOSDataset } from "../data-source";
import type { LTVPoint } from "../types";
import { calculateCohorts, type CohortSummary } from "./cohorts";
import {
  calculateFirstToSecondOrderConversion,
  calculateRepeatPurchaseRate,
} from "./repeat-purchase";
import { calculateRetentionByCohort } from "./retention";
import { calculateLTVByCohort } from "./ltv";
import {
  evaluateRevenueDurabilityStatus,
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  LTV_COHORT_SPREAD_MATERIAL_USD,
  MONTH_PLUS_1_ACTIVE_HEALTHY,
  MONTH_PLUS_1_ACTIVE_WATCH,
  REPEAT_PURCHASE_HEALTHY,
  REPEAT_PURCHASE_WATCH,
  type RevenueDurabilityStatus,
} from "./revenue-durability-status";
import type { MetricDataQuality, MetricId } from "./metric-definitions";
import { buildAcquisitionPageViewModelFromDataset } from "./acquisition-view-model";
import {
  buildDashboardDataCompletenessView,
  buildSpineObservationBullets,
  mapDashboardAcquisitionExecutive,
  mapDashboardProductQualityExecutive,
  type DashboardAcquisitionExecutiveView,
  type DashboardDataCompletenessView,
  type DashboardProductQualityExecutiveView,
} from "./dashboard-executive-spine";
import { buildProductsPageViewModelFromDataset } from "./product-quality-view-model";
import { netOrderRevenue, orderContribution, safeDivide } from "./utils";

export type {
  DashboardAcquisitionExecutiveView,
  DashboardDataCompletenessView,
  DashboardProductQualityExecutiveView,
} from "./dashboard-executive-spine";

export type { RevenueDurabilityStatus };

export interface DashboardSummaryView {
  totalCustomers: number;
  totalOrders: number;
  totalNetRevenue: number;
  totalContribution: number | null;
  cohortCount: number;
  largestCohort: { cohortPeriod: string; cohortSize: number } | null;
  allTimeRepeatPurchaseRate: number;
  firstToSecondWithin90DaysRate: number;
  averageDaysToSecondOrder: number | null;
  averageMonthPlus1ActiveRate: number | null;
  averageMonthPlus2ActiveRate: number | null;
  averageMonthPlus3ActiveRate: number | null;
  avgTerminalNetRevenueLtvAcrossCohorts: number | null;
  avgTerminalContributionLtvAcrossCohorts: number | null;
  bestNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
  weakestNetRevenueLtvCohort: { cohortPeriod: string; terminalNetRevenueLtv: number } | null;
}

export interface RevenueDurabilitySnapshotView {
  status: RevenueDurabilityStatus;
  /** Transparency: rule-of-thumb inputs used for the plain-English snapshot (no composite score yet). */
  methodologyNotes: readonly string[];
}

export interface DashboardExecutiveViewModel {
  summary: DashboardSummaryView;
  durability: RevenueDurabilitySnapshotView;
  /** Deterministic bullets for the MVP executive screen. */
  observations: readonly string[];
  hero: DashboardCommandCentreHeroView;
  acquisition: DashboardAcquisitionExecutiveView;
  productQuality: DashboardProductQualityExecutiveView;
  dataCompleteness: DashboardDataCompletenessView;
}

export interface DashboardHeroSignalTileView {
  readonly id: "repeat" | "acquisition" | "payback" | "product";
  readonly title: string;
  readonly value: string;
  readonly sub?: string;
  readonly metricId?: MetricId;
  readonly dataQuality?: MetricDataQuality;
  readonly tone: "neutral" | "positive" | "watch" | "locked";
}

export interface DashboardCommandCentreHeroView {
  readonly posture: RevenueDurabilityStatus;
  readonly whyBullets: readonly string[];
  readonly caveat: string;
  readonly signals: readonly DashboardHeroSignalTileView[];
  readonly biggestLeak: {
    readonly label: string;
    readonly detail: string;
  };
  readonly strongestProof: {
    readonly label: string;
    readonly detail: string;
  };
  readonly investigate: {
    readonly href: `/${string}`;
    readonly label: string;
    readonly detail: string;
  };
}

function groupLtvCurveByCohort(points: readonly LTVPoint[]): Map<string, LTVPoint[]> {
  const map = new Map<string, LTVPoint[]>();
  for (const p of points) {
    const list = map.get(p.cohortKey);
    if (list) list.push(p);
    else map.set(p.cohortKey, [p]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.offset - b.offset);
  }
  return map;
}

function terminalPoint(curve: readonly LTVPoint[]): LTVPoint | null {
  if (curve.length === 0) return null;
  return curve[curve.length - 1] ?? null;
}

interface TerminalRollupRow {
  cohortPeriod: string;
  terminalNetRevenueLtv: number;
}

function pickBest(rows: readonly TerminalRollupRow[]): TerminalRollupRow | null {
  if (rows.length === 0) return null;
  return rows.reduce<TerminalRollupRow>((best, r) => {
    if (r.terminalNetRevenueLtv > best.terminalNetRevenueLtv) return r;
    if (r.terminalNetRevenueLtv === best.terminalNetRevenueLtv && r.cohortPeriod.localeCompare(best.cohortPeriod) > 0) {
      return r;
    }
    return best;
  }, rows[0]!);
}

function pickWeakestDistinct(rows: readonly TerminalRollupRow[]): TerminalRollupRow | null {
  if (rows.length < 2) return null;
  const uniq = new Set(rows.map((row) => row.terminalNetRevenueLtv));
  if (uniq.size < 2) return null;
  return rows.reduce<TerminalRollupRow>((w, r) => {
    if (r.terminalNetRevenueLtv < w.terminalNetRevenueLtv) return r;
    if (r.terminalNetRevenueLtv === w.terminalNetRevenueLtv && r.cohortPeriod.localeCompare(w.cohortPeriod) < 0) {
      return r;
    }
    return w;
  }, rows[0]!);
}

function averageActiveRateAcrossCohorts(
  retention: ReturnType<typeof calculateRetentionByCohort>,
  offset: number,
): number | null {
  let sum = 0;
  let n = 0;
  for (const row of retention) {
    const p = row.points.find((pt) => pt.offset === offset);
    if (p) {
      sum += p.retentionRate;
      n += 1;
    }
  }
  return n === 0 ? null : safeDivide(sum, n);
}

function summarizeLargestCohort(rows: readonly CohortSummary[]): { cohortPeriod: string; cohortSize: number } | null {
  if (rows.length === 0) return null;
  return rows.reduce(
    (best, row) =>
      row.cohortSize > best.cohortSize ||
      (row.cohortSize === best.cohortSize && row.cohortPeriod.localeCompare(best.cohortPeriod) > 0)
        ? row
        : best,
    rows[0]!,
  );
}

function computeDurability(
  repeat: number,
  f290: number,
  m1: number | null,
  weakest: { cohortPeriod: string; terminalNetRevenueLtv: number } | null,
  best: { cohortPeriod: string; terminalNetRevenueLtv: number } | null,
): RevenueDurabilitySnapshotView {
  const methodologyNotes = [
    "Snapshot uses MVP fraction thresholds only (portfolio repeat ≥2 orders; first→second ≤90 calendar days vs first order).",
    "Month +1 active rate is cohort calendar-month repurchase breadth — not interchangeable with journey first→second timing.",
    "LTV cohort spread compares terminal staircase net revenue LTV only (discounts/refunds removed from merchandise revenue).",
  ] as const;

  let spreadUsdLike: number | null = null;
  if (weakest != null && best != null && weakest.cohortPeriod !== best.cohortPeriod) {
    spreadUsdLike = best.terminalNetRevenueLtv - weakest.terminalNetRevenueLtv;
  }

  const status = evaluateRevenueDurabilityStatus({
    repeatPurchaseRate: repeat,
    firstToSecond90Rate: f290,
    avgMonthPlus1ActiveRate: m1,
    spreadUsdLike,
  });

  return { status, methodologyNotes };
}

function buildObservations(
  s: DashboardSummaryView,
  acquisition: DashboardAcquisitionExecutiveView,
  productQuality: DashboardProductQualityExecutiveView,
): readonly string[] {
  const obs: string[] = [];

  if (s.allTimeRepeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY) {
    obs.push(
      `Portfolio repeat is solid for this demo: about ${(s.allTimeRepeatPurchaseRate * 100).toFixed(1)}% of customers have reached a second qualifying order.`,
    );
  } else if (s.allTimeRepeatPurchaseRate < REPEAT_PURCHASE_WATCH) {
    obs.push(
      `Repeat depth looks thin: fewer than roughly three in ten customers show two or more orders in the demo slice — revisit repurchase journeys before leaning on cohort LTV ceilings.`,
    );
  } else {
    obs.push(
      `Portfolio repeat (~${(s.allTimeRepeatPurchaseRate * 100).toFixed(1)}%) sits in a mid band — tighten post-first-order paths to move the funnel.`,
    );
  }

  if (s.firstToSecondWithin90DaysRate >= FIRST_TO_SECOND_90_HEALTHY) {
    obs.push(
      `Early reordering discipline is comparatively strong — about ${(s.firstToSecondWithin90DaysRate * 100).toFixed(1)}% convert to a second order within ninety days of the first.`,
    );
  } else if (s.firstToSecondWithin90DaysRate < FIRST_TO_SECOND_90_WATCH) {
    obs.push(
      `First-to-second inside ninety days (~${(s.firstToSecondWithin90DaysRate * 100).toFixed(1)}%) is sluggish; expect calendar Month +N active rates to behave differently — they track any order activity in cohort month offsets.`,
    );
  } else {
    obs.push(
      `First-to-second within ninety days (~${(s.firstToSecondWithin90DaysRate * 100).toFixed(1)}%) is workable but uneven — pair with cohort LTV dispersion checks before allocating acquisition budget.`,
    );
  }

  if (s.weakestNetRevenueLtvCohort && s.bestNetRevenueLtvCohort) {
    const gap =
      s.bestNetRevenueLtvCohort.terminalNetRevenueLtv - s.weakestNetRevenueLtvCohort.terminalNetRevenueLtv;
    obs.push(
      `Cohort heterogeneity matters: strongest terminal net revenue LTV is ${s.bestNetRevenueLtvCohort.cohortPeriod} vs weakest ${s.weakestNetRevenueLtvCohort.cohortPeriod} — roughly a $${gap.toFixed(0)} average gap at the staircase tail in this fixture.`,
    );
  } else {
    obs.push(
      `Cohort dispersion is muted in this fixture (flat or single-cohort edge case) — use the cohort table drilldown once live data exposes spread.`,
    );
  }

  if (s.avgTerminalContributionLtvAcrossCohorts != null && s.avgTerminalNetRevenueLtvAcrossCohorts != null) {
    const pct = safeDivide(s.avgTerminalContributionLtvAcrossCohorts, s.avgTerminalNetRevenueLtvAcrossCohorts);
    obs.push(
      `Contribution LTV rests near ${(pct * 100).toFixed(0)}% of terminal net revenue LTV on average here — materially lower than top-line ladders because modeled contribution applies margin assumptions.`,
    );
  }

  if (s.averageDaysToSecondOrder != null) {
    obs.push(
      `Among customers who reach a second order, the demo shows ~${Math.round(s.averageDaysToSecondOrder)} average calendar days between first and second purchases — interpret separately from Month +N calendar-month activity.`,
    );
  }

  const spineBullets = buildSpineObservationBullets(acquisition, productQuality);
  return [...obs, ...spineBullets].slice(0, 6);
}

function formatHeroPct(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatHeroMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatHeroRatio(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}×`;
}

function buildHeroWhyBullets(summary: DashboardSummaryView): readonly string[] {
  const bullets: string[] = [];
  const repeat = summary.allTimeRepeatPurchaseRate;
  const f2s = summary.firstToSecondWithin90DaysRate;

  if (repeat < REPEAT_PURCHASE_WATCH) {
    bullets.push(`Repeat depth is thin at ${formatHeroPct(repeat)} — below the watch band.`);
  } else if (repeat >= REPEAT_PURCHASE_HEALTHY) {
    bullets.push(`Repeat depth is solid at ${formatHeroPct(repeat)} — above the healthy band.`);
  } else {
    bullets.push(`Repeat sits in the mid band at ${formatHeroPct(repeat)} — respectable but not a moat.`);
  }

  if (f2s < FIRST_TO_SECOND_90_WATCH) {
    bullets.push(`First-to-second within 90 days is soft at ${formatHeroPct(f2s)}.`);
  } else if (f2s >= FIRST_TO_SECOND_90_HEALTHY) {
    bullets.push(`First-to-second within 90 days is disciplined at ${formatHeroPct(f2s)}.`);
  } else {
    bullets.push(`First-to-second within 90 days is mixed at ${formatHeroPct(f2s)} — a clear journey lever.`);
  }

  const m1 = summary.averageMonthPlus1ActiveRate;
  if (m1 != null) {
    if (m1 < MONTH_PLUS_1_ACTIVE_WATCH) {
      bullets.push(`Month +1 active rate is low at ${formatHeroPct(m1)} across cohorts.`);
    } else if (m1 >= MONTH_PLUS_1_ACTIVE_HEALTHY) {
      bullets.push(`Month +1 calendar retention is healthy at ${formatHeroPct(m1)}.`);
    }
  } else if (summary.weakestNetRevenueLtvCohort && summary.bestNetRevenueLtvCohort) {
    const gap =
      summary.bestNetRevenueLtvCohort.terminalNetRevenueLtv -
      summary.weakestNetRevenueLtvCohort.terminalNetRevenueLtv;
    if (gap >= LTV_COHORT_SPREAD_MATERIAL_USD) {
      bullets.push(
        `Cohort LTV spread is material — about ${formatHeroMoney(gap)} between strongest and weakest acquisition months.`,
      );
    } else {
      bullets.push(`Cohort terminal LTV dispersion is modest in this snapshot.`);
    }
  }

  return bullets.slice(0, 3);
}

function buildHeroSignalTiles(
  summary: DashboardSummaryView,
  acquisition: DashboardAcquisitionExecutiveView,
  productQuality: DashboardProductQualityExecutiveView,
): readonly DashboardHeroSignalTileView[] {
  const repeatRate = summary.allTimeRepeatPurchaseRate;
  let repeatTone: DashboardHeroSignalTileView["tone"] = "neutral";
  if (repeatRate >= REPEAT_PURCHASE_HEALTHY) repeatTone = "positive";
  else if (repeatRate < REPEAT_PURCHASE_WATCH) repeatTone = "watch";

  const repeatTile: DashboardHeroSignalTileView = {
    id: "repeat",
    title: "Repeat quality",
    value: formatHeroPct(repeatRate),
    sub: `F2S 90d ${formatHeroPct(summary.firstToSecondWithin90DaysRate)}`,
    metricId: "repeat_purchase_rate",
    tone: repeatTone,
  };

  let acquisitionTile: DashboardHeroSignalTileView;
  if (acquisition.lockedMissingSpend) {
    acquisitionTile = {
      id: "acquisition",
      title: "Acquisition efficiency",
      value: "Locked",
      sub: "Add marketing spend on Data",
      metricId: "blended_cac",
      dataQuality: "unavailable",
      tone: "locked",
    };
  } else {
    const est = acquisition.spendIsEstimated;
    acquisitionTile = {
      id: "acquisition",
      title: est ? "Acquisition efficiency (est.)" : "Acquisition efficiency",
      value: formatHeroRatio(acquisition.revenueLtvToCac),
      sub: `CAC ${formatHeroMoney(acquisition.blendedCac)} · rev LTV:CAC`,
      metricId: "revenue_ltv_cac",
      dataQuality: est ? "estimated" : "actual",
      tone:
        acquisition.revenueLtvToCac != null && acquisition.revenueLtvToCac >= 2
          ? "positive"
          : acquisition.revenueLtvToCac != null && acquisition.revenueLtvToCac < 1.5
            ? "watch"
            : "neutral",
    };
  }

  let paybackTile: DashboardHeroSignalTileView;
  if (acquisition.lockedMissingSpend) {
    paybackTile = {
      id: "payback",
      title: "Payback pressure",
      value: "Locked",
      sub: "Needs marketing spend",
      metricId: "payback",
      dataQuality: "unavailable",
      tone: "locked",
    };
  } else if (acquisition.paybackStatus === "locked_no_contribution") {
    paybackTile = {
      id: "payback",
      title: "Payback pressure",
      value: "Locked",
      sub: "Needs contribution LTV path",
      metricId: "payback",
      dataQuality: "partial",
      tone: "locked",
    };
  } else {
    const est = acquisition.spendIsEstimated;
    paybackTile = {
      id: "payback",
      title: est ? "Payback (est.)" : "Payback pressure",
      value: acquisition.paybackLabel,
      sub:
        acquisition.contributionLtvToCac != null
          ? `Contrib LTV:CAC ${formatHeroRatio(acquisition.contributionLtvToCac)}`
          : undefined,
      metricId: "payback",
      dataQuality: est ? "estimated" : "partial",
      tone:
        acquisition.paybackStatus === "none_achieved"
          ? "watch"
          : acquisition.paybackStatus === "partial"
            ? "neutral"
            : acquisition.paybackStatus === "achieved"
              ? "positive"
              : "neutral",
    };
  }

  let productTile: DashboardHeroSignalTileView;
  if (productQuality.state === "locked_no_line_items") {
    productTile = {
      id: "product",
      title: "Entry-product signal",
      value: "Locked",
      sub: "Line items with product_id required",
      metricId: "product_quality",
      dataQuality: "unavailable",
      tone: "locked",
    };
  } else if (productQuality.state === "insufficient_segments") {
    productTile = {
      id: "product",
      title: "Entry-product signal",
      value: "Insufficient data",
      sub: productQuality.segmentCoverageLabel,
      metricId: "product_quality",
      dataQuality: "partial",
      tone: "watch",
    };
  } else if (productQuality.strongest && productQuality.weakest) {
    productTile = {
      id: "product",
      title: "Entry-product signal",
      value: productQuality.weakest.qualitySignal === "weak" ? "Weak anchor" : "Mixed segments",
      sub: `Strong: ${productQuality.strongest.productTitle}`,
      metricId: "product_quality",
      tone:
        productQuality.weakest.qualitySignal === "weak"
          ? "watch"
          : productQuality.strongest.qualitySignal === "strong"
            ? "positive"
            : "neutral",
    };
  } else {
    productTile = {
      id: "product",
      title: "Entry-product signal",
      value: "—",
      sub: productQuality.segmentCoverageLabel,
      metricId: "product_quality",
      tone: "neutral",
    };
  }

  return [repeatTile, acquisitionTile, paybackTile, productTile];
}

function buildHeroActionRow(
  summary: DashboardSummaryView,
  acquisition: DashboardAcquisitionExecutiveView,
  productQuality: DashboardProductQualityExecutiveView,
): Pick<DashboardCommandCentreHeroView, "biggestLeak" | "strongestProof" | "investigate"> {
  if (acquisition.lockedMissingSpend) {
    return {
      biggestLeak: {
        label: "Biggest leak",
        detail: "Acquisition economics are locked without marketing spend on this source.",
      },
      strongestProof: {
        label: "Strongest proof",
        detail: `Portfolio repeat is ${formatHeroPct(summary.allTimeRepeatPurchaseRate)} — retention signals still readable without spend.`,
      },
      investigate: {
        href: "/data",
        label: "Investigate on Data",
        detail: "Attach marketing spend to unlock CAC, LTV:CAC, and payback.",
      },
    };
  }

  if (productQuality.state === "locked_no_line_items") {
    return {
      biggestLeak: {
        label: "Biggest leak",
        detail: "First-product quality is locked — orders need line items with product_id.",
      },
      strongestProof: {
        label: "Strongest proof",
        detail:
          acquisition.revenueLtvToCac != null
            ? `Revenue LTV:CAC near ${formatHeroRatio(acquisition.revenueLtvToCac)} where spend is attached.`
            : "Acquisition metrics are available where spend is attached.",
      },
      investigate: {
        href: "/data",
        label: "Investigate on Data",
        detail: "Upload combined order + line-item CSV to unlock product quality.",
      },
    };
  }

  if (acquisition.paybackStatus === "none_achieved") {
    return {
      biggestLeak: {
        label: "Biggest leak",
        detail: "No cohort months achieve contribution payback in this snapshot.",
      },
      strongestProof: buildStrongestProof(summary, acquisition, productQuality),
      investigate: {
        href: "/acquisition",
        label: "Investigate Acquisition",
        detail: "Review month-level CAC and payback ladders.",
      },
    };
  }

  if (acquisition.paybackStatus === "partial") {
    return {
      biggestLeak: {
        label: "Biggest leak",
        detail: acquisition.paybackLabel,
      },
      strongestProof: buildStrongestProof(summary, acquisition, productQuality),
      investigate: {
        href: "/acquisition",
        label: "Investigate Acquisition",
        detail: "Compare cohorts that pay back vs those that do not.",
      },
    };
  }

  if (productQuality.weakest?.qualitySignal === "weak") {
    return {
      biggestLeak: {
        label: "Biggest leak",
        detail: `Weakest entry product "${productQuality.weakest.productTitle}" — repeat ${formatHeroPct(productQuality.weakest.repeatPurchaseRate)}.`,
      },
      strongestProof: buildStrongestProof(summary, acquisition, productQuality),
      investigate: {
        href: "/products",
        label: "Investigate Products",
        detail: "Compare entry-product repeat and LTV by first SKU.",
      },
    };
  }

  if (
    summary.allTimeRepeatPurchaseRate < REPEAT_PURCHASE_WATCH ||
    summary.firstToSecondWithin90DaysRate < FIRST_TO_SECOND_90_WATCH
  ) {
    return {
      biggestLeak: {
        label: "Biggest leak",
        detail: `Journey timing — repeat ${formatHeroPct(summary.allTimeRepeatPurchaseRate)}, F2S 90d ${formatHeroPct(summary.firstToSecondWithin90DaysRate)}.`,
      },
      strongestProof: buildStrongestProof(summary, acquisition, productQuality),
      investigate: {
        href: "/retention",
        label: "Investigate Retention",
        detail: "Read calendar retention alongside ninety-day reorder pacing.",
      },
    };
  }

  if (summary.weakestNetRevenueLtvCohort && summary.bestNetRevenueLtvCohort) {
    const gap =
      summary.bestNetRevenueLtvCohort.terminalNetRevenueLtv -
      summary.weakestNetRevenueLtvCohort.terminalNetRevenueLtv;
    if (gap >= LTV_COHORT_SPREAD_MATERIAL_USD) {
      return {
        biggestLeak: {
          label: "Biggest leak",
          detail: `Cohort dispersion — weakest ${summary.weakestNetRevenueLtvCohort.cohortPeriod} vs strongest ${summary.bestNetRevenueLtvCohort.cohortPeriod}.`,
        },
        strongestProof: buildStrongestProof(summary, acquisition, productQuality),
        investigate: {
          href: "/cohorts",
          label: "Investigate Cohorts",
          detail: "Compare acquisition-month economics side by side.",
        },
      };
    }
  }

  return {
    biggestLeak: {
      label: "Biggest leak",
      detail: "No single dominant leak — posture is mixed across retention, payback, and product quality.",
    },
    strongestProof: buildStrongestProof(summary, acquisition, productQuality),
    investigate: {
      href: "/insights",
      label: "Investigate Insights",
      detail: "See prioritized diagnostic cards and evidence.",
    },
  };
}

function buildStrongestProof(
  summary: DashboardSummaryView,
  acquisition: DashboardAcquisitionExecutiveView,
  productQuality: DashboardProductQualityExecutiveView,
): { label: string; detail: string } {
  if (productQuality.strongest?.qualitySignal === "strong") {
    return {
      label: "Strongest proof",
      detail: `"${productQuality.strongest.productTitle}" anchors strong entry-product repeat (${formatHeroPct(productQuality.strongest.repeatPurchaseRate)}).`,
    };
  }
  if (summary.allTimeRepeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY) {
    return {
      label: "Strongest proof",
      detail: `Portfolio repeat is healthy at ${formatHeroPct(summary.allTimeRepeatPurchaseRate)}.`,
    };
  }
  if (acquisition.revenueLtvToCac != null && acquisition.revenueLtvToCac >= 2) {
    return {
      label: "Strongest proof",
      detail: `Revenue LTV:CAC near ${formatHeroRatio(acquisition.revenueLtvToCac)} on blended acquisition economics.`,
    };
  }
  if (
    acquisition.paybackStatus === "partial" ||
    acquisition.paybackStatus === "achieved"
  ) {
    return {
      label: "Strongest proof",
      detail: acquisition.paybackLabel,
    };
  }
  if (
    summary.avgTerminalContributionLtvAcrossCohorts != null &&
    summary.avgTerminalNetRevenueLtvAcrossCohorts != null
  ) {
    const ratio = safeDivide(
      summary.avgTerminalContributionLtvAcrossCohorts,
      summary.avgTerminalNetRevenueLtvAcrossCohorts,
    );
    return {
      label: "Strongest proof",
      detail: `Contribution LTV runs near ${formatHeroPct(ratio, 0)} of revenue LTV — margin assumptions matter.`,
    };
  }
  return {
    label: "Strongest proof",
    detail: `Repeat ${formatHeroPct(summary.allTimeRepeatPurchaseRate)} with ${summary.cohortCount} cohort months of history.`,
  };
}

export function buildDashboardCommandCentreHeroView(
  summary: DashboardSummaryView,
  durability: RevenueDurabilitySnapshotView,
  acquisition: DashboardAcquisitionExecutiveView,
  productQuality: DashboardProductQualityExecutiveView,
): DashboardCommandCentreHeroView {
  const actionRow = buildHeroActionRow(summary, acquisition, productQuality);
  return {
    posture: durability.status,
    whyBullets: buildHeroWhyBullets(summary),
    caveat: "Heuristic posture from threshold votes — not a 0–100 score or finance-grade index.",
    signals: buildHeroSignalTiles(summary, acquisition, productQuality),
    ...actionRow,
  };
}

export function buildDashboardExecutiveViewModelFromDataset(dataset: RetentionOSDataset): DashboardExecutiveViewModel {
  const { customers, orders, marginAssumptions, marketingSpend } = dataset;

  const cohortSummaries = calculateCohorts(customers, orders, marginAssumptions);
  const retentionSeries = calculateRetentionByCohort(customers, orders);
  const repeat = calculateRepeatPurchaseRate(customers, orders);
  const f2 = calculateFirstToSecondOrderConversion(customers, orders, 90);

  const ltvPoints = calculateLTVByCohort(customers, orders, marginAssumptions);
  const curvesByCohort = groupLtvCurveByCohort(ltvPoints);

  const terminals: TerminalRollupRow[] = [];
  const terminalContribution: number[] = [];
  let totalContributionSum = 0;
  for (const o of orders) {
    totalContributionSum += orderContribution(o, marginAssumptions);
  }
  const totalContributionPresentation = marginAssumptions ? totalContributionSum : null;

  for (const cohort of cohortSummaries) {
    const tail = terminalPoint(curvesByCohort.get(cohort.cohortPeriod) ?? []);
    if (!tail) continue;
    terminals.push({
      cohortPeriod: cohort.cohortPeriod,
      terminalNetRevenueLtv: tail.cumulativeAvgGrossRevenue,
    });
    if (tail.cumulativeAvgContribution != null) {
      terminalContribution.push(tail.cumulativeAvgContribution);
    }
  }

  const bestPick = pickBest(terminals);
  const weakestPick = pickWeakestDistinct(terminals);
  const bestNetRevenueLtvCohort = bestPick
    ? { cohortPeriod: bestPick.cohortPeriod, terminalNetRevenueLtv: bestPick.terminalNetRevenueLtv }
    : null;
  let weakestNetRevenueLtvCohort = weakestPick
    ? { cohortPeriod: weakestPick.cohortPeriod, terminalNetRevenueLtv: weakestPick.terminalNetRevenueLtv }
    : null;
  if (
    bestNetRevenueLtvCohort &&
    weakestNetRevenueLtvCohort &&
    bestNetRevenueLtvCohort.cohortPeriod === weakestNetRevenueLtvCohort.cohortPeriod
  ) {
    weakestNetRevenueLtvCohort = null;
  }

  const totalNetRevenue = orders.reduce((sum, o) => sum + netOrderRevenue(o), 0);
  const avgTerminalNetRevenueLtvAcrossCohorts =
    terminals.length === 0 ? null : terminals.reduce((s, x) => s + x.terminalNetRevenueLtv, 0) / terminals.length;
  const avgTerminalContributionLtvAcrossCohorts =
    terminalContribution.length === 0 ? null : terminalContribution.reduce((a, b) => a + b, 0) / terminalContribution.length;

  const summary: DashboardSummaryView = {
    totalCustomers: customers.length,
    totalOrders: orders.length,
    totalNetRevenue,
    totalContribution: totalContributionPresentation,
    cohortCount: cohortSummaries.length,
    largestCohort: summarizeLargestCohort(cohortSummaries),
    allTimeRepeatPurchaseRate: repeat.repeatPurchaseRate,
    firstToSecondWithin90DaysRate: f2.conversionRateWithinWindow,
    averageDaysToSecondOrder: f2.averageDaysToSecondOrder,
    averageMonthPlus1ActiveRate: averageActiveRateAcrossCohorts(retentionSeries, 1),
    averageMonthPlus2ActiveRate: averageActiveRateAcrossCohorts(retentionSeries, 2),
    averageMonthPlus3ActiveRate: averageActiveRateAcrossCohorts(retentionSeries, 3),
    avgTerminalNetRevenueLtvAcrossCohorts,
    avgTerminalContributionLtvAcrossCohorts,
    bestNetRevenueLtvCohort,
    weakestNetRevenueLtvCohort,
  };

  const durability = computeDurability(
    summary.allTimeRepeatPurchaseRate,
    summary.firstToSecondWithin90DaysRate,
    summary.averageMonthPlus1ActiveRate,
    summary.weakestNetRevenueLtvCohort,
    summary.bestNetRevenueLtvCohort,
  );

  const acquisitionVm = buildAcquisitionPageViewModelFromDataset(
    customers,
    orders,
    marginAssumptions,
    marketingSpend ?? [],
    getDatasetSummary(dataset).marketingSpendSource,
  );
  const productsVm = buildProductsPageViewModelFromDataset(dataset);

  const datasetSummary = getDatasetSummary(dataset);
  const acquisition = mapDashboardAcquisitionExecutive(
    acquisitionVm,
    summary.avgTerminalNetRevenueLtvAcrossCohorts,
    datasetSummary.marketingSpendSource,
  );
  const productQuality = mapDashboardProductQualityExecutive(productsVm);
  const dataCompleteness = buildDashboardDataCompletenessView(dataset, productsVm);
  const observations = buildObservations(summary, acquisition, productQuality);
  const hero = buildDashboardCommandCentreHeroView(summary, durability, acquisition, productQuality);

  return { summary, durability, observations, hero, acquisition, productQuality, dataCompleteness };
}

export function buildDashboardExecutiveViewModel(seed?: number): DashboardExecutiveViewModel {
  return buildDashboardExecutiveViewModelFromDataset(buildDemoRetentionOSDataset(seed));
}
