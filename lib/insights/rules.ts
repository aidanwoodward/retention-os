import type { Insight } from "../types";
import {
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  LTV_COHORT_SPREAD_MATERIAL_USD,
  MONTH_PLUS_1_ACTIVE_HEALTHY,
  MONTH_PLUS_1_ACTIVE_WATCH,
  RECENT_QUALITY_MIN_BASELINE_COHORTS,
  RECENT_TERMINAL_GAP_WARN,
  REPEAT_PURCHASE_HEALTHY,
  REPEAT_PURCHASE_WATCH,
  RETENTION_MONTH_RELATIVE_NOTE,
} from "./thresholds";
import type {
  DiagnosticDurabilityInputs,
  DiagnosticInsightsInput,
  RecentOffsetLtvComparison,
  RevenueDurabilityStatus,
} from "./context";

/** Same vote logic as `computeDurability` in dashboard-view-model (subset of inputs only). */
export function evaluateRevenueDurabilityStatus(inputs: DiagnosticDurabilityInputs): RevenueDurabilityStatus {
  const { repeatPurchaseRate, firstToSecond90Rate, avgMonthPlus1ActiveRate, spreadUsdLike } = inputs;

  let watchVotes = 0;
  let healthyVotes = 0;

  if (repeatPurchaseRate < REPEAT_PURCHASE_WATCH) watchVotes += 2;
  else if (repeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY) healthyVotes += 1;

  if (firstToSecond90Rate < FIRST_TO_SECOND_90_WATCH) watchVotes += 2;
  else if (firstToSecond90Rate >= FIRST_TO_SECOND_90_HEALTHY) healthyVotes += 1;

  if (avgMonthPlus1ActiveRate != null) {
    if (avgMonthPlus1ActiveRate < MONTH_PLUS_1_ACTIVE_WATCH) watchVotes += 1;
    else if (avgMonthPlus1ActiveRate >= MONTH_PLUS_1_ACTIVE_HEALTHY) healthyVotes += 1;
  }

  const spreadHealthyBand = LTV_COHORT_SPREAD_MATERIAL_USD * 0.45;
  if (spreadUsdLike != null) {
    if (spreadUsdLike >= LTV_COHORT_SPREAD_MATERIAL_USD) watchVotes += 1;
    else if (spreadUsdLike < spreadHealthyBand) healthyVotes += 1;
  }

  if (watchVotes >= 3) return "Watch";
  if (watchVotes <= 1 && healthyVotes >= 2) return "Healthy";
  return "Mixed";
}

const METHODOLOGY_NOTES_DEFAULT = [
  "Snapshot thresholds are deterministic — portfolio repeat (≥2 orders), first-to-second within 90 days, mean Month +1 active rate where present, cohort terminal net revenue LTV dispersion.",
  "Month +N active rates capture any order placed in cohort calendar months; first-to-second within 90 days is a narrower journey metric.",
  "Net revenue LTV is merchandise revenue after discounts/refunds — not interchangeable with contribution LTV.",
] as const;

function pct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

function money(n: number, digits = 0): string {
  return `$${n.toFixed(digits)}`;
}

export function methodologyNotesSnapshot(): readonly string[] {
  return METHODOLOGY_NOTES_DEFAULT;
}

export function insightRepeatPurchaseHealth(input: DiagnosticInsightsInput): Insight {
  const { repeatPurchaseRate, repeatCustomers, totalCustomers } = input;
  const evidence = `${pct(repeatPurchaseRate)} of customers have placed two or more orders (${repeatCustomers.toLocaleString()} of ${totalCustomers.toLocaleString()} shoppers in this slice).`;

  let severity: Insight["severity"];
  let title: string;
  let recommended: string | undefined;

  if (repeatPurchaseRate < REPEAT_PURCHASE_WATCH) {
    severity = "warning";
    title = "Repeat depth looks thin versus an MVP reorder benchmark";
    recommended =
      "Diagnose fulfilment friction, SKU cadence, and post-first-order messaging before leaning on cohort LTV ceilings.";
  } else if (repeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY) {
    severity = "info";
    title = "Portfolio repeat purchase depth is respectable for this cohort set";
    recommended =
      "Press advantage into contribution economics — tighten margin assumptions explicitly when comparing to net revenue ladders.";
  } else {
    severity = "info";
    title = "Repeat purchase rate sits in a mid band worth pressure-testing";
    recommended =
      "Use first-to-second within 90 days and Month +N active rates together to see whether slowdown is timing vs depth.";
  }

  return {
    id: "portfolio-repeat-depth",
    severity,
    title,
    evidence,
    recommendedAction: recommended,
    metricRefs: ["repeat.all_time_rate"],
    confidence: totalCustomers >= 100 ? 0.88 : totalCustomers >= 30 ? 0.72 : 0.58,
  };
}

export function insightFirstToSecondWithin90Days(input: DiagnosticInsightsInput): Insight {
  const rate = input.firstToSecondWithin90DaysRate;
  const avgDaysAmongRepeaters =
    input.averageDaysToSecondOrderAmongRepeaters ??
    input.firstToSecondMedianDaysAmongRepeaters;

  const timingNote =
    avgDaysAmongRepeaters != null
      ? ` Among shoppers who repeat, average calendar spacing to the second order is about ${Math.round(avgDaysAmongRepeaters)} days — still distinct from Month +N active rates, which count any activity in offset months.`
      : "";

  const evidence = `First-to-second within 90 days is ${pct(rate)} of all customers — a journey metric that answers how quickly second orders appear after the first.${timingNote}`;

  let severity: Insight["severity"];
  let title: string;
  let recommended: string | undefined;

  if (rate < FIRST_TO_SECOND_90_WATCH) {
    severity = "warning";
    title = "First-to-second within 90 days is soft — journey timing needs attention";
    recommended =
      "Audit welcome and replenishment flows; pair with SKU-level replenishment hypotheses before rewriting acquisition targets.";
  } else if (rate >= FIRST_TO_SECOND_90_HEALTHY) {
    severity = "info";
    title = "First-to-second within 90 days looks disciplined for this population";
    recommended =
      "Carry this strength into cohort LTV and contribution LTV pacing — reinforce offers that shorten safe reorder windows.";
  } else {
    severity = "warning";
    title = "First-to-second within 90 days is mixed — not yet a reliable strength";
    recommended =
      "Segment by merchandising archetype before scaling spend; consolidate wins from cohorts converting inside the ninety-day envelope.";
  }

  return {
    id: "first-to-second-within-ninety-days",
    severity,
    title,
    evidence,
    recommendedAction: recommended,
    metricRefs: ["repeat.first_to_second_within_90d", "repeat.avg_days_first_to_second"],
    confidence: input.totalCustomers >= 100 ? 0.87 : input.totalCustomers >= 30 ? 0.71 : 0.55,
  };
}

export function insightRetentionTiming(input: DiagnosticInsightsInput): Insight {
  const { m1, m2, m3 } = input.retentionAverages;
  const f2Healthy = input.firstToSecondWithin90DaysRate >= FIRST_TO_SECOND_90_HEALTHY;

  const parts: string[] = [];

  let longerCycleCue = false;
  if (
    m1 != null &&
    m2 != null &&
    m2 > m1 * (1 + RETENTION_MONTH_RELATIVE_NOTE)
  ) {
    longerCycleCue = true;
    parts.push(
      `Mean Month +2 active rate (${pct(m2)}) is higher than Month +1 (${pct(m1)}), consistent with reorder activity landing on slightly longer calendars than immediate post-acquisition Month +2 timing alone would imply.`,
    );
  }

  if (
    m1 != null &&
    m3 != null &&
    m3 > m1 * (1 + RETENTION_MONTH_RELATIVE_NOTE)
  ) {
    longerCycleCue = true;
    parts.push(
      `Mean Month +3 active rate (${pct(m3)}) also reads above Month +1 (${pct(m1)}), reinforcing that customers may be repeating on elongated cycles rather than abandoning.`,
    );
  }

  if (
    m1 != null &&
    m1 < MONTH_PLUS_1_ACTIVE_WATCH &&
    f2Healthy &&
    parts.length === 0
  ) {
    parts.push(
      `Mean Month +1 active rate (${pct(m1)}) is subdued, yet first-to-second within 90 days is comparatively healthy — Month +1 is calendar-month breadth, so a lower Month +1 need not contradict strong journey conversion when orders bunch outside that first offset month.`,
    );
  }

  if (parts.length === 0) {
    if (m1 != null && m2 != null && m3 != null) {
      parts.push(
        `Mean Month +1 / +2 / +3 active rates are ${pct(m1)}, ${pct(m2)}, ${pct(m3)} — sequencing is comparatively flat versus a pronounced long-cycle uplift pattern.`,
      );
    } else {
      parts.push(
        "Insufficient overlapping Month +1/+2/+3 telemetry across cohort ages to pronounce a reorder-cycle story — widen the observable window once more cohorts mature.",
      );
    }
  }

  const severity: Insight["severity"] = longerCycleCue ? "info" : "info";
  const title = longerCycleCue
    ? "Retention timing hints at longer effective reorder rhythms"
    : "Retention timing needs Month +N context — avoid reading Month +1 alone";

  let recommended =
    longerCycleCue
      ? "Model cash contribution on realistic replenishment arcs; stress-test stocking and CRM cadence assumptions past the first calendar month strip."
      : "Compare Month +N strips with first-to-second within 90 days before treating early Month offsets as deterioration.";

  if (parts.length === 1 && parts[0]?.includes("Insufficient")) {
    recommended =
      "Revisit once additional cohort offsets exist — prioritize collecting consistent calendar-month histories.";
  }

  return {
    id: "retention-timing-interpretation",
    severity,
    title,
    evidence: parts.join(" "),
    recommendedAction: recommended,
    metricRefs: ["retention.month_plus_1", "retention.month_plus_2", "retention.month_plus_3"],
    confidence: longerCycleCue ? 0.79 : m1 != null && m2 != null && m3 != null ? 0.73 : 0.55,
  };
}

export function insightCohortLtvSpread(input: DiagnosticInsightsInput): Insight {
  const { bestTerminalNetRevenueLtvCohort, weakestTerminalNetRevenueLtvCohort, terminalNetRevenueSpreadUsd } = input;

  if (
    bestTerminalNetRevenueLtvCohort == null ||
    weakestTerminalNetRevenueLtvCohort == null ||
    terminalNetRevenueSpreadUsd == null
  ) {
    return {
      id: "cohort-ltv-dispersion",
      severity: "info",
      title: "Cohort net revenue LTV dispersion is muted in this dataset window",
      evidence:
        "Not enough materially distinct cohort terminal net revenue ladders to underline a dispersion risk — broaden the observable horizon or tighten cohort granularity.",
      recommendedAction:
        "When live data introduces spread, rerun diagnostics with monthly acquisition cuts to localize merchandising-led variance.",
      metricRefs: ["ltv.terminal_net_revenue.best", "ltv.terminal_net_revenue.weakest"],
      confidence: 0.6,
    };
  }

  const spreadRounded = terminalNetRevenueSpreadUsd;

  let severity: Insight["severity"];
  let title: string;
  let recommended: string;

  if (spreadRounded >= LTV_COHORT_SPREAD_MATERIAL_USD) {
    severity = "warning";
    title = "Terminal net revenue LTV dispersion flags acquisition-quality variance risk";
    recommended =
      "Pressure-test funnel sources and SKU bundles tied to weakest cohorts — spread at the terminal staircase often precedes brittle ROAS narratives.";
  } else {
    severity = "info";
    title = "Cohort terminal net revenue LTV spread sits within tolerance for now";
    recommended =
      "Still monitor outliers monthly; contribution LTV can diverge materially even when revenue ladders align.";
  }

  const evidence = `Strongest terminal net revenue LTV is cohort ${bestTerminalNetRevenueLtvCohort.cohortPeriod} at ${money(
    bestTerminalNetRevenueLtvCohort.terminalNetRevenueLtv,
  )} average versus weakest cohort ${weakestTerminalNetRevenueLtvCohort.cohortPeriod} at ${money(
    weakestTerminalNetRevenueLtvCohort.terminalNetRevenueLtv,
  )}, about a ${money(spreadRounded)} gap on this fixture.`;

  return {
    id: "cohort-ltv-dispersion",
    severity,
    title,
    evidence,
    recommendedAction: recommended,
    metricRefs: ["ltv.terminal_net_revenue.spread"],
    confidence: spreadRounded >= LTV_COHORT_SPREAD_MATERIAL_USD ? 0.84 : 0.76,
  };
}

export function insightContributionVsNetRevenueLtv(input: DiagnosticInsightsInput): Insight | null {
  const net = input.avgTerminalNetRevenueLtvAcrossCohorts;
  const contrib = input.avgTerminalContributionLtvAcrossCohorts;

  if (net == null || contrib == null || net <= 0) {
    return null;
  }

  const ratio = contrib / net;
  let severity: Insight["severity"] = "info";
  let title =
    "Contribution LTV complements — but does not replace — terminal net revenue LTV";
  let recommended =
    "When presenting externally, headline net revenue LTV for continuity; insist on modeled contribution assumptions for underwriting cash.";

  if (ratio < 0.42) {
    severity = "warning";
    title = "Contribution LTV materially trails terminal net revenue LTV on average";
    recommended =
      "Validate margin payloads on repeat orders explicitly — strong revenue ladders can mask thin contribution if discounts or COGS escalate post-acquisition.";
  }

  const evidence = `Across cohort tails in this slice, typical terminal contribution LTV is ${money(contrib)} while typical terminal net revenue LTV averages ${money(
    net,
  )}, about ${pct(ratio, 1)} contribution-of-revenue once modeled economics land. Contribution LTV folds in modeled order-level contribution whereas net revenue LTV reflects merchandise receipts after refunds and incentives.`;

  return {
    id: "contribution-vs-net-revenue-ltv",
    severity,
    title,
    evidence,
    recommendedAction: recommended,
    metricRefs: ["ltv.terminal_net_revenue.avg", "ltv.terminal_contribution.avg"],
    confidence: input.cohortCount >= 4 ? 0.82 : 0.65,
  };
}

export function insightRecentCohortQuality(
  comparison: RecentOffsetLtvComparison | null,
): Insight | null {
  if (
    comparison == null ||
    comparison.baselineCohortCount < RECENT_QUALITY_MIN_BASELINE_COHORTS ||
    comparison.recentCohortLabels.length === 0
  ) {
    return null;
  }

  const gap =
    comparison.baselineAvgLtvAtOffset > 0
      ? (comparison.baselineAvgLtvAtOffset - comparison.recentAvgLtvAtOffset) /
        comparison.baselineAvgLtvAtOffset
      : 0;

  let severity: Insight["severity"];
  let title: string;
  let recommended: string;

  if (gap >= RECENT_TERMINAL_GAP_WARN) {
    severity = "warning";
    title = "Younger cohorts show softer aligned-horizon net revenue pacing";
    recommended =
      "Hold acquisition scaling until economics at matched offsets stabilize — reconcile channel mix shifts before diagnosing product failure.";
  } else if (gap <= -RECENT_TERMINAL_GAP_WARN) {
    severity = "info";
    title = "Aligned-horizon net revenue pacing tilts favourable for newer cohorts";
    recommended =
      "Codify merchandising wins from recent cohort periods while guarding against optimism bias as tails extend.";
  } else {
    severity = "info";
    title = "Recent cohort quality is roughly in-family at a shared observable horizon";
    recommended =
      "Continue monitoring maturity-aligned ladders — extend monitoring as additional offsets unlock.";
  }

  const cohortList = comparison.recentCohortLabels.join(", ");
  const evidence = `Compared average cumulative net revenue LTV at Month +${comparison.offsetUsed} among the most recent cohorts (${cohortList}) versus older cohort averages at the same offset (${comparison.baselineCohortCount} cohorts baseline). Gap on this fixture is roughly ${pct(
    Math.abs(gap),
    1,
  )} ${gap >= 0 ? "below prior pacing" : "ahead of prior pacing"} — guarded because younger cohort tails still lengthen with calendar time.`;

  return {
    id: "recent-cohort-aligned-ltv-check",
    severity,
    title,
    evidence,
    recommendedAction: recommended,
    metricRefs: ["ltv.partial.offset_aligned_recent_vs_mature"],
    confidence: comparison.baselineCohortCount >= 4 ? 0.74 : 0.66,
  };
}

export function insightRevenueDurabilitySnapshot(status: RevenueDurabilityStatus): Insight {
  const mapping: Record<RevenueDurabilityStatus, { severity: Insight["severity"]; title: string }> = {
    Healthy: {
      severity: "info",
      title: "Revenue durability posture reads Healthy against MVP rule thresholds",
    },
    Mixed: {
      severity: "warning",
      title: "Revenue durability posture is Mixed — reinforcement needed in at least one lever",
    },
    Watch: {
      severity: "critical",
      title: "Revenue durability posture is Watch — repeat and reorder signals need executive attention",
    },
  };

  const { severity, title } = mapping[status];

  return {
    id: "revenue-durability-snapshot",
    severity,
    title,
    evidence: `Plain-English durability label: ${status}. Labels combine portfolio repeat depth, first-to-second within 90 days, mean Month +1 active rate where available, and cohort terminal net revenue spread — not a composite precision score.`,
    recommendedAction:
      status === "Healthy"
        ? "Institutionalize the operating review cadence so Healthy does not mask single-cohort fragility."
        : status === "Mixed"
          ? "Pick the weakest vote-getter (repeat, ninety-day reorder, Month +1, or spread) and assign an owner-level remediation plan."
          : "Treat acquisition and replenishment pacing as intertwined — slow both until diagnostics stabilise.",
    metricRefs: ["durability.status"],
    confidence: 0.7,
  };
}
