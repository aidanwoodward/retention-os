/**
 * Client-aware command-centre dataset selection (Sprint 3G+).
 * Uploaded CSV from `sessionStorage` when valid; otherwise canonical demo `RetentionOSDataset`.
 */

import type { RetentionOSDataset, RetentionOSSourceType } from "./dataset-types";
import { buildDemoRetentionOSDataset } from "./demo-source";
import { loadUploadedRetentionOSDataset } from "./browser-session";
import { applyUploadedSessionMarginAssumptions } from "./margin-session";
import { applyUploadedSessionMarketingSpend } from "./marketing-spend-session";

/** Resolved source for view models — mirrors key fields from `dataset.meta` for convenient UI binding. */
export interface CommandCentreDatasetSelection {
  readonly dataset: RetentionOSDataset;
  readonly sourceType: RetentionOSSourceType;
  readonly sourceLabel: string;
  readonly isUploaded: boolean;
  readonly isDemo: boolean;
}

function selectionFromDataset(dataset: RetentionOSDataset): CommandCentreDatasetSelection {
  const m = dataset.meta;
  return {
    dataset,
    sourceType: m.sourceType,
    sourceLabel: m.sourceLabel,
    isUploaded: m.isUploaded,
    isDemo: m.isDemo,
  };
}

/** Demo fixture only — stable for SSR and initial client paint. */
export function buildDemoCommandCentreSelection(seed?: number): CommandCentreDatasetSelection {
  return selectionFromDataset(buildDemoRetentionOSDataset(seed));
}

/**
 * Browser: session upload when present and parseable; otherwise demo.
 * Server / no `window`: always demo (sessionStorage unavailable).
 */
export function resolveCommandCentreDatasetSource(seed?: number): CommandCentreDatasetSelection {
  if (typeof window === "undefined") {
    return buildDemoCommandCentreSelection(seed);
  }
  const uploaded = loadUploadedRetentionOSDataset();
  if (uploaded != null) {
    return selectionFromDataset(
      applyUploadedSessionMarketingSpend(applyUploadedSessionMarginAssumptions(uploaded)),
    );
  }
  return buildDemoCommandCentreSelection(seed);
}
