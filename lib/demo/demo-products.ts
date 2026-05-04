import type { Product } from "../types";
import { DEMO_CATALOG } from "./demo-config";

/** Stock-keeping list for the demo brand — prices live in `DEMO_CATALOG` for order simulation. */
export const DEMO_PRODUCTS: Product[] = DEMO_CATALOG.map((p) => ({
  id: p.id,
  handle: p.handle,
  title: p.title,
  sku: p.sku,
}));
