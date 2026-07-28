/**
 * Narrow proportional allocation of trusted order net to product keys (MET-CONCENTRATION).
 *
 * Order net is trusted via netOrderRevenue. Product-level amounts are deterministically
 * allocated using gross lineTotal weights — not exact line-level discount/refund attribution.
 */

import type { Order } from "../types/order";
import { netOrderRevenue } from "./utils";

/** Absolute float tolerance for order-level reconciliation (sibling metric pattern). */
export const ALLOCATION_EPSILON = 1e-9;

export type TrustedNetProductAllocation = {
  /** Allocated net by trimmed productId (only keys with positive allocated amount). */
  readonly byProductId: ReadonlyMap<string, number>;
  /** Trusted order net not assigned to a stable productId (includes missing-id shares). */
  readonly unattributedRevenue: number;
  readonly orderNet: number;
};

function emptyAllocation(orderNet: number, unattributed: number): TrustedNetProductAllocation {
  return {
    byProductId: new Map(),
    unattributedRevenue: unattributed,
    orderNet,
  };
}

/**
 * Allocate trusted netOrderRevenue across merchandise lines proportionally by lineTotal.
 *
 * Invalid (negative or non-finite) lineTotal on any line: entire positive net is unattributed.
 * Missing productId on a valid-weight line: that share is unattributed.
 */
export function allocateTrustedNetByProduct(order: Order): TrustedNetProductAllocation {
  const orderNet = netOrderRevenue(order);

  if (orderNet === 0) {
    return emptyAllocation(0, 0);
  }

  for (const line of order.lineItems) {
    const lt = line.lineTotal;
    if (lt === undefined) continue;
    if (!Number.isFinite(lt) || lt < 0) {
      return emptyAllocation(orderNet, orderNet);
    }
  }

  let totalWeight = 0;
  for (const line of order.lineItems) {
    const lt = line.lineTotal;
    if (lt !== undefined && Number.isFinite(lt) && lt >= 0) {
      totalWeight += lt;
    }
  }

  if (totalWeight === 0) {
    return emptyAllocation(orderNet, orderNet);
  }

  const attributed = new Map<string, number>();
  let attributedSum = 0;

  for (const line of order.lineItems) {
    const lt = line.lineTotal;
    const weight = lt !== undefined && Number.isFinite(lt) && lt >= 0 ? lt : 0;
    if (weight === 0) continue;

    const share = (orderNet * weight) / totalWeight;
    const productId = line.productId?.trim() ?? "";
    if (productId.length === 0) {
      continue;
    }
    attributed.set(productId, (attributed.get(productId) ?? 0) + share);
    attributedSum += share;
  }

  if (attributedSum - orderNet > ALLOCATION_EPSILON) {
    throw new RangeError(
      `allocateTrustedNetByProduct: attributed revenue ${String(attributedSum)} exceeds orderNet ${String(orderNet)} beyond epsilon`,
    );
  }

  let unattributed = orderNet - attributedSum;
  if (Math.abs(unattributed) <= ALLOCATION_EPSILON) {
    unattributed = 0;
  }
  if (unattributed < 0) {
    throw new RangeError(
      `allocateTrustedNetByProduct: negative unattributed revenue ${String(unattributed)}`,
    );
  }

  const positiveOnly = new Map<string, number>();
  for (const [id, revenue] of attributed) {
    if (revenue > ALLOCATION_EPSILON) {
      positiveOnly.set(id, revenue);
    }
  }

  return {
    byProductId: positiveOnly,
    unattributedRevenue: unattributed,
    orderNet,
  };
}
