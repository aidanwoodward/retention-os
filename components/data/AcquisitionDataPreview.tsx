"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { AcquisitionEconomicsPanel } from "@/components/acquisition/AcquisitionEconomicsPanel";
import {
  buildDemoCommandCentreSelection,
  getMarketingSpendForAcquisitionPreview,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "@/lib/data-source";
import { buildAcquisitionPreviewFromDataset } from "@/lib/metrics";

/** /data-only acquisition economics preview — uses command-centre dataset + session spend rules (Sprint 4D). */
export function AcquisitionDataPreview({ sessionEpoch }: { readonly sessionEpoch: number }) {
  const [selection, setSelection] = useState<CommandCentreDatasetSelection>(() => buildDemoCommandCentreSelection());

  useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource());
  }, [sessionEpoch]);

  const model = useMemo(() => {
    const spend = getMarketingSpendForAcquisitionPreview(selection.isUploaded, selection.dataset.marketingSpend);
    return buildAcquisitionPreviewFromDataset(
      selection.dataset.customers,
      selection.dataset.orders,
      selection.dataset.marginAssumptions,
      spend,
    );
  }, [selection]);

  const sourceLabel = selection.isUploaded ? "Uploaded orders dataset" : "Canonical demo dataset";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-indigo-200/90 bg-indigo-50/40 px-4 py-3 text-sm leading-relaxed text-indigo-950 ring-1 ring-indigo-900/10">
        <p className="font-semibold">Acquisition preview (Layer 4 onboarding on /data)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-indigo-950/95">
          <li>
            Customer/order inputs follow the <span className="font-medium">active command-centre source</span>: {sourceLabel}. Spend follows{" "}
            <span className="font-medium">saved session spend</span> when you are on the demo fixture; uploaded orders use spend merged from session in the
            resolver.
          </li>
          <li>
            For the full KPI workspace, open <span className="font-medium">/acquisition</span> — it uses dataset-native spend only (no demo-customers +
            orphan session spend blending).
          </li>
          <li>
            These are <span className="font-medium">transparent calculators</span> only — no Supabase persistence.
          </li>
        </ul>
      </div>

      <AcquisitionEconomicsPanel model={model} variant="preview" />
    </div>
  );
}
