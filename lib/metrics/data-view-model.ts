import { buildDemoRetentionOSDataset, type RetentionOSDataset } from "../data-source";
import { DEMO_BRAND_NAME, DEMO_BRAND_TAGLINE } from "../demo";
import type { DemoMetricSanityCheckResult } from "./demo-sanity-check";
import { runDemoMetricSanityCheck } from "./demo-sanity-check";

/** MVP transparency: only the canonical fixture is wired into metrics today. */
export type DataSourceMode = "demo";

export interface DataPageViewModel {
  readonly dataMode: DataSourceMode;
  readonly demoBrandName: string;
  readonly demoBrandTagline: string;
  /** Smoke output from the same path as regression checks (`runDemoMetricSanityCheck`). */
  readonly sanity: DemoMetricSanityCheckResult;
  /** From `MarginAssumptions.contributionMarginPct` on the demo dataset. */
  readonly marginContributionPct: number;
  /** From `MarginAssumptions.netRevenueMultiplier` when set (fixture uses 1). */
  readonly netRevenueMultiplier: number | undefined;
  /** Total line rows across all orders (`Order.lineItems`). */
  readonly orderLineItemCount: number;
  readonly enginePoweredRoutes: readonly {
    readonly href: string;
    readonly label: string;
    readonly description: string;
  }[];
  readonly canonicalModelEntities: readonly {
    readonly title: string;
    readonly notes: string;
  }[];
  readonly comingNext: readonly {
    readonly title: string;
    readonly detail: string;
  }[];
}

function countOrderLineItems(orders: readonly { lineItems: readonly unknown[] }[]): number {
  let n = 0;
  for (const o of orders) {
    n += o.lineItems.length;
  }
  return n;
}

/**
 * `/data` page payload — deterministic counts and copy anchors only (no uploads, APIs, or IO).
 * `sanity` stays separate: it is the existing smoke harness over the metric engine (still demo-seeded in the wrapper).
 */
export function buildDataPageViewModelFromDataset(
  dataset: RetentionOSDataset,
  sanity: DemoMetricSanityCheckResult,
): DataPageViewModel {
  const margin = dataset.marginAssumptions;

  return {
    dataMode: "demo",
    demoBrandName: DEMO_BRAND_NAME,
    demoBrandTagline: DEMO_BRAND_TAGLINE,
    sanity,
    marginContributionPct: margin?.contributionMarginPct ?? 0,
    netRevenueMultiplier: margin?.netRevenueMultiplier,
    orderLineItemCount: countOrderLineItems(dataset.orders),
    enginePoweredRoutes: [
      {
        href: "/dashboard",
        label: "/dashboard",
        description: "Executive KPIs, revenue durability snapshot, and demo observations via `buildDashboardExecutiveViewModel`.",
      },
      {
        href: "/cohorts",
        label: "/cohorts",
        description: "Cohort month table — net revenue, contribution, Month +N active rates.",
      },
      {
        href: "/retention",
        label: "/retention",
        description: "Repeat depth, first-to-second within 90 days, cohort retention offsets.",
      },
      {
        href: "/ltv",
        label: "/ltv",
        description: "Cumulative net revenue LTV and contribution LTV staircases.",
      },
      {
        href: "/acquisition",
        label: "/acquisition",
        description: "CAC, LTV:CAC, and payback when dataset-native marketing spend is available.",
      },
      {
        href: "/products",
        label: "/products",
        description: "First-product customer quality — repeat, LTV, contribution, and drag by entry product.",
      },
      {
        href: "/insights",
        label: "/insights",
        description: "Deterministic diagnostic cards from `/lib/insights` on the same fixture.",
      },
    ],
    canonicalModelEntities: [
      {
        title: "Customers",
        notes:
          "Canonical `Customer` — identity, first order timestamp, optional acquisition channel; cohort month from first order (UTC).",
      },
      {
        title: "Orders",
        notes:
          "Canonical `Order` — gross revenue, discounts, refunds, optional contribution and channel; timestamps drive retention and LTV ladders.",
      },
      {
        title: "Order line items",
        notes: "Canonical `OrderLineItem` — quantity, SKU/product links; powers first-product customer quality on `/products`.",
      },
      {
        title: "Products",
        notes: "Canonical `Product` — catalog slice in the fixture; SKU metadata for demos, not live catalog sync.",
      },
      {
        title: "Marketing spend",
        notes: "Canonical `MarketingSpend` rows — consumed by `/acquisition` when spend is attached to the selected orders source (demo fixture or uploaded session merge).",
      },
      {
        title: "Margin assumptions",
        notes:
          "`MarginAssumptions` — contribution margin % and optional net revenue multiplier used when computing contribution LTV.",
      },
    ],
    comingNext: [
      {
        title: "Live Shopify sync",
        detail: "Connect Shopify directly and keep orders in sync automatically — not available in this MVP; use CSV export today.",
      },
      {
        title: "Cloud persistence",
        detail: "Saved uploads stay in this browser tab only — multi-tenant account storage and team sharing are on the roadmap.",
      },
      {
        title: "Scenario modelling",
        detail: "Model spend or retention changes before you commit capital — planned for a future release.",
      },
    ],
  };
}

export function buildDataPageViewModel(seed?: number): DataPageViewModel {
  return buildDataPageViewModelFromDataset(buildDemoRetentionOSDataset(seed), runDemoMetricSanityCheck(seed));
}
