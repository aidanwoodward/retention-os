"use client";

import { useMemo } from "react";
import { AcquisitionEconomicsPanel } from "@/components/acquisition/AcquisitionEconomicsPanel";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { getDatasetSummary } from "@/lib/data-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildAcquisitionPreviewFromDataset } from "@/lib/metrics";

/** /data-only acquisition economics preview — uses command-centre dataset + session spend rules (Sprint 4D/5D). */
export function AcquisitionDataPreview({ sessionEpoch }: { readonly sessionEpoch: number }) {
  const selection = useCommandCentreDatasetSelection(undefined, sessionEpoch);

  const preview = useMemo(() => {
    if (!selection.metricsAllowed) return null;
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
      isUploaded: selection.isUploaded,
    };
  }, [selection]);

  if (selection.status === "pending" || selection.status === "lost_upload") {
    return <DatasetSourceUnavailablePanel selection={selection} />;
  }

  if (preview == null) return null;

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-zinc-600">
        Uses the <span className="font-medium text-zinc-900">{preview.sourceLabel}</span>
        {preview.isUploaded ?
          <> — spend follows your saved % assumption or CSV rows (CSV wins when both exist).</>
        : <> — fixture marketing spend and margin assumptions are included.</>}
        Open <span className="font-medium text-zinc-900">/acquisition</span> for the full workspace on the same source.
      </p>

      <AcquisitionEconomicsPanel model={preview.model} variant="preview" spendIsEstimated={preview.spendIsEstimated} />
    </div>
  );
}
