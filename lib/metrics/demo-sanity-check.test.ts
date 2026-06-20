import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runDemoMetricSanityCheck } from "./demo-sanity-check";

describe("runDemoMetricSanityCheck", () => {
  it("passes structural and narrative guardrails on the canonical demo fixture", () => {
    const result = runDemoMetricSanityCheck();

    assert.equal(result.warnings.length, 0, result.warnings.join("; "));
    assert.ok(result.customerCount >= 2800 && result.customerCount <= 3200);
    assert.ok(result.orderCount >= 3500 && result.orderCount <= 4500);
    assert.ok(result.productCount >= 6);
    assert.ok(result.cohortCount >= 30);
    assert.equal(result.firstCohort, "2023-07");
    assert.equal(result.lastCohort, "2026-05");
    assert.ok(result.totalRepeatPurchaseRate > 0 && result.totalRepeatPurchaseRate < 1);
    assert.ok(result.firstToSecondWithin90DaysRate > 0 && result.firstToSecondWithin90DaysRate < 1);
    assert.ok(result.latestAverageRevenueLTV != null && result.latestAverageRevenueLTV > 0);
    assert.ok(
      result.latestAverageContributionLTV != null &&
        result.latestAverageContributionLTV < (result.latestAverageRevenueLTV ?? 0),
    );
    assert.equal(result.ltvNonDecreasingByCohort, true);
  });
});
