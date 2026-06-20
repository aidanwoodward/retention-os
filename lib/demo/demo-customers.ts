import type { Customer } from "../types";
import {
  allocateCustomersByChannel,
  DEMO_CHANNELS,
  DEMO_MONTH_KEYS,
  type DemoChannel,
} from "./demo-config";

/** Unit interval PRNG consumer — injected for deterministic fixtures. */
export type DemoRand = () => number;

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function parseMonthKey(key: string): { y: number; m0: number } {
  const [ys, ms] = key.split("-");
  return { y: Number(ys), m0: Number(ms) - 1 };
}

/** Uniform random timestamp within the calendar month (UTC). */
function randomTimeInMonth(monthKey: string, rand: DemoRand): string {
  const { y, m0 } = parseMonthKey(monthKey);
  const dim = daysInMonth(y, m0);
  const day = 1 + Math.floor(rand() * dim);
  const hh = Math.floor(rand() * 24);
  const mm = Math.floor(rand() * 60);
  const ss = Math.floor(rand() * 60);
  return new Date(Date.UTC(y, m0, day, hh, mm, ss)).toISOString();
}

/**
 * First-product mix by acquisition source. TikTok over-indexes barrier cream + cleanser;
 * owned email leans hero serum; Meta pushes welcome offer; Google captures SPF + kit trials.
 */
function pickFirstProductId(channel: DemoChannel, rand: DemoRand): string {
  const r = rand();
  if (channel === "tiktok_paid") {
    if (r < 0.38) return "prod_quiet_night_barrier_cream";
    if (r < 0.58) return "prod_river_foam_cleanser";
    if (r < 0.72) return "prod_lumin_daily_serum";
    if (r < 0.84) return "prod_welcome_routine_set";
    if (r < 0.94) return "prod_cliff_mineral_spf40";
    return "prod_discovery_mini_kit";
  }
  if (channel === "google_paid") {
    if (r < 0.28) return "prod_cliff_mineral_spf40";
    if (r < 0.46) return "prod_discovery_mini_kit";
    if (r < 0.62) return "prod_welcome_routine_set";
    if (r < 0.78) return "prod_lumin_daily_serum";
    if (r < 0.9) return "prod_river_foam_cleanser";
    return "prod_steady_reset_magnesium";
  }
  if (channel === "email_owned") {
    if (r < 0.52) return "prod_lumin_daily_serum";
    if (r < 0.7) return "prod_cliff_mineral_spf40";
    if (r < 0.84) return "prod_steady_reset_magnesium";
    if (r < 0.94) return "prod_river_foam_cleanser";
    return "prod_quiet_night_barrier_cream";
  }
  if (channel === "influencer") {
    if (r < 0.44) return "prod_lumin_daily_serum";
    if (r < 0.62) return "prod_quiet_night_barrier_cream";
    if (r < 0.78) return "prod_cliff_mineral_spf40";
    if (r < 0.9) return "prod_river_foam_cleanser";
    if (r < 0.96) return "prod_discovery_mini_kit";
    return "prod_steady_reset_magnesium";
  }
  // meta_paid — scale volume via cleanser + welcome offer
  if (r < 0.28) return "prod_river_foam_cleanser";
  if (r < 0.48) return "prod_welcome_routine_set";
  if (r < 0.66) return "prod_lumin_daily_serum";
  if (r < 0.8) return "prod_quiet_night_barrier_cream";
  if (r < 0.92) return "prod_discovery_mini_kit";
  return "prod_cliff_mineral_spf40";
}

/**
 * Builds customers without `lastOrderAt` — callers merge chronology after simulating purchases.
 */
export function createDemoCustomers(rand: DemoRand): Customer[] {
  const customers: Customer[] = [];
  let seq = 0;
  for (let mi = 0; mi < DEMO_MONTH_KEYS.length; mi++) {
    const monthKey = DEMO_MONTH_KEYS[mi];
    const alloc = allocateCustomersByChannel(mi);
    for (const ch of DEMO_CHANNELS) {
      const n = alloc[ch];
      for (let i = 0; i < n; i++) {
        seq += 1;
        const id = `cust_${String(seq).padStart(5, "0")}`;
        customers.push({
          id,
          firstOrderAt: randomTimeInMonth(monthKey, rand),
          acquisitionChannel: ch,
          firstProductId: pickFirstProductId(ch, rand),
        });
      }
    }
  }
  return customers;
}
