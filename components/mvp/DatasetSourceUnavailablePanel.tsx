"use client";

import Link from "next/link";
import type { CommandCentreDatasetSelection } from "@/lib/data-source/client-selected-source";
import { useDemoDataset } from "@/lib/data-source/dataset-lifecycle";

/**
 * Shared pending / lost_upload surface — keep status branching out of KPI route bodies.
 */
export function DatasetSourceUnavailablePanel({
  selection,
  onRecoveredToDemo,
}: {
  readonly selection: Extract<CommandCentreDatasetSelection, { status: "pending" | "lost_upload" }>;
  readonly onRecoveredToDemo?: () => void;
}) {
  if (selection.status === "pending") {
    return (
      <div
        className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600"
        role="status"
        aria-live="polite"
      >
        Loading active dataset…
      </div>
    );
  }

  const useDemo = () => {
    useDemoDataset();
    onRecoveredToDemo?.();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="rounded-lg border border-amber-300/90 bg-amber-50/80 px-4 py-6 text-sm text-amber-950 ring-1 ring-amber-900/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800/90">Uploaded dataset unavailable</p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950">Session data was lost</h2>
      <p className="mt-2 max-w-xl leading-relaxed text-zinc-700">
        RetentionOS still records that you were analysing{" "}
        <strong className="font-semibold text-zinc-900">{selection.sourceLabel}</strong>
        {selection.control?.importedAt ? (
          <>
            {" "}
            (imported {new Date(selection.control.importedAt).toLocaleString()})
          </>
        ) : null}
        , but the CSV payload is session-scoped and is no longer in this browser tab. Demo metrics are{" "}
        <strong className="font-semibold">not</strong> shown in place of your data.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-zinc-700">
        <li>Re-upload your orders CSV on Data to continue with your shop.</li>
        <li>Or explicitly switch to the demo dataset.</li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/data"
          className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-800/80 bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900"
        >
          Re-upload on Data
        </Link>
        <button
          type="button"
          onClick={useDemo}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
        >
          Use demo dataset
        </button>
      </div>
    </div>
  );
}
