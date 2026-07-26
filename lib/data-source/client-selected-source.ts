/**
 * Client-aware command-centre dataset selection (Sprint 3G+ / 5V-B).
 * Resolves pending/demo/uploaded/lost_upload using session payload + durable control.
 */

import {
  type ActiveSourceControlRecord,
  loadActiveSourceControl,
  parseActiveSourceControlLoad,
} from "./active-source-control";
import { loadUploadedRetentionOSDataset } from "./browser-session";
import { buildDemoRetentionOSDataset } from "./demo-source";
import {
  clearOrphanUploadedSessionWhenDemoControl,
  ensureDemoControlRecord,
  syncActiveSourceControlFromUploadedDataset,
} from "./dataset-lifecycle";
import type { RetentionOSDataset } from "./dataset-types";
import { applyUploadedSessionMarginAssumptions } from "./margin-session";
import { applyUploadedSessionMarketingSpend } from "./marketing-spend-session";

export type CommandCentreSourceStatus = "pending" | "demo" | "uploaded" | "lost_upload";

/** Resolved source for view models — status-aware; dataset null when metrics must not bind. */
export type CommandCentreDatasetSelection =
  | {
      readonly status: "pending";
      readonly dataset: null;
      readonly sourceType: null;
      readonly sourceLabel: string;
      readonly isUploaded: false;
      readonly isDemo: false;
      readonly control: null;
      readonly metricsAllowed: false;
    }
  | {
      readonly status: "demo";
      readonly dataset: RetentionOSDataset;
      readonly sourceType: "demo";
      readonly sourceLabel: string;
      readonly isUploaded: false;
      readonly isDemo: true;
      readonly control: ActiveSourceControlRecord | null;
      readonly metricsAllowed: true;
    }
  | {
      readonly status: "uploaded";
      readonly dataset: RetentionOSDataset;
      readonly sourceType: "uploaded_csv";
      readonly sourceLabel: string;
      readonly isUploaded: true;
      readonly isDemo: false;
      readonly control: ActiveSourceControlRecord | null;
      readonly metricsAllowed: true;
    }
  | {
      readonly status: "lost_upload";
      readonly dataset: null;
      readonly sourceType: "uploaded_csv";
      readonly sourceLabel: string;
      readonly isUploaded: true;
      readonly isDemo: false;
      readonly control: ActiveSourceControlRecord | null;
      readonly metricsAllowed: false;
    };

function enrichUploaded(dataset: RetentionOSDataset): RetentionOSDataset {
  return applyUploadedSessionMarketingSpend(applyUploadedSessionMarginAssumptions(dataset));
}

function selectionDemo(seed?: number, control: ActiveSourceControlRecord | null = null): CommandCentreDatasetSelection {
  const dataset = buildDemoRetentionOSDataset(seed);
  const m = dataset.meta;
  return {
    status: "demo",
    dataset,
    sourceType: "demo",
    sourceLabel: m.sourceLabel,
    isUploaded: false,
    isDemo: true,
    control,
    metricsAllowed: true,
  };
}

function selectionUploaded(
  dataset: RetentionOSDataset,
  control: ActiveSourceControlRecord | null,
): CommandCentreDatasetSelection {
  const enriched = enrichUploaded(dataset);
  const m = enriched.meta;
  return {
    status: "uploaded",
    dataset: enriched,
    sourceType: "uploaded_csv",
    sourceLabel: m.sourceLabel,
    isUploaded: true,
    isDemo: false,
    control,
    metricsAllowed: true,
  };
}

function selectionLostUpload(
  control: ActiveSourceControlRecord | null,
  sourceLabel: string,
): CommandCentreDatasetSelection {
  return {
    status: "lost_upload",
    dataset: null,
    sourceType: "uploaded_csv",
    sourceLabel,
    isUploaded: true,
    isDemo: false,
    control,
    metricsAllowed: false,
  };
}

/** Neutral pending shell for first client paint — never binds demo metrics as commercial truth. */
export function buildPendingCommandCentreSelection(): CommandCentreDatasetSelection {
  return {
    status: "pending",
    dataset: null,
    sourceType: null,
    sourceLabel: "Loading dataset…",
    isUploaded: false,
    isDemo: false,
    control: null,
    metricsAllowed: false,
  };
}

/** Demo fixture only — stable for SSR when metrics are intentionally demo-backed. */
export function buildDemoCommandCentreSelection(seed?: number): CommandCentreDatasetSelection {
  return selectionDemo(seed, null);
}

/**
 * Pure precedence helper for tests — pass preloaded control parse + session dataset.
 * Does not perform storage side effects; callers apply backfill/clear via lifecycle.
 */
export function resolveCommandCentreSelectionFromState(
  controlLoad: ReturnType<typeof parseActiveSourceControlLoad>,
  sessionDataset: RetentionOSDataset | null,
  seed?: number,
): {
  readonly selection: CommandCentreDatasetSelection;
  readonly sideEffect:
    | "none"
    | "backfill_control"
    | "regenerate_control"
    | "clear_orphan_session"
    | "ensure_demo_control";
} {
  const hasSession = sessionDataset != null;

  if (controlLoad.kind === "missing") {
    if (hasSession) {
      return {
        selection: selectionUploaded(sessionDataset, null),
        sideEffect: "backfill_control",
      };
    }
    return { selection: selectionDemo(seed, null), sideEffect: "ensure_demo_control" };
  }

  if (controlLoad.kind === "corrupt") {
    if (hasSession) {
      return {
        selection: selectionUploaded(sessionDataset, null),
        sideEffect: "regenerate_control",
      };
    }
    if (controlLoad.uploadedIntentEstablished) {
      const label = controlLoad.partialLabel ?? "Uploaded dataset (session lost)";
      return {
        selection: selectionLostUpload(null, label),
        sideEffect: "none",
      };
    }
    return { selection: selectionDemo(seed, null), sideEffect: "ensure_demo_control" };
  }

  const record = controlLoad.record;

  if (record.activeSource === "demo") {
    if (hasSession) {
      return {
        selection: selectionDemo(seed, record),
        sideEffect: "clear_orphan_session",
      };
    }
    return { selection: selectionDemo(seed, record), sideEffect: "none" };
  }

  // activeSource === "uploaded"
  if (hasSession) {
    return {
      selection: selectionUploaded(sessionDataset, record),
      sideEffect: "none",
    };
  }

  return {
    selection: selectionLostUpload(record, record.sourceLabel ?? "Uploaded dataset (session lost)"),
    sideEffect: "none",
  };
}

/**
 * Browser: resolve using durable control + session upload with locked precedence.
 * Server / no `window`: always demo (sessionStorage unavailable).
 */
export function resolveCommandCentreDatasetSource(seed?: number): CommandCentreDatasetSelection {
  if (typeof window === "undefined") {
    return buildDemoCommandCentreSelection(seed);
  }

  const controlLoad = loadActiveSourceControl();
  const sessionDataset = loadUploadedRetentionOSDataset();
  const { selection, sideEffect } = resolveCommandCentreSelectionFromState(
    controlLoad,
    sessionDataset,
    seed,
  );

  if (sideEffect === "backfill_control" || sideEffect === "regenerate_control") {
    if (sessionDataset != null) {
      syncActiveSourceControlFromUploadedDataset(sessionDataset);
    }
  } else if (sideEffect === "clear_orphan_session") {
    clearOrphanUploadedSessionWhenDemoControl();
  } else if (sideEffect === "ensure_demo_control") {
    ensureDemoControlRecord();
  }

  return selection;
}

/** Map selection status to CommandCentrePageFrame source framing. */
export function frameSourceFromSelection(
  selection: CommandCentreDatasetSelection,
): "demo" | "uploaded_csv" | "pending" | "lost_upload" {
  if (selection.status === "uploaded") return "uploaded_csv";
  return selection.status;
}
