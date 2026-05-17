"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  importMarketingSpendCsvFromText,
  type MarketingSpendCsvImportResult,
} from "@/lib/import";

/**
 * Browser-only marketing spend CSV preview (Sprint 4C).
 * Does not persist, does not alter KPI routes, does not compute CAC/payback.
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

export function MarketingSpendCsvPreview() {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<MarketingSpendCsvImportResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileName(null);
    setResult(null);
    setReadError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

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
      setResult(importMarketingSpendCsvFromText(text));
    };
    reader.onerror = () => {
      setReadError("File read failed. Try a smaller file or a different browser.");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const hasRowErrors = result != null && result.errors.length > 0;
  const hasSpend = result != null && result.marketingSpend.length > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed text-slate-950 ring-1 ring-slate-900/10">
        <p className="font-semibold">Preview only — no CAC yet</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-900/95">
          <li>
            This control validates a <strong className="font-medium">marketing spend CSV contract</strong> in your browser only. Nothing is written to
            sessionStorage or Supabase in this sprint.
          </li>
          <li>
            <strong className="font-medium">Dashboard, Cohorts, Retention, LTV, and Insights are unchanged</strong> by spend uploads here.
          </li>
          <li>
            A <strong className="font-medium">future sprint</strong> will join this spend shape to cohorts to calculate <strong>CAC</strong>,{" "}
            <strong>LTV:CAC</strong>, and <strong>payback</strong> on the selected dataset — not in this release.
          </li>
        </ul>
      </div>

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
