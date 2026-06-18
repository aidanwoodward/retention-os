import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateUploadedMarketingSpendAssumptions } from "./marketing-spend-assumption-session";

describe("validateUploadedMarketingSpendAssumptions", () => {
  it("accepts 0–1 fractions", () => {
    assert.deepEqual(validateUploadedMarketingSpendAssumptions({ marketingSpendPctOfNetRevenue: 0 }), {
      marketingSpendPctOfNetRevenue: 0,
    });
    assert.deepEqual(validateUploadedMarketingSpendAssumptions({ marketingSpendPctOfNetRevenue: 0.2 }), {
      marketingSpendPctOfNetRevenue: 0.2,
    });
    assert.deepEqual(validateUploadedMarketingSpendAssumptions({ marketingSpendPctOfNetRevenue: 1 }), {
      marketingSpendPctOfNetRevenue: 1,
    });
  });

  it("rejects invalid percentages", () => {
    assert.equal(validateUploadedMarketingSpendAssumptions(null), null);
    assert.equal(validateUploadedMarketingSpendAssumptions({ marketingSpendPctOfNetRevenue: -0.1 }), null);
    assert.equal(validateUploadedMarketingSpendAssumptions({ marketingSpendPctOfNetRevenue: 1.01 }), null);
    assert.equal(validateUploadedMarketingSpendAssumptions({ marketingSpendPctOfNetRevenue: Number.NaN }), null);
  });
});
