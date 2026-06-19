"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import {
  clearUploadedMarketingSpend,
  getUploadedMarketingSpendSessionSummary,
  saveUploadedMarketingSpend,
  type UploadedMarketingSpendSessionSummary,
} from "@/lib/data-source";
import {
  importMarketingSpendCsvFromText,
  type MarketingSpendCsvImportResult,
} from "@/lib/import";

/**
 * Browser-only marketing spend CSV preview + optional session persistence (Sprint 4C–4D).
 * Session spend enriches uploaded orders in the command-centre resolver and powers /data acquisition previews.
 */

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3 ring-1 ring-black/[0.02]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1.5 text-sm font-semibold tabular-nums text-zinc-900">{value}</dd>
    </div>
  );
}

export function MarketingSpendCsvPreview({
  sessionSyncEpoch = 0,
  onSessionSpendChange,
}: {
  readonly sessionSyncEpoch?: number;
  readonly onSessionSpendChange?: () => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<MarketingSpendCsvImportResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<UploadedMarketingSpendSessionSummary | null>(null);
  const [sessionSaveError, setSessionSaveError] = useState<string | null>(null);
  const [sessionSaveToast, setSessionSaveToast] = useState<string | null>(null);

  const refreshSessionSummary = useCallback(() => {
    setSessionSummary(getUploadedMarketingSpendSessionSummary());
  }, []);

  useLayoutEffect(() => {
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

  const onFile = useCallback((fileList: FileList | null) => {
    setReadError(null);
    setResult(null);
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
      setResult(importMarketingSpendCsvFromText(text));
    };
    reader.onerror = () => {
      setReadError("File read failed. Try a smaller file or a different browser.");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const onSaveSessionSpend = useCallback(() => {
    setSessionSaveError(null);
    setSessionSaveToast(null);
    if (!result || result.marketingSpend.length === 0) {
      setSessionSaveError("Import valid spend rows before saving to session.");
      return;
    }
    try {
      saveUploadedMarketingSpend(result.marketingSpend);
    } catch (e) {
      setSessionSaveError(e instanceof Error ? e.message : "Could not save marketing spend to session storage.");
      return;
    }
    refreshSessionSummary();
    onSessionSpendChange?.();
    setSessionSaveToast(
      `Saved ${result.marketingSpend.length} spend row(s) to this tab’s session — uploaded orders will pick this up automatically; demo fixture uses it only on /data previews.`,
    );
  }, [onSessionSpendChange, refreshSessionSummary, result]);

  const onClearSessionSpend = useCallback(() => {
    setSessionSaveError(null);
    setSessionSaveToast(null);
    clearUploadedMarketingSpend();
    refreshSessionSummary();
    onSessionSpendChange?.();
  }, [onSessionSpendChange, refreshSessionSummary]);

  const hasRowErrors = result != null && result.errors.length > 0;
  const hasSpend = result != null && result.marketingSpend.length > 0;
  const hasSessionSpend = sessionSummary != null;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed text-slate-950 ring-1 ring-slate-900/10">
        <p className="font-semibold">Optional: import actual marketing spend</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-900/95">
          <li>
            Parse and validate in-browser. Saving stores spend <strong className="font-medium">for this browser tab only</strong>.
          </li>
          <li>
            When saved alongside uploaded orders, spend flows to <strong className="font-medium">Acquisition</strong>, Dashboard, and the acquisition
            preview above — and overrides the % assumption.
          </li>
        </ul>
      </div>

      {sessionSummary ?
        <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-950 ring-1 ring-indigo-900/10">
          <p className="font-semibold">Saved marketing spend (session)</p>
          <p className="mt-2 text-indigo-950/90">
            {sessionSummary.rowCount.toLocaleString()} rows · {sessionSummary.monthCount} month(s) · {sessionSummary.channelCount} channel(s) ·{" "}
            <span className="font-medium">{formatMoney(sessionSummary.totalSpend)}</span> total
            {sessionSummary.firstMonth && sessionSummary.lastMonth ?
              <>
                {" "}
                · {sessionSummary.firstMonth} → {sessionSummary.lastMonth}
              </>
            : null}
          </p>
          <button
            type="button"
            onClick={onClearSessionSpend}
            className="mt-3 inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-950 hover:bg-indigo-50"
          >
            Clear marketing spend from session
          </button>
        </div>
      : null}

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
          Choose spend CSV
        </label>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Clear preview
        </button>
        {fileName ?
          <span className="text-sm text-zinc-600">
            Selected: <span className="font-medium text-zinc-900">{fileName}</span>
          </span>
        : <span className="text-sm text-zinc-500">No file selected.</span>}
      </div>

      <p className="text-sm text-zinc-600">
        Sample file in repo:{" "}
        <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">
          docs/sample-retentionos-marketing-spend.csv
        </code>
        . Required columns: <code className="font-mono text-[11px]">month</code>,{" "}
        <code className="font-mono text-[11px]">channel</code>, <code className="font-mono text-[11px]">spend</code> (non-negative).{" "}
        <strong className="font-medium text-zinc-800">Duplicate month + channel rows are summed</strong> with a warning.
      </p>

      {readError ?
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Read error</p>
          <p className="mt-1">{readError}</p>
        </div>
      : null}

      {sessionSaveError ?
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Session save</p>
          <p className="mt-1">{sessionSaveError}</p>
        </div>
      : null}

      {sessionSaveToast ?
        <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Marketing spend saved for this tab</p>
          <p className="mt-1">{sessionSaveToast}</p>
        </div>
      : null}

      {result ?
        <>
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              !hasSpend && hasRowErrors ?
                "border-red-200/90 bg-red-50/80 text-red-950"
              : hasRowErrors ?
                "border-amber-200/90 bg-amber-50/80 text-amber-950"
              : "border-emerald-200/90 bg-emerald-50/70 text-emerald-950"
            }`}
          >
            <p className="font-semibold">
              {!hasSpend && hasRowErrors ?
                "No spend rows produced — fix header or row errors"
              : hasRowErrors ?
                "Partial import — some rows were skipped; valid rows are aggregated below"
              : "Valid preview — CSV parsed and normalised"}
            </p>
          </div>

          {hasSpend ?
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={onSaveSessionSpend}
                className="inline-flex items-center justify-center rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Save marketing spend for this browser session
              </button>
              {hasSessionSpend ?
                <button
                  type="button"
                  onClick={onClearSessionSpend}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
                >
                  Clear saved spend (session)
                </button>
              : null}
              <p className="text-xs leading-relaxed text-zinc-600">
                Session key is tab-scoped. Clearing orders upload does <span className="font-medium">not</span> auto-clear spend — revert both from /data if
                you need a clean slate.
              </p>
            </div>
          : null}

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Import summary</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem label="Raw data rows (non-blank)" value={String(result.summary.rawRowCount)} />
              <SummaryItem label="Spend rows (after merge)" value={String(result.summary.spendRowCount)} />
              <SummaryItem label="Distinct months" value={String(result.summary.monthCount)} />
              <SummaryItem label="Distinct channels" value={String(result.summary.channelCount)} />
              <SummaryItem label="Total spend" value={formatMoney(result.summary.totalSpend)} />
              <SummaryItem label="First month" value={result.summary.firstMonth ?? "—"} />
              <SummaryItem label="Last month" value={result.summary.lastMonth ?? "—"} />
              <SummaryItem label="Errors" value={String(result.summary.errorCount)} />
              <SummaryItem label="Warnings" value={String(result.summary.warningCount)} />
            </dl>
          </div>

          {result.errors.length > 0 ?
            <div className="rounded-lg border border-red-200/90 bg-red-50/80 px-4 py-3">
              <p className="text-sm font-semibold text-red-950">Errors ({result.errors.length})</p>
              <ul className="mt-2 space-y-2 text-sm text-red-900">
                {result.errors.map((e, i) => (
                  <li key={`${e.code}-${i}`} className="rounded-md border border-red-100/80 bg-white/70 px-3 py-2">
                    <span className="font-mono text-[11px] text-red-800">{e.code}</span>
                    {e.row != null ?
                      <span className="ml-2 text-xs text-red-700">Row {e.row}</span>
                    : null}
                    <p className="mt-1 leading-relaxed">{e.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          : null}

          {result.warnings.length > 0 ?
            <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3">
              <p className="text-sm font-semibold text-amber-950">Warnings ({result.warnings.length})</p>
              <ul className="mt-2 space-y-2 text-sm text-amber-950">
                {result.warnings.map((w, i) => (
                  <li key={`${w.code}-${i}`} className="rounded-md border border-amber-100/80 bg-white/70 px-3 py-2">
                    <span className="font-mono text-[11px] text-amber-900">{w.code}</span>
                    {w.row != null ?
                      <span className="ml-2 text-xs text-amber-800">Row {w.row}</span>
                    : null}
                    <p className="mt-1 leading-relaxed">{w.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          : null}

          {hasSpend ?
            <div className="overflow-x-auto rounded-lg border border-zinc-200/90 bg-white ring-1 ring-black/[0.02]">
              <table className="min-w-[640px] w-full border-collapse text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2 text-right">Spend</th>
                    <th className="px-3 py-2">Platform</th>
                    <th className="px-3 py-2">Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {result.marketingSpend.map((r, i) => (
                    <tr key={`${r.month}-${r.channel}-${i}`} className="border-b border-zinc-100">
                      <td className="px-3 py-2 font-mono tabular-nums text-zinc-900">{r.month}</td>
                      <td className="px-3 py-2 text-zinc-800">{r.channel}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-900">{formatMoney(r.spend)}</td>
                      <td className="px-3 py-2 text-zinc-600">{r.platform ?? "—"}</td>
                      <td className="px-3 py-2 text-zinc-600">{r.campaign ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          : null}
        </>
      : null}
    </div>
  );
}
