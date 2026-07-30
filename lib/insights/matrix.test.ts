import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Insight } from "../types/insight";
import {
  MATRIX_SURFACES,
  selectSignalsForSurface,
  type MatrixSurfaceId,
} from "./matrix";

function signal(
  id: string,
  overrides: Partial<Insight> = {},
): Insight {
  return {
    id,
    severity: "info",
    title: id,
    evidence: `evidence:${id}`,
    metricRefs: ["repeat_purchase_rate"],
    observations: [{ value: 1, unit: "ratio" }],
    sufficiency: "sufficient",
    caveats: [],
    destination: { route: "/retention" },
    ...overrides,
  };
}

const ALL_SEVEN: readonly Insight[] = [
  signal("portfolio-repeat-depth"),
  signal("first-to-second-within-ninety-days", { severity: "critical" }),
  signal("retention-timing-interpretation", { severity: "warning" }),
  signal("cohort-ltv-dispersion"),
  signal("contribution-vs-net-revenue-ltv"),
  signal("recent-cohort-aligned-ltv-check", { sufficiency: "limited" }),
  signal("revenue-durability-snapshot", {
    severity: "critical",
    sufficiency: "limited",
    destination: { route: "/dashboard" },
  }),
];

describe("MATRIX_SURFACES", () => {
  it("contains exactly the six analytical placement surfaces", () => {
    assert.deepEqual([...MATRIX_SURFACES], [
      "dashboard",
      "cohorts",
      "retention",
      "ltv",
      "acquisition",
      "products",
    ]);
    assert.equal(MATRIX_SURFACES.includes("insights" as MatrixSurfaceId), false);
    assert.equal(MATRIX_SURFACES.includes("data" as MatrixSurfaceId), false);
  });
});

describe("selectSignalsForSurface eligibility", () => {
  it("dashboard returns only RDS when emitted", () => {
    const result = selectSignalsForSurface(ALL_SEVEN, "dashboard");
    assert.deepEqual(
      result.map((s) => s.id),
      ["revenue-durability-snapshot"],
    );
    assert.equal(result[0], ALL_SEVEN[6]);
  });

  it("retention returns only its approved three IDs", () => {
    assert.deepEqual(
      selectSignalsForSurface(ALL_SEVEN, "retention").map((s) => s.id),
      [
        "portfolio-repeat-depth",
        "first-to-second-within-ninety-days",
        "retention-timing-interpretation",
      ],
    );
  });

  it("ltv returns only its approved three IDs", () => {
    assert.deepEqual(
      selectSignalsForSurface(ALL_SEVEN, "ltv").map((s) => s.id),
      [
        "cohort-ltv-dispersion",
        "contribution-vs-net-revenue-ltv",
        "recent-cohort-aligned-ltv-check",
      ],
    );
  });

  it("acquisition, products, and cohorts return empty arrays", () => {
    assert.deepEqual(selectSignalsForSurface(ALL_SEVEN, "acquisition"), []);
    assert.deepEqual(selectSignalsForSurface(ALL_SEVEN, "products"), []);
    assert.deepEqual(selectSignalsForSurface(ALL_SEVEN, "cohorts"), []);
  });
});

describe("selectSignalsForSurface conditional absence", () => {
  it("skips a registered Signal that was not emitted without filling", () => {
    const withoutRepeat = ALL_SEVEN.filter((s) => s.id !== "portfolio-repeat-depth");
    const result = selectSignalsForSurface(withoutRepeat, "retention");
    assert.deepEqual(
      result.map((s) => s.id),
      ["first-to-second-within-ninety-days", "retention-timing-interpretation"],
    );
  });

  it("returns empty when dashboard RDS is absent", () => {
    const withoutRds = ALL_SEVEN.filter((s) => s.id !== "revenue-durability-snapshot");
    assert.deepEqual(selectSignalsForSurface(withoutRds, "dashboard"), []);
  });
});

describe("selectSignalsForSurface ordering", () => {
  it("follows Matrix policy order even when input is reordered", () => {
    const shuffled = [
      ALL_SEVEN[2],
      ALL_SEVEN[0],
      ALL_SEVEN[1],
      ALL_SEVEN[6],
      ALL_SEVEN[5],
      ALL_SEVEN[3],
      ALL_SEVEN[4],
    ];
    assert.deepEqual(
      selectSignalsForSurface(shuffled, "retention").map((s) => s.id),
      [
        "portfolio-repeat-depth",
        "first-to-second-within-ninety-days",
        "retention-timing-interpretation",
      ],
    );
    assert.deepEqual(
      selectSignalsForSurface(shuffled, "ltv").map((s) => s.id),
      [
        "cohort-ltv-dispersion",
        "contribution-vs-net-revenue-ltv",
        "recent-cohort-aligned-ltv-check",
      ],
    );
  });

  it("does not severity-sort", () => {
    const criticalFirst = [
      signal("retention-timing-interpretation", { severity: "info" }),
      signal("portfolio-repeat-depth", { severity: "critical" }),
      signal("first-to-second-within-ninety-days", { severity: "warning" }),
    ];
    assert.deepEqual(
      selectSignalsForSurface(criticalFirst, "retention").map((s) => s.id),
      [
        "portfolio-repeat-depth",
        "first-to-second-within-ninety-days",
        "retention-timing-interpretation",
      ],
    );
  });
});

describe("selectSignalsForSurface sufficiency neutrality", () => {
  it("places eligible limited Signals without filtering or modifying sufficiency", () => {
    const limitedRds = signal("revenue-durability-snapshot", { sufficiency: "limited" });
    const limitedRecent = signal("recent-cohort-aligned-ltv-check", { sufficiency: "limited" });
    const dashboard = selectSignalsForSurface([limitedRds], "dashboard");
    const ltv = selectSignalsForSurface([limitedRecent], "ltv");
    assert.equal(dashboard.length, 1);
    assert.equal(dashboard[0]!.sufficiency, "limited");
    assert.equal(dashboard[0], limitedRds);
    assert.equal(ltv.length, 1);
    assert.equal(ltv[0]!.sufficiency, "limited");
    assert.equal(ltv[0], limitedRecent);
  });
});

describe("selectSignalsForSurface unknown future Signal", () => {
  it("omits unregistered IDs from analytical surfaces without mutating them", () => {
    const future = signal("future-channel-quality");
    const input = [...ALL_SEVEN, future];
    const frozenId = future.id;
    const frozenTitle = future.title;

    for (const surface of MATRIX_SURFACES) {
      const result = selectSignalsForSurface(input, surface);
      assert.equal(
        result.some((s) => s.id === "future-channel-quality"),
        false,
      );
    }

    assert.equal(future.id, frozenId);
    assert.equal(future.title, frozenTitle);
    assert.equal(input[input.length - 1], future);
  });
});

describe("selectSignalsForSurface integrity", () => {
  it("does not mutate the input array or Insight fields", () => {
    const input = [...ALL_SEVEN];
    const snapshot = input.map((s) => ({
      ...s,
      metricRefs: [...s.metricRefs],
      observations: [...s.observations],
      caveats: [...s.caveats],
    }));
    selectSignalsForSurface(input, "retention");
    assert.equal(input.length, snapshot.length);
    for (let i = 0; i < input.length; i++) {
      assert.equal(input[i]!.id, snapshot[i]!.id);
      assert.equal(input[i]!.severity, snapshot[i]!.severity);
      assert.equal(input[i]!.title, snapshot[i]!.title);
      assert.equal(input[i]!.evidence, snapshot[i]!.evidence);
      assert.equal(input[i]!.sufficiency, snapshot[i]!.sufficiency);
      assert.deepEqual([...input[i]!.metricRefs], snapshot[i]!.metricRefs);
    }
  });

  it("returns original Insight object references unchanged", () => {
    const result = selectSignalsForSurface(ALL_SEVEN, "ltv");
    assert.equal(result[0], ALL_SEVEN[3]);
    assert.equal(result[1], ALL_SEVEN[4]);
    assert.equal(result[2], ALL_SEVEN[5]);
  });

  it("does not invent acquisition, product, or cohort Signals", () => {
    assert.deepEqual(selectSignalsForSurface(ALL_SEVEN, "acquisition"), []);
    assert.deepEqual(selectSignalsForSurface(ALL_SEVEN, "products"), []);
    assert.deepEqual(selectSignalsForSurface(ALL_SEVEN, "cohorts"), []);
  });

  it("does not emit duplicate outputs for a surface", () => {
    const dupInput = [ALL_SEVEN[0]!, ALL_SEVEN[0]!, ALL_SEVEN[1]!];
    const result = selectSignalsForSurface(dupInput, "retention");
    assert.deepEqual(
      result.map((s) => s.id),
      ["portfolio-repeat-depth", "first-to-second-within-ninety-days"],
    );
  });
});

describe("selectSignalsForSurface invalid surface", () => {
  it("fail-closes with RangeError for an unknown surface", () => {
    assert.throws(
      () => selectSignalsForSurface(ALL_SEVEN, "insights" as MatrixSurfaceId),
      (err: unknown) =>
        err instanceof RangeError && /Unknown Matrix surface/.test(String(err)),
    );
  });
});
