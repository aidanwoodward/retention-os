import type {
  Customer,
  MarginAssumptions,
  MarketingSpend,
  Order,
  Product,
} from "../types";
import { createDemoCustomers, type DemoRand } from "./demo-customers";
import { createDemoOrders } from "./demo-orders";
import { DEMO_MARGIN_ASSUMPTIONS } from "./demo-margin-assumptions";
import { DEMO_MARKETING_SPEND } from "./demo-marketing-spend";
import { DEMO_PRODUCTS } from "./demo-products";

/** Stable seed keeps cohort stories comparable across installs (override for Monte Carlo checks). */
const DEMO_RANDOM_SEED = 20260104;

export interface DemoDataset {
  customers: Customer[];
  orders: Order[];
  products: Product[];
  marketingSpend: MarketingSpend[];
  marginAssumptions: MarginAssumptions;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createDemoRand(seed: number): DemoRand {
  return mulberry32(seed >>> 0);
}

function enrichLastOrderAt(customers: readonly Customer[], orders: readonly Order[]): Customer[] {
  const lastMap = new Map<string, string>();
  for (const o of orders) {
    const cur = lastMap.get(o.customerId);
    if (!cur || o.orderedAt > cur) {
      lastMap.set(o.customerId, o.orderedAt);
    }
  }
  return customers.map((c) => ({
    ...c,
    lastOrderAt: lastMap.get(c.id),
  }));
}

/** Canonical deterministic fixtures for MVP metrics (`/lib/metrics` will consume next). */
export function getDemoDataset(seed: number = DEMO_RANDOM_SEED): DemoDataset {
  const rand = createDemoRand(seed);
  const baseCustomers = createDemoCustomers(rand);
  const orders = createDemoOrders(rand, baseCustomers, DEMO_MARGIN_ASSUMPTIONS);

  return {
    customers: enrichLastOrderAt(baseCustomers, orders),
    orders,
    products: DEMO_PRODUCTS,
    marketingSpend: DEMO_MARKETING_SPEND,
    marginAssumptions: DEMO_MARGIN_ASSUMPTIONS,
  };
}
