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
        notes: "Canonical `OrderLineItem` — quantity, SKU/product links, line economics for future product-quality metrics.",
      },
      {
        title: "Products",
        notes: "Canonical `Product` — catalog slice in the fixture; SKU metadata for demos, not live catalog sync.",
      },
      {
        title: "Marketing spend",
        notes: "Canonical `MarketingSpend` rows exist in the fixture for future acquisition economics — not consumed by active MVP routes yet.",
      },
      {
        title: "Margin assumptions",
        notes:
          "`MarginAssumptions` — contribution margin % and optional net revenue multiplier used when computing contribution LTV.",
      },
    ],
    comingNext: [
      {
        title: "CSV upload",
        detail: "Not implemented. Imports will normalize into the same canonical objects before touching `/lib/metrics`.",
      },
      {
        title: "Marketing spend import",
        detail: "Fixture rows only today — no file or API import path wired for operators.",
      },
      {
        title: "Margin assumption editor",
        detail: "Demo uses fixed `DEMO_MARGIN_ASSUMPTIONS`; no in-app tuning surface yet.",
      },
      {
        title: "Shopify ingestion",
        detail:
          "OAuth/sync code exists elsewhere in the repo for future use — this MVP stack does **not** read live Shopify totals on these routes.",
      },
      {
        title: "Supabase / live account adapters",
        detail: "Production data paths are out of scope for this restart checkpoint; `/data` reflects the intentional demo-only posture.",
      },
    ],
  };
}

export function buildDataPageViewModel(seed?: number): DataPageViewModel {
  return buildDataPageViewModelFromDataset(buildDemoRetentionOSDataset(seed), runDemoMetricSanityCheck(seed));
}
