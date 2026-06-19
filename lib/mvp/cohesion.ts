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
      "Read the revenue durability posture label, then scan acquisition economics and first-product quality in the spine cards.",
      "Open Diagnostic Insights for prioritized operator moves backed by evidence.",
      "Check the data completeness strip — open Data if you need to upload orders or add marketing spend and margin assumptions.",
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
      "Contrast strongest vs weakest cohort ladders, then validate patterns in Diagnostic Insights.",
      "Pair with Retention to separate calendar-month breadth from ninety-day reorder pacing.",
      "Return to Dashboard for headline metrics before a stakeholder review.",
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
      "Open Diagnostic Insights when you want prioritized moves tied to your metrics.",
      "Cross-check LTV staircases when repeat looks healthy but contribution may still lag.",
      "Upload or review your data source on Data if you need to confirm what powers these numbers.",
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
      "Compare terminal cohort spreads with acquisition-quality signals in Insights.",
      "Stress-test dispersion on Cohort economics when tails diverge materially.",
      "Return to Dashboard for portfolio headline averages before scaling spend.",
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
      "When using your own CSV, save orders and add a marketing spend % on Data to unlock these metrics.",
      "Open Diagnostic Insights when weak payback shows up alongside acquisition-quality variance.",
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
      "Read the attribution note above the table — first product is the first order line, not the full basket.",
      "Upload a combined order and line-item CSV on Data to run this lens on your own catalog.",
    ],
  },
  insights: {
    title: "Diagnostic Insights",
    hook: `${MVP_COMMAND_CENTRE_NAME} — prioritized moves from deterministic rules.`,
    lookingAt:
      `Executive evidence cards from deterministic rules on the ${DEMO_DATASET_LABEL.toLowerCase()} — the same metrics bundle as Dashboard and KPI routes.`,
    matters:
      "Metrics alone do not prescribe focus. This page compresses repeatable interpretation into actionable evidence without black-box diagnostics.",
    nextSteps: [
      "Treat each card as a hypothesis to validate commercially — use the linked metrics in other tabs to confirm.",
      "Return to Dashboard for the summarized revenue durability label.",
      "Drill into Retention or LTV depending on whether timing or monetisation dominates the flagged pattern.",
    ],
  },
  data: {
    title: "Data & sources",
    hook: `${MVP_COMMAND_CENTRE_NAME} — upload your shop data, set assumptions, and control what powers every KPI route.`,
    lookingAt:
      `Active data source for this browser tab: the ${DEMO_BRAND_NAME} demo fixture until you upload and save a Shopify Orders CSV. After save, Dashboard, Cohorts, Retention, LTV, Acquisition, Products, and Insights use your upload for this tab only.`,
    matters:
      "You cannot judge revenue durability honestly if the data source is unclear. This page shows what is active, lets you upload and review quality, and sets marketing spend and margin assumptions.",
    nextSteps: [
      "Upload your Shopify Orders export, review data quality and caveats, then save.",
      "Add marketing spend as a % of net revenue to unlock acquisition economics.",
      "Open Dashboard to diagnose customer economics — then drill into Acquisition, Retention, LTV, Products, and Insights.",
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
    dashboard: `A single-plane summary of cohort scale, repeat depth, first-to-second within 90 days, Month +N active rates, cumulative net revenue / contribution LTV, acquisition economics, and first-product customer quality — computed on your saved uploaded CSV (this browser tab only; not the ${DEMO_BRAND_NAME} demo).`,
    cohorts: `First-order monthly cohorts with net merchandise revenue, modeled contribution, and Month +N active rates from your saved uploaded CSV (UTC cohort months; this browser tab only).`,
    retention: `Portfolio repeat rate, first-to-second within 90 days, average spacing to second order, and cohort Month +0/+N active rates from your saved uploaded CSV (this browser tab only).`,
    ltv: `Average cumulative net revenue per customer by cohort-age offset, with parallel contribution ladders where margin assumptions apply — from your saved uploaded CSV (this browser tab only).`,
    acquisition: `Monthly CAC, blended CAC, terminal LTV:CAC, and contribution payback from your saved uploaded orders plus marketing spend merged for this tab (add spend on Data if these metrics are locked).`,
    products: `First-product customer quality from your saved uploaded CSV — customers grouped by first order line item with repeat, LTV, and drag metrics (requires line items with product_id).`,
    insights: `Executive evidence cards from deterministic rules on your saved uploaded CSV — the same metrics bundle as Dashboard and KPI routes (this browser tab only).`,
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
  return `${DEMO_DATASET_LABEL}. ${DEMO_BRAND_NAME} — ${DEMO_BRAND_TAGLINE} Save a validated CSV on Data to run the same diagnostic rules on your upload for this browser tab.`;
}

export function dataModeBannerSentence(): string {
  return `${DEMO_DATASET_LABEL}: ${DEMO_BRAND_NAME} — ${DEMO_BRAND_TAGLINE} This page controls demo vs your saved upload for KPI routes (this browser tab only). Live Shopify sync is not available in this MVP.`;
}
