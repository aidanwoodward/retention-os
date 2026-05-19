import type { MarketingSpend } from "../types";
import {
  allocateCustomersByChannel,
  DEMO_CHANNELS,
  DEMO_MONTH_KEYS,
  type DemoChannel,
} from "./demo-config";

/**
 * Implied fully-loaded monthly spend by channel so CAC ≈ customers acquired × this constant.
 * TikTok is deliberately expensive per retained dollar; email lean but not free (creators + ESP).
 */
const EFFECTIVE_ACQUISITION_COST_USD: Record<DemoChannel, number> = {
  influencer: 54,
  meta_paid: 49,
  google_paid: 56,
  tiktok_paid: 74,
  email_owned: 11,
};

function buildDemoMarketingSpend(): MarketingSpend[] {
  const rows: MarketingSpend[] = [];
  for (let mi = 0; mi < DEMO_MONTH_KEYS.length; mi++) {
    const month = `${DEMO_MONTH_KEYS[mi]}-01`;
    const alloc = allocateCustomersByChannel(mi);
    for (const ch of DEMO_CHANNELS) {
      const customers = alloc[ch];
      if (customers === 0) {
        continue;
      }
      rows.push({
        month,
        channel: ch,
        spend: Math.round(customers * EFFECTIVE_ACQUISITION_COST_USD[ch]),
      });
    }
  }
  return rows;
}

/** Month × channel spend aligned to `allocateCustomersByChannel` counts. */
export const DEMO_MARKETING_SPEND: MarketingSpend[] = buildDemoMarketingSpend();
