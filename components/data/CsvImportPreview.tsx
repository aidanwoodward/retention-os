"use client";

import { useCallback, useId, useRef, useState } from "react";
import { importCombinedOrderCsvFromText, type CombineOrderCsvImportResult } from "@/lib/import";

/**
 * Local-only CSV validation preview for the combined order + line-item contract (`/lib/import`).
 * Does not persist files, call APIs, or replace `getDemoDataset()` on command-centre routes.
 */

function formatIsoDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CsvImportPreview() {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<CombineOrderCsvImportResult | null>(null);
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
      setResult(importCombinedOrderCsvFromText(text));
    };
    reader.onerror = () => {
      setReadError("File read failed. Try a smaller file or a different browser.");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const blocked = result != null && result.errors.length > 0;
  const validPreview = result != null && result.errors.length === 0 && result.summary.rawRowCount > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-4 py-3 text-sm leading-relaxed text-emerald-950 ring-1 ring-emerald-900/10">
        <p className="font-semibold">Local preview only</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-900/90">
          <li>Files stay in this browser tab — nothing is uploaded to a server or saved.</li>
          <li>
            Dashboard, Cohorts, Retention, LTV, and Insights still use{" "}
            <code className="rounded border border-emerald-300/80 bg-white/80 px-1 py-0.5 font-mono text-[11px]">getDemoDataset()</code>.
          </li>
          <li>Next step is wiring valid imports into a metric-engine preview — not in this sprint.</li>
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
                  ? "Valid preview — parse and validation passed (still not powering command-centre routes)"
                  : "No data rows — fix the file or header"}
            </p>
            {!blocked && validPreview ? (
              <p className="mt-1 text-xs opacity-90">
                Counts below reflect the normalised import only. Demo fixture counts elsewhere on this page are unchanged.
              </p>
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
        </>
      ) : null}
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
