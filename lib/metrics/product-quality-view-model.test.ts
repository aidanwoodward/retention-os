import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order, OrderLineItem } from "../types/order";
import type { Product } from "../types/product";
import {
  calculateFirstProductCustomerQuality,
  calculateFirstProductCustomerQualityFromDataset,
  MIN_CUSTOMERS_FOR_SIGNAL,
} from "./product-quality";
import {
  buildProductsPageViewModelFromDataset,
  ATTRIBUTION_COVERAGE_TRUST_COPY,
  CONTRIBUTION_LTV_TRUST_COPY,
  OVERALL_QUALITY_LEADER_METHODOLOGY_COPY,
} from "./product-quality-view-model";

function line(
  productId: string | undefined,
  title: string,
  lineTotal?: number,
  extras: Partial<OrderLineItem> = {},
): OrderLineItem {
  return {
    id: `li_${productId ?? title}`,
    productId,
    title,
    quantity: 1,
    unitPrice: lineTotal,
    lineTotal,
    ...extras,
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
    overrides.grossRevenue ?? lineItems.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0);
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

function dataset(
  customers: Customer[],
  orders: Order[],
  products: Product[] = [],
  overrides: Partial<RetentionOSDataset> = {},
): RetentionOSDataset {
  const lastOrderAt =
    orders.length > 0
      ? orders.reduce((latest, o) => (o.orderedAt > latest ? o.orderedAt : latest), orders[0]!.orderedAt)
      : undefined;
  return {
    customers,
    orders,
    products,
    meta: {
      sourceType: "demo",
      sourceLabel: "product-quality-vm-test",
      isDemo: true,
      isUploaded: false,
      customerCount: customers.length,
      orderCount: orders.length,
      productCount: products.length,
      lineItemCount: orders.reduce((n, o) => n + o.lineItems.length, 0),
      lastOrderAt,
    },
    ...overrides,
  };
}

describe("buildProductsPageViewModelFromDataset", () => {
  it("A: attribution coverage populations reconcile to totalCustomers", () => {
    const customers = [
      customer("c_single", "2024-01-01T00:00:00.000Z"),
      customer("c_multi", "2024-01-02T00:00:00.000Z"),
      customer("c_unknown", "2024-01-03T00:00:00.000Z"),
    ];
    const orders = [
      order("o1", "c_single", "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 100)]),
      order("o2", "c_multi", "2024-01-02T00:00:00.000Z", [
        line("prod_a", "A", 30),
        line("prod_b", "B", 70),
      ]),
      order("o3", "c_unknown", "2024-01-03T00:00:00.000Z", [line(undefined, "No id", 50)]),
    ];
    const ds = dataset(customers, orders, [product("prod_a", "A"), product("prod_b", "B")]);
    const vm = buildProductsPageViewModelFromDataset(ds);
    const cov = vm.attributionCoverage;

    assert.equal(vm.summary.totalCustomers, 3);
    assert.equal(
      cov.singleProductCustomerCount + cov.multiProductCustomerCount + cov.unknownFirstProductCustomerCount,
      vm.summary.totalCustomers,
    );
    assert.equal(cov.singleProductShare + cov.multiProductShare + cov.unknownShare, 1);
  });

  it("B: multi-product residual increases multi count without a quality row", () => {
    const customers = [customer("c_multi", "2024-01-01T00:00:00.000Z")];
    const orders = [
      order("o1", "c_multi", "2024-01-01T00:00:00.000Z", [
        line("prod_a", "A", 40),
        line("prod_b", "B", 60),
      ]),
    ];
    const vm = buildProductsPageViewModelFromDataset(dataset(customers, orders));
    assert.equal(vm.attributionCoverage.multiProductCustomerCount, 1);
    assert.equal(vm.tableRows.length, 0);
  });

  it("C: unknown residual increases unknown count without a fake product row", () => {
    const customers = [customer("c_unknown", "2024-01-01T00:00:00.000Z")];
    const orders = [order("o1", "c_unknown", "2024-01-01T00:00:00.000Z", [line(undefined, "Gift", 50)])];
    const vm = buildProductsPageViewModelFromDataset(dataset(customers, orders));
    assert.equal(vm.attributionCoverage.unknownFirstProductCustomerCount, 1);
    assert.equal(vm.tableRows.length, 0);
  });

  it("classified unknown with line-item coverage — unknown residual without page lock", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `c_single_${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00.000Z"));
      orders.push(order(`o_single_${i}`, id, "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 100)]));
    }
    customers.push(customer("c_unknown", "2024-01-02T00:00:00.000Z"));
    orders.push(
      order("o_unknown", "c_unknown", "2024-01-02T00:00:00.000Z", [line(undefined, "Unresolved line", 50)]),
    );

    const vm = buildProductsPageViewModelFromDataset(
      dataset(customers, orders, [product("prod_a", "A")]),
    );

    assert.equal(vm.missingLineItemCoverage, false);
    assert.equal(vm.attributionCoverage.unknownFirstProductCustomerCount, 1);
    assert.equal(vm.attributionCoverage.singleProductCustomerCount, MIN_CUSTOMERS_FOR_SIGNAL);
    assert.equal(
      vm.attributionCoverage.singleProductCustomerCount +
        vm.attributionCoverage.multiProductCustomerCount +
        vm.attributionCoverage.unknownFirstProductCustomerCount,
      vm.summary.totalCustomers,
    );
    assert.equal(vm.tableRows.length, 1);
    assert.equal(vm.tableRows[0]!.productId, "prod_a");
    assert.equal(vm.tableRows[0]!.customerCount, MIN_CUSTOMERS_FOR_SIGNAL);
    assert.notEqual(vm.tableRows[0]!.qualitySignal, "insufficient_data");
    assert.ok(!vm.tableRows.some((row) => row.productTitle === "Unresolved line"));
  });

  it("all insufficient segments — executive leaders unavailable", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL - 1; i++) {
      const idA = `a${i}`;
      const idB = `b${i}`;
      customers.push(customer(idA, "2024-01-01T00:00:00.000Z"));
      customers.push(customer(idB, "2024-01-02T00:00:00.000Z"));
      orders.push(order(`oa${i}`, idA, "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 100)]));
      orders.push(order(`ob${i}`, idB, "2024-01-02T00:00:00.000Z", [line("prod_b", "B", 100)]));
    }
    const vm = buildProductsPageViewModelFromDataset(
      dataset(customers, orders, [product("prod_a", "A"), product("prod_b", "B")]),
    );

    assert.equal(vm.executive.hasSufficientSegments, false);
    assert.equal(vm.executive.overallQualityLeader.productId, null);
    assert.equal(vm.executive.highestRepeatRate.productId, null);
    assert.equal(vm.executive.highestRevenueLtv.productId, null);
    assert.equal(vm.summary.strongestProductId, null);
    assert.equal(vm.tableRows.length, 2);
    assert.ok(vm.tableRows.every((row) => row.qualitySignal === "insufficient_data"));
  });
  it("D: no product identifiers yields locked unavailable VM", () => {
    const customers = [customer("c1", "2024-01-01T00:00:00.000Z")];
    const orders = [
      {
        id: "o1",
        customerId: "c1",
        orderedAt: "2024-01-01T00:00:00.000Z",
        grossRevenue: 100,
        discounts: 0,
        refunds: 0,
        lineItems: [],
      },
    ];
    const vm = buildProductsPageViewModelFromDataset(dataset(customers, orders as Order[]));
    assert.equal(vm.missingLineItemCoverage, true);
    assert.equal(vm.tableRows.length, 0);
    assert.equal(vm.executive.hasSufficientSegments, false);
  });

  it("E: shareOfSnapshotCustomers equals customerCount / totalCustomers", () => {
    const customers = [
      customer("c1", "2024-01-01T00:00:00.000Z"),
      customer("c2", "2024-01-02T00:00:00.000Z"),
      customer("c3", "2024-01-03T00:00:00.000Z"),
      customer("c4", "2024-01-04T00:00:00.000Z"),
    ];
    const orders = [
      order("o1", "c1", "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 100)]),
      order("o2", "c2", "2024-01-02T00:00:00.000Z", [line("prod_a", "A", 100)]),
      order("o3", "c3", "2024-01-03T00:00:00.000Z", [line("prod_b", "B", 100)]),
      order("o4", "c4", "2024-01-04T00:00:00.000Z", [
        line("prod_a", "A", 30),
        line("prod_b", "B", 70),
      ]),
    ];
    const vm = buildProductsPageViewModelFromDataset(
      dataset(customers, orders, [product("prod_a", "A"), product("prod_b", "B")]),
    );
    const rowA = vm.tableRows.find((r) => r.productId === "prod_a");
    assert.ok(rowA);
    assert.equal(rowA.shareOfSnapshotCustomers, rowA.customerCount / vm.summary.totalCustomers);
    assert.equal(rowA.shareOfSnapshotCustomers, 2 / 4);
  });

  it("F: insufficient_data segments are excluded from all three executive cards", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL - 1; i++) {
      const id = `small_${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00.000Z"));
      orders.push(order(`o_small_${i}`, id, "2024-01-01T00:00:00.000Z", [line("prod_small", "Small", 100)]));
    }
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `big_${i}`;
      customers.push(customer(id, "2024-01-02T00:00:00.000Z"));
      orders.push(
        order(`o_big_${i}`, id, "2024-01-02T00:00:00.000Z", [line("prod_big", "Big", 100)]),
        order(`o_big2_${i}`, id, "2024-02-01T00:00:00.000Z", [line("prod_big", "Big", 50)]),
      );
    }
    const ds = dataset(customers, orders, [product("prod_small", "Small"), product("prod_big", "Big")]);
    const vm = buildProductsPageViewModelFromDataset(ds);
    const smallRow = vm.tableRows.find((r) => r.productId === "prod_small");
    assert.ok(smallRow);
    assert.equal(smallRow.qualitySignal, "insufficient_data");

    assert.equal(vm.executive.overallQualityLeader.productId, "prod_big");
    assert.equal(vm.executive.highestRepeatRate.productId, "prod_big");
    assert.equal(vm.executive.highestRevenueLtv.productId, "prod_big");
    assert.notEqual(vm.executive.overallQualityLeader.productId, "prod_small");
  });

  it("G: overall quality leader matches engine strongestProduct among sufficient segments", () => {
    const customers = [
      customer("c1", "2024-01-01T00:00:00.000Z"),
      customer("c2", "2024-01-02T00:00:00.000Z"),
    ];
    const orders = [
      order("o1", "c1", "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 100)]),
      order("o2", "c1", "2024-02-01T00:00:00.000Z", [line("prod_a", "A", 100)]),
      order("o3", "c2", "2024-01-02T00:00:00.000Z", [line("prod_a", "A", 100)]),
      order("o4", "c2", "2024-02-02T00:00:00.000Z", [line("prod_a", "A", 100)]),
    ];
    for (let i = 3; i <= MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `c${i}`;
      customers.push(customer(id, "2024-01-03T00:00:00.000Z"));
      orders.push(order(`o${i}a`, id, "2024-01-03T00:00:00.000Z", [line("prod_a", "A", 100)]));
      orders.push(order(`o${i}b`, id, "2024-02-03T00:00:00.000Z", [line("prod_a", "A", 100)]));
    }
    for (let i = 1; i <= MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `d${i}`;
      customers.push(customer(id, "2024-01-10T00:00:00.000Z"));
      orders.push(order(`od${i}`, id, "2024-01-10T00:00:00.000Z", [line("prod_b", "B", 50)]));
    }
    const ds = dataset(customers, orders, [product("prod_a", "A"), product("prod_b", "B")]);
    const engine = calculateFirstProductCustomerQualityFromDataset(ds);
    const vm = buildProductsPageViewModelFromDataset(ds);
    assert.equal(vm.executive.overallQualityLeader.productId, engine.strongestProduct);
    assert.equal(vm.summary.strongestProductId, engine.strongestProduct);
  });

  it("H: highest repeat uses deterministic productId tie-break", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `a${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00.000Z"));
      orders.push(
        order(`oa${i}1`, id, "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 100)]),
        order(`oa${i}2`, id, "2024-02-01T00:00:00.000Z", [line("prod_a", "A", 50)]),
      );
    }
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `b${i}`;
      customers.push(customer(id, "2024-01-02T00:00:00.000Z"));
      orders.push(
        order(`ob${i}1`, id, "2024-01-02T00:00:00.000Z", [line("prod_b", "B", 100)]),
        order(`ob${i}2`, id, "2024-02-02T00:00:00.000Z", [line("prod_b", "B", 50)]),
      );
    }
    const ds = dataset(customers, orders, [product("prod_a", "A"), product("prod_b", "B")]);
    const vm = buildProductsPageViewModelFromDataset(ds);
    assert.equal(vm.executive.highestRepeatRate.productId, "prod_a");
    assert.equal(vm.executive.highestRepeatRate.repeatPurchaseRate, 1);
  });

  it("I: highest Revenue LTV uses deterministic productId tie-break", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `a${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00.000Z"));
      orders.push(order(`oa${i}`, id, "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 200)]));
    }
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `b${i}`;
      customers.push(customer(id, "2024-01-02T00:00:00.000Z"));
      orders.push(order(`ob${i}`, id, "2024-01-02T00:00:00.000Z", [line("prod_b", "B", 200)]));
    }
    const ds = dataset(customers, orders, [product("prod_a", "A"), product("prod_b", "B")]);
    const vm = buildProductsPageViewModelFromDataset(ds);
    assert.equal(vm.executive.highestRevenueLtv.productId, "prod_a");
    assert.equal(vm.executive.highestRevenueLtv.avgRevenueLtv, 200);
  });

  it("J: conflicting leaders â€” rank leader, highest repeat, and highest Revenue LTV differ", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];

    for (let i = 0; i < 6; i++) {
      const id = `a${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00.000Z"));
      orders.push(order(`oa${i}1`, id, "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 400)]));
      if (i < 4) {
        orders.push(order(`oa${i}2`, id, "2024-02-01T00:00:00.000Z", [line("prod_a", "A", 0)]));
      }
    }

    for (let i = 0; i < 6; i++) {
      const id = `b${i}`;
      customers.push(customer(id, "2024-01-02T00:00:00.000Z"));
      orders.push(
        order(`ob${i}1`, id, "2024-01-02T00:00:00.000Z", [line("prod_b", "B", 80)]),
        order(`ob${i}2`, id, "2024-02-02T00:00:00.000Z", [line("prod_b", "B", 0)]),
      );
    }

    for (let i = 0; i < 6; i++) {
      const id = `c${i}`;
      customers.push(customer(id, "2024-01-03T00:00:00.000Z"));
      orders.push(order(`oc${i}`, id, "2024-01-03T00:00:00.000Z", [line("prod_c", "C", 900)]));
    }

    const ds = dataset(
      customers,
      orders,
      [product("prod_a", "A"), product("prod_b", "B"), product("prod_c", "C")],
    );
    const engine = calculateFirstProductCustomerQuality(ds.customers, ds.orders, ds.products);
    const vm = buildProductsPageViewModelFromDataset(ds);

    assert.equal(engine.strongestProduct, "prod_a");
    assert.equal(vm.executive.overallQualityLeader.productId, "prod_a");
    assert.equal(vm.executive.highestRepeatRate.productId, "prod_b");
    assert.equal(vm.executive.highestRevenueLtv.productId, "prod_c");
    assert.notEqual(vm.executive.overallQualityLeader.productId, vm.executive.highestRepeatRate.productId);
    assert.notEqual(vm.executive.overallQualityLeader.productId, vm.executive.highestRevenueLtv.productId);
    assert.notEqual(vm.executive.highestRepeatRate.productId, vm.executive.highestRevenueLtv.productId);
  });

  it("K: contribution missing keeps Revenue LTV available and Contribution null", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `c${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00.000Z"));
      orders.push(order(`o${i}`, id, "2024-01-01T00:00:00.000Z", [line("prod_a", "A", 120)]));
    }
    const vm = buildProductsPageViewModelFromDataset(
      dataset(customers, orders, [product("prod_a", "A")]),
    );
    assert.equal(vm.summary.hasContributionCoverage, false);
    const row = vm.tableRows[0];
    assert.ok(row);
    assert.equal(row.avgRevenueLtv, 120);
    assert.equal(row.avgContributionLtv, null);
  });

  it("L: empty dataset yields zero-state VM", () => {
    const vm = buildProductsPageViewModelFromDataset(dataset([], []));
    assert.equal(vm.summary.totalCustomers, 0);
    assert.equal(vm.tableRows.length, 0);
    assert.equal(vm.executive.hasSufficientSegments, false);
    assert.equal(vm.missingLineItemCoverage, true);
  });

  it("M: product title falls back to productId without catalogue metadata", () => {
    const customers: Customer[] = [];
    const orders: Order[] = [];
    for (let i = 0; i < MIN_CUSTOMERS_FOR_SIGNAL; i++) {
      const id = `c${i}`;
      customers.push(customer(id, "2024-01-01T00:00:00.000Z"));
      orders.push(order(`o${i}`, id, "2024-01-01T00:00:00.000Z", [line("prod_x", "Line title", 100)]));
    }
    const vm = buildProductsPageViewModelFromDataset(dataset(customers, orders, []));
    const row = vm.tableRows.find((r) => r.productId === "prod_x");
    assert.ok(row);
    assert.equal(row.productTitle, "prod_x");
  });

  it("exports locked trust copy constants", () => {
    assert.ok(ATTRIBUTION_COVERAGE_TRUST_COPY.includes("single-product"));
    assert.ok(CONTRIBUTION_LTV_TRUST_COPY.includes("margin assumption"));
    assert.ok(OVERALL_QUALITY_LEADER_METHODOLOGY_COPY.includes("90-day"));
  });
});
