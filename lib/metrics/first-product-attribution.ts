/**
 * Canonical first-product attribution (MET-FIRST-PRODUCT-RULE).
 *
 * Deterministic three-state rule: single_product | multi_product | unknown.
 * Chronology invariants match MET-NEW-RETURN (parity by copy — do not import new-returning).
 *
 * Deliberately stricter than revenue concentration on variant fallback: entry-product
 * attribution requires proof of one canonical product, not sales-mix allocation.
 *
 * Imported Customer.firstProductId is denormalised interim data and is never read here.
 */

import { assertCanonicalUtcInstant } from "../analysis-context/period";
import type { Customer } from "../types/customer";
import { isIdentifiedOrder, type Order, type OrderLineItem } from "../types/order";

export type FirstProductAttributionOptions = {
  readonly asOfDate?: string;
};

export type FirstProductAttribution =
  | {
      readonly attributionStatus: "single_product";
      readonly firstProductId: string;
    }
  | {
      readonly attributionStatus: "multi_product";
      readonly firstProductId: null;
    }
  | {
      readonly attributionStatus: "unknown";
      readonly firstProductId: null;
    };

const UNKNOWN: FirstProductAttribution = {
  attributionStatus: "unknown",
  firstProductId: null,
};

function compareOrdersByCanonicalFirstIdentity(a: Order, b: Order): number {
  if (a.orderedAt < b.orderedAt) return -1;
  if (a.orderedAt > b.orderedAt) return 1;
  return a.id.localeCompare(b.id, "en");
}

/**
 * Fail-closed variant-fallback identity (may be stricter than revenue concentration).
 * Catalogue presence does not rehabilitate a verified fallback.
 */
export function isVariantFallbackProductIdentity(line: OrderLineItem): boolean {
  const productId = line.productId?.trim() ?? "";
  if (productId.length === 0) return false;

  const variantId = line.variantId?.trim() ?? "";
  if (variantId.length > 0 && productId === variantId) return true;
  if (variantId.length > 0 && productId === `shopify:variant:${variantId}`) return true;
  if (productId.startsWith("shopify:variant:")) return true;
  return false;
}

function hasReliableCanonicalProductId(line: OrderLineItem): boolean {
  const productId = line.productId?.trim() ?? "";
  if (productId.length === 0) return false;
  return !isVariantFallbackProductIdentity(line);
}

function hasInvalidPresentLineTotal(line: OrderLineItem): boolean {
  const lt = line.lineTotal;
  if (lt == null) return false;
  return !Number.isFinite(lt) || lt < 0;
}

function classifyFirstOrderBasket(order: Order): FirstProductAttribution {
  const lines = order.lineItems;
  if (lines.length === 0) return UNKNOWN;

  for (const line of lines) {
    if (hasInvalidPresentLineTotal(line)) return UNKNOWN;
  }

  const distinct = new Set<string>();
  for (const line of lines) {
    if (!hasReliableCanonicalProductId(line)) return UNKNOWN;
    distinct.add(line.productId!.trim());
  }

  if (distinct.size === 0) return UNKNOWN;
  if (distinct.size === 1) {
    return {
      attributionStatus: "single_product",
      firstProductId: [...distinct][0]!,
    };
  }
  return {
    attributionStatus: "multi_product",
    firstProductId: null,
  };
}

/**
 * Attribute a customer's canonical first order to a product (or declare multi/unknown).
 *
 * Product-quality currently omits `asOfDate` (all-time observation). When provided,
 * only orders with orderedAt &lt; asOfDate are considered.
 */
export function deriveFirstProductAttribution(
  customer: Customer,
  orders: readonly Order[],
  options?: FirstProductAttributionOptions,
): FirstProductAttribution {
  const firstOrderAtMs = assertCanonicalUtcInstant(customer.firstOrderAt, "firstOrderAt");
  const asOfMs =
    options?.asOfDate != null
      ? assertCanonicalUtcInstant(options.asOfDate, "asOfDate")
      : null;

  const observed: Order[] = [];
  for (const order of orders) {
    if (!isIdentifiedOrder(order) || order.customerId !== customer.id) continue;
    const orderedAtMs = assertCanonicalUtcInstant(order.orderedAt, "orderedAt");
    if (asOfMs != null && !(orderedAtMs < asOfMs)) continue;
    if (orderedAtMs < firstOrderAtMs) {
      throw new RangeError(
        `Canonical integrity violation: order "${order.id}" orderedAt is before customer "${customer.id}" firstOrderAt`,
      );
    }
    observed.push(order);
  }

  if (observed.length === 0) return UNKNOWN;

  observed.sort(compareOrdersByCanonicalFirstIdentity);
  const earliest = observed[0]!;
  const earliestMs = assertCanonicalUtcInstant(earliest.orderedAt, "orderedAt");

  if (earliestMs > firstOrderAtMs) {
    return UNKNOWN;
  }

  return classifyFirstOrderBasket(earliest);
}
