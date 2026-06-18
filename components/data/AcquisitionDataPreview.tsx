"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { AcquisitionEconomicsPanel } from "@/components/acquisition/AcquisitionEconomicsPanel";
import {
  buildDemoCommandCentreSelection,
  getDatasetSummary,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "@/lib/data-source";
import { buildAcquisitionPreviewFromDataset } from "@/lib/metrics";

/** /data-only acquisition economics preview — uses command-centre dataset + session spend rules (Sprint 4D/5D). */
export function AcquisitionDataPreview({ sessionEpoch }: { readonly sessionEpoch: number }) {
  const [selection, setSelection] = useState<CommandCentreDatasetSelection>(() => buildDemoCommandCentreSelection());

  useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource());
  }, [sessionEpoch]);

  const { model, spendIsEstimated, sourceLabel } = useMemo(() => {
    const spend = selection.dataset.marketingSpend ?? [];
    const summary = getDatasetSummary(selection.dataset);
    return {
      model: buildAcquisitionPreviewFromDataset(
        selection.dataset.customers,
        selection.dataset.orders,
        selection.dataset.marginAssumptions,
        spend,
      ),
      spendIsEstimated: summary.marketingSpendSource === "assumption",
      sourceLabel: selection.isUploaded ? "Uploaded orders dataset" : "Canonical demo dataset",
    };
  }, [selection]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-indigo-200/90 bg-indigo-50/40 px-4 py-3 text-sm leading-relaxed text-indigo-950 ring-1 ring-indigo-900/10">
        <p className="font-semibold">Acquisition preview (Layer 4 onboarding on /data)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-indigo-950/95">
          <li>
            Customer/order inputs follow the <span className="font-medium">active command-centre source</span>: {sourceLabel}. Spend follows your saved{" "}
            <span className="font-medium">% assumption</span> or <span className="font-medium">CSV rows</span> (CSV wins when both exist).
          </li>
          <li>
            Open <span className="font-medium">/acquisition</span> for the full KPI workspace on the same resolved session source.
          </li>
          <li>
            These are <span className="font-medium">transparent calculators</span> only — no Supabase persistence.
          </li>
        </ul>
      </div>

      <AcquisitionEconomicsPanel model={model} variant="preview" spendIsEstimated={spendIsEstimated} />
    </div>
  );
}
