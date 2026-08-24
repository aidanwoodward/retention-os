import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMvpContainmentRedirect } from "./demo-surface-guard";

describe("getMvpContainmentRedirect", () => {
  it("allows the eight-route analytical spine", () => {
    for (const path of [
      "/dashboard",
      "/cohorts",
      "/retention",
      "/ltv",
      "/acquisition",
      "/products",
      "/insights",
      "/data",
    ]) {
      assert.equal(getMvpContainmentRedirect(path), null, path);
    }
  });

  it("allows /settings only", () => {
    assert.equal(getMvpContainmentRedirect("/settings"), null);
  });

  it("redirects orphan settings sub-routes to /settings", () => {
    assert.equal(getMvpContainmentRedirect("/settings/integrations"), "/settings");
    assert.equal(getMvpContainmentRedirect("/settings/feedback"), "/settings");
  });

  it("redirects legacy prototype routes to /dashboard", () => {
    for (const path of ["/integrations", "/sync", "/roadmap", "/scenarios", "/connect/shopify"]) {
      assert.equal(getMvpContainmentRedirect(path), "/dashboard", path);
    }
  });
});
