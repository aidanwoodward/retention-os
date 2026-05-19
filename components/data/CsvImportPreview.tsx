"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildImportedRetentionOSDataset,
  clearUploadedRetentionOSDataset,
  getUploadedDatasetSessionSummary,
  saveUploadedRetentionOSDataset,
  type RetentionOSDatasetSummary,
} from "@/lib/data-source";
import {
  buildImportedCsvMetricPreview,
  importCombinedOrderCsvFromText,
  type CombineOrderCsvImportResult,
} from "@/lib/import";
import { UploadedSessionDatasetDl } from "@/components/data/UploadedSessionDatasetSnapshot";

/**
 * Local-only CSV validation preview for the combined order + line-item contract (`/lib/import`).
 * Does not persist files or call APIs. Saved session datasets steer command-centre routes in this browser tab only.
 */

function formatIsoDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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
  }, [fileName, onSessionDatasetChange, refreshSessionSummary, result]);

  const onFile = useCallback((fileList: FileList | null) => {
    setReadError(null);
    setResult(null);
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
      setResult(importCombinedOrderCsvFromText(text));
    };
    reader.onerror = () => {
      setReadError("File read failed. Try a smaller file or a different browser.");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const blocked = result != null && result.errors.length > 0;
  const validPreview = result != null && result.errors.length === 0 && result.summary.rawRowCount > 0;

  const metricPreview = useMemo(() => {
    if (!result || result.errors.length > 0) return null;
    if (result.summary.rawRowCount === 0) return null;
    if (result.customers.length === 0 || result.orders.length === 0) return null;
    return buildImportedCsvMetricPreview(result.customers, result.orders, result.products);
  }, [result]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-4 py-3 text-sm leading-relaxed text-emerald-950 ring-1 ring-emerald-900/10">
        <p className="font-semibold">Local preview only</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-900/90">
          <li>Files stay in this browser tab until you explicitly save — nothing is uploaded to a server.</li>
          <li>
            <strong className="font-semibold">Session-only:</strong> you can save a valid import to{" "}
            <code className="rounded border border-emerald-300/80 bg-white/80 px-1 py-0.5 font-mono text-[11px]">sessionStorage</code>{" "}
            for this tab (see below). <strong className="font-semibold">Not persisted to Supabase.</strong>
          </li>
          <li>
            When you save below,{" "}
            <strong className="font-semibold">this uploaded dataset powers Dashboard, Cohorts, Retention, LTV, and Insights in this browser session</strong>
            {' '}
            (via <code className="rounded border border-emerald-300/80 bg-white/80 px-1 py-0.5 font-mono text-[11px]">
              sessionStorage</code>). Clear the dataset on this page whenever you want the command centre to fall back to the canonical demo fixture.
          </li>
          <li>
            A <strong className="font-semibold">Metric engine preview</strong> below runs valid uploads through{" "}
            <code className="rounded border border-emerald-300/80 bg-white/80 px-1 py-0.5 font-mono text-[11px]">/lib/metrics</code> —
            mirrored on command-centre routes after you session-save.
          </li>
        </ul>
      </div>

      {sessionSummary ?
        <SessionStoredDatasetCard summary={sessionSummary} onClear={onClearStoredUpload} />
      : <SessionStoredDatasetCardEmptyState />}
      {sessionSaveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Session save</p>
          <p className="mt-1">{sessionSaveError}</p>
        </div>
      ) : null}

      {sessionSaveToast ? (
        <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Saved for this browser session</p>
          <p className="mt-1">{sessionSaveToast}</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">
            Session-only — not persisted to Supabase. Dashboard, Cohorts, Retention, LTV, and Insights now consume this snapshot on this tab;
            revisit those routes after saving so their source banner reflects the uploaded slice. Refresh this page and the summary above persists
            until you clear it or close the tab.
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
          Choose CSV
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
        Template: copy or adapt{" "}
        <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">docs/sample-retentionos-orders.csv</code>{" "}
        from the repo — it is not served as a public download from this app in this checkpoint.
      </p>

      {readError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Read error</p>
          <p className="mt-1">{readError}</p>
        </div>
      ) : null}

      {result ? (
        <>
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              blocked
                ? "border-amber-300/90 bg-amber-50/90 text-amber-950"
                : validPreview
                  ? "border-emerald-200/90 bg-emerald-50/60 text-emerald-950"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800"
            }`}
          >
            <p className="font-semibold">
              {blocked
                ? "Blocked by errors — no Customer/Order/Product model was produced"
                : validPreview
                  ? "Valid preview — parse and validation passed"
                  : "No data rows — fix the file or header"}
            </p>
            {!blocked && validPreview ? (
              <p className="mt-1 text-xs opacity-90">
                Counts below reflect the normalised import only. Demo fixture counts elsewhere on this page are unchanged.
              </p>
            ) : null}
            {!blocked && validPreview ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-emerald-200/60 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={onSaveSessionDataset}
                  className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
                >
                  Save for this browser session
                </button>
                <p className="text-xs leading-relaxed text-emerald-950/90">
                  Stores the normalised <code className="font-mono text-[11px]">RetentionOSDataset</code> in{" "}
                  <code className="font-mono text-[11px]">sessionStorage</code> — session-only, not Supabase. After save, KPI routes listed in the
                  session banner use this snapshot until you clear it.
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Import summary</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem label="Raw data rows" value={String(result.summary.rawRowCount)} />
              <SummaryItem label="Customers" value={String(result.summary.customerCount)} />
              <SummaryItem label="Orders" value={String(result.summary.orderCount)} />
              <SummaryItem label="Line items" value={String(result.summary.lineItemCount)} />
              <SummaryItem label="Products" value={String(result.summary.productCount)} />
              <SummaryItem label="Errors" value={String(result.summary.errorCount)} />
              <SummaryItem label="Warnings" value={String(result.summary.warningCount)} />
              <SummaryItem label="First order (UTC)" value={formatIsoDate(result.summary.firstOrderAt)} />
              <SummaryItem label="Last order (UTC)" value={formatIsoDate(result.summary.lastOrderAt)} />
            </dl>
          </div>

          {result.errors.length > 0 ? (
            <div className="rounded-lg border border-red-200/90 bg-red-50/80 px-4 py-3">
              <p className="text-sm font-semibold text-red-950">Errors ({result.errors.length})</p>
              <ul className="mt-2 space-y-2 text-sm text-red-900">
                {result.errors.map((e, i) => (
                  <li key={`${e.code}-${i}`} className="rounded-md border border-red-100/80 bg-white/70 px-3 py-2">
                    <span className="font-mono text-[11px] text-red-800">{e.code}</span>
                    {e.row != null ? (
                      <span className="ml-2 text-xs text-red-700">Row {e.row}</span>
                    ) : null}
                    <p className="mt-1 leading-relaxed">{e.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50/70 px-4 py-3">
              <p className="text-sm font-semibold text-amber-950">Warnings ({result.warnings.length})</p>
              <ul className="mt-2 space-y-2 text-sm text-amber-950">
                {result.warnings.map((w, i) => (
                  <li key={`${w.code}-${i}`} className="rounded-md border border-amber-100/90 bg-white/60 px-3 py-2">
                    <span className="font-mono text-[11px] text-amber-900">{w.code}</span>
                    {w.row != null ? (
                      <span className="ml-2 text-xs text-amber-800">Row {w.row}</span>
                    ) : null}
                    <p className="mt-1 leading-relaxed">{w.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {metricPreview && !blocked ? (
            <div className="rounded-xl border border-zinc-300/90 bg-gradient-to-b from-zinc-50 to-white px-4 py-4 shadow-sm ring-1 ring-black/[0.03] sm:px-5">
              <div className="border-b border-zinc-200/80 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Metric engine preview</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  Same calculators as the command centre — your upload only, isolated to this tab
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  These numbers come from{" "}
                  <code className="rounded border border-zinc-200 bg-white px-1 py-0.5 font-mono text-[11px]">calculateCohorts</code>,{" "}
                  <code className="rounded border border-zinc-200 bg-white px-1 py-0.5 font-mono text-[11px]">calculateRetentionByCohort</code>,{" "}
                  repeat / first-to-second, and{" "}
                  <code className="rounded border border-zinc-200 bg-white px-1 py-0.5 font-mono text-[11px]">calculateLTVByCohort</code>. No
                  demo margin assumptions are applied unless every imported order carries{" "}
                  <code className="rounded border border-zinc-200 bg-white px-1 py-0.5 font-mono text-[11px]">contribution_margin</code>.
                </p>
                <p className="mt-2 text-xs font-medium text-zinc-800">
                  After you{" "}
                  <span className="text-emerald-800">session-save above</span>, /dashboard, /cohorts, /retention, /ltv, and /insights honour this
                  snapshot for this browser tab until you clear the upload.
                </p>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryItem label="Customers (preview)" value={String(metricPreview.customerCount)} />
                <SummaryItem label="Orders (preview)" value={String(metricPreview.orderCount)} />
                <SummaryItem label="Products (preview)" value={String(metricPreview.productCount)} />
                <SummaryItem label="Cohort months" value={String(metricPreview.cohortCount)} />
                <SummaryItem label="First cohort" value={metricPreview.firstCohort ?? "—"} />
                <SummaryItem label="Last cohort" value={metricPreview.lastCohort ?? "—"} />
                <SummaryItem label="Repeat purchase rate" value={formatPct(metricPreview.totalRepeatPurchaseRate)} />
                <SummaryItem
                  label="First → 2nd within 90d"
                  value={formatPct(metricPreview.firstToSecondWithin90DaysRate)}
                />
                <SummaryItem
                  label="Avg days to 2nd order"
                  value={
                    metricPreview.averageDaysToSecondOrder != null
                      ? metricPreview.averageDaysToSecondOrder.toFixed(1)
                      : "—"
                  }
                />
                <SummaryItem
                  label="Median days to 2nd order"
                  value={
                    metricPreview.medianDaysToSecondOrder != null
                      ? metricPreview.medianDaysToSecondOrder.toFixed(1)
                      : "—"
                  }
                />
                <SummaryItem label="Avg Month +1 active" value={formatPct(metricPreview.averageMonth1ActiveRate)} />
                <SummaryItem label="Avg Month +2 active" value={formatPct(metricPreview.averageMonth2ActiveRate)} />
                <SummaryItem label="Avg Month +3 active" value={formatPct(metricPreview.averageMonth3ActiveRate)} />
                <SummaryItem
                  label="Latest avg net revenue LTV (terminal)"
                  value={formatMoney(metricPreview.latestAverageNetRevenueLTV)}
                />
                <SummaryItem
                  label="Latest avg contribution LTV"
                  value={
                    metricPreview.contributionLTVAvailable
                      ? formatMoney(metricPreview.latestAverageContributionLTV)
                      : "—"
                  }
                />
              </dl>

              {!metricPreview.contributionLTVAvailable ? (
                <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-2.5 text-xs leading-relaxed text-zinc-700">
                  Contribution LTV unavailable — include <span className="font-mono">contribution_margin</span> on every order row or
                  configure margin assumptions in a future step. This preview never borrows demo fixture margins.
                </p>
              ) : null}

              {metricPreview.warnings.length > 0 ? (
                <div className="mt-4 rounded-lg border border-sky-200/90 bg-sky-50/80 px-3.5 py-3">
                  <p className="text-xs font-semibold text-sky-950">Engine caveats</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-sky-950">
                    {metricPreview.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
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
        <span className="font-semibold text-zinc-800">Active source stays the demo fixture</span> until then. Clearing is only available once a dataset is
        stored.
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
        <strong className="font-semibold">same effect as Revert to demo dataset</strong> in the banner: Dashboard, Cohorts, Retention, LTV, and Insights
        fall back to the canonical demo fixture for this browser tab.
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 ring-1 ring-black/[0.02]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-900">{value}</dd>
    </div>
  );
}
