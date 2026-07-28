import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDiagnosticInsightsBundle,
  generateDiagnosticInsights,
} from "./generate-diagnostic-insights";
import type { Customer } from "../types";
import type { Order } from "../types/order";

function order(
  id: string,
  customerId: string,
  orderedAt: string,
  grossRevenue = 100,
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue,
    discounts: 0,
    refunds: 0,
    lineItems: [],
  };
}

describe("buildDiagnosticInsightsBundle completed retention averages", () => {
  it("uses completed-only M+1/M+2/M+3 and suppresses partial offsets", () => {
    const customers: Customer[] = [
      { id: "d1", firstOrderAt: "2024-12-01T12:00:00.000Z" },
      { id: "d2", firstOrderAt: "2024-12-05T12:00:00.000Z" },
      { id: "j1", firstOrderAt: "2025-01-01T12:00:00.000Z" },
      { id: "j2", firstOrderAt: "2025-01-05T12:00:00.000Z" },
    ];
    // Latest order mid-Feb → Dec M+1 complete; Jan M+1 partial.
    const orders: Order[] = [
      order("o1", "d1", "2024-12-01T12:00:00.000Z"),
      order("o2", "d2", "2024-12-05T12:00:00.000Z"),
      order("o3", "d1", "2025-01-10T12:00:00.000Z"),
      order("o4", "d2", "2025-01-12T12:00:00.000Z"),
      order("o5", "j1", "2025-01-01T12:00:00.000Z"),
      order("o6", "j2", "2025-01-05T12:00:00.000Z"),
      order("o7", "j1", "2025-02-10T12:00:00.000Z"),
    ];

    const bundle = buildDiagnosticInsightsBundle(customers, orders);
    assert.equal(bundle.retentionAverages.m1, 1);
    // M+2/M+3 for Dec not complete at mid-Feb (Feb/Mar periods) → null when only Dec could qualify later.
    // At mid-Feb: Dec M+2 (Feb) partial; Jan M+2 unavailable/partial → m2 null.
    assert.equal(bundle.retentionAverages.m2, null);
    assert.equal(bundle.retentionAverages.m3, null);
  });

  it("partial M+2 cannot create a false longer-cycle timing claim", () => {
    // Complete M+1 low; provisional M+2 high if included would trigger m2 > m1 * 1.x narrative.
    const customers: Customer[] = [
      { id: "a1", firstOrderAt: "2024-11-01T12:00:00.000Z" },
      { id: "a2", firstOrderAt: "2024-11-05T12:00:00.000Z" },
      { id: "b1", firstOrderAt: "2024-12-01T12:00:00.000Z" },
    ];
    const orders: Order[] = [
      order("o1", "a1", "2024-11-01T12:00:00.000Z"),
      order("o2", "a2", "2024-11-05T12:00:00.000Z"),
      // Nov M+1 (Dec): none reorder → completed 0 at asOf mid-Jan? Need asOf after Jan 1 for Nov M+1 complete.
      order("o3", "b1", "2024-12-01T12:00:00.000Z"),
      // Extend into Jan so Nov M+2 (Jan) is partial mid-Jan with high provisional activity.
      order("o4", "a1", "2025-01-10T12:00:00.000Z"),
      order("o5", "a2", "2025-01-12T12:00:00.000Z"),
    ];

    const bundle = buildDiagnosticInsightsBundle(customers, orders);
    // asOf = 2025-01-12: Nov M+1 (Dec) complete = 0; Nov M+2 (Jan) partial → excluded.
    assert.equal(bundle.retentionAverages.m1, 0);
    assert.equal(bundle.retentionAverages.m2, null);

    const insights = generateDiagnosticInsights(bundle, null);
    const timing = insights.find((i) => i.id === "retention-timing-interpretation");
    assert.ok(timing);
    assert.doesNotMatch(timing!.evidence, /Month \+2 active rate/);
  });

  it("returns null averages when orders are empty", () => {
    const bundle = buildDiagnosticInsightsBundle(
      [{ id: "c1", firstOrderAt: "2025-01-01T00:00:00.000Z" }],
      [],
    );
    assert.equal(bundle.retentionAverages.m1, null);
    assert.equal(bundle.retentionAverages.m2, null);
    assert.equal(bundle.retentionAverages.m3, null);
  });
});
