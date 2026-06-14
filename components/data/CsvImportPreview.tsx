"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildImportedRetentionOSDataset,
  clearUploadedRetentionOSDataset,
  getUploadedDatasetSessionSummary,
  getUploadedMarginAssumptionsSummary,
  getUploadedMarketingSpendSessionSummary,
  saveUploadedRetentionOSDataset,
  type RetentionOSDatasetSummary,
} from "@/lib/data-source";
import {
  buildImportReviewViewModel,
  importOrdersCsvFromText,
  ordersCsvFormatLabel,
  type CombineOrderCsvImportResult,
  type ImportReviewViewModel,
  type OrdersCsvImportFormat,
} from "@/lib/import";
import { ImportedDatasetReviewPanel } from "@/components/data/ImportedDatasetReviewPanel";
import { UploadedSessionDatasetDl } from "@/components/data/UploadedSessionDatasetSnapshot";

/**
 * Local-only CSV validation preview for the combined order + line-item contract (`/lib/import`).
 * Does not persist files or call APIs. Saved session datasets steer command-centre routes in this browser tab only.
 */

export function CsvImportPreview({
  sessionSyncEpoch = 0,
  onSessionDatasetChange,
}: {
  readonly sessionSyncEpoch?: number;
  readonly onSessionDatasetChange?: () => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<OrdersCsvImportFormat | null>(null);
  const [result, setResult] = useState<CombineOrderCsvImportResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const [sessionSummary, setSessionSummary] = useState<RetentionOSDatasetSummary | null>(null);
  const [sessionSaveError, setSessionSaveError] = useState<string | null>(null);
  const [sessionSaveToast, setSessionSaveToast] = useState<string | null>(null);

  const refreshSessionSummary = useCallback(() => {
    setSessionSummary(getUploadedDatasetSessionSummary());
  }, []);

  useEffect(() => {
    refreshSessionSummary();
  }, [sessionSyncEpoch, refreshSessionSummary]);

  const reset = useCallback(() => {
    setFileName(null);
    setDetectedFormat(null);
    setResult(null);
    setReadError(null);
    setSessionSaveError(null);
    setSessionSaveToast(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onClearStoredUpload = useCallback(() => {
    clearUploadedRetentionOSDataset();
    setSessionSummary(null);
    setSessionSaveError(null);
    setSessionSaveToast(null);
    onSessionDatasetChange?.();
  }, [onSessionDatasetChange]);

  const reviewOutcome = useMemo(() => {
    void sessionSyncEpoch;
    if (!result || detectedFormat == null) return null;
    const spend = getUploadedMarketingSpendSessionSummary();
    const margin = getUploadedMarginAssumptionsSummary();
    return buildImportReviewViewModel({
      format: detectedFormat,
      result,
      sessionContext: {
        hasSavedMarketingSpend: spend != null && spend.rowCount > 0,
        hasSavedMarginAssumptions: margin != null,
        marginAssumptionPct: margin?.assumptions.contributionMarginPct,
      },
    });
  }, [detectedFormat, result, sessionSyncEpoch]);

  const onSaveSessionDataset = useCallback(() => {
    setSessionSaveError(null);
    setSessionSaveToast(null);
    if (!result || result.errors.length > 0) {
      setSessionSaveError("Fix import errors before saving — blocked datasets are not stored.");
      return;
    }
    const built = buildImportedRetentionOSDataset(result, {
      importedAt: new Date().toISOString(),
      sourceLabel: fileName ? `Uploaded: ${fileName}` : undefined,
      uploadFormat:
        detectedFormat === "shopify_orders" || detectedFormat === "retentionos_template"
          ? detectedFormat
          : undefined,
    });
    if (!built.ok) {
      setSessionSaveError("This import still has errors in the pipeline — nothing was saved.");
      return;
    }
    try {
      saveUploadedRetentionOSDataset(built.dataset);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not save (storage may be full or unavailable in this browser).";
      setSessionSaveError(msg);
      return;
    }
    refreshSessionSummary();
    onSessionDatasetChange?.();
    const m = built.dataset.meta;
    setSessionSaveToast(
      `Saved: ${m.customerCount.toLocaleString()} customers, ${m.orderCount.toLocaleString()} orders, ${m.lineItemCount.toLocaleString()} line items.`,
    );
  }, [detectedFormat, fileName, onSessionDatasetChange, refreshSessionSummary, result]);

  const onFile = useCallback((fileList: FileList | null) => {
    setReadError(null);
    setResult(null);
    setDetectedFormat(null);
    setSessionSaveError(null);
    setSessionSaveToast(null);
    const file = fileList?.[0];
    if (!file) {
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        setReadError("Could not read file as text.");
        return;
      }
      const outcome = importOrdersCsvFromText(text);
      setDetectedFormat(outcome.format);
      setResult(outcome.result);
    };
    reader.onerror = () => {
      setReadError("File read failed. Try a smaller file or a different browser.");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const blocked = reviewOutcome?.kind === "blocked";
  const reviewVm: ImportReviewViewModel | null = reviewOutcome?.kind === "review" ? reviewOutcome : null;
  const unsupportedFormat = detectedFormat === "unsupported";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-4 py-3 text-sm leading-relaxed text-emerald-950 ring-1 ring-emerald-900/10">
        <p className="font-semibold">Local preview only</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-900/90">
          <li>Files stay in this browser tab until you explicitly save — nothing is uploaded to a server.</li>
          <li>
            <strong className="font-semibold">Session-only:</strong> after you confirm the review below, the dataset is
            stored in{" "}
            <code className="rounded border border-emerald-300/80 bg-white/80 px-1 py-0.5 font-mono text-[11px]">
              sessionStorage
            </code>{" "}
            for this tab. <strong className="font-semibold">Not persisted to Supabase.</strong>
          </li>
          <li>
            When you save,{" "}
            <strong className="font-semibold">
              Dashboard, Cohorts, Retention, LTV, and Insights use this upload in this browser session
            </strong>{" "}
            until you revert to the demo fixture.
          </li>
        </ul>
      </div>

      {sessionSummary ? (
        <SessionStoredDatasetCard summary={sessionSummary} onClear={onClearStoredUpload} />
      ) : (
        <SessionStoredDatasetCardEmptyState />
      )}

      {sessionSaveToast ? (
        <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Saved for this browser session</p>
          <p className="mt-1">{sessionSaveToast}</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">
            Session-only — not persisted to Supabase. Dashboard, Cohorts, Retention, LTV, and Insights now consume this
            snapshot on this tab until you clear it or close the tab.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => onFile(e.target.files)}
        />
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-black/[0.04] transition-colors hover:bg-zinc-50"
        >
          Upload Shopify Orders CSV
        </label>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Clear preview
        </button>
        {fileName ? (
          <span className="text-sm text-zinc-600">
            Selected: <span className="font-medium text-zinc-900">{fileName}</span>
          </span>
        ) : (
          <span className="text-sm text-zinc-500">No file selected.</span>
        )}
      </div>

      <p className="text-sm text-zinc-600">
        Primary path: export from Shopify Admin → Orders → Export → Orders. Advanced / testing: RetentionOS combined
        template{" "}
        <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">
          docs/sample-retentionos-orders.csv
        </code>{" "}
        — not served as a public download from this app.
      </p>

      {readError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Read error</p>
          <p className="mt-1">{readError}</p>
        </div>
      ) : null}

      {reviewOutcome && blocked ? (
        <>
          {detectedFormat != null ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Detected format</span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  detectedFormat === "shopify_orders"
                    ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
                    : detectedFormat === "retentionos_template"
                      ? "bg-sky-100 text-sky-900 ring-1 ring-sky-200"
                      : "bg-red-100 text-red-900 ring-1 ring-red-200"
                }`}
              >
                {ordersCsvFormatLabel(detectedFormat)}
              </span>
            </div>
          ) : null}

          <div className="rounded-lg border border-amber-300/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">
              {unsupportedFormat ? "Unsupported orders CSV — import blocked" : "Import blocked — cannot save"}
            </p>
            <p className="mt-2 text-xs leading-relaxed opacity-95">{reviewOutcome.reason}</p>
            {unsupportedFormat ? (
              <p className="mt-2 text-xs leading-relaxed opacity-95">
                Upload a native Shopify Orders export, or the RetentionOS combined template with exact header names.
              </p>
            ) : null}
          </div>

          {reviewOutcome.errors.length > 0 ? (
            <div className="rounded-lg border border-red-200/90 bg-red-50/80 px-4 py-3">
              <p className="text-sm font-semibold text-red-950">Errors ({reviewOutcome.errors.length})</p>
              <ul className="mt-2 space-y-2 text-sm text-red-900">
                {reviewOutcome.errors.map((e, i) => (
                  <li key={`${e.code}-${i}`} className="rounded-md border border-red-100/80 bg-white/70 px-3 py-2">
                    <span className="font-mono text-[11px] text-red-800">{e.code}</span>
                    {e.row != null ? <span className="ml-2 text-xs text-red-700">Row {e.row}</span> : null}
                    <p className="mt-1 leading-relaxed">{e.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {reviewVm ? (
        <ImportedDatasetReviewPanel
          viewModel={reviewVm}
          fileName={fileName}
          onConfirmSave={onSaveSessionDataset}
          onDismissPreview={reset}
          saveError={sessionSaveError}
        />
      ) : null}
    </div>
  );
}

function SessionStoredDatasetCardEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300/90 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700">
      <p className="font-semibold text-zinc-900">No uploaded CSV in sessionStorage yet</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-600">
        Save a validated import below to switch Dashboard, Cohorts, Retention, LTV, and Insights on this browser tab.&nbsp;
        <span className="font-semibold text-zinc-800">Active source stays the demo fixture</span> until then.
      </p>
    </div>
  );
}

function SessionStoredDatasetCard({
  summary,
  onClear,
}: {
  summary: RetentionOSDatasetSummary;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-sky-200/90 bg-sky-50/70 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-900/10">
      <p className="font-semibold">Session dataset on file (mirror of control banner)</p>
      <p className="mt-2 text-xs leading-relaxed opacity-95">
        <strong className="font-semibold">Session-only — not persisted to Supabase.</strong> Clearing below has the{" "}
        <strong className="font-semibold">same effect as Revert to demo dataset</strong> in the banner.
      </p>

      <UploadedSessionDatasetDl
        summary={summary}
        footer={
          <div className="pt-3">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex w-full items-center justify-center rounded-lg border-2 border-amber-700/80 bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 sm:w-auto"
            >
              Revert to demo dataset · clear upload
            </button>
          </div>
        }
      />
    </div>
  );
}
