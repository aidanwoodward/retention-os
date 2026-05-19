import type { Customer, MarginAssumptions, Order, OrderLineItem } from "../types";
import { DEMO_PRODUCT_BY_ID, DEMO_WINDOW_END } from "./demo-config";
import type { DemoChannel } from "./demo-config";
import type { DemoRand } from "./demo-customers";

const END_MS = new Date(DEMO_WINDOW_END).getTime();

function addDaysUtc(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function netMerchandise(o: Pick<Order, "grossRevenue" | "discounts" | "refunds">): number {
  return Math.max(0, o.grossRevenue - o.discounts - o.refunds);
}

/** Downstream repeat strength — serum + influencer/email flywheel vs TikTok + barrier cream leakage. */
function repeatPurchasePropensity(customer: Customer): number {
  const ch = customer.acquisitionChannel as DemoChannel;
  const fp = customer.firstProductId ?? "";

  if (fp === "prod_lumin_daily_serum") {
    if (ch === "influencer" || ch === "email_owned") return 0.58;
    if (ch === "meta_paid") return 0.51;
    if (ch === "google_paid") return 0.47;
    return 0.34;
  }
  if (fp === "prod_quiet_night_barrier_cream") {
    return ch === "tiktok_paid" ? 0.21 : 0.31;
  }
  if (fp === "prod_discovery_mini_kit") {
    return ch === "google_paid" ? 0.44 : 0.37;
  }
  if (fp === "prod_cliff_mineral_spf40") {
    return ch === "email_owned" ? 0.55 : 0.46;
  }
  if (fp === "prod_river_foam_cleanser") {
    return 0.42;
  }
  return 0.38;
}

const COMPANION_POOL = [
  "prod_river_foam_cleanser",
  "prod_cliff_mineral_spf40",
  "prod_steady_reset_magnesium",
] as const;

function pickCompanion(mainId: string, rand: DemoRand): string {
  const pool = COMPANION_POOL.filter((p) => p !== mainId);
  return pool[Math.floor(rand() * pool.length)] ?? "prod_river_foam_cleanser";
}

function pickReplenishmentSku(customer: Customer, rand: DemoRand): string {
  const fp = customer.firstProductId ?? "";
  if (fp === "prod_quiet_night_barrier_cream") {
    if (rand() < 0.42) return "prod_river_foam_cleanser";
    if (rand() < 0.76) return "prod_cliff_mineral_spf40";
    return "prod_lumin_daily_serum";
  }
  if (fp === "prod_lumin_daily_serum") {
    if (rand() < 0.56) return "prod_lumin_daily_serum";
    if (rand() < 0.83) return "prod_cliff_mineral_spf40";
    return "prod_river_foam_cleanser";
  }
  if (fp === "prod_cliff_mineral_spf40") {
    if (rand() < 0.62) return "prod_cliff_mineral_spf40";
    if (rand() < 0.86) return "prod_lumin_daily_serum";
    return "prod_river_foam_cleanser";
  }
  if (fp === "prod_discovery_mini_kit") {
    if (rand() < 0.5) return "prod_lumin_daily_serum";
    if (rand() < 0.78) return "prod_quiet_night_barrier_cream";
    return "prod_cliff_mineral_spf40";
  }
  if (rand() < 0.45) return "prod_lumin_daily_serum";
  if (rand() < 0.72) return "prod_cliff_mineral_spf40";
  return "prod_quiet_night_barrier_cream";
}

function bundleSecondLine(primaryId: string, rand: DemoRand): OrderLineItem | null {
  if (rand() >= 0.3) return null;
  const addId = pickCompanion(primaryId, rand);
  const add = DEMO_PRODUCT_BY_ID[addId];
  return {
    id: `oli_placeholder`,
    productId: addId,
    title: add.title,
    sku: add.sku,
    quantity: 1,
    unitPrice: add.price,
    lineTotal: add.price,
  };
}

function repeatAttribution(acq: string | undefined, rand: DemoRand): string | undefined {
  if (!acq) return "direct";
  const r = rand();
  if (r < 0.34) return "email_owned";
  if (r < 0.58) return acq;
  return "direct";
}

function buildContribution(
  o: Pick<Order, "grossRevenue" | "discounts" | "refunds">,
  margin: MarginAssumptions,
): number | undefined {
  const mult = margin.netRevenueMultiplier ?? 1;
  const base = netMerchandise(o) * mult * margin.contributionMarginPct;
  return roundMoney(base);
}

export function createDemoOrders(
  rand: DemoRand,
  customers: readonly Customer[],
  margin: MarginAssumptions,
): Order[] {
  const orders: Order[] = [];

  for (const c of customers) {
    let orderIdx = 0;
    const mainId = c.firstProductId ?? "prod_lumin_daily_serum";
    const main = DEMO_PRODUCT_BY_ID[mainId];
    const lines: OrderLineItem[] = [
      {
        id: `oli_${c.id}-${orderIdx}-0`,
        productId: mainId,
        title: main.title,
        sku: main.sku,
        quantity: 1,
        unitPrice: main.price,
        lineTotal: main.price,
      },
    ];
    let subtotal = main.price;

    const extra = bundleSecondLine(mainId, rand);
    if (extra) {
      extra.id = `oli_${c.id}-${orderIdx}-1`;
      lines.push(extra);
      subtotal += extra.lineTotal ?? 0;
    }

    let discounts = 0;
    if (rand() < 0.14) {
      discounts = Math.round(subtotal * (0.08 + rand() * 0.12));
    }
    let refunds = 0;
    if (rand() < 0.028) {
      refunds = Math.round(4 + rand() * 22);
    }

    const firstOrder: Order = {
      id: `ord_${c.id}-${orderIdx}`,
      customerId: c.id,
      orderedAt: c.firstOrderAt,
      grossRevenue: roundMoney(subtotal),
      discounts,
      refunds,
      channel: c.acquisitionChannel,
      lineItems: lines,
    };
    firstOrder.contributionMargin = buildContribution(firstOrder, margin);
    orders.push(firstOrder);
    orderIdx += 1;

    let p = repeatPurchasePropensity(c);
    let t = c.firstOrderAt;
    let guard = 0;
    while (guard < 14) {
      guard += 1;
      if (rand() > p) break;
      const gap = 19 + Math.floor(rand() * 86);
      t = addDaysUtc(t, gap);
      if (new Date(t).getTime() > END_MS) break;
      p *= 0.87;

      const skuId = pickReplenishmentSku(c, rand);
      const cat = DEMO_PRODUCT_BY_ID[skuId];
      const rLines: OrderLineItem[] = [
        {
          id: `oli_${c.id}-${orderIdx}-0`,
          productId: skuId,
          title: cat.title,
          sku: cat.sku,
          quantity: 1,
          unitPrice: cat.price,
          lineTotal: cat.price,
        },
      ];
      let rSub = cat.price;
      if (rand() < 0.18) {
        const addId = pickCompanion(skuId, rand);
        const add = DEMO_PRODUCT_BY_ID[addId];
        rLines.push({
          id: `oli_${c.id}-${orderIdx}-1`,
          productId: addId,
          title: add.title,
          sku: add.sku,
          quantity: 1,
          unitPrice: add.price,
          lineTotal: add.price,
        });
        rSub += add.price;
      }

      let rDisc = 0;
      if (rand() < 0.09) {
        rDisc = Math.round(rSub * (0.05 + rand() * 0.08));
      }
      let rRef = 0;
      if (rand() < 0.022) {
        rRef = Math.round(3 + rand() * 14);
      }

      const rep: Order = {
        id: `ord_${c.id}-${orderIdx}`,
        customerId: c.id,
        orderedAt: t,
        grossRevenue: roundMoney(rSub),
        discounts: rDisc,
        refunds: rRef,
        channel: repeatAttribution(c.acquisitionChannel, rand),
        lineItems: rLines,
      };
      rep.contributionMargin = buildContribution(rep, margin);
      orders.push(rep);
      orderIdx += 1;
    }
  }

  return orders;
}
