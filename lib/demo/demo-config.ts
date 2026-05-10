/**
 * Deterministic schedule and catalog metadata for the canonical demo brand
 * "Lumin & River" (DTC skincare + light wellness). Not domain types — wiring only.
 */

/** Display identity for MVP transparency surfaces (`/data`, etc.). */
export const DEMO_BRAND_NAME = "Lumin & River" as const;

/** Short positioning line for transparency copy — aligns with simulation intent, not audited financials. */
export const DEMO_BRAND_TAGLINE =
  "DTC skincare plus light wellness — a deterministic spreadsheet-grade fixture for customer economics demos." as const;

/** Inclusive simulation window for orders (ISO end-of-day UTC). */
export const DEMO_WINDOW_END = "2025-03-31T23:59:59.000Z";

/** First-order cohort months (15 months of demo history). */
export const DEMO_MONTH_KEYS = [
  "2024-01",
  "2024-02",
  "2024-03",
  "2024-04",
  "2024-05",
  "2024-06",
  "2024-07",
  "2024-08",
  "2024-09",
  "2024-10",
  "2024-11",
  "2024-12",
  "2025-01",
  "2025-02",
  "2025-03",
] as const;

/**
 * New paying customers acquired each month. Mid-window growth + late 2024 spike
 * mirrors paid social scale before a TikTok-heavy Q4 pushes volume with weaker fidelity.
 */
export const DEMO_NEW_CUSTOMERS_BY_MONTH: readonly number[] = [
  22, 24, 27, 28, 30, 31, 33, 34, 32, 35, 36, 58, 45, 38, 33,
];

export type DemoChannel =
  | "influencer"
  | "meta_paid"
  | "google_paid"
  | "tiktok_paid"
  | "email_owned";

export const DEMO_CHANNELS: DemoChannel[] = [
  "influencer",
  "meta_paid",
  "google_paid",
  "tiktok_paid",
  "email_owned",
];

/** Match integer acquisition counts per channel to fractional weights (largest remainder). */
export function allocateCustomersByChannel(monthIndex: number): Record<DemoChannel, number> {
  const n = DEMO_NEW_CUSTOMERS_BY_MONTH[monthIndex];
  const w = channelWeightsForMonth(monthIndex);
  const parts = DEMO_CHANNELS.map((ch) => {
    const exact = n * w[ch];
    return { ch, floor: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  const base = parts.reduce((s, p) => s + p.floor, 0);
  const leftover = n - base;
  const remainderOrder = [...parts].sort((a, b) => b.frac - a.frac);
  const out: Record<DemoChannel, number> = {
    influencer: 0,
    meta_paid: 0,
    google_paid: 0,
    tiktok_paid: 0,
    email_owned: 0,
  };
  for (const p of parts) {
    out[p.ch] = p.floor;
  }
  for (let i = 0; i < leftover; i++) {
    out[remainderOrder[i].ch] += 1;
  }
  return out;
}

/** Influencer/Meta-strong early flywheel; TikTok share rises toward month index 14. */
export function channelWeightsForMonth(monthIndex: number): Record<DemoChannel, number> {
  const t = monthIndex / (DEMO_MONTH_KEYS.length - 1);
  const tiktok = 0.06 + t * 0.26;
  const google = 0.2 - t * 0.04;
  const influencer = 0.34 - t * 0.18;
  const meta = 0.32 - t * 0.12;
  const email = Math.max(0.04, 1 - (influencer + meta + google + tiktok));
  const sum = influencer + meta + google + tiktok + email;
  return {
    influencer: influencer / sum,
    meta_paid: meta / sum,
    google_paid: google / sum,
    tiktok_paid: tiktok / sum,
    email_owned: email / sum,
  };
}

export interface DemoCatalogEntry {
  id: string;
  title: string;
  handle: string;
  sku: string;
  /** Typical shelf price for revenue simulation (not on `Product` type). */
  price: number;
}

export const DEMO_CATALOG: readonly DemoCatalogEntry[] = [
  {
    id: "prod_lumin_daily_serum",
    title: "Lumin Daily Vitamin C Serum",
    handle: "lumin-daily-vitamin-c-serum",
    sku: "LMN-SER-30",
    price: 64,
  },
  {
    id: "prod_quiet_night_barrier_cream",
    title: "Quiet Night Barrier Cream",
    handle: "quiet-night-barrier-cream",
    sku: "QUI-CRM-50",
    price: 46,
  },
  {
    id: "prod_river_foam_cleanser",
    title: "River Foam Cleanser",
    handle: "river-foam-cleanser",
    sku: "RIV-CLN-150",
    price: 28,
  },
  {
    id: "prod_cliff_mineral_spf40",
    title: "Cliff Mineral SPF 40",
    handle: "cliff-mineral-spf-40",
    sku: "CLF-SPF-50",
    price: 36,
  },
  {
    id: "prod_steady_reset_magnesium",
    title: "Steady Reset Magnesium Capsules",
    handle: "steady-reset-magnesium",
    sku: "STD-MG-60",
    price: 42,
  },
  {
    id: "prod_discovery_mini_kit",
    title: "Discovery Mini Kit",
    handle: "discovery-mini-kit",
    sku: "DSC-KIT-01",
    price: 44,
  },
];

export const DEMO_PRODUCT_BY_ID: Record<string, DemoCatalogEntry> = Object.fromEntries(
  DEMO_CATALOG.map((p) => [p.id, p]),
);
