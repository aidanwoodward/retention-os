import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateRevenueDurabilityStatus,
  FIRST_TO_SECOND_90_HEALTHY,
  FIRST_TO_SECOND_90_WATCH,
  LTV_COHORT_SPREAD_MATERIAL_USD,
  MONTH_PLUS_1_ACTIVE_HEALTHY,
  MONTH_PLUS_1_ACTIVE_WATCH,
  REPEAT_PURCHASE_HEALTHY,
  REPEAT_PURCHASE_WATCH,
  type RevenueDurabilityStatusInputs,
} from "./revenue-durability-status";

const LTV_SPREAD_HEALTHY_BAND_USD = LTV_COHORT_SPREAD_MATERIAL_USD * 0.45;

function inputs(
  overrides: Partial<RevenueDurabilityStatusInputs> = {},
): RevenueDurabilityStatusInputs {
  return {
    repeatPurchaseRate: 0.3,
    firstToSecond90Rate: 0.25,
    avgMonthPlus1ActiveRate: null,
    spreadUsdLike: null,
    ...overrides,
  };
}

describe("evaluateRevenueDurabilityStatus", () => {
  it("returns Healthy for strong portfolio signals", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.4,
          firstToSecond90Rate: 0.35,
          avgMonthPlus1ActiveRate: 0.1,
          spreadUsdLike: 20,
        }),
      ),
      "Healthy",
    );
  });

  it("returns Watch for weak portfolio signals", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.2,
          firstToSecond90Rate: 0.15,
          avgMonthPlus1ActiveRate: 0.04,
          spreadUsdLike: 60,
        }),
      ),
      "Watch",
    );
  });

  it("returns Mixed when core metrics sit in the middle band with null optional inputs", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.3,
          firstToSecond90Rate: 0.25,
          avgMonthPlus1ActiveRate: null,
          spreadUsdLike: null,
        }),
      ),
      "Mixed",
    );
  });

  it("skips null LTV spread and still returns Healthy", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.4,
          firstToSecond90Rate: 0.35,
          avgMonthPlus1ActiveRate: 0.1,
          spreadUsdLike: null,
        }),
      ),
      "Healthy",
    );
  });

  it("skips null month+1 active rate and still returns Healthy", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.4,
          firstToSecond90Rate: 0.35,
          avgMonthPlus1ActiveRate: null,
          spreadUsdLike: 20,
        }),
      ),
      "Healthy",
    );
  });

  it("adds repeat watch votes just below the watch threshold", () => {
    const justBelow = REPEAT_PURCHASE_WATCH - 0.001;
    const atThreshold = REPEAT_PURCHASE_WATCH;

    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: justBelow,
          firstToSecond90Rate: 0.15,
        }),
      ),
      "Watch",
    );
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: atThreshold,
          firstToSecond90Rate: 0.15,
        }),
      ),
      "Mixed",
    );
  });

  it("adds a repeat healthy vote at the healthy threshold", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: REPEAT_PURCHASE_HEALTHY,
          firstToSecond90Rate: FIRST_TO_SECOND_90_HEALTHY,
        }),
      ),
      "Healthy",
    );
  });

  it("adds an LTV spread watch vote at the material boundary", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.2,
          firstToSecond90Rate: 0.15,
          avgMonthPlus1ActiveRate: 0.04,
          spreadUsdLike: LTV_COHORT_SPREAD_MATERIAL_USD,
        }),
      ),
      "Watch",
    );
  });

  it("adds an LTV spread healthy vote below the healthy band", () => {
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.4,
          firstToSecond90Rate: 0.35,
          avgMonthPlus1ActiveRate: 0.1,
          spreadUsdLike: LTV_SPREAD_HEALTHY_BAND_USD - 0.01,
        }),
      ),
      "Healthy",
    );
    assert.equal(
      evaluateRevenueDurabilityStatus(
        inputs({
          repeatPurchaseRate: 0.3,
          firstToSecond90Rate: 0.25,
          spreadUsdLike: LTV_SPREAD_HEALTHY_BAND_USD,
        }),
      ),
      "Mixed",
    );
  });
});

describe("revenue durability threshold constants", () => {
  it("matches the Sprint C MVP vote thresholds", () => {
    assert.equal(REPEAT_PURCHASE_WATCH, 0.28);
    assert.equal(REPEAT_PURCHASE_HEALTHY, 0.37);
    assert.equal(FIRST_TO_SECOND_90_WATCH, 0.24);
    assert.equal(FIRST_TO_SECOND_90_HEALTHY, 0.31);
    assert.equal(MONTH_PLUS_1_ACTIVE_WATCH, 0.065);
    assert.equal(MONTH_PLUS_1_ACTIVE_HEALTHY, 0.092);
    assert.equal(LTV_COHORT_SPREAD_MATERIAL_USD, 52);
    assert.equal(LTV_SPREAD_HEALTHY_BAND_USD, LTV_COHORT_SPREAD_MATERIAL_USD * 0.45);
  });
});
