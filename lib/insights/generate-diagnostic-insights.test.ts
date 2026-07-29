import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDiagnosticInsightsBundle,
  finalizeInsights,
  generateDiagnosticInsights,
  generateDiagnosticInsightsFromMetrics,
} from "./generate-diagnostic-insights";
import { CONTRACTED_METRIC_IDS } from "../metrics/metric-contract-index";
import { evaluateRevenueDurabilityStatus } from "./rules";
import type { Insight } from "../types/insight";
import type { Customer } from "../types";
import type { Order } from "../types/order";
import type { DiagnosticInsightsInput } from "./context";

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

function baseInput(overrides: Partial<DiagnosticInsightsInput> = {}): DiagnosticInsightsInput {
  return {
    cohortCount: 4,
    totalCustomers: 100,
    repeatCustomers: 40,
    repeatPurchaseRate: 0.4,
    firstToSecondWithin90DaysRate: 0.35,
    averageDaysToSecondOrderAmongRepeaters: 28,
    firstToSecondMedianDaysAmongRepeaters: 25,
    retentionAverages: { m1: 0.1, m2: 0.11, m3: 0.12 },
    bestTerminalNetRevenueLtvCohort: { cohortPeriod: "2024-01", terminalNetRevenueLtv: 120 },
    weakestTerminalNetRevenueLtvCohort: { cohortPeriod: "2024-02", terminalNetRevenueLtv: 40 },
    terminalNetRevenueSpreadUsd: 80,
    avgTerminalNetRevenueLtvAcrossCohorts: 80,
    avgTerminalContributionLtvAcrossCohorts: 50,
    ...overrides,
  };
}

const REGISTRY_ORDER = [
  "portfolio-repeat-depth",
  "first-to-second-within-ninety-days",
  "retention-timing-interpretation",
  "cohort-ltv-dispersion",
  "contribution-vs-net-revenue-ltv",
  "revenue-durability-snapshot",
] as const;

describe("buildDiagnosticInsightsBundle completed retention averages", () => {
  it("uses completed-only M+1/M+2/M+3 and suppresses partial offsets", () => {
    const customers: Customer[] = [
      { id: "d1", firstOrderAt: "2024-12-01T12:00:00.000Z" },
      { id: "d2", firstOrderAt: "2024-12-05T12:00:00.000Z" },
      { id: "j1", firstOrderAt: "2025-01-01T12:00:00.000Z" },
      { id: "j2", firstOrderAt: "2025-01-05T12:00:00.000Z" },
    ];
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
    assert.equal(bundle.retentionAverages.m2, null);
    assert.equal(bundle.retentionAverages.m3, null);
  });

  it("partial M+2 cannot create a false longer-cycle timing claim", () => {
    const customers: Customer[] = [
      { id: "a1", firstOrderAt: "2024-11-01T12:00:00.000Z" },
      { id: "a2", firstOrderAt: "2024-11-05T12:00:00.000Z" },
      { id: "b1", firstOrderAt: "2024-12-01T12:00:00.000Z" },
    ];
    const orders: Order[] = [
      order("o1", "a1", "2024-11-01T12:00:00.000Z"),
      order("o2", "a2", "2024-11-05T12:00:00.000Z"),
      order("o3", "b1", "2024-12-01T12:00:00.000Z"),
      order("o4", "a1", "2025-01-10T12:00:00.000Z"),
      order("o5", "a2", "2025-01-12T12:00:00.000Z"),
    ];

    const bundle = buildDiagnosticInsightsBundle(customers, orders);
    assert.equal(bundle.retentionAverages.m1, 0);
    assert.equal(bundle.retentionAverages.m2, null);

    const insights = generateDiagnosticInsights(bundle, null);
    const timing = insights.find((i) => i.id === "retention-timing-interpretation");
    assert.ok(timing);
    assert.doesNotMatch(timing!.evidence, /Month \+2 active rate/);
    assert.equal(timing!.observations.find((o) => o.value === 0)?.value, 0);
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

describe("finalizeInsights", () => {
  it("fails closed on duplicate ids", () => {
    const sample = generateDiagnosticInsights(baseInput(), null)[0]!;
    assert.throws(
      () => finalizeInsights([sample, { ...sample }]),
      (err: unknown) => err instanceof RangeError && /Duplicate canonical Insight\.id/.test(String(err)),
    );
  });

  it("preserves registry order and does not mutate the input array", () => {
    const a = generateDiagnosticInsights(baseInput(), null);
    const frozen = Object.freeze([...a]);
    const out = finalizeInsights(frozen);
    assert.deepEqual(
      out.map((i) => i.id),
      frozen.map((i) => i.id),
    );
    assert.notEqual(out, frozen);
  });
});

describe("generateDiagnosticInsights Signal contract", () => {
  it("emits stable ids and never uses title as identity", () => {
    const a = generateDiagnosticInsights(baseInput(), null);
    const b = generateDiagnosticInsights(baseInput(), null);
    assert.deepEqual(
      a.map((i) => i.id),
      b.map((i) => i.id),
    );
    for (const insight of a) {
      assert.notEqual(insight.id, insight.title);
      assert.match(insight.id, /^[a-z0-9-]+$/);
    }
  });

  it("preserves registry order; later critical does not sort ahead", () => {
    const watchInput = baseInput({
      repeatPurchaseRate: 0.1,
      firstToSecondWithin90DaysRate: 0.1,
      retentionAverages: { m1: 0.01, m2: 0.01, m3: 0.01 },
      terminalNetRevenueSpreadUsd: 80,
    });
    const insights = generateDiagnosticInsights(watchInput, null);
    const ids = insights.map((i) => i.id);
    const durability = insights.find((i) => i.id === "revenue-durability-snapshot");
    assert.ok(durability);
    assert.equal(durability!.severity, "critical");
    assert.ok(ids.indexOf("portfolio-repeat-depth") < ids.indexOf("revenue-durability-snapshot"));
    for (let i = 0; i < REGISTRY_ORDER.length; i++) {
      const expected = REGISTRY_ORDER[i]!;
      if (ids.includes(expected)) {
        const earlier = REGISTRY_ORDER.slice(0, i).filter((id) => ids.includes(id));
        for (const prior of earlier) {
          assert.ok(ids.indexOf(prior) < ids.indexOf(expected));
        }
      }
    }
  });

  it("suppresses repeat-depth and F2S when eligible population is empty", () => {
    const insights = generateDiagnosticInsights(
      baseInput({
        totalCustomers: 0,
        repeatCustomers: 0,
        repeatPurchaseRate: 0,
        firstToSecondWithin90DaysRate: 0,
      }),
      null,
    );
    assert.equal(
      insights.find((i) => i.id === "portfolio-repeat-depth"),
      undefined,
    );
    assert.equal(
      insights.find((i) => i.id === "first-to-second-within-ninety-days"),
      undefined,
    );
    assert.equal(
      insights.find((i) => i.id === "revenue-durability-snapshot"),
      undefined,
    );
  });

  it("retains genuine observed zero repeat rate when population exists", () => {
    const insights = generateDiagnosticInsights(
      baseInput({
        totalCustomers: 50,
        repeatCustomers: 0,
        repeatPurchaseRate: 0,
      }),
      null,
    );
    const repeat = insights.find((i) => i.id === "portfolio-repeat-depth");
    assert.ok(repeat);
    assert.equal(repeat!.observations[0]?.value, 0);
    assert.equal(repeat!.observations[0]?.eligibleCount, 50);
    assert.equal(repeat!.confidence, undefined);
  });

  it("suppresses retention timing when completed averages are all null", () => {
    const insights = generateDiagnosticInsights(
      baseInput({
        retentionAverages: { m1: null, m2: null, m3: null },
      }),
      null,
    );
    assert.equal(
      insights.find((i) => i.id === "retention-timing-interpretation"),
      undefined,
    );
  });

  it("treats completed retention zero as valid evidence", () => {
    const insights = generateDiagnosticInsights(
      baseInput({
        retentionAverages: { m1: 0, m2: 0, m3: 0 },
        firstToSecondWithin90DaysRate: 0.4,
      }),
      null,
    );
    const timing = insights.find((i) => i.id === "retention-timing-interpretation");
    assert.ok(timing);
    assert.equal(timing!.observations[0]?.value, 0);
  });

  it("uses only contracted metricRefs and never emits numeric confidence", () => {
    const contracted = new Set<string>(CONTRACTED_METRIC_IDS);
    assert.equal(CONTRACTED_METRIC_IDS.length, 22);
    const insights = generateDiagnosticInsights(baseInput(), null);
    for (const insight of insights) {
      assert.equal(insight.confidence, undefined);
      assert.ok(insight.sufficiency === "sufficient" || insight.sufficiency === "limited");
      assert.ok(Array.isArray(insight.observations));
      assert.ok(Array.isArray(insight.caveats));
      assert.ok(insight.destination.route.startsWith("/"));
      for (const ref of insight.metricRefs) {
        assert.ok(contracted.has(ref), `unexpected metricRef ${ref}`);
      }
    }
  });

  it("suppresses contribution Signal when contribution is missing", () => {
    const insights = generateDiagnosticInsights(
      baseInput({ avgTerminalContributionLtvAcrossCohorts: null }),
      null,
    );
    assert.equal(
      insights.find((i) => i.id === "contribution-vs-net-revenue-ltv"),
      undefined,
    );
  });

  it("carries contribution and net values in observations when present", () => {
    const insights = generateDiagnosticInsights(baseInput(), null);
    const contrib = insights.find((i) => i.id === "contribution-vs-net-revenue-ltv");
    assert.ok(contrib);
    assert.equal(contrib!.observations[0]?.value, 50);
    assert.equal(contrib!.observations[0]?.comparisonValue, 80);
  });

  it("suppresses cohort dispersion when spread evidence is absent", () => {
    const insights = generateDiagnosticInsights(
      baseInput({
        bestTerminalNetRevenueLtvCohort: null,
        weakestTerminalNetRevenueLtvCohort: null,
        terminalNetRevenueSpreadUsd: null,
      }),
      null,
    );
    assert.equal(
      insights.find((i) => i.id === "cohort-ltv-dispersion"),
      undefined,
    );
  });

  it("maps RDS posture severity without duplicating vote logic", () => {
    const healthy = evaluateRevenueDurabilityStatus({
      repeatPurchaseRate: 0.4,
      firstToSecond90Rate: 0.35,
      avgMonthPlus1ActiveRate: 0.1,
      spreadUsdLike: 10,
    });
    const mixed = evaluateRevenueDurabilityStatus({
      repeatPurchaseRate: 0.3,
      firstToSecond90Rate: 0.28,
      avgMonthPlus1ActiveRate: 0.08,
      spreadUsdLike: 40,
    });
    const watch = evaluateRevenueDurabilityStatus({
      repeatPurchaseRate: 0.1,
      firstToSecond90Rate: 0.1,
      avgMonthPlus1ActiveRate: 0.01,
      spreadUsdLike: 80,
    });
    assert.equal(healthy, "Healthy");
    assert.equal(mixed, "Mixed");
    assert.equal(watch, "Watch");

    const healthyInsight = generateDiagnosticInsights(
      baseInput({
        repeatPurchaseRate: 0.4,
        firstToSecondWithin90DaysRate: 0.35,
        retentionAverages: { m1: 0.1, m2: 0.1, m3: 0.1 },
        terminalNetRevenueSpreadUsd: 10,
        bestTerminalNetRevenueLtvCohort: { cohortPeriod: "2024-01", terminalNetRevenueLtv: 55 },
        weakestTerminalNetRevenueLtvCohort: { cohortPeriod: "2024-02", terminalNetRevenueLtv: 45 },
      }),
      null,
    ).find((i) => i.id === "revenue-durability-snapshot");
    assert.equal(healthyInsight?.severity, "info");
    assert.equal(healthyInsight?.observations[0]?.value, "Healthy");
    assert.equal(healthyInsight?.observations[0]?.unit, "posture");

    const watchInsight = generateDiagnosticInsights(
      baseInput({
        repeatPurchaseRate: 0.1,
        firstToSecondWithin90DaysRate: 0.1,
        retentionAverages: { m1: 0.01, m2: 0.01, m3: 0.01 },
        terminalNetRevenueSpreadUsd: 80,
      }),
      null,
    ).find((i) => i.id === "revenue-durability-snapshot");
    assert.equal(watchInsight?.severity, "critical");
    assert.equal(watchInsight?.observations[0]?.value, "Watch");
  });

  it("does not invent channel Signals", () => {
    const insights = generateDiagnosticInsights(baseInput(), null);
    for (const insight of insights) {
      assert.doesNotMatch(insight.id, /channel/i);
      for (const ref of insight.metricRefs) {
        assert.doesNotMatch(ref, /channel/i);
      }
    }
  });

  it("does not mutate input and is stable under customer/order reorder", () => {
    const customers: Customer[] = [
      { id: "c1", firstOrderAt: "2024-10-01T12:00:00.000Z" },
      { id: "c2", firstOrderAt: "2024-10-05T12:00:00.000Z" },
      { id: "c3", firstOrderAt: "2024-11-01T12:00:00.000Z" },
    ];
    const orders: Order[] = [
      order("o1", "c1", "2024-10-01T12:00:00.000Z"),
      order("o2", "c2", "2024-10-05T12:00:00.000Z"),
      order("o3", "c1", "2024-11-10T12:00:00.000Z"),
      order("o4", "c3", "2024-11-01T12:00:00.000Z"),
      order("o5", "c2", "2024-12-01T12:00:00.000Z"),
      order("o6", "c3", "2025-01-05T12:00:00.000Z"),
    ];
    const inputSnapshot = structuredClone(baseInput());
    generateDiagnosticInsights(inputSnapshot, null);
    assert.deepEqual(inputSnapshot, baseInput());

    const a = generateDiagnosticInsightsFromMetrics(customers, orders);
    const b = generateDiagnosticInsightsFromMetrics(
      [...customers].reverse(),
      [...orders].reverse(),
    );
    assert.deepEqual(
      a.map((i) => i.id),
      b.map((i) => i.id),
    );
  });

  it("demo and uploaded-shaped paths share the same generator contract surface", () => {
    const customers: Customer[] = [
      { id: "u1", firstOrderAt: "2024-09-01T00:00:00.000Z" },
      { id: "u2", firstOrderAt: "2024-09-15T00:00:00.000Z" },
    ];
    const orders: Order[] = [
      order("o1", "u1", "2024-09-01T00:00:00.000Z"),
      order("o2", "u2", "2024-09-15T00:00:00.000Z"),
      order("o3", "u1", "2024-10-20T00:00:00.000Z"),
    ];
    const fromMetrics = generateDiagnosticInsightsFromMetrics(customers, orders);
    const bundle = buildDiagnosticInsightsBundle(customers, orders);
    const { recentOffsetLtvComparison, ...input } = bundle;
    const fromBundle = generateDiagnosticInsights(input, recentOffsetLtvComparison);
    assert.deepEqual(
      fromMetrics.map((i) => i.id),
      fromBundle.map((i) => i.id),
    );
    for (const insight of fromMetrics) {
      assertContractShape(insight);
    }
  });
});

function assertContractShape(insight: Insight): void {
  assert.equal(typeof insight.id, "string");
  assert.ok(["info", "warning", "critical"].includes(insight.severity));
  assert.ok(insight.sufficiency === "sufficient" || insight.sufficiency === "limited");
  assert.equal(insight.confidence, undefined);
  assert.ok(insight.destination.route.length > 0);
  assert.ok(insight.metricRefs.length > 0);
}
