import type { Insight } from "../types/insight";
import {
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  LTV_COHORT_SPREAD_MATERIAL_USD,
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
import { evaluateRevenueDurabilityStatus as evaluateRevenueDurabilityStatusCore } from "../metrics/revenue-durability-status";

/** Delegates to `/lib/metrics/revenue-durability-status` — single source of truth for posture votes. */
export function evaluateRevenueDurabilityStatus(inputs: DiagnosticDurabilityInputs): RevenueDurabilityStatus {
  return evaluateRevenueDurabilityStatusCore(inputs);
}

const METHODOLOGY_NOTES_DEFAULT = [
  "Snapshot thresholds are deterministic — portfolio repeat (≥2 orders), first-to-second within 90 days, mean Month +1 active rate where present, cohort terminal net revenue LTV dispersion.",
  "Month +N active rates capture any order placed in cohort calendar months; first-to-second within 90 days is a narrower journey metric.",
  "Net revenue LTV is merchandise revenue after discounts/refunds — not interchangeable with contribution LTV.",
] as const;

/** Existing contribution-vs-net ratio trigger (internal heuristic — not an industry benchmark). */
const CONTRIBUTION_TO_NET_LTV_WARNING_RATIO = 0.42;

function pct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

function money(n: number, digits = 0): string {
  return `$${n.toFixed(digits)}`;
}

export function methodologyNotesSnapshot(): readonly string[] {
  return METHODOLOGY_NOTES_DEFAULT;
}

export function insightRepeatPurchaseHealth(input: DiagnosticInsightsInput): Insight | null {
  const { repeatPurchaseRate, repeatCustomers, totalCustomers } = input;

  // Empty eligible population — do not diagnose poor performance from metric zero-rates.
  if (totalCustomers === 0) {
    return null;
  }

  const evidence = `${pct(repeatPurchaseRate)} of customers have placed two or more orders (${repeatCustomers.toLocaleString()} of ${totalCustomers.toLocaleString()} shoppers in this slice).`;

  let severity: Insight["severity"];
  let title: string;
  let recommended: string | undefined;

  if (repeatPurchaseRate < REPEAT_PURCHASE_WATCH) {
    severity = "warning";
    title = "Repeat depth looks thin versus an MVP reorder benchmark";
    recommended =
      "Investigate fulfilment friction, SKU cadence, and post-first-order messaging before leaning on cohort LTV ceilings.";
  } else if (repeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY) {
    severity = "info";
    title = "Portfolio repeat purchase depth is respectable for this cohort set";
    recommended =
      "Compare contribution economics next — tighten margin assumptions explicitly when comparing to net revenue ladders.";
  } else {
    severity = "info";
    title = "Repeat purchase rate sits in a mid band worth pressure-testing";
    recommended =
      "Compare first-to-second within 90 days and Month +N active rates together to see whether slowdown is timing vs depth.";
  }

  return {
    id: "portfolio-repeat-depth",
    severity,
    title,
    evidence,
    recommendedAction: recommended,
    metricRefs: ["repeat_purchase_rate"],
    observations: [
      {
        value: repeatPurchaseRate,
        comparisonValue: REPEAT_PURCHASE_WATCH,
        unit: "ratio",
        eligibleCount: totalCustomers,
        affectedCount: repeatCustomers,
      },
    ],
    sufficiency: "sufficient",
    caveats: [],
    destination: { route: "/retention" },
  };
}

export function insightFirstToSecondWithin90Days(input: DiagnosticInsightsInput): Insight | null {
  if (input.totalCustomers === 0) {
    return null;
  }

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
      "Inspect welcome and replenishment flows; compare with SKU-level replenishment hypotheses before rewriting acquisition targets.";
  } else if (rate >= FIRST_TO_SECOND_90_HEALTHY) {
    severity = "info";
    title = "First-to-second within 90 days looks disciplined for this population";
    recommended =
      "Compare this strength into cohort LTV and contribution LTV pacing — review offers that shorten safe reorder windows.";
  } else {
    severity = "warning";
    title = "First-to-second within 90 days is mixed — not yet a reliable strength";
    recommended =
      "Segment by merchandising archetype before scaling spend; consolidate wins from cohorts converting inside the ninety-day envelope.";
  }

  const observations = [
    {
      value: rate,
      comparisonValue: FIRST_TO_SECOND_90_WATCH,
      unit: "ratio" as const,
      eligibleCount: input.totalCustomers,
    },
    ...(avgDaysAmongRepeaters != null
      ? [
          {
            value: avgDaysAmongRepeaters,
            unit: "days" as const,
            eligibleCount: input.totalCustomers,
          },
        ]
      : []),
  ];

  return {
    id: "first-to-second-within-ninety-days",
    severity,
    title,
    evidence,
    recommendedAction: recommended,
    metricRefs: ["first_to_second_conversion"],
    observations,
    sufficiency: "sufficient",
    caveats:
      avgDaysAmongRepeaters == null
        ? ["Average days to second order among repeaters is unavailable in this slice."]
        : [],
    destination: { route: "/retention" },
  };
}

export function insightRetentionTiming(input: DiagnosticInsightsInput): Insight | null {
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
      // Minimum completed-offset evidence absent — suppress rather than invent a timing diagnosis.
      return null;
    }
  }

  const severity: Insight["severity"] = "info";
  const title = longerCycleCue
    ? "Retention timing hints at longer effective reorder rhythms"
    : "Retention timing needs Month +N context — avoid reading Month +1 alone";

  const recommended = longerCycleCue
    ? "Review cash contribution models on realistic replenishment arcs; stress-test stocking and CRM cadence assumptions past the first calendar month strip."
    : "Compare Month +N strips with first-to-second within 90 days before treating early Month offsets as deterioration.";

  const observations = [
    ...(m1 != null
      ? [
          {
            value: m1,
            comparisonValue: MONTH_PLUS_1_ACTIVE_WATCH,
            unit: "ratio" as const,
          },
        ]
      : []),
    ...(m2 != null ? [{ value: m2, unit: "ratio" as const }] : []),
    ...(m3 != null ? [{ value: m3, unit: "ratio" as const }] : []),
  ];

  const caveats: string[] = [];
  if (m2 == null) {
    caveats.push("Completed Month +2 active-rate average is unavailable in this as-of window.");
  }
  if (m3 == null) {
    caveats.push("Completed Month +3 active-rate average is unavailable in this as-of window.");
  }

  return {
    id: "retention-timing-interpretation",
    severity,
    title,
    evidence: parts.join(" "),
    recommendedAction: recommended,
    metricRefs: ["cohort_retention", "first_to_second_conversion"],
    observations,
    sufficiency: m1 != null && m2 != null && m3 != null ? "sufficient" : "limited",
    caveats,
    destination: { route: "/retention" },
  };
}

export function insightCohortLtvSpread(input: DiagnosticInsightsInput): Insight | null {
  const { bestTerminalNetRevenueLtvCohort, weakestTerminalNetRevenueLtvCohort, terminalNetRevenueSpreadUsd } = input;

  if (
    bestTerminalNetRevenueLtvCohort == null ||
    weakestTerminalNetRevenueLtvCohort == null ||
    terminalNetRevenueSpreadUsd == null
  ) {
    return null;
  }

  const spreadRounded = terminalNetRevenueSpreadUsd;

  let severity: Insight["severity"];
  let title: string;
  let recommended: string;

  if (spreadRounded >= LTV_COHORT_SPREAD_MATERIAL_USD) {
    severity = "warning";
    title = "Terminal net revenue LTV dispersion flags acquisition-quality variance risk";
    recommended =
      "Investigate funnel sources and SKU bundles tied to weakest cohorts — review whether terminal-staircase spread coincides with brittle ROAS narratives.";
  } else {
    severity = "info";
    title = "Cohort terminal net revenue LTV spread sits within tolerance for now";
    recommended =
      "Continue monitoring outliers monthly; contribution LTV can diverge materially even when revenue ladders align.";
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
    metricRefs: ["revenue_ltv"],
    observations: [
      {
        value: bestTerminalNetRevenueLtvCohort.terminalNetRevenueLtv,
        comparisonValue: weakestTerminalNetRevenueLtvCohort.terminalNetRevenueLtv,
        unit: "usd",
      },
      {
        value: spreadRounded,
        comparisonValue: LTV_COHORT_SPREAD_MATERIAL_USD,
        unit: "usd",
      },
    ],
    sufficiency: "sufficient",
    caveats: [],
    destination: { route: "/ltv" },
  };
}

export function insightContributionVsNetRevenueLtv(input: DiagnosticInsightsInput): Insight | null {
  const net = input.avgTerminalNetRevenueLtvAcrossCohorts;
  const contrib = input.avgTerminalContributionLtvAcrossCohorts;

  // Missing contribution must suppress — never coerce null to zero.
  if (net == null || contrib == null || net <= 0) {
    return null;
  }

  const ratio = contrib / net;
  let severity: Insight["severity"] = "info";
  let title =
    "Contribution LTV complements — but does not replace — terminal net revenue LTV";
  let recommended =
    "When presenting externally, headline net revenue LTV for continuity; validate modeled contribution assumptions for underwriting cash.";

  if (ratio < CONTRIBUTION_TO_NET_LTV_WARNING_RATIO) {
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
    metricRefs: ["revenue_ltv", "contribution_ltv"],
    observations: [
      {
        value: contrib,
        comparisonValue: net,
        unit: "usd",
      },
      {
        value: ratio,
        comparisonValue: CONTRIBUTION_TO_NET_LTV_WARNING_RATIO,
        unit: "ratio",
      },
    ],
    sufficiency: "sufficient",
    caveats: [
      "Contribution LTV depends on modeled margin assumptions and is not interchangeable with net revenue LTV.",
    ],
    destination: { route: "/ltv" },
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
      "Review acquisition scaling against matched-offset economics — reconcile mix shifts before diagnosing product failure.";
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
    metricRefs: ["revenue_ltv"],
    observations: [
      {
        value: comparison.recentAvgLtvAtOffset,
        comparisonValue: comparison.baselineAvgLtvAtOffset,
        unit: "usd",
        eligibleCount: comparison.baselineCohortCount + comparison.recentCohortLabels.length,
      },
      {
        value: gap,
        comparisonValue: RECENT_TERMINAL_GAP_WARN,
        unit: "ratio",
      },
    ],
    sufficiency: "limited",
    caveats: [
      "Younger cohort tails are still maturing; aligned-horizon gaps can change as additional offsets unlock.",
    ],
    destination: { route: "/ltv" },
  };
}

export function insightRevenueDurabilitySnapshot(
  status: RevenueDurabilityStatus,
  input: Pick<DiagnosticInsightsInput, "totalCustomers" | "retentionAverages" | "terminalNetRevenueSpreadUsd">,
): Insight | null {
  if (input.totalCustomers === 0) {
    return null;
  }

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
  const m1 = input.retentionAverages.m1;

  return {
    id: "revenue-durability-snapshot",
    severity,
    title,
    evidence: `Plain-English durability label: ${status}. Labels combine portfolio repeat depth, first-to-second within 90 days, mean Month +1 active rate where available, and cohort terminal net revenue spread — not a composite precision score.`,
    recommendedAction:
      status === "Healthy"
        ? "Institutionalize the operating review cadence so Healthy does not mask single-cohort fragility."
        : status === "Mixed"
          ? "Prioritise analysis of the weakest vote-getter (repeat, ninety-day reorder, Month +1, or spread) and assign an owner-level review."
          : "Prioritise analysis of acquisition and replenishment pacing as intertwined until diagnostics stabilise.",
    metricRefs: [
      "revenue_durability_posture",
      "repeat_purchase_rate",
      "first_to_second_conversion",
      "cohort_retention",
      "revenue_ltv",
    ],
    observations: [
      {
        value: status,
        unit: "posture",
        eligibleCount: input.totalCustomers,
      },
      {
        value: m1,
        unit: "ratio",
      },
      {
        value: input.terminalNetRevenueSpreadUsd,
        comparisonValue: LTV_COHORT_SPREAD_MATERIAL_USD,
        unit: "usd",
      },
    ],
    sufficiency: m1 == null ? "limited" : "sufficient",
    caveats:
      m1 == null
        ? ["Completed Month +1 active-rate average is unavailable; that vote is omitted from the posture heuristic."]
        : [],
    destination: { route: "/dashboard" },
  };
}
