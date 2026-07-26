/**
 * Sprint 5V-B — dataset lifecycle precedence and control-record parsing tests.
 * Pure resolve path (no browser storage I/O).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION,
  buildControlFromUploadedDataset,
  buildDemoActiveSourceControl,
  parseActiveSourceControlLoad,
} from "./active-source-control";
import { resolveCommandCentreSelectionFromState } from "./client-selected-source";
import { buildDemoRetentionOSDataset } from "./demo-source";
import type { RetentionOSDataset } from "./dataset-types";

function uploadedFixture(): RetentionOSDataset {
  const demo = buildDemoRetentionOSDataset(1);
  return {
    customers: demo.customers,
    orders: demo.orders,
    products: demo.products,
    meta: {
      sourceType: "uploaded_csv",
      sourceLabel: "Uploaded: fixture.csv",
      isDemo: false,
      isUploaded: true,
      importedAt: "2026-07-01T12:00:00.000Z",
      uploadFormat: "shopify_orders",
      customerCount: demo.customers.length,
      orderCount: demo.orders.length,
      productCount: demo.products.length,
      lineItemCount: demo.meta.lineItemCount,
      firstOrderAt: demo.meta.firstOrderAt,
      lastOrderAt: demo.meta.lastOrderAt,
      errorCount: 0,
      warningCount: 0,
    },
  };
}

describe("parseActiveSourceControlLoad", () => {
  it("returns missing for empty", () => {
    assert.equal(parseActiveSourceControlLoad(null).kind, "missing");
    assert.equal(parseActiveSourceControlLoad("").kind, "missing");
  });

  it("parses valid demo and uploaded records", () => {
    const demo = parseActiveSourceControlLoad(JSON.stringify(buildDemoActiveSourceControl()));
    assert.equal(demo.kind, "valid");
    if (demo.kind === "valid") assert.equal(demo.record.activeSource, "demo");

    const uploaded = parseActiveSourceControlLoad(
      JSON.stringify(buildControlFromUploadedDataset(uploadedFixture())),
    );
    assert.equal(uploaded.kind, "valid");
    if (uploaded.kind === "valid") {
      assert.equal(uploaded.record.activeSource, "uploaded");
      assert.equal(uploaded.record.schemaVersion, ACTIVE_SOURCE_CONTROL_SCHEMA_VERSION);
      assert.ok(uploaded.record.sourceLabel?.includes("fixture"));
    }
  });

  it("marks incompatible schema as corrupt with uploaded intent when readable", () => {
    const raw = JSON.stringify({
      schemaVersion: 99,
      activeSource: "uploaded",
      sourceLabel: "Old upload",
    });
    const r = parseActiveSourceControlLoad(raw);
    assert.equal(r.kind, "corrupt");
    if (r.kind === "corrupt") {
      assert.equal(r.uploadedIntentEstablished, true);
      assert.equal(r.partialLabel, "Old upload");
    }
  });

  it("marks garbage JSON as corrupt without uploaded intent", () => {
    const r = parseActiveSourceControlLoad("{not-json");
    assert.equal(r.kind, "corrupt");
    if (r.kind === "corrupt") assert.equal(r.uploadedIntentEstablished, false);
  });
});

describe("resolveCommandCentreSelectionFromState precedence", () => {
  const session = uploadedFixture();

  it("missing control + valid session → uploaded + backfill", () => {
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "missing" },
      session,
    );
    assert.equal(selection.status, "uploaded");
    assert.equal(selection.metricsAllowed, true);
    assert.equal(sideEffect, "backfill_control");
  });

  it("missing control + no session → demo", () => {
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "missing" },
      null,
    );
    assert.equal(selection.status, "demo");
    assert.equal(selection.metricsAllowed, true);
    assert.equal(sideEffect, "ensure_demo_control");
  });

  it("uploaded control + valid session → uploaded", () => {
    const control = buildControlFromUploadedDataset(session);
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "valid", record: control },
      session,
    );
    assert.equal(selection.status, "uploaded");
    assert.equal(sideEffect, "none");
  });

  it("uploaded control + missing session → lost_upload (no fixture metrics)", () => {
    const control = buildControlFromUploadedDataset(session);
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "valid", record: control },
      null,
    );
    assert.equal(selection.status, "lost_upload");
    assert.equal(selection.metricsAllowed, false);
    assert.equal(selection.dataset, null);
    assert.equal(sideEffect, "none");
  });

  it("corrupt control + valid session → uploaded + regenerate", () => {
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "corrupt", uploadedIntentEstablished: true, partialLabel: "x" },
      session,
    );
    assert.equal(selection.status, "uploaded");
    assert.equal(sideEffect, "regenerate_control");
  });

  it("corrupt control + no session + uploaded intent → lost_upload", () => {
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "corrupt", uploadedIntentEstablished: true, partialLabel: "Lost shop" },
      null,
    );
    assert.equal(selection.status, "lost_upload");
    assert.equal(selection.sourceLabel, "Lost shop");
    assert.equal(selection.metricsAllowed, false);
    assert.equal(sideEffect, "none");
  });

  it("corrupt control + no session + no uploaded intent → demo", () => {
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "corrupt", uploadedIntentEstablished: false },
      null,
    );
    assert.equal(selection.status, "demo");
    assert.equal(sideEffect, "ensure_demo_control");
  });

  it("demo control + orphan session → demo wins + clear orphan", () => {
    const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
      { kind: "valid", record: buildDemoActiveSourceControl() },
      session,
    );
    assert.equal(selection.status, "demo");
    assert.equal(selection.isDemo, true);
    assert.equal(sideEffect, "clear_orphan_session");
  });
});
