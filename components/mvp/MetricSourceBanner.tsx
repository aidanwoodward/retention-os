"use client";

import type { CommandCentreDatasetSelection } from "@/lib/data-source/client-selected-source";
import { metricsBannerScopeLine } from "@/lib/mvp/cohesion";

export type MetricSourceBannerRouteId = "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights";

const SOURCE_BADGE_DEMO = "inline-flex shrink-0 rounded-md border border-zinc-300/90 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700";
const SOURCE_BADGE_UPLOAD = "inline-flex shrink-0 rounded-md border border-emerald-300/90 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-900";
const SESSION_PILL = "inline-flex shrink-0 rounded-md border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-950";

export function MetricSourceBanner({
  routeId,
  selection,
}: {
  routeId: MetricSourceBannerRouteId;
  selection: CommandCentreDatasetSelection;
}) {
  const scope = metricsBannerScopeLine(routeId);
  const provenanceDetail = selection.isUploaded
    ? "Your uploaded orders power metrics on this page for this browser tab only. Data is not saved to the cloud — refresh or close the tab and you will need to upload again."
    : "Demo brand data powers this page. Upload your Shopify Orders export on Data to analyse your own shop in this tab.";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50/70 px-3 py-2 text-sm ring-1 ring-black/[0.02]">
      <span className={selection.isUploaded ? SOURCE_BADGE_UPLOAD : SOURCE_BADGE_DEMO}>
        {selection.isUploaded ? "Your upload" : "Demo data"}
      </span>
      <span className="min-w-0 text-zinc-600">{scope}</span>
      {selection.isUploaded ? (
        <span className={SESSION_PILL} title="Not persisted to cloud storage">
          Browser tab only
        </span>
      ) : null}
      <details className="ml-auto text-xs text-zinc-500">
        <summary className="cursor-pointer select-none font-medium text-zinc-600 hover:text-zinc-900">About this source</summary>
        <p className="mt-1.5 max-w-md leading-relaxed text-zinc-600">{provenanceDetail}</p>
      </details>
    </div>
  );
}
