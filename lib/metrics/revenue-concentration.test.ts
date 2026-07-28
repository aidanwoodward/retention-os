/**
 * MET-CONCENTRATION — deterministic selected-period revenue concentration tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisSelection } from "../analysis-context/select";
import type { AnalysisSelection } from "../analysis-context/types";
import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { Customer } from "../types/customer";
import type { Order, OrderLineItem } from "../types/order";
import type { Product } from "../types/product";
import {
  ALLOCATION_EPSILON,
  allocateTrustedNetByProduct,
} from "./allocate-trusted-net-by-product";
import {
  calculateRevenueConcentration,
  type RevenueConcentrationResult,
} from "./revenue-concentration";
import { getMetricContractIndexEntry } from "./metric-contract-index";
import { netOrderRevenue } from "./utils";

const AS_OF = "2025-04-30T23:59:59.000Z";
const JAN_START = "2025-01-01T00:00:00.000Z";
const FEB_START = "2025-02-01T00:00:00.000Z";

function assertClose(actual: number, expected: number, label: string): void {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) < ALLOCATION_EPSILON,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

function line(opts: {
  id: string;
  productId?: string;
  variantId?: string;
  title?: string;
  quantity?: number;
  lineTotal?: number;
}): OrderLineItem {
  return {
    id: opts.id,
    productId: opts.productId,
    variantId: opts.variantId,
    title: opts.title,
    quantity: opts.quantity ?? 1,
    lineTotal: opts.lineTotal,
    unitPrice: opts.lineTotal,
  };
}

function order(
  id: string,
  customerId: string | null,
  orderedAt: string,
  financials: { gross: number; discounts?: number; refunds?: number },
  lineItems: OrderLineItem[],
): Order {
  return {
    id,
    customerId,
    orderedAt,
    grossRevenue: financials.gross,
    discounts: financials.discounts ?? 0,
    refunds: financials.refunds ?? 0,
    lineItems,
  };
}

function customer(id: string, firstOrderAt = "2025-01-05T12:00:00.000Z"): Customer {
  return { id, firstOrderAt };
}

function product(id: string, title: string, vendor?: string): Product {
  return { id, title, vendor };
}

function dataset(
  customers: readonly Customer[],
  orders: readonly Order[],
  products: readonly Product[] = [],
): RetentionOSDataset {
  return {
    customers,
    orders,
    products,
    meta: {
      sourceType: "demo",
      sourceLabel: "concentration-test",
      isDemo: true,
      isUploaded: false,
      customerCount: customers.length,
      orderCount: orders.length,
      productCount: products.length,
      lineItemCount: orders.reduce((n, o) => n + o.lineItems.length, 0),
    },
  };
}

function select(
  ds: RetentionOSDataset,
  opts?: {
    asOfDate?: string;
    reportingStart?: string;
    reportingEnd?: string;
    acquisitionPeriod?: { startDate: string; endDateExclusive: string };
    maturityHorizonMonths?: number;
  },
): AnalysisSelection {
  return buildAnalysisSelection(ds, {
    asOfDate: opts?.asOfDate ?? AS_OF,
    reportingPeriod: {
      startDate: opts?.reportingStart ?? JAN_START,
      endDateExclusive: opts?.reportingEnd ?? FEB_START,
    },
    acquisitionPeriod: opts?.acquisitionPeriod,
    maturityHorizonMonths: opts?.maturityHorizonMonths,
  });
}

function assertFiniteResult(result: RevenueConcentrationResult): void {
  assert.ok(Number.isFinite(result.totalReportingRevenue));
  for (const dim of [result.product, result.vendor, result.category]) {
    assert.ok(Number.isFinite(dim.attributedRevenue));
    assert.ok(Number.isFinite(dim.unattributedRevenue));
    if (dim.attributionCoverage != null) assert.ok(Number.isFinite(dim.attributionCoverage));
    for (const share of [
      dim.top1ShareOfAttributedRevenue,
      dim.top3ShareOfAttributedRevenue,
      dim.top5ShareOfAttributedRevenue,
    ]) {
      if (share != null) assert.ok(Number.isFinite(share));
    }
    for (const row of dim.rows) {
      assert.ok(Number.isFinite(row.revenue));
      if (row.shareOfAttributedRevenue != null) {
        assert.ok(Number.isFinite(row.shareOfAttributedRevenue));
      }
    }
  }
}

describe("allocateTrustedNetByProduct", () => {
  it("1: single-product order receives 100% of trusted net", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
      line({ id: "l1", productId: "p1", lineTotal: 100 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assertClose(a.orderNet, 100, "net");
    assertClose(a.byProductId.get("p1")!, 100, "p1");
    assertClose(a.unattributedRevenue, 0, "unattributed");
  });

  it("2: multi-product order allocated proportionally by lineTotal", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
      line({ id: "l1", productId: "p1", lineTotal: 60 }),
      line({ id: "l2", productId: "p2", lineTotal: 40 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assertClose(a.byProductId.get("p1")!, 60, "p1");
    assertClose(a.byProductId.get("p2")!, 40, "p2");
    assertClose(a.unattributedRevenue, 0, "unattributed");
  });

  it("3: order-level discounts reduce products proportionally", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100, discounts: 20 }, [
      line({ id: "l1", productId: "p1", lineTotal: 75 }),
      line({ id: "l2", productId: "p2", lineTotal: 25 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assertClose(a.orderNet, 80, "net");
    assertClose(a.byProductId.get("p1")!, 60, "p1");
    assertClose(a.byProductId.get("p2")!, 20, "p2");
  });

  it("4: order-level refunds reduce products proportionally", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100, refunds: 50 }, [
      line({ id: "l1", productId: "p1", lineTotal: 50 }),
      line({ id: "l2", productId: "p2", lineTotal: 50 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assertClose(a.orderNet, 50, "net");
    assertClose(a.byProductId.get("p1")!, 25, "p1");
    assertClose(a.byProductId.get("p2")!, 25, "p2");
  });

  it("5: multi-product allocation reconciles to order net", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 90, discounts: 10 }, [
      line({ id: "l1", productId: "p1", lineTotal: 30 }),
      line({ id: "l2", productId: "p2", lineTotal: 60 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    let sum = a.unattributedRevenue;
    for (const v of a.byProductId.values()) sum += v;
    assertClose(sum, a.orderNet, "reconcile");
  });

  it("6: full refund produces no positive product allocation", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40, refunds: 40 }, [
      line({ id: "l1", productId: "p1", lineTotal: 40 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assert.equal(a.orderNet, 0);
    assert.equal(a.byProductId.size, 0);
    assert.equal(a.unattributedRevenue, 0);
  });

  it("7/16: zero-net and zero lineTotal", () => {
    const zeroNet = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 0 }, [
      line({ id: "l1", productId: "p1", lineTotal: 0 }),
    ]);
    const a0 = allocateTrustedNetByProduct(zeroNet);
    assert.equal(a0.byProductId.size, 0);
    assert.equal(a0.unattributedRevenue, 0);

    const zeroLine = order("o2", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }, [
      line({ id: "l1", productId: "p1", lineTotal: 0 }),
      line({ id: "l2", productId: "p2", lineTotal: 50 }),
    ]);
    const a1 = allocateTrustedNetByProduct(zeroLine);
    assert.equal(a1.byProductId.has("p1"), false);
    assertClose(a1.byProductId.get("p2")!, 50, "p2 gets all");
  });

  it("8/9: same product across lines aggregates; qty does not duplicate rows", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 90 }, [
      line({ id: "l1", productId: "p1", quantity: 2, lineTotal: 60 }),
      line({ id: "l2", productId: "p1", quantity: 1, lineTotal: 30 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assert.equal(a.byProductId.size, 1);
    assertClose(a.byProductId.get("p1")!, 90, "aggregated");
  });

  it("12: missing productId becomes unattributed", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
      line({ id: "l1", productId: "p1", lineTotal: 40 }),
      line({ id: "l2", lineTotal: 60 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assertClose(a.byProductId.get("p1")!, 40, "p1");
    assertClose(a.unattributedRevenue, 60, "unattributed");
  });

  it("13: no usable line weight makes whole positive net unattributed", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }, [
      line({ id: "l1", productId: "p1" }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assert.equal(a.byProductId.size, 0);
    assertClose(a.unattributedRevenue, 80, "all unattributed");
  });

  it("14: negative lineTotal makes whole positive net unattributed", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
      line({ id: "l1", productId: "p1", lineTotal: 80 }),
      line({ id: "l2", productId: "p2", lineTotal: -5 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assert.equal(a.byProductId.size, 0);
    assertClose(a.unattributedRevenue, 100, "all unattributed");
  });

  it("15: non-finite lineTotal makes whole positive net unattributed", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
      line({ id: "l1", productId: "p1", lineTotal: 50 }),
      line({ id: "l2", productId: "p2", lineTotal: Number.NaN }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assert.equal(a.byProductId.size, 0);
    assertClose(a.unattributedRevenue, 100, "all unattributed");
  });

  it("17: malformed line cannot shift revenue onto another product", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
      line({ id: "l1", productId: "p1", lineTotal: 100 }),
      line({ id: "l2", productId: "p2", lineTotal: Number.POSITIVE_INFINITY }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assert.equal(a.byProductId.has("p1"), false);
    assertClose(a.unattributedRevenue, 100, "no transfer");
  });

  it("18: no materially negative unattributed revenue", () => {
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10, discounts: 1 }, [
      line({ id: "l1", productId: "p1", lineTotal: 3 }),
      line({ id: "l2", productId: "p2", lineTotal: 7 }),
    ]);
    const a = allocateTrustedNetByProduct(o);
    assert.ok(a.unattributedRevenue >= -ALLOCATION_EPSILON);
  });
});

describe("calculateRevenueConcentration — product identity and ranking", () => {
  it("21-22: productId grouping; title collisions do not merge", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 }, [
          line({ id: "l1", productId: "p1", title: "Same", lineTotal: 40 }),
        ]),
        order("o2", "c1", "2025-01-12T12:00:00.000Z", { gross: 60 }, [
          line({ id: "l2", productId: "p2", title: "Same", lineTotal: 60 }),
        ]),
      ],
      [product("p1", "Same"), product("p2", "Same")],
    );
    const result = calculateRevenueConcentration(select(ds));
    assert.equal(result.product.rows.length, 2);
    assert.equal(result.product.rows[0]!.key, "p2");
    assert.equal(result.product.rows[1]!.key, "p1");
  });

  it("23-24: variants aggregate by productId; variantId alone never creates a row", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
          line({
            id: "l1",
            productId: "prod",
            variantId: "v1",
            title: "A",
            lineTotal: 40,
          }),
          line({
            id: "l2",
            productId: "prod",
            variantId: "v2",
            title: "B",
            lineTotal: 60,
          }),
        ]),
      ],
      [product("prod", "Canonical")],
    );
    const result = calculateRevenueConcentration(select(ds));
    assert.equal(result.product.rows.length, 1);
    assert.equal(result.product.rows[0]!.key, "prod");
    assertClose(result.product.rows[0]!.revenue, 100, "aggregated");
    assert.ok(!result.product.rows.some((r) => r.key === "v1" || r.key === "v2"));
  });

  it("25: variant fallback without Product record is unattributed", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 70 }, [
          line({
            id: "l1",
            productId: "var_x",
            variantId: "var_x",
            title: "Fallback",
            lineTotal: 70,
          }),
        ]),
      ],
      [],
    );
    const result = calculateRevenueConcentration(select(ds));
    assert.equal(result.product.status, "unavailable");
    assert.equal(result.product.rows.length, 0);
    assertClose(result.product.unattributedRevenue, 70, "unattributed");
    assertClose(result.product.attributionCoverage!, 0, "coverage");
  });

  it("26: deleted product with genuine productId still attributes", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 55 }, [
          line({ id: "l1", productId: "gone", title: "Gone", lineTotal: 55 }),
        ]),
      ],
      [{ id: "gone", title: "Gone Product", isDeletedOrMissing: true }],
    );
    const result = calculateRevenueConcentration(select(ds));
    assert.equal(result.product.status, "available");
    assert.equal(result.product.rows[0]!.key, "gone");
    assert.equal(result.product.rows[0]!.label, "Gone Product");
  });

  it("27: duplicate Product.id throws RangeError", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10 }, [
          line({ id: "l1", productId: "p1", lineTotal: 10 }),
        ]),
      ],
      [product("p1", "A"), product("p1", "B")],
    );
    assert.throws(() => calculateRevenueConcentration(select(ds)), RangeError);
  });

  it("28-30: label precedence catalog > lex-min line title > Unknown product", () => {
    const withCatalog = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10 }, [
              line({ id: "l1", productId: "p1", title: "Line Z", lineTotal: 10 }),
            ]),
          ],
          [product("p1", "Catalog Title")],
        ),
      ),
    );
    assert.equal(withCatalog.product.rows[0]!.label, "Catalog Title");

    const lexMin = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 30 }, [
              line({ id: "l1", productId: "p1", title: "Zebra", lineTotal: 10 }),
              line({ id: "l2", productId: "p1", title: "Alpha", lineTotal: 20 }),
            ]),
          ],
          [],
        ),
      ),
    );
    assert.equal(lexMin.product.rows[0]!.label, "Alpha");

    const unknown = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10 }, [
              line({ id: "l1", productId: "p1", lineTotal: 10 }),
            ]),
          ],
          [],
        ),
      ),
    );
    assert.equal(unknown.product.rows[0]!.label, "Unknown product");
  });

  it("31-33: labels and ranking stable under reorder", () => {
    const productsA = [product("pa", "A"), product("pb", "B")];
    const productsB = [product("pb", "B"), product("pa", "A")];
    const ordersA = [
      order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 30 }, [
        line({ id: "l1", productId: "pa", lineTotal: 10 }),
        line({ id: "l2", productId: "pb", lineTotal: 20 }),
      ]),
      order("o2", "c1", "2025-01-11T12:00:00.000Z", { gross: 40 }, [
        line({ id: "l3", productId: "pa", lineTotal: 40 }),
      ]),
    ];
    const ordersB = [...ordersA].reverse().map((o) => ({
      ...o,
      lineItems: [...o.lineItems].reverse(),
    }));
    const r1 = calculateRevenueConcentration(
      select(dataset([customer("c1")], ordersA, productsA)),
    );
    const r2 = calculateRevenueConcentration(
      select(dataset([customer("c1")], ordersB, productsB)),
    );
    assert.deepEqual(
      r1.product.rows.map((r) => ({ key: r.key, label: r.label, revenue: r.revenue })),
      r2.product.rows.map((r) => ({ key: r.key, label: r.label, revenue: r.revenue })),
    );
  });

  it("32/34: ranking revenue desc then key asc; omit zero-revenue", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }, [
          line({ id: "l1", productId: "pb", lineTotal: 25 }),
          line({ id: "l2", productId: "pa", lineTotal: 25 }),
        ]),
        order("o2", "c1", "2025-01-11T12:00:00.000Z", { gross: 0, refunds: 0 }, [
          line({ id: "l3", productId: "pz", lineTotal: 0 }),
        ]),
      ],
      [product("pa", "A"), product("pb", "B"), product("pz", "Z")],
    );
    // o2 has gross 0 → net 0; no rows for pz
    const result = calculateRevenueConcentration(select(ds));
    assert.equal(result.product.rows.length, 2);
    assert.equal(result.product.rows[0]!.key, "pa");
    assert.equal(result.product.rows[1]!.key, "pb");
    assert.ok(!result.product.rows.some((r) => r.key === "pz"));
  });
});

describe("calculateRevenueConcentration — concentration and coverage", () => {
  it("35-40: top-N shares and invariants", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
          line({ id: "l1", productId: "p1", lineTotal: 50 }),
          line({ id: "l2", productId: "p2", lineTotal: 30 }),
          line({ id: "l3", productId: "p3", lineTotal: 20 }),
        ]),
      ],
      [product("p1", "1"), product("p2", "2"), product("p3", "3")],
    );
    const result = calculateRevenueConcentration(select(ds));
    assertClose(result.product.top1ShareOfAttributedRevenue!, 0.5, "top1");
    assertClose(result.product.top3ShareOfAttributedRevenue!, 1, "top3");
    assertClose(result.product.top5ShareOfAttributedRevenue!, 1, "top5 uses all");
    const shareSum = result.product.rows.reduce((s, r) => s + (r.shareOfAttributedRevenue ?? 0), 0);
    assertClose(shareSum, 1, "shares");
    assert.ok(
      result.product.top1ShareOfAttributedRevenue! <= result.product.top3ShareOfAttributedRevenue! &&
        result.product.top3ShareOfAttributedRevenue! <= result.product.top5ShareOfAttributedRevenue!,
    );
  });

  it("41-46: coverage, residuals, unattributed not ranked", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
          line({ id: "l1", productId: "p1", lineTotal: 40 }),
          line({ id: "l2", lineTotal: 60 }),
        ]),
      ],
      [product("p1", "P")],
    );
    const result = calculateRevenueConcentration(select(ds));
    assertClose(result.product.attributedRevenue, 40, "attributed");
    assertClose(result.product.unattributedRevenue, 60, "unattributed");
    assertClose(result.product.attributionCoverage!, 0.4, "coverage");
    assertClose(result.product.rows[0]!.shareOfAttributedRevenue!, 1, "share over attributed");
    assert.ok(!result.product.rows.some((r) => r.key === "unattributed"));
  });

  it("43-44: coverage 0 vs null", () => {
    const noAttr = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 25 }, [
              line({ id: "l1", lineTotal: 25 }),
            ]),
          ],
        ),
      ),
    );
    assertClose(noAttr.product.attributionCoverage!, 0, "coverage 0");

    const zeroNet = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10, refunds: 10 }, [
              line({ id: "l1", productId: "p1", lineTotal: 10 }),
            ]),
          ],
          [product("p1", "P")],
        ),
      ),
    );
    assert.equal(zeroNet.status, "available");
    assert.equal(zeroNet.product.attributionCoverage, null);
  });

  it("47-48: guest and unresolved customer orders included", () => {
    const ds = dataset(
      [customer("known")],
      [
        order("og", null, "2025-01-10T12:00:00.000Z", { gross: 30 }, [
          line({ id: "l1", productId: "p1", lineTotal: 30 }),
        ]),
        order("ou", "missing", "2025-01-11T12:00:00.000Z", { gross: 70 }, [
          line({ id: "l2", productId: "p1", lineTotal: 70 }),
        ]),
      ],
      [product("p1", "P")],
    );
    const result = calculateRevenueConcentration(select(ds));
    assertClose(result.totalReportingRevenue, 100, "total");
    assertClose(result.product.attributedRevenue, 100, "attributed");
  });
});

describe("calculateRevenueConcentration — vendor", () => {
  it("49-53: vendor normalisation, deterministic label, reorder stability", () => {
    const dsA = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 }, [
          line({ id: "l1", productId: "p1", lineTotal: 40 }),
        ]),
        order("o2", "c1", "2025-01-11T12:00:00.000Z", { gross: 60 }, [
          line({ id: "l2", productId: "p2", lineTotal: 60 }),
        ]),
      ],
      [product("p1", "A", "  Acme   Brand "), product("p2", "B", "acme brand")],
    );
    const dsB = dataset(
      [customer("c1")],
      [...dsA.orders].reverse(),
      [product("p2", "B", "acme brand"), product("p1", "A", "  Acme   Brand ")],
    );
    const r1 = calculateRevenueConcentration(select(dsA));
    const r2 = calculateRevenueConcentration(select(dsB));
    assert.equal(r1.vendor.status, "available");
    assert.equal(r1.vendor.rows.length, 1);
    assert.equal(r1.vendor.rows[0]!.key, "acme brand");
    assert.equal(r1.vendor.rows[0]!.label, "Acme   Brand");
    assertClose(r1.vendor.rows[0]!.revenue, 100, "vendor revenue");
    assert.deepEqual(
      r1.vendor.rows.map((r) => ({ key: r.key, label: r.label, revenue: r.revenue })),
      r2.vendor.rows.map((r) => ({ key: r.key, label: r.label, revenue: r.revenue })),
    );
  });

  it("54-56: blank vendor and missing Product are unattributed; keys separate", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
          line({ id: "l1", productId: "p1", lineTotal: 40 }),
          line({ id: "l2", productId: "p2", lineTotal: 30 }),
          line({ id: "l3", productId: "p3", lineTotal: 30 }),
        ]),
      ],
      [product("p1", "A", "VendorX"), product("p2", "B", "  "), product("p3", "C")],
    );
    // p3 has no vendor field; p2 blank; p1 VendorX. p3 not in... wait p3 is in catalog without vendor
    const result = calculateRevenueConcentration(select(ds));
    assert.equal(result.vendor.rows.length, 1);
    assert.equal(result.vendor.rows[0]!.key, "vendorx");
    assertClose(result.vendor.attributedRevenue, 40, "vendor attributed");
    assertClose(result.vendor.unattributedRevenue, 60, "vendor unattributed");
  });

  it("57-60: vendor shares, top-N, partial coverage, unavailable", () => {
    const partial = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100 }, [
              line({ id: "l1", productId: "p1", lineTotal: 70 }),
              line({ id: "l2", productId: "p2", lineTotal: 30 }),
            ]),
          ],
          [product("p1", "A", "V1"), product("p2", "B")],
        ),
      ),
    );
    assertClose(partial.vendor.attributionCoverage!, 0.7, "partial");
    assertClose(partial.vendor.top1ShareOfAttributedRevenue!, 1, "top1");

    const none = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }, [
              line({ id: "l1", productId: "p1", lineTotal: 50 }),
            ]),
          ],
          [product("p1", "A")],
        ),
      ),
    );
    assert.equal(none.vendor.status, "unavailable");
    assert.equal(none.vendor.rows.length, 0);
  });
});

describe("calculateRevenueConcentration — category", () => {
  it("62-66: category always unavailable; no invented taxonomy", () => {
    const withRevenue = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 40 }, [
              line({ id: "l1", productId: "p1", lineTotal: 40 }),
            ]),
          ],
          [product("p1", "A", "V")],
        ),
      ),
    );
    assert.equal(withRevenue.category.status, "unavailable");
    assert.equal(withRevenue.category.rows.length, 0);
    assert.equal(withRevenue.category.attributedRevenue, 0);
    assertClose(withRevenue.category.unattributedRevenue, 40, "cat unattributed");
    assertClose(withRevenue.category.attributionCoverage!, 0, "cat coverage 0");
    assert.equal(withRevenue.category.top1ShareOfAttributedRevenue, null);

    const zero = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10, refunds: 10 }, [
              line({ id: "l1", productId: "p1", lineTotal: 10 }),
            ]),
          ],
        ),
      ),
    );
    assert.equal(zero.category.attributionCoverage, null);
  });
});

describe("calculateRevenueConcentration — scope and stability", () => {
  it("67: missing reportingPeriod throws RangeError", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10 }, [
          line({ id: "l1", productId: "p1", lineTotal: 10 }),
        ]),
      ],
    );
    const base = buildAnalysisSelection(ds, { asOfDate: AS_OF });
    assert.throws(() => calculateRevenueConcentration(base), /reportingPeriod/);
  });

  it("68-70: acquisition, eligible, maturity ignored", () => {
    const ds = dataset(
      [customer("c1", "2024-06-01T12:00:00.000Z"), customer("c2", "2025-01-05T12:00:00.000Z")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 80 }, [
          line({ id: "l1", productId: "p1", lineTotal: 80 }),
        ]),
        order("o2", "c2", "2025-01-12T12:00:00.000Z", { gross: 20 }, [
          line({ id: "l2", productId: "p2", lineTotal: 20 }),
        ]),
      ],
      [product("p1", "A"), product("p2", "B")],
    );
    const plain = calculateRevenueConcentration(select(ds));
    const bounded = calculateRevenueConcentration(
      select(ds, {
        acquisitionPeriod: {
          startDate: "2025-01-01T00:00:00.000Z",
          endDateExclusive: "2025-02-01T00:00:00.000Z",
        },
        maturityHorizonMonths: 0,
      }),
    );
    assertClose(plain.totalReportingRevenue, bounded.totalReportingRevenue, "total");
    assert.deepEqual(
      plain.product.rows.map((r) => r.revenue),
      bounded.product.rows.map((r) => r.revenue),
    );
  });

  it("71-73: period end and asOf exclusion via AnalysisSelection", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }, [
          line({ id: "l1", productId: "p1", lineTotal: 50 }),
        ]),
        order("o_end", "c1", FEB_START, { gross: 99 }, [
          line({ id: "l2", productId: "p1", lineTotal: 99 }),
        ]),
      ],
      [product("p1", "P")],
    );
    const result = calculateRevenueConcentration(select(ds));
    assert.equal(result.reportingOrderCount, 1);
    assertClose(result.totalReportingRevenue, 50, "excludes end");

    const asOf = "2025-02-01T00:00:00.000Z";
    const ds2 = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-05T12:00:00.000Z", { gross: 50 }, [
          line({ id: "l1", productId: "p1", lineTotal: 50 }),
        ]),
        order("o_asof", "c1", asOf, { gross: 99 }, [
          line({ id: "l2", productId: "p1", lineTotal: 99 }),
        ]),
      ],
      [product("p1", "P")],
    );
    const r2 = calculateRevenueConcentration(select(ds2, { asOfDate: asOf, reportingEnd: asOf }));
    assert.equal(r2.reportingOrderCount, 1);
  });

  it("74: metric consumes reportingOrders without re-filtering", () => {
    const ds = dataset(
      [customer("c1")],
      [
        order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 50 }, [
          line({ id: "l1", productId: "p1", lineTotal: 50 }),
        ]),
      ],
      [product("p1", "P")],
    );
    const base = select(ds);
    const injected = order("o_extra", "c1", "2024-06-01T12:00:00.000Z", { gross: 200 }, [
      line({ id: "lx", productId: "p1", lineTotal: 200 }),
    ]);
    const patched: AnalysisSelection = {
      ...base,
      reportingOrders: [...base.reportingOrders, injected],
    };
    const result = calculateRevenueConcentration(patched);
    assert.equal(result.reportingOrderCount, 2);
    assertClose(result.totalReportingRevenue, 250, "injected counted");
  });

  it("76-77: inputs are not mutated", () => {
    const orders = [
      order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 10 }, [
        line({ id: "l1", productId: "p1", lineTotal: 10 }),
      ]),
    ];
    const products = [product("p1", "P")];
    const valid = dataset([customer("c1")], orders, products);
    const base = select(valid);
    const snapshot = JSON.stringify(base.reportingOrders);
    const result = calculateRevenueConcentration(base);
    assert.equal(result.status, "available");
    assert.equal(JSON.stringify(base.reportingOrders), snapshot);
  });

  it("empty and zero behaviours", () => {
    const empty = calculateRevenueConcentration(
      select(dataset([customer("c1")], [], [product("p1", "P")])),
    );
    assert.equal(empty.status, "empty");
    assert.equal(empty.product.status, "unavailable");
    assert.equal(empty.product.attributionCoverage, null);

    const zero = calculateRevenueConcentration(
      select(
        dataset(
          [customer("c1")],
          [
            order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 20, refunds: 20 }, [
              line({ id: "l1", productId: "p1", lineTotal: 20 }),
            ]),
          ],
          [product("p1", "P")],
        ),
      ),
    );
    assert.equal(zero.status, "available");
    assert.equal(zero.reportingOrderCount, 1);
    assert.equal(zero.product.rows.length, 0);
    assert.equal(zero.product.attributionCoverage, null);
    assertFiniteResult(zero);
  });

  it("80-82: contract wiring empty; no sibling imports required for smoke", () => {
    const entry = getMetricContractIndexEntry("revenue_concentration");
    assert.deepEqual(entry.viewModelBuilders, []);
    assert.deepEqual(entry.uiRoutes, []);
    assert.ok(
      entry.engineEntrypoints.some((e) => e.includes("calculateRevenueConcentration")),
    );
  });

  it("10: shipping/tax/duties not in netOrderRevenue path", () => {
    // Canonical Order has no shipping/tax fields — net is gross-discounts-refunds only.
    const o = order("o1", "c1", "2025-01-10T12:00:00.000Z", { gross: 100, discounts: 10 }, [
      line({ id: "l1", productId: "p1", lineTotal: 100 }),
    ]);
    assertClose(netOrderRevenue(o), 90, "net excludes non-fields");
    const a = allocateTrustedNetByProduct(o);
    assertClose(a.byProductId.get("p1")!, 90, "allocated net");
  });
});
