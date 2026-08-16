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
    hook: "Portfolio read on repeat, LTV, acquisition, and product quality before you commit capital.",
    lookingAt: "Headline KPIs, revenue durability posture, acquisition economics, and first-product quality for the active data source.",
    matters: "Weak repeat or payback signals here affect how much you can scale spend with confidence.",
    nextSteps: [],
  },
  cohorts: {
    title: "Cohort economics",
    hook: "Acquisition-month tables showing where net revenue LTV starts to diverge.",
    lookingAt: "Monthly first-order cohorts with net revenue, contribution, and Month +N active rates.",
    matters: "Wide spread across acquisition months is a warning sign before you scale paid channels.",
    nextSteps: [],
  },
  retention: {
    title: "Retention & repeat behaviour",
    hook: "Are customers returning, and how does retention differ across cohorts?",
    lookingAt:
      "First-to-second conversion within 90 days, all-time repeat, time to a second order, and cohort Month +N active rates.",
    matters:
      "A 90-day reorder journey and calendar-month cohort activity are different views of the same orders — read both before judging loss.",
    nextSteps: [],
  },
  ltv: {
    title: "LTV ladders",
    hook: "How does customer value build across cohort months?",
    lookingAt:
      "Cumulative net merchandise LTV and contribution LTV by calendar cohort month (Month +N) — not elapsed-day windows.",
    matters:
      "Revenue and contribution LTV show how cumulative customer value builds across cohort months, with contribution dependent on available order-level inputs or the saved margin model.",
    nextSteps: [],
  },
  acquisition: {
    title: "Acquisition economics",
    hook: "CAC, LTV:CAC, and payback when marketing spend is attached to your orders.",
    lookingAt: "Blended CAC, terminal LTV:CAC ratios, and contribution payback from the active orders source.",
    matters: "Scaling spend without payback visibility invites liquidity risk.",
    nextSteps: [],
  },
  products: {
    title: "First-product customer quality",
    hook: "Which entry products create repeat, profitable customers — not just first-order volume.",
    lookingAt: "Customers grouped by first order line item: repeat depth, LTV, and discount or refund drag.",
    matters: "Not every hero SKU attracts customers who come back or retain margin.",
    nextSteps: [],
  },
  insights: {
    title: "Diagnostic Insights",
    hook: "Prioritized operator moves from transparent rules on your active data source.",
    lookingAt: "Evidence cards with thresholds, caveats, and recommended actions tied to your metrics.",
    matters: "Metrics alone do not prescribe focus — this page turns patterns into testable hypotheses.",
    nextSteps: [],
  },
  data: {
    title: "Data & sources",
    hook: "Control what powers every KPI route — upload orders, set assumptions, review quality.",
    lookingAt: `Active source for this tab: ${DEMO_BRAND_NAME} demo until you upload and save a Shopify Orders CSV. After save, all KPI routes use your upload here only.`,
    matters: "You cannot judge customer economics honestly if the data source and assumptions are unclear.",
    nextSteps: [
      "Explore KPI routes on the Lumin & River demo — fixture spend and margin assumptions are already included.",
      "Upload your Shopify Orders CSV, then add spend or margin assumptions if your file does not include them.",
      "Open Dashboard, then drill into Acquisition, Retention, LTV, and Insights.",
    ],
  },
};

export function getMvpPageCopy(routeId: MvpRouteId): MvpPageCopy {
  return MVP_PAGE_COPY[routeId];
}

/** Command-centre routes: adjust “What you’re looking at” for the active dataset status. */
export function getMvpPageCopyForActiveSource(
  routeId: "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights",
  source: "demo" | "uploaded_csv" | "pending" | "lost_upload",
): MvpPageCopy {
  const base = MVP_PAGE_COPY[routeId];
  if (source === "demo") {
    return base;
  }
  if (source === "pending") {
    return { ...base, lookingAt: "Resolving the active dataset for this browser tab…" };
  }
  if (source === "lost_upload") {
    return {
      ...base,
      lookingAt:
        "Your uploaded session was lost (CSV payloads are tab-scoped). Demo metrics are not shown in place of your data — re-upload on Data or explicitly use demo.",
    };
  }
  type SourceAwareRoute = "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights";
  const lookingAt: Record<SourceAwareRoute, string> = {
    dashboard: "Headline KPIs, posture, acquisition economics, and product quality from your saved upload (this browser tab only).",
    cohorts: "Monthly first-order cohorts from your saved upload — net revenue, contribution, and Month +N active rates.",
    retention:
      "First-to-second within 90 days, all-time repeat, and calendar Month +N retention from your saved upload.",
    ltv: "Cumulative net merchandise and contribution LTV by calendar cohort month from your saved upload.",
    acquisition: "CAC, LTV:CAC, and payback from your upload plus marketing spend (add spend on Data if locked).",
    products: "First-product customer quality from your upload — requires line items with product IDs.",
    insights: "Diagnostic cards from transparent rules on your saved upload.",
  };
  return { ...base, lookingAt: lookingAt[routeId] };
}

export function metricsBannerScopeLine(
  routeId: "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights",
): string {
  switch (routeId) {
    case "dashboard":
      return "Executive summary for the active source.";
    case "cohorts":
      return "Acquisition-month cohort tables.";
    case "retention":
      return "Repeat and calendar retention KPIs.";
    case "acquisition":
      return "CAC, LTV:CAC, and payback.";
    case "products":
      return "First-product customer quality.";
    case "insights":
      return "Rules-based diagnostic cards.";
    default:
      return "Net revenue vs contribution LTV ladders.";
  }
}

export const RULES_ENGINE_INSIGHTS_NOTICE =
  "Rules-based engine. Cards synthesize evidence using transparent thresholds — not LLMs, chat copilots, or hidden models." as const;

export function insightsDemoNotice(): string {
  return `${DEMO_DATASET_LABEL} — ${DEMO_BRAND_NAME}. Upload orders on Data to run the same rules on your shop.`;
}

export function dataModeBannerSentence(): string {
  return `Demo: ${DEMO_BRAND_NAME} — ${DEMO_BRAND_TAGLINE} Switch to your upload here; KPI routes follow this tab only. Live Shopify sync is not in this MVP.`;
}
