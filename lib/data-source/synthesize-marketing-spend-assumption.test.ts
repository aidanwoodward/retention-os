import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Order } from "../types/order";
import { synthesizeMarketingSpendFromAssumption } from "./synthesize-marketing-spend-assumption";

function order(partial: Partial<Order> & Pick<Order, "id" | "orderedAt">): Order {
  return {
    customerId: "c1",
    grossRevenue: 100,
    discounts: 0,
    refunds: 0,
    lineItems: [],
    ...partial,
  };
}

describe("synthesizeMarketingSpendFromAssumption", () => {
  it("aggregates net revenue by UTC month and applies percentage", () => {
    const orders: Order[] = [
      order({ id: "o1", orderedAt: "2024-01-15T12:00:00.000Z", grossRevenue: 10000, discounts: 0, refunds: 0 }),
      order({ id: "o2", orderedAt: "2024-01-20T12:00:00.000Z", grossRevenue: 5000, discounts: 500, refunds: 0 }),
      order({ id: "o3", orderedAt: "2024-02-10T12:00:00.000Z", grossRevenue: 8000, discounts: 0, refunds: 1000 }),
    ];

    const rows = synthesizeMarketingSpendFromAssumption(orders, { marketingSpendPctOfNetRevenue: 0.2 });

    assert.equal(rows.length, 2);
    const jan = rows.find((r) => r.month === "2024-01");
    const feb = rows.find((r) => r.month === "2024-02");
    assert.ok(jan);
    assert.ok(feb);
    // Jan: (10000 + (5000-500)) * 0.2 = 2900
    assert.equal(jan!.spend, 2900);
    // Feb: (8000 - 1000) * 0.2 = 1400
    assert.equal(feb!.spend, 1400);
  });

  it("uses net merchandise revenue (discounts and refunds reduce basis)", () => {
    const orders: Order[] = [
      order({
        id: "o1",
        orderedAt: "2024-03-01T00:00:00.000Z",
        grossRevenue: 1000,
        discounts: 200,
        refunds: 100,
      }),
    ];
    const rows = synthesizeMarketingSpendFromAssumption(orders, { marketingSpendPctOfNetRevenue: 0.5 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.spend, 350);
  });

  it("handles 0% and 100% edge cases", () => {
    const orders: Order[] = [order({ id: "o1", orderedAt: "2024-01-01T00:00:00.000Z", grossRevenue: 5000 })];
    assert.deepEqual(
      synthesizeMarketingSpendFromAssumption(orders, { marketingSpendPctOfNetRevenue: 0 }),
      [{ month: "2024-01", spend: 0 }],
    );
    assert.deepEqual(
      synthesizeMarketingSpendFromAssumption(orders, { marketingSpendPctOfNetRevenue: 1 }),
      [{ month: "2024-01", spend: 5000 }],
    );
  });
});
