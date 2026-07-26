/**
 * Central dataset lifecycle coordinator (Sprint 5V-B).
 * All activate / replace / refresh / delete / use-demo transitions go through here.
 */

import {
  buildControlFromUploadedDataset,
  buildDemoActiveSourceControl,
  resetActiveSourceControlToDemo,
  saveActiveSourceControl,
} from "./active-source-control";
import {
  clearUploadedRetentionOSDatasetBlobOnly,
  loadUploadedRetentionOSDataset,
  saveUploadedRetentionOSDataset,
} from "./browser-session";
import type { RetentionOSDataset } from "./dataset-types";
import { clearUploadedMarginAssumptions } from "./margin-session";
import { clearUploadedMarketingSpendAssumption } from "./marketing-spend-assumption-session";
import { clearUploadedMarketingSpend } from "./marketing-spend-session";

/** Clear every uploaded session overlay key. Never throws. */
export function clearAllUploadedSessionOverlays(): void {
  clearUploadedMarginAssumptions();
  clearUploadedMarketingSpend();
  clearUploadedMarketingSpendAssumption();
}

/** Clear session dataset blob + all overlays. Never throws. */
export function clearAllUploadedSessionState(): void {
  clearUploadedRetentionOSDatasetBlobOnly();
  clearAllUploadedSessionOverlays();
}

export type ActivateUploadedDatasetResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

/**
 * Activate or replace the uploaded session dataset (also used for CSV refresh).
 * Validates via saveUploadedRetentionOSDataset; on dataset write failure prior state is preserved.
 * On success: clears all overlays, writes durable uploaded control.
 */
export function activateOrReplaceUploadedDataset(dataset: RetentionOSDataset): ActivateUploadedDatasetResult {
  try {
    saveUploadedRetentionOSDataset(dataset);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save uploaded dataset.";
    return { ok: false, error: message };
  }

  clearAllUploadedSessionOverlays();

  try {
    saveActiveSourceControl(buildControlFromUploadedDataset(dataset));
  } catch {
    // Dataset is saved; resolver backfills control on next resolve.
  }

  return { ok: true };
}

/** Alias for validated CSV refresh (= replace). */
export function refreshUploadedDataset(dataset: RetentionOSDataset): ActivateUploadedDatasetResult {
  return activateOrReplaceUploadedDataset(dataset);
}

/**
 * Intentional delete / revert / use-demo: clear all session commercial state and reset control to demo.
 */
export function deleteUploadedDatasetAndUseDemo(): void {
  clearAllUploadedSessionState();
  resetActiveSourceControlToDemo();
}

/** Explicit use-demo (same as delete for MVP one-active-dataset model). */
export function useDemoDataset(): void {
  deleteUploadedDatasetAndUseDemo();
}

/** Backfill or regenerate durable control from a verified uploaded session dataset. */
export function syncActiveSourceControlFromUploadedDataset(dataset: RetentionOSDataset): void {
  try {
    saveActiveSourceControl(buildControlFromUploadedDataset(dataset));
  } catch {
    /* best-effort — next resolve may retry */
  }
}

/**
 * When durable intent is demo but an orphan session upload exists, clear orphans.
 * Demo wins explicitly.
 */
export function clearOrphanUploadedSessionWhenDemoControl(): void {
  const uploaded = loadUploadedRetentionOSDataset();
  if (uploaded == null) {
    clearAllUploadedSessionOverlays();
    return;
  }
  clearAllUploadedSessionState();
}

export function ensureDemoControlRecord(): void {
  try {
    saveActiveSourceControl(buildDemoActiveSourceControl());
  } catch {
    resetActiveSourceControlToDemo();
  }
}
