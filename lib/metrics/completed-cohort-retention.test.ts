import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { averageCompletedCohortRetentionAtOffset } from "./completed-cohort-retention";
import type { RetentionByCohortSeries } from "./retention";

function series(
  cohortPeriod: string,
  points: readonly { offset: number; retentionRate: number }[],
  cohortSize = 10,
): RetentionByCohortSeries {
  return {
    cohortPeriod,
    cohortKey: cohortPeriod,
    cohortSize,
    points: points.map((p) => ({
      cohortKey: cohortPeriod,
      offset: p.offset,
      retentionRate: p.retentionRate,
      activeCustomers: Math.round(p.retentionRate * cohortSize),
    })),
  };
}

describe("averageCompletedCohortRetentionAtOffset", () => {
  // Jan cohort: M+1 (Feb) complete when asOf >= 2025-03-01
  const AS_OF_COMPLETE_M1 = "2025-03-01T00:00:00.000Z";
  const AS_OF_PARTIAL_M1 = "2025-02-15T12:00:00.000Z";
  const AS_OF_UNAVAILABLE_M1 = "2025-01-31T12:00:00.000Z";

  it("includes completed requested offset", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 0.4 }])];
    assert.equal(averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1), 0.4);
  });

  it("includes completed zero", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 0 }])];
    assert.equal(averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1), 0);
  });

  it("excludes partial requested offset", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 0.9 }])];
    assert.equal(averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_PARTIAL_M1), null);
  });

  it("excludes unavailable requested offset", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 0.9 }])];
    assert.equal(averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_UNAVAILABLE_M1), null);
  });

  it("excludes missing point even when maturity would be complete", () => {
    const input = [series("2025-01", [{ offset: 0, retentionRate: 1 }])];
    assert.equal(averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1), null);
  });

  it("returns null when no completed cohorts", () => {
    const input = [
      series("2025-01", [{ offset: 1, retentionRate: 0.5 }]),
      series("2025-02", [{ offset: 1, retentionRate: 0.2 }]),
    ];
    assert.equal(averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_PARTIAL_M1), null);
  });

  it("averages only complete cohorts when mixed with partial", () => {
    // Dec M+1 (Jan) complete by mid-Feb; Jan M+1 (Feb) still partial at mid-Feb
    const input = [
      series("2024-12", [{ offset: 1, retentionRate: 0.5 }], 2),
      series("2025-01", [{ offset: 1, retentionRate: 0.1 }], 100),
    ];
    assert.equal(
      averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_PARTIAL_M1),
      0.5,
    );
  });

  it("uses unweighted mean across unequal cohort sizes", () => {
    const input = [
      series("2024-11", [{ offset: 1, retentionRate: 0.2 }], 1000),
      series("2024-12", [{ offset: 1, retentionRate: 0.8 }], 2),
    ];
    assert.equal(
      averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1),
      0.5,
    );
  });

  it("applies the same maturity rule at an arbitrary valid offset", () => {
    // Jan M+2 (Mar) complete at 2025-04-01
    const input = [series("2025-01", [{ offset: 2, retentionRate: 0.25 }])];
    assert.equal(
      averageCompletedCohortRetentionAtOffset(input, 2, "2025-04-01T00:00:00.000Z"),
      0.25,
    );
    assert.equal(
      averageCompletedCohortRetentionAtOffset(input, 2, "2025-03-15T12:00:00.000Z"),
      null,
    );
  });

  it("is deterministic under cohort series reorder", () => {
    const a = series("2024-11", [{ offset: 1, retentionRate: 0.2 }]);
    const b = series("2024-12", [{ offset: 1, retentionRate: 0.6 }]);
    const left = averageCompletedCohortRetentionAtOffset([a, b], 1, AS_OF_COMPLETE_M1);
    const right = averageCompletedCohortRetentionAtOffset([b, a], 1, AS_OF_COMPLETE_M1);
    assert.equal(left, right);
    assert.equal(left, 0.4);
  });

  it("is deterministic under point reorder within a series", () => {
    const forward = series("2025-01", [
      { offset: 0, retentionRate: 1 },
      { offset: 1, retentionRate: 0.3 },
    ]);
    const reverse = series("2025-01", [
      { offset: 1, retentionRate: 0.3 },
      { offset: 0, retentionRate: 1 },
    ]);
    assert.equal(
      averageCompletedCohortRetentionAtOffset([forward], 1, AS_OF_COMPLETE_M1),
      averageCompletedCohortRetentionAtOffset([reverse], 1, AS_OF_COMPLETE_M1),
    );
  });

  it("does not mutate inputs", () => {
    const input = [
      series("2025-01", [
        { offset: 0, retentionRate: 1 },
        { offset: 1, retentionRate: 0.4 },
      ]),
    ];
    const before = structuredClone(input);
    averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1);
    assert.deepEqual(input, before);
  });

  it("throws RangeError on duplicate cohort periods", () => {
    const input = [
      series("2025-01", [{ offset: 1, retentionRate: 0.4 }]),
      series("2025-01", [{ offset: 1, retentionRate: 0.2 }]),
    ];
    assert.throws(
      () => averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1),
      RangeError,
    );
  });

  it("throws RangeError on duplicate requested-offset points", () => {
    const dup: RetentionByCohortSeries = {
      cohortPeriod: "2025-01",
      cohortKey: "2025-01",
      cohortSize: 10,
      points: [
        { cohortKey: "2025-01", offset: 1, retentionRate: 0.4 },
        { cohortKey: "2025-01", offset: 1, retentionRate: 0.5 },
      ],
    };
    assert.throws(
      () => averageCompletedCohortRetentionAtOffset([dup], 1, AS_OF_COMPLETE_M1),
      RangeError,
    );
  });

  it("throws on non-finite completed retentionRate", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: Number.NaN }])];
    assert.throws(
      () => averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1),
      RangeError,
    );
  });

  it("throws on completed retentionRate below zero", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: -0.01 }])];
    assert.throws(
      () => averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1),
      RangeError,
    );
  });

  it("throws on completed retentionRate above one", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 1.01 }])];
    assert.throws(
      () => averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_COMPLETE_M1),
      RangeError,
    );
  });

  it("throws on negative offset", () => {
    assert.throws(
      () => averageCompletedCohortRetentionAtOffset([], -1, AS_OF_COMPLETE_M1),
      RangeError,
    );
  });

  it("throws on non-integer offset", () => {
    assert.throws(
      () => averageCompletedCohortRetentionAtOffset([], 1.5, AS_OF_COMPLETE_M1),
      RangeError,
    );
  });

  it("invalid asOfDate follows canonical validation", () => {
    assert.throws(
      () =>
        averageCompletedCohortRetentionAtOffset(
          [series("2025-01", [{ offset: 1, retentionRate: 0.4 }])],
          1,
          "2025-03-01T00:00:00Z",
        ),
      /canonical UTC ISO instant/,
    );
  });

  it("mid-month asOf keeps Month+1 partial", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 0.7 }])];
    assert.equal(averageCompletedCohortRetentionAtOffset(input, 1, AS_OF_PARTIAL_M1), null);
  });

  it("exact first instant after offset period makes Month+1 complete", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 0.7 }])];
    assert.equal(
      averageCompletedCohortRetentionAtOffset(input, 1, "2025-03-01T00:00:00.000Z"),
      0.7,
    );
  });

  it("exclusive asOf semantics match canonical maturity (just before month start remains partial)", () => {
    const input = [series("2025-01", [{ offset: 1, retentionRate: 0.7 }])];
    assert.equal(
      averageCompletedCohortRetentionAtOffset(input, 1, "2025-02-28T23:59:59.999Z"),
      null,
    );
  });
});
