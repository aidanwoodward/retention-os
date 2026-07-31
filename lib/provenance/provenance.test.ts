import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getMetricContractIndexEntry } from "../metrics/metric-contract-index";
import { getMetricDefinition } from "../metrics/metric-definitions";
import { buildMetricProvenance, buildSignalProvenance } from "./build";
import type {
  MetricProvenanceInput,
  ProvenanceSourceIdentity,
  SignalProvenanceInput,
} from "./types";

const DEMO_SOURCE: ProvenanceSourceIdentity = {
  sourceType: "demo",
  sourceLabel: "Demo brand",
  isDemo: true,
  isUploaded: false,
};

const UPLOAD_SOURCE: ProvenanceSourceIdentity = {
  sourceType: "uploaded_csv",
  uploadFormat: "shopify_orders",
  sourceLabel: "Uploaded CSV",
  isDemo: false,
  isUploaded: true,
};

const BOUNDED_SCOPE = {
  reportingPeriod: {
    startDate: "2025-01-01T00:00:00.000Z",
    endDateExclusive: "2025-07-01T00:00:00.000Z",
  },
  asOfDate: "2025-06-30T23:59:59.999Z",
} as const;

const UNBOUNDED_SCOPE = {
  asOfDate: "2025-06-30T23:59:59.999Z",
} as const;

function baseMetricInput(
  overrides: Partial<MetricProvenanceInput> = {},
): MetricProvenanceInput {
  return {
    metricId: "repeat_purchase_rate",
    source: DEMO_SOURCE,
    reportingScope: BOUNDED_SCOPE,
    ...overrides,
  };
}

describe("buildMetricProvenance determinism", () => {
  it("returns identical provenance for identical inputs", () => {
    const input = baseMetricInput({
      population: { eligibleCustomerCount: 412 },
      assumptions: { contributionMarginPct: 0.62 },
      maturity: { status: "complete", completedOffsetsOnly: true },
    });
    const a = buildMetricProvenance(input);
    const b = buildMetricProvenance(input);
    assert.deepEqual(a, b);
  });
});

describe("buildMetricProvenance source identity", () => {
  it("passes through demo source identity", () => {
    const result = buildMetricProvenance(baseMetricInput({ source: DEMO_SOURCE }));
    assert.equal(result.source.sourceType, "demo");
    assert.equal(result.source.isDemo, true);
    assert.equal(result.source.isUploaded, false);
    assert.equal(result.source.uploadFormat, undefined);
    assert.equal(result.source.sourceLabel, "Demo brand");
  });

  it("passes through uploaded_csv source identity and uploadFormat", () => {
    const result = buildMetricProvenance(baseMetricInput({ source: UPLOAD_SOURCE }));
    assert.equal(result.source.sourceType, "uploaded_csv");
    assert.equal(result.source.uploadFormat, "shopify_orders");
    assert.equal(result.source.isDemo, false);
    assert.equal(result.source.isUploaded, true);
  });

  it("uses the same builder API for demo and upload", () => {
    const demo = buildMetricProvenance(baseMetricInput({ source: DEMO_SOURCE }));
    const upload = buildMetricProvenance(baseMetricInput({ source: UPLOAD_SOURCE }));
    assert.equal(demo.metricId, upload.metricId);
    assert.equal(demo.methodology.docAnchor, upload.methodology.docAnchor);
    assert.notEqual(demo.source.sourceType, upload.source.sourceType);
  });
});

describe("buildMetricProvenance reporting scope", () => {
  it("passes through bounded reporting period and asOfDate", () => {
    const result = buildMetricProvenance(baseMetricInput({ reportingScope: BOUNDED_SCOPE }));
    assert.deepEqual(result.reportingScope.reportingPeriod, BOUNDED_SCOPE.reportingPeriod);
    assert.equal(result.reportingScope.asOfDate, BOUNDED_SCOPE.asOfDate);
  });

  it("represents unbounded/all-history by omitting reportingPeriod", () => {
    const result = buildMetricProvenance(baseMetricInput({ reportingScope: UNBOUNDED_SCOPE }));
    assert.equal(result.reportingScope.reportingPeriod, undefined);
    assert.equal(result.reportingScope.asOfDate, UNBOUNDED_SCOPE.asOfDate);
  });
});

describe("buildMetricProvenance population", () => {
  it("preserves supplied trusted counts exactly", () => {
    const population = {
      eligibleCustomerCount: 412,
      reportingOrderCount: 900,
      identifiableReportingOrderCount: 850,
      guestReportingOrderCount: 50,
      metricEligibleCount: 412,
    };
    const result = buildMetricProvenance(baseMetricInput({ population }));
    assert.deepEqual(result.population, population);
  });

  it("omits missing population and never zero-fills", () => {
    const result = buildMetricProvenance(baseMetricInput());
    assert.equal(result.population, undefined);

    const partial = buildMetricProvenance(
      baseMetricInput({ population: { eligibleCustomerCount: 10 } }),
    );
    assert.deepEqual(partial.population, { eligibleCustomerCount: 10 });
    assert.equal(
      partial.population !== undefined && "reportingOrderCount" in partial.population,
      false,
    );
  });

  it("omits empty population objects with only undefined fields", () => {
    const result = buildMetricProvenance(
      baseMetricInput({
        population: {
          eligibleCustomerCount: undefined,
          reportingOrderCount: undefined,
        },
      }),
    );
    assert.equal(result.population, undefined);
  });
});

describe("buildMetricProvenance assumptions", () => {
  it("passes through canonical assumption values and source unchanged", () => {
    const assumptions = {
      contributionMarginPct: 0.62,
      netRevenueMultiplier: 1,
      marketingSpendPctOfNetRevenue: 0.2,
      marketingSpendSource: "assumption" as const,
    };
    const result = buildMetricProvenance(baseMetricInput({ assumptions }));
    assert.deepEqual(result.assumptions, assumptions);
  });

  it("does not default or derive missing assumption values", () => {
    const result = buildMetricProvenance(
      baseMetricInput({ assumptions: { contributionMarginPct: 0.42 } }),
    );
    assert.equal(result.assumptions?.contributionMarginPct, 0.42);
    assert.equal(result.assumptions?.marketingSpendPctOfNetRevenue, undefined);
    assert.equal(result.assumptions?.marketingSpendSource, undefined);
  });

  it("preserves zero assumption values without treating them as missing", () => {
    const result = buildMetricProvenance(
      baseMetricInput({ assumptions: { contributionMarginPct: 0 } }),
    );
    assert.equal(result.assumptions?.contributionMarginPct, 0);
  });
});

describe("buildMetricProvenance maturity", () => {
  it("passes through existing MaturityStatus unchanged", () => {
    const result = buildMetricProvenance(
      baseMetricInput({ maturity: { status: "partial", completedOffsetsOnly: true } }),
    );
    assert.equal(result.maturity?.status, "partial");
    assert.equal(result.maturity?.completedOffsetsOnly, true);
  });

  it("omits maturity when not supplied", () => {
    const result = buildMetricProvenance(baseMetricInput());
    assert.equal(result.maturity, undefined);
  });
});

describe("buildMetricProvenance methodology", () => {
  it("uses contracted metric id and matching docAnchor from contract index", () => {
    const result = buildMetricProvenance(baseMetricInput({ metricId: "repeat_purchase_rate" }));
    const index = getMetricContractIndexEntry("repeat_purchase_rate");
    assert.equal(result.metricId, "repeat_purchase_rate");
    assert.equal(result.methodology.metricId, "repeat_purchase_rate");
    assert.equal(result.methodology.docAnchor, index.docAnchor);
    assert.match(result.methodology.docAnchor, /METRIC_CONTRACTS\.md#/);
  });

  it("takes short methodology copy only from canonical metric definitions", () => {
    const result = buildMetricProvenance(
      baseMetricInput({ metricId: "first_to_second_conversion" }),
    );
    const def = getMetricDefinition("first_to_second_conversion");
    assert.equal(result.methodology.meaning, def.meaning);
    assert.equal(result.methodology.retentionOsBasis, def.retentionOsBasis);
    assert.equal(result.methodology.caveat, def.caveat);
    assert.ok(result.caveats.includes(def.caveat!));
  });

  it("fails closed for non-contracted metric ids", () => {
    assert.throws(
      () => buildMetricProvenance(baseMetricInput({ metricId: "aov" })),
      (err: unknown) =>
        err instanceof RangeError && String(err.message).includes("Unknown contracted metric id"),
    );
    assert.throws(
      () => buildMetricProvenance(baseMetricInput({ metricId: "not_a_metric" })),
      RangeError,
    );
  });
});

describe("buildMetricProvenance integrity", () => {
  it("does not mutate input objects", () => {
    const population = { eligibleCustomerCount: 5 };
    const assumptions = { contributionMarginPct: 0.5 };
    const maturity = { status: "complete" as const };
    const source = { ...DEMO_SOURCE };
    const reportingScope = {
      reportingPeriod: { ...BOUNDED_SCOPE.reportingPeriod },
      asOfDate: BOUNDED_SCOPE.asOfDate,
    };
    const input: MetricProvenanceInput = {
      metricId: "repeat_purchase_rate",
      source,
      reportingScope,
      population,
      assumptions,
      maturity,
      caveats: ["extra"],
    };
    const sourceSnapshot = structuredClone(source);
    const scopeSnapshot = structuredClone(reportingScope);
    const populationSnapshot = structuredClone(population);
    const assumptionsSnapshot = structuredClone(assumptions);
    const maturitySnapshot = structuredClone(maturity);

    buildMetricProvenance(input);

    assert.deepEqual(source, sourceSnapshot);
    assert.deepEqual(reportingScope, scopeSnapshot);
    assert.deepEqual(population, populationSnapshot);
    assert.deepEqual(assumptions, assumptionsSnapshot);
    assert.deepEqual(maturity, maturitySnapshot);
  });

  it("does not expose Shopify-equivalence fields", () => {
    const result = buildMetricProvenance(baseMetricInput({ source: UPLOAD_SOURCE }));
    const json = JSON.stringify(result);
    assert.equal(json.includes("shopifyReconciliation"), false);
    assert.equal(json.includes("matchesShopify"), false);
    assert.equal(json.includes("formulaEquivalence"), false);
    assert.equal(result.source.sourceType, "uploaded_csv");
  });

  it("does not introduce a ProvenanceAvailability vocabulary", () => {
    const result = buildMetricProvenance(baseMetricInput());
    assert.equal("availability" in result, false);
    assert.equal(JSON.stringify(result).includes('"available"'), false);
  });
});

describe("buildSignalProvenance composition", () => {
  function signalInput(
    overrides: Partial<SignalProvenanceInput> = {},
  ): SignalProvenanceInput {
    return {
      signal: {
        id: "portfolio-repeat-depth",
        metricRefs: ["repeat_purchase_rate", "first_to_second_conversion"],
      },
      source: DEMO_SOURCE,
      reportingScope: BOUNDED_SCOPE,
      population: { eligibleCustomerCount: 100 },
      assumptions: { contributionMarginPct: 0.62 },
      ...overrides,
    };
  }

  it("composes metric provenance from signal.metricRefs", () => {
    const result = buildSignalProvenance(signalInput());
    assert.equal(result.signalId, "portfolio-repeat-depth");
    assert.equal(result.metrics.length, 2);
    assert.equal(result.metrics[0]?.metricId, "repeat_purchase_rate");
    assert.equal(result.metrics[1]?.metricId, "first_to_second_conversion");
    assert.equal(result.source.sourceType, "demo");
    assert.deepEqual(result.reportingScope.reportingPeriod, BOUNDED_SCOPE.reportingPeriod);
  });

  it("does not copy observations, sufficiency, or Signal caveats onto SignalProvenance", () => {
    const insightShaped = {
      id: "portfolio-repeat-depth",
      severity: "warning" as const,
      title: "Repeat depth is weakening",
      evidence: "evidence text",
      metricRefs: ["repeat_purchase_rate"] as const,
      observations: [{ value: 0.31, unit: "ratio" as const, eligibleCount: 412 }],
      sufficiency: "limited" as const,
      caveats: ["Signal-level caveat"],
      destination: { route: "/retention" },
    };

    const result = buildSignalProvenance({
      signal: insightShaped,
      source: DEMO_SOURCE,
      reportingScope: BOUNDED_SCOPE,
    });

    const keys = Object.keys(result).sort();
    assert.deepEqual(keys, ["metrics", "reportingScope", "signalId", "source"]);
    assert.equal("observations" in result, false);
    assert.equal("sufficiency" in result, false);
    assert.equal("caveats" in result, false);
    assert.equal("evidence" in result, false);
    assert.equal("destination" in result, false);
    assert.equal("severity" in result, false);
    assert.equal("title" in result, false);
  });

  it("does not mutate the Insight-shaped signal object", () => {
    const signal = {
      id: "portfolio-repeat-depth",
      metricRefs: ["repeat_purchase_rate"] as string[],
      observations: [{ value: 1, unit: "ratio" as const }],
      sufficiency: "sufficient" as const,
      caveats: ["keep me"],
    };
    const before = structuredClone(signal);
    buildSignalProvenance({
      signal,
      source: DEMO_SOURCE,
      reportingScope: UNBOUNDED_SCOPE,
    });
    assert.deepEqual(signal, before);
  });

  it("fails closed when a signal metricRef is not contracted", () => {
    assert.throws(
      () =>
        buildSignalProvenance({
          signal: { id: "x", metricRefs: ["aov"] },
          source: DEMO_SOURCE,
          reportingScope: UNBOUNDED_SCOPE,
        }),
      RangeError,
    );
  });
});

describe("provenance module boundary", () => {
  it("does not import Matrix or call metric calculators", () => {
    const buildSource = fs.readFileSync("lib/provenance/build.ts", "utf8");
    assert.equal(buildSource.includes("matrix"), false);
    assert.equal(buildSource.includes("selectSignalsForSurface"), false);
    assert.equal(buildSource.includes("calculateRepeatPurchaseRate"), false);
    assert.equal(buildSource.includes("generateDiagnosticInsights"), false);
  });
});
