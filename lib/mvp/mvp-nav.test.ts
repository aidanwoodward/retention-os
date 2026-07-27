import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MVP_NAV, type MvpNavItem } from "./cohesion";

/** Locked analytical spine — product SoT for 6A-NAV. */
const EXPECTED_SPINE: readonly MvpNavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "cohorts", href: "/cohorts", label: "Cohorts" },
  { id: "retention", href: "/retention", label: "Retention" },
  { id: "ltv", href: "/ltv", label: "LTV" },
  { id: "acquisition", href: "/acquisition", label: "Acquisition" },
  { id: "products", href: "/products", label: "Products" },
  { id: "insights", href: "/insights", label: "Insights" },
  { id: "data", href: "/data", label: "Data" },
];

describe("MVP_NAV analytical spine", () => {
  it("has exactly eight items in the locked id/href/label order", () => {
    assert.equal(MVP_NAV.length, 8);
    assert.deepEqual([...MVP_NAV], [...EXPECTED_SPINE]);
  });

  it("has unique route ids", () => {
    const ids = MVP_NAV.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("has unique hrefs", () => {
    const hrefs = MVP_NAV.map((item) => item.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("does not include Settings", () => {
    const ids = MVP_NAV.map((item) => item.id as string);
    const hrefs = MVP_NAV.map((item) => item.href as string);
    const labels = MVP_NAV.map((item) => item.label);
    assert.equal(ids.includes("settings"), false);
    assert.equal(hrefs.includes("/settings"), false);
    assert.equal(labels.includes("Settings"), false);
  });

  it("does not include Scenarios", () => {
    const ids = MVP_NAV.map((item) => item.id as string);
    const hrefs = MVP_NAV.map((item) => item.href as string);
    const labels = MVP_NAV.map((item) => item.label);
    assert.equal(ids.includes("scenarios"), false);
    assert.equal(hrefs.includes("/scenarios"), false);
    assert.equal(labels.includes("Scenarios"), false);
  });
});
