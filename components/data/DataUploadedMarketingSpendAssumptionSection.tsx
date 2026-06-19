"use client";

import { useCallback, useId, useLayoutEffect, useState } from "react";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import {
  clearUploadedMarketingSpendAssumption,
  getUploadedMarketingSpendAssumptionSummary,
  getUploadedMarketingSpendSessionSummary,
  saveUploadedMarketingSpendAssumption,
  validateUploadedMarketingSpendAssumptions,
} from "@/lib/data-source";

function formatPctFromFraction(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Session-only marketing spend % assumption for uploaded CSV when actual spend CSV is not saved. */
export function DataUploadedMarketingSpendAssumptionSection({
  hasUpload,
  sessionSyncEpoch = 0,
  onSessionAssumptionChange,
}: {
  readonly hasUpload: boolean;
  readonly sessionSyncEpoch?: number;
  readonly onSessionAssumptionChange?: () => void;
}) {
  const pctFieldId = useId();
  const [pctInput, setPctInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const assumptionSummary = hasUpload ? getUploadedMarketingSpendAssumptionSummary() : null;
  const csvSpendSummary = hasUpload ? getUploadedMarketingSpendSessionSummary() : null;
  const csvSpendActive = csvSpendSummary != null && csvSpendSummary.rowCount > 0;

  const syncFromSession = useCallback(() => {
    const s = getUploadedMarketingSpendAssumptionSummary();
    if (s) {
      setPctInput((s.assumptions.marketingSpendPctOfNetRevenue * 100).toString());
    } else {
      setPctInput("");
    }
    setSaveError(null);
    setSaveToast(null);
  }, []);

  useLayoutEffect(() => {
    syncFromSession();
  }, [sessionSyncEpoch, hasUpload, syncFromSession]);

  const onSave = useCallback(() => {
    setSaveError(null);
    setSaveToast(null);
    const raw = pctInput.trim().replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setSaveError("Enter a percentage between 0 and 100 (e.g. 20 for 20%).");
      return;
    }
    const marketingSpendPctOfNetRevenue = n / 100;
    const candidate = validateUploadedMarketingSpendAssumptions({ marketingSpendPctOfNetRevenue });
    if (!candidate) {
      setSaveError("That percentage is not usable — keep it between 0% and 100%.");
      return;
    }
    try {
      saveUploadedMarketingSpendAssumption(candidate);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save marketing spend assumption.");
      return;
    }
    setSaveToast(
      `Saved ${formatPctFromFraction(candidate.marketingSpendPctOfNetRevenue, 1)} of net revenue as estimated marketing spend for this session.`,
    );
    onSessionAssumptionChange?.();
  }, [pctInput, onSessionAssumptionChange]);

  const onClear = useCallback(() => {
    setSaveError(null);
    setSaveToast(null);
    clearUploadedMarketingSpendAssumption();
    setPctInput("");
    onSessionAssumptionChange?.();
  }, [onSessionAssumptionChange]);

  return (
    <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6">
      <div className="border-b border-zinc-100 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Acquisition economics · uploads</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-900">
          <KpiMetricLabel metricId="marketing_spend_assumption" dataQuality="estimated">
            Estimated marketing spend (% of net revenue)
          </KpiMetricLabel>
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Set a <span className="font-medium text-zinc-800">single session-only</span> marketing spend rate applied to net merchandise revenue per order
          month. This unlocks assumption-based CAC, LTV:CAC, and payback without importing a spend CSV.
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500">
          Basis: net revenue = line-derived gross revenue − discounts − refunds; excludes tax, shipping, and Shopify Total. Example: £10,000 net revenue ×
          20% = £2,000 assumed marketing spend that month.
        </p>
      </div>

      {!hasUpload ?
        <p className="mt-5 text-sm leading-relaxed text-zinc-600">
          Save a valid orders CSV to this tab first. Marketing spend controls activate once an uploaded session dataset is active in the banner above.
        </p>
      : <>
          {csvSpendActive ?
            <div className="mt-5 rounded-lg border border-amber-200/90 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-900/10">
              <p className="font-semibold">Inactive — actual spend CSV takes precedence</p>
              <p className="mt-2">
                Saved marketing spend CSV rows ({csvSpendSummary!.rowCount.toLocaleString()}) drive acquisition metrics. Your % assumption stays in session
                but reactivates if you clear the CSV.
              </p>
            </div>
          : null}

          <div className="mt-5 rounded-lg border border-violet-200/90 bg-violet-50/50 px-4 py-3 text-sm leading-relaxed text-violet-950 ring-1 ring-violet-900/10">
            <p className="font-semibold">Saved for this browser tab only</p>
            <p className="mt-2 text-violet-950/95">
              Clearing your upload removes this assumption. Closing the tab discards unsaved work.
            </p>
            {assumptionSummary ?
              <p className="mt-2 text-xs font-medium text-violet-900/90">
                Active assumption label: {assumptionSummary.provenanceLabel} ·{" "}
                {formatPctFromFraction(assumptionSummary.assumptions.marketingSpendPctOfNetRevenue, 1)} of net merchandise revenue per order month
                {csvSpendActive ? " (inactive while CSV spend is saved)" : ""}.
              </p>
            : null}
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor={pctFieldId} className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Estimated marketing spend (% of net revenue)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id={pctFieldId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="e.g. 20"
                  value={pctInput}
                  disabled={!hasUpload}
                  onChange={(e) => setPctInput(e.target.value)}
                  className="w-full max-w-[11rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 shadow-sm ring-1 ring-black/[0.02] placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-sm text-zinc-600">% (0–100)</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSave}
                className="inline-flex items-center justify-center rounded-lg border border-violet-600 bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                Save for session
              </button>
              <button
                type="button"
                onClick={onClear}
                disabled={!assumptionSummary}
                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear assumption
              </button>
            </div>
          </div>

          {saveError ?
            <p className="mt-4 text-sm text-red-800">{saveError}</p>
          : null}
          {saveToast ?
            <p className="mt-4 text-sm text-emerald-800">{saveToast}</p>
          : null}
        </>
      }
    </section>
  );
}
