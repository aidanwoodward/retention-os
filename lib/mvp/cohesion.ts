import { DEMO_BRAND_NAME, DEMO_BRAND_TAGLINE } from "../demo";

/** Product framing — used in navigation chrome and onboarding copy. */
export const MVP_COMMAND_CENTRE_NAME = "Revenue Durability Command Centre" as const;

export const DEMO_DATASET_LABEL = "Demo dataset" as const;

export type MvpRouteId = "dashboard" | "cohorts" | "retention" | "ltv" | "insights" | "data";

export interface MvpNavItem {
  readonly id: MvpRouteId;
  readonly href: `/${string}`;
  readonly label: string;
}

/** Primary operator paths inside the MVP command centre shell. */
export const MVP_NAV: readonly MvpNavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "cohorts", href: "/cohorts", label: "Cohorts" },
  { id: "retention", href: "/retention", label: "Retention" },
  { id: "ltv", href: "/ltv", label: "LTV" },
  { id: "insights", href: "/insights", label: "Insights" },
  { id: "data", href: "/data", label: "Data" },
];

export interface MvpPageCopy {
  /** Main H1 title (short, operator-facing). */
  readonly title: string;
  /** One-line hook beneath the title. */
  readonly hook: string;
  /** Answers: what am I looking at? */
  readonly lookingAt: string;
  /** Answers: why does it matter? */
  readonly matters: string;
  /** Answers: what should I do next? (bullet strings — may reference route names plainly). */
  readonly nextSteps: readonly string[];
}

export const MVP_PAGE_COPY: Record<MvpRouteId, MvpPageCopy> = {
  dashboard: {
    title: "Executive overview",
    hook: `${MVP_COMMAND_CENTRE_NAME} — portfolio read on Revenue durability economics before you commit capital.`,
    lookingAt:
      `A single-plane summary of cohort scale, repeat depth, first-to-second within 90 days, Month +N active rates, and cumulative net revenue / contribution LTV — all computed on the ${DEMO_DATASET_LABEL.toLowerCase()} for ${DEMO_BRAND_NAME}.`,
    matters:
      "Revenue durability emerges from depth and timing of repeat purchases and how evenly cohort ladders perform. Weak signals here propagate into acquisition-risk and liquidity decisions.",
    nextSteps: [
      "Inspect the Revenue durability snapshot label, then drill to Diagnostic Insights when you need prioritized operator moves.",
      "Use Cohort economics and Retention tabs to verify whether dispersion is breadth (Month +N) vs journey friction (ninety-day conversion).",
      "Open Data to confirm assumptions, fixtures, and what integrations are deliberately not wired yet.",
    ],
  },
  cohorts: {
    title: "Cohort economics",
    hook: "Acquisition-month tables that reveal where net revenue LTV dispersion starts.",
    lookingAt:
      `First-order monthly cohorts with net merchandise revenue, modeled contribution, and Month +N active rates (${DEMO_BRAND_NAME} fixture, UTC cohort months).`,
    matters:
      "Before scaling spend you need conviction that newer cohort tails resemble mature ones. Wide variance across acquisition months signals acquisition-quality variance risk tied to Revenue durability posture.",
    nextSteps: [
      "Contrast strongest vs weakest ladders, then correlate with Diagnostic Insights for rules-based narration.",
      "Pair with Retention to separate calendar-month breadth from journey pacing.",
      "Return to the Dashboard headline metrics when reporting upward.",
    ],
  },
  retention: {
    title: "Retention & repeat behaviour",
    hook: "Journey pacing plus calendar strips — complementary lenses on the same orders.",
    lookingAt:
      `Portfolio repeat rate, first-to-second within 90 days, average spacing to second order, and cohort Month +0/+N active rates for ${DEMO_BRAND_NAME}.`,
    matters:
      "Misreading Month +1 softness as existential churn is easy when ninety-day reordering is intact. Operators need both views to steward Revenue durability conversations honestly.",
    nextSteps: [
      "Escalate to Diagnostic Insights when you want blunt prioritisation tied to deterministic rules.",
      "Cross-check LTV staircases when repeat looks healthy yet contribution could still lag.",
      "Consult Data for lineage on how these metrics are stitched from canonical orders.",
    ],
  },
  ltv: {
    title: "LTV ladders",
    hook: "Cumulative average net revenue LTV stacked against modeled contribution LTV.",
    lookingAt:
      `Average cumulative net revenue per customer by cohort-age offset, with parallel contribution ladders where margin assumptions surface (${DEMO_BRAND_NAME} demo).`,
    matters:
      "Net revenue LTV is not interchangeable with contribution LTV — confusing them undermines underwriting and payout planning. Robust Revenue durability insists both stories stay visible.",
    nextSteps: [
      "Contrast terminal cohort spreads with Acquisition-quality variance flagged in Insights.",
      "Stress-test hypotheses on Cohort economics when terminal tails diverge materially.",
      "Loop back to Dashboard for headline averages before stakeholder reviews.",
    ],
  },
  insights: {
    title: "Diagnostic Insights",
    hook: `${MVP_COMMAND_CENTRE_NAME} — prioritized moves from deterministic rules.`,
    lookingAt:
      `Executive evidence cards surfaced by the Rules-based engine in /lib/insights on ${DEMO_DATASET_LABEL.toLowerCase()} outputs from /lib/metrics.`,
    matters:
      "Metrics alone do not prescribe focus. This route compresses repeatable interpretation into actionable evidence without invoking LLMs or black-box diagnostics.",
    nextSteps: [
      "Treat cards as hypotheses to validate commercially — each maps to Metric references you can reconcile in other tabs.",
      "Return to Dashboard for the summarized Revenue durability label; open Data whenever provenance debates arise.",
      "Route owners to Retention vs LTV based on whether timing or monetisation dominates the flagged pattern.",
    ],
  },
  data: {
    title: "Data & sources",
    hook: `${MVP_COMMAND_CENTRE_NAME} — transparency ledger for canonical fixtures.`,
    lookingAt:
      `Fixture counts (customers, orders, line rows, cohort months) plus canonical object definitions underpinning Dashboard, Insights, cohort, retention, and LTV tabs — ${DEMO_BRAND_NAME} copy only.`,
    matters:
      "Operators cannot manage Revenue durability sceptically if intake posture is ambiguous. Honest signalling about demo vs eventual live ingestion prevents false certainty.",
    nextSteps: [
      "Share this page internally before implying live ingestion exists.",
      "Return to Insights or Dashboard armed with lineage when sceptics push on provenance.",
      "Plan ingestion work knowing CSV, Shopify connectors, Supabase adapters, and margin editors remain future-state only.",
    ],
  },
};

export function getMvpPageCopy(routeId: MvpRouteId): MvpPageCopy {
  return MVP_PAGE_COPY[routeId];
}

/** Scope sentence inserted after brand tagline in amber banners on metric-heavy pages. */
export type MetricsBannerScopeFn = (
  routeId: "dashboard" | "cohorts" | "retention" | "ltv",
) => string;

export function metricsBannerScopeLine(routeId: "dashboard" | "cohorts" | "retention" | "ltv"): string {
  switch (routeId) {
    case "dashboard":
      return `This Dashboard summarises cohort scale, reorder behaviour, Revenue durability primitives, and LTV ladders in one executive canvas.`;
    case "cohorts":
      return `These cohort economics tables quantify acquisition-month dispersion and Month +N active breadth.`;
    case "retention":
      return `These retention KPIs juxtapose ninety-day reorder timing with cohort calendar-month strips.`;
    default:
      return `These ladders show cumulative averages for net revenue LTV versus modeled contribution LTV.`;
  }
}

export const RULES_ENGINE_INSIGHTS_NOTICE =
  "Rules-based engine. Cards synthesize evidence using transparent thresholds — not LLMs, chat copilots, or hidden models." as const;

export function insightsDemoNotice(): string {
  return `${DEMO_DATASET_LABEL}. ${DEMO_BRAND_NAME} — ${DEMO_BRAND_TAGLINE} Insights mirror the deterministic metric engine (/lib/metrics) — live Shopify telemetry, warehouse exports, Supabase KPI rows, or CSV ingestion are inactive in this checkpoint.`;
}

export function dataModeBannerSentence(): string {
  return `${DEMO_DATASET_LABEL} lineage: ${DEMO_BRAND_NAME} — ${DEMO_BRAND_TAGLINE} Transparent counts regenerate from canonical fixtures routed through runDemoMetricSanityCheck(); live ingestion adapters are roadmap items — not wired here.`;
}
