import { DEMO_BRAND_NAME, DEMO_BRAND_TAGLINE } from "../demo";

/** Product framing — used in navigation chrome and onboarding copy. */
export const MVP_COMMAND_CENTRE_NAME = "Revenue Durability Command Centre" as const;

/** One-word product mark for breadcrumbs, metadata, and sidebar (no space). */
export const RETENTIONOS_MARK = "RetentionOS" as const;

export const DEMO_DATASET_LABEL = "Demo dataset" as const;

export type MvpRouteId = "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights" | "data";

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
  { id: "acquisition", href: "/acquisition", label: "Acquisition" },
  { id: "products", href: "/products", label: "Products" },
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
      `A single-plane summary of cohort scale, repeat depth, first-to-second within 90 days, Month +N active rates, cumulative net revenue / contribution LTV, acquisition economics, and first-product customer quality — all computed on the ${DEMO_DATASET_LABEL.toLowerCase()} for ${DEMO_BRAND_NAME}.`,
    matters:
      "Revenue durability emerges from depth and timing of repeat purchases, cohort ladder dispersion, acquisition payback honesty, and entry-product customer quality. Weak signals here propagate into acquisition-risk and liquidity decisions.",
    nextSteps: [
      "Scan the Command-centre spine cards for acquisition economics and first-product quality before drilling to /acquisition or /products.",
      "Inspect the Revenue durability snapshot label, then drill to Diagnostic Insights when you need prioritized operator moves.",
      "Use the data completeness strip to see what is unlocked vs assumption-based, then open Data to attach spend or margin paths.",
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
  acquisition: {
    title: "Acquisition economics",
    hook: "CAC, LTV:CAC, and payback diagnostics when marketing spend travels with the selected orders source.",
    lookingAt:
      `Monthly CAC, blended CAC, terminal revenue and contribution LTV:CAC, and contribution payback previews from the ${DEMO_DATASET_LABEL.toLowerCase()} plus its fixture marketing spend (${DEMO_BRAND_NAME}) — dataset-native spend only on this route.`,
    matters:
      "Scaling spend without calendar-aligned CAC and payback visibility invites liquidity risk. This page keeps acquisition economics tied to the same orders snapshot as LTV and cohort routes — no orphan spend blending.",
    nextSteps: [
      "Cross-check terminal LTV spreads on LTV before trusting LTV:CAC ratios.",
      "Save orders and marketing spend together on Data when using uploaded CSV — session spend previews on /data do not override demo economics here.",
      "Escalate to Diagnostic Insights when acquisition-quality variance shows up alongside weak payback.",
    ],
  },
  products: {
    title: "First-product customer quality",
    hook: "Which entry products create durable, repeat, profitable customers?",
    lookingAt:
      `Customers grouped by the first line item on their chronological first order — repeat depth, first-to-second within 90 days, all-time revenue and contribution LTV, and order-level discount/refund drag per entry product (${DEMO_BRAND_NAME} fixture with line items).`,
    matters:
      "Not all entry products create equal downstream economics. Before scaling merchandising or acquisition around a SKU, you need to know whether it attracts one-and-done buyers or customers who repeat and retain margin.",
    nextSteps: [
      "Compare strongest vs weakest entry products, then cross-check Retention and LTV for portfolio context.",
      "Read the attribution note above the table — first product is the first order line, not basket composition.",
      "Upload combined order + line-item CSV on Data when you need this lens on your own catalog slice.",
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
    hook: `${MVP_COMMAND_CENTRE_NAME} — trust ledger, demo fixture counts, and session CSV source control.`,
    lookingAt:
      `Canonical ${DEMO_BRAND_NAME} fixture counts (customers, orders, line rows, cohort months) plus object definitions — always visible for audit. Until you save a passing CSV snapshot to sessionStorage here, Dashboard, Cohorts, Retention, LTV, Acquisition, Products, and Insights consume the demo fixture; after save, those KPI routes use your uploaded slice for this browser tab only.`,
    matters:
      "Operators cannot judge revenue durability honestly if provenance is vague. This page states the active source, lists route coverage, and makes session-only CSV explicit — no Supabase mirror and no live Shopify on the MVP spine.",
    nextSteps: [
      "Share this page internally before implying multi-tenant or server-persisted ingestion exists.",
      "Return to Insights or Dashboard armed with lineage when sceptics push on provenance.",
      "Plan next-wave work knowing tenant persistence, Shopify connectors, and margin editors are still roadmap for this product path.",
    ],
  },
};

export function getMvpPageCopy(routeId: MvpRouteId): MvpPageCopy {
  return MVP_PAGE_COPY[routeId];
}

/** Command-centre routes: adjust “What you’re looking at” when the active dataset is a session upload. */
export function getMvpPageCopyForActiveSource(
  routeId: "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights",
  source: "demo" | "uploaded_csv",
): MvpPageCopy {
  const base = MVP_PAGE_COPY[routeId];
  if (source === "demo") {
    return base;
  }
  type SourceAwareRoute = "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights";
  const lookingAt: Record<SourceAwareRoute, string> = {
    dashboard: `A single-plane summary of cohort scale, repeat depth, first-to-second within 90 days, Month +N active rates, cumulative net revenue / contribution LTV, acquisition economics, and first-product customer quality — computed on your session-saved uploaded CSV (this browser tab only; not the ${DEMO_BRAND_NAME} demo fixture).`,
    cohorts: `First-order monthly cohorts with net merchandise revenue, modeled contribution, and Month +N active rates from your session-saved uploaded CSV (UTC cohort months; sessionStorage in this tab only).`,
    retention: `Portfolio repeat rate, first-to-second within 90 days, average spacing to second order, and cohort Month +0/+N active rates from your session-saved uploaded CSV (sessionStorage in this tab only).`,
    ltv: `Average cumulative net revenue per customer by cohort-age offset, with parallel contribution ladders where margin assumptions apply — from your session-saved uploaded CSV (sessionStorage in this tab only).`,
    acquisition: `Monthly CAC, blended CAC, terminal LTV:CAC, and contribution payback from your session-saved uploaded orders plus session marketing spend merged by the resolver (sessionStorage in this tab only — orphan spend without orders upload does not apply here).`,
    products: `First-product customer quality from your session-saved uploaded CSV — customers grouped by first order line item with repeat, LTV, and drag metrics (sessionStorage in this tab only; requires line items with product_id).`,
    insights: `Executive evidence cards from deterministic rules on your session-saved uploaded CSV outputs (wired through /lib/metrics → /lib/insights — sessionStorage in this tab only, not persisted to Supabase).`,
  };
  return { ...base, lookingAt: lookingAt[routeId] };
}

/** Scope sentence inserted after brand tagline in amber banners on metric-heavy pages. */
export type MetricsBannerScopeFn = (
  routeId: "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products",
) => string;

export function metricsBannerScopeLine(
  routeId: "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights",
): string {
  switch (routeId) {
    case "dashboard":
      return `This Dashboard summarises cohort scale, reorder behaviour, Revenue durability primitives, LTV ladders, acquisition economics, and first-product quality in one executive canvas.`;
    case "cohorts":
      return `These cohort economics tables quantify acquisition-month dispersion and Month +N active breadth.`;
    case "retention":
      return `These retention KPIs juxtapose ninety-day reorder timing with cohort calendar-month strips.`;
    case "acquisition":
      return `These acquisition economics diagnostics show CAC, LTV:CAC, and payback when marketing spend is attached to the selected orders source.`;
    case "products":
      return `These first-product customer quality metrics show which entry products create durable, repeat, profitable customers — not SKU sales volume.`;
    case "insights":
      return `These Diagnostic Insights cards interpret the same deterministic bundle as Dashboard / KPI routes — prioritized operator moves tied to thresholds.`;
    default:
      return `These ladders show cumulative averages for net revenue LTV versus modeled contribution LTV.`;
  }
}

export const RULES_ENGINE_INSIGHTS_NOTICE =
  "Rules-based engine. Cards synthesize evidence using transparent thresholds — not LLMs, chat copilots, or hidden models." as const;

export function insightsDemoNotice(): string {
  return `${DEMO_DATASET_LABEL}. ${DEMO_BRAND_NAME} — ${DEMO_BRAND_TAGLINE} Insight cards derive from deterministic /lib/metrics inputs (demo fixture by default); save a validated CSV session snapshot on /data to run the same rules on your upload for this browser tab.`;
}

export function dataModeBannerSentence(): string {
  return `${DEMO_DATASET_LABEL} lineage: ${DEMO_BRAND_NAME} — ${DEMO_BRAND_TAGLINE} Transparent demo counts are grounded in runDemoMetricSanityCheck(); this page also controls demo vs session-saved CSV for KPI routes (browser tab only — not Supabase). Live Shopify and warehouse adapters remain off this spine.`;
}
