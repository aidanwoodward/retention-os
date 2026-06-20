"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useId, useLayoutEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {  clearUploadedMarginAssumptions,
  getUploadedMarginAssumptionsSummary,
  saveUploadedMarginAssumptions,
  validateUploadedMarginAssumptions,
} from "@/lib/data-source";

function formatPctFromFraction(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Session-only contribution margin fallback for uploaded CSV when order-level `contribution_margin` is missing or incomplete. */
export function DataUploadedMarginAssumptionsSection({
  hasUpload,
  sessionSyncEpoch = 0,
  onSessionMarginChange,
}: {
  readonly hasUpload: boolean;
  readonly sessionSyncEpoch?: number;
  readonly onSessionMarginChange?: () => void;
}) {
  const pctFieldId = useId();
  const [pctInput, setPctInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const marginSummary = hasUpload ? getUploadedMarginAssumptionsSummary() : null;

  const syncFromSession = useCallback(() => {
    const s = getUploadedMarginAssumptionsSummary();
    if (s) {
      setPctInput((s.assumptions.contributionMarginPct * 100).toString());
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
      setSaveError("Enter a percentage between 0 and 100 (e.g. 38 for 38%).");
      return;
    }
    const contributionMarginPct = n / 100;
    const candidate = validateUploadedMarginAssumptions({ contributionMarginPct });
    if (!candidate) {
      setSaveError("That percentage is not usable — keep it between 0% and 100%.");
      return;
    }
    try {
      saveUploadedMarginAssumptions(candidate);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save margin assumptions.");
      return;
    }
    setSaveToast(`Saved ${formatPctFromFraction(candidate.contributionMarginPct, 1)} contribution margin for this session.`);
    onSessionMarginChange?.();
  }, [pctInput, onSessionMarginChange]);

  const onClear = useCallback(() => {
    setSaveError(null);
    setSaveToast(null);
    clearUploadedMarginAssumptions();
    setPctInput("");
    onSessionMarginChange?.();
  }, [onSessionMarginChange]);

  return (
    <Collapsible defaultOpen={false}>
      <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Contribution economics</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">Margin assumption (optional)</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              Fallback contribution rate when your CSV lacks margin on some orders. Order-level values always win when present.
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-zinc-500 transition group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-zinc-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
      {!hasUpload ?
        <p className="text-sm leading-relaxed text-zinc-600">
          Save a valid orders CSV first. Margin controls activate once an upload is active.
        </p>
      : <>
          <div className="rounded-lg border border-violet-200/90 bg-violet-50/50 px-4 py-3 text-sm leading-relaxed text-violet-950 ring-1 ring-violet-900/10">
            <p className="font-semibold">Saved for this browser tab only</p>
            <p className="mt-2 text-violet-950/95">
              Clearing your upload or reverting to demo removes this assumption. Closing the tab discards unsaved work.
            </p>
            {marginSummary ?
              <p className="mt-2 text-xs font-medium text-violet-900/90">
                Active: {marginSummary.provenanceLabel} · {formatPctFromFraction(marginSummary.assumptions.contributionMarginPct, 1)} of net revenue per
                uncovered order.
              </p>
            : null}
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">            <div className="min-w-0 flex-1">
              <label htmlFor={pctFieldId} className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Contribution margin (%)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id={pctFieldId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="e.g. 38"
                  value={pctInput}
                  disabled={!hasUpload}
                  onChange={(e) => setPctInput(e.target.value)}
                  className="w-full max-w-[11rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 shadow-sm ring-1 ring-black/[0.02] placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-sm text-zinc-600">% of net revenue (0–100)</span>
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
                disabled={!marginSummary}
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
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}