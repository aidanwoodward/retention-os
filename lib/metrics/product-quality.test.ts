import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDemoRetentionOSDataset } from "../data-source/demo-source";
import type { Customer } from "../types/customer";
import type { Order, OrderLineItem } from "../types/order";
import type { Product } from "../types/product";
import type { MarginAssumptions } from "../types/scenario";
import {
  MIN_CUSTOMERS_FOR_SIGNAL,
  calculateFirstProductCustomerQuality,
  calculateFirstProductCustomerQualityFromDataset,
  deriveFirstProductIdForCustomer,
} from "./product-quality";

function line(
  productId: string,
  title: string,
  lineTotal: number,
): OrderLineItem {
  return {
    id: `li_${productId}`,
    productId,
    title,
    quantity: 1,
    unitPrice: lineTotal,
    lineTotal,
  };
}

function order(
  id: string,
  customerId: string,
  orderedAt: string,
  lineItems: OrderLineItem[],
  overrides: Partial<Pick<Order, "grossRevenue" | "discounts" | "refunds" | "contributionMargin">> = {},
): Order {
  const grossRevenue =
    overrides.grossRevenue ??
    lineItems.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0);
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue,
    discounts: overrides.discounts ?? 0,
    refunds: overrides.refunds ?? 0,
    lineItems,
    ...overrides,
  };
}

function customer(id: string, firstOrderAt: string): Customer {
  return { id, firstOrderAt };
}

function product(id: string, title: string): Product {
  return { id, title };
}

function assertRatesInUnitInterval(result: ReturnType<typeof calculateFirstProductCustomerQuality>): void {
  for (const row of result.rows) {
    assert.ok(row.repeatPurchaseRate >= 0 && row.repeatPurchaseRate <= 1);
    assert.ok(row.firstToSecondRate >= 0 && row.firstToSecondRate <= 1);
    assert.ok(row.firstToSecondWithinWindowRate >= 0 && row.firstToSecondWithinWindowRate <= 1);
    assert.ok(row.thirdPurchaseRate >= 0 && row.thirdPurchaseRate <= 1);
    assert.ok(row.discountDragRate >= 0 && row.discountDragRate <= 1);
    assert.ok(row.refundDragRate >= 0 && row.refundDragRate <= 1);
  }
}

describe("deriveFirstProductIdForCustomer", () => {
  it("uses first line on chronological first order", () => {
    const orders: Order[] = [
      order("o2", "c1", "2024-02-01T00:00:00Z", [line("prod_b", "B", 50)]),
      order("o1", "c1", "2024-01-01T00:00:00Z", [
        line("prod_a", "A", 30),
        line("prod_c", "C", 20),
      ]),
    ];
    assert.equal(deriveFirstProductIdForCustomer("c1", orders), "prod_a");
  });
});

describe("calculateFirstProductCustomerQuality", () => {
  it("returns empty result for no customers", () => {
    const result = calculateFirstProductCustomerQuality([], [], []);
    assert.equal(result.rows.length, 0);
    assert.equal(result.totalCustomers, 0);
    assert.equal(result.strongestProduct, null);
    assert.equal(result.weakestProduct, null);
  });

  it("marks no line-item coverage when product_id is absent", () => {
    const customers = [customer("c1", "2024-01-01T00:00:00Z")];
    const orders: Order[] = [
      {
        id: "o1",
        customerId: "c1",
        orderedAt: "2024-01-01T00:00:00Z",
        grossRevenue: 100,
        discounts: 0,
        refunds: 0,
        lineItems: [{ id: "li1", quantity: 1 }],
      },
    ];
    const result = calculateFirstProductCustomerQuality(customers, orders, []);
    assert.equal(result.hasLineItemCoverage, false);
    assert.equal(result.rows.length, 0);
    assert.equal(result.unassignedCustomerCount, 1);
  });

  it("segments two products with different repeat behaviour", () => {
    const customers = [
      customer("c1", "2024-01-01T00:00:00Z"),
      customer("c2", "2024-01-02T00:00:00Z"),
      customer("c3", "2024-01-03T00:00:00Z"),
    ];
    const orders: Order[] = [
      order("o1", "c1", "2024-01-01T00:00:00Z", [line("prod_a", "A", 100)]),
      order("o2", "c1", "2024-02-01T00:00:00Z", [line("prod_a", "A", 100)]),
      order("o3", "c2", "2024-01-02T00:00:00Z", [line("prod_a", "A", 100)]),
      order("o4", "c3", "2024-01-03T00:00:00Z", [line("prod_b", "B", 50)]),
    ];
    const products = [product("prod_a", "Product A"), product("prod_b", "Product B")];

    const result = calculateFirstProductCustomerQuality(customers, orders, products);
    const rowA = result.rows.find((r) => r.productId === "prod_a");
    const rowB = result.rows.find((r) => r.productId === "prod_b");

    assert.ok(rowA);
    assert.ok(rowB);
    assert.equal(rowA.repeatCustomerCount, 1);
    assert.equal(rowA.repeatPurchaseRate, 0.5);
    assert.equal(rowB.repeatCustomerCount, 0);
    assert.equal(rowB.repeatPurchaseRate, 0);
  });

  it("computes discount and refund drag on a two-customer fixture", () => {
    const customers = [
      customer("c1", "2024-01-01T00:00:00Z"),
      customer("c2", "2024-01-02T00:00:00Z"),
    ];
    const orders: Order[] = [
      order("o1", "c1", "2024-01-01T00:00:00Z", [line("prod_a", "A", 100)], {
        grossRevenue: 100,
        discounts: 20,
        refunds: 10,
      }),
      order("o2", "c2", "2024-01-02T00:00:00Z", [line("prod_a", "A", 200)], {
        grossRevenue: 200,
        discounts: 0,
        refunds: 0,
      }),
    ];

    const result = calculateFirstProductCustomerQuality(customers, orders, [product("prod_a", "A")]);
    const row = result.rows[0]!;
    assert.equal(row.discountDragRate, 20 / 300);
    assert.equal(row.refundDragRate, 10 / 300);
    assert.equal(row.avgDiscountDollars, 10);
    assert.equal(row.avgRefundDollars, 5);
  });

  it("leaves contribution null without margin path", () => {
    const customers = [customer("c1", "2024-01-01T00:00:00Z")];
    const orders: Order[] = [
      order("o1", "c1", "2024-01-01T00:00:00Z", [line("prod_a", "A", 100)]),
    ];
    const result = calculateFirstProductCustomerQuality(customers, orders, [product("prod_a", "A")]);
    assert.equal(result.hasContributionCoverage, false);
    assert.equal(result.rows[0]!.avgContributionLtv, null);
    assert.equal(result.rows[0]!.contributionGapPerCustomer, null);
    assert.ok(result.warnings.some((w) => w.includes("Contribution LTV")));
  });

  it("populates contribution with margin assumptions", () => {
    const customers = [customer("c1", "2024-01-01T00:00:00Z")];
    const orders: Order[] = [
      order("o1", "c1", "2024-01-01T00:00:00Z", [line("prod_a", "A", 100)], {
        grossRevenue: 100,
        discounts: 0,
        refunds: 0,
      }),
    ];
    const margin: MarginAssumptions = { contributionMarginPct: 0.4 };
    const result = calculateFirstProductCustomerQuality(
      customers,
      orders,
      [product("prod_a", "A")],
      margin,
    );
    assert.equal(result.hasContributionCoverage, true);
    assert.equal(result.rows[0]!.avgContributionLtv, 40);
    assert.equal(result.rows[0]!.contributionGapPerCustomer, 60);
  });

  it("assigns qualitySignal insufficient_data below customer threshold", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL - 1; i++) {
      const id = `c${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00Z"));
      orders.push(order(`o${i}`, id, "2024-01-01T00:00:00Z", [line("prod_small", "Small", 50)]));
    }
    const result = calculateFirstProductCustomerQuality(customers, orders, [
      product("prod_small", "Small"),
    ]);
    assert.equal(result.rows[0]!.qualitySignal, "insufficient_data");
    assert.equal(result.groupsWithEnoughCustomers, 0);
    assert.equal(result.strongestProduct, null);
    assert.equal(result.weakestProduct, null);
  });

  it("classifies strong and weak signals on a controlled fixture", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];

    for (let i = 0; i < 6; i++) {
      const id = `strong_${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00Z"));
      orders.push(order(`s1_${i}`, id, "2024-01-01T00:00:00Z", [line("prod_strong", "Strong", 200)]));
      orders.push(order(`s2_${i}`, id, "2024-01-15T00:00:00Z", [line("prod_strong", "Strong", 200)]));
      orders.push(order(`s3_${i}`, id, "2024-02-01T00:00:00Z", [line("prod_strong", "Strong", 200)]));
    }

    for (let i = 0; i < 6; i++) {
      const id = `weak_${i}`;
      customers.push(customer(id, "2024-01-02T00:00:00Z"));
      orders.push(
        order(`w1_${i}`, id, "2024-01-02T00:00:00Z", [line("prod_weak", "Weak", 50)], {
          grossRevenue: 50,
          discounts: 20,
          refunds: 0,
        }),
      );
    }

    const result = calculateFirstProductCustomerQuality(customers, orders, [
      product("prod_strong", "Strong"),
      product("prod_weak", "Weak"),
    ]);

    const strongRow = result.rows.find((r) => r.productId === "prod_strong");
    const weakRow = result.rows.find((r) => r.productId === "prod_weak");
    assert.ok(strongRow);
    assert.ok(weakRow);
    assert.equal(strongRow.qualitySignal, "strong");
    assert.equal(weakRow.qualitySignal, "weak");
    assert.equal(result.productCount, 2);
    assert.equal(result.groupsWithEnoughCustomers, 2);
    assert.equal(result.strongestProduct, "prod_strong");
    assert.equal(result.weakestProduct, "prod_weak");
  });

  it("populates summary fields when enough data exists", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < 6; i++) {
      const id = `c_${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00Z"));
      orders.push(order(`o_${i}`, id, "2024-01-01T00:00:00Z", [line("prod_x", "X", 80)]));
    }
    const result = calculateFirstProductCustomerQuality(customers, orders, [product("prod_x", "X")]);
    assert.equal(result.productCount, 1);
    assert.equal(result.groupsWithEnoughCustomers, 1);
    assert.equal(result.strongestProduct, "prod_x");
    assert.equal(result.weakestProduct, "prod_x");
  });
});

describe("calculateFirstProductCustomerQualityFromDataset", () => {
  it("runs demo smoke without brittle product assertions", () => {
    const dataset = buildDemoRetentionOSDataset();
    const result = calculateFirstProductCustomerQualityFromDataset(dataset);
    assert.ok(result.rows.length > 0);
    assert.ok(result.productCount > 0);
    assert.ok(result.totalCustomers > 0);
    assert.equal(result.hasLineItemCoverage, true);
    assertRatesInUnitInterval(result);
  });
});
