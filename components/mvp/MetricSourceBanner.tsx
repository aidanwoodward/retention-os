"use client";

import type { CommandCentreDatasetSelection } from "@/lib/data-source/client-selected-source";
import { DEMO_BRAND_NAME } from "@/lib/demo";
import type { DashboardReportingMeta } from "@/lib/mvp/dashboard-presentation-view-model";
import { metricsBannerScopeLine } from "@/lib/mvp/cohesion";

export type MetricSourceBannerRouteId = "dashboard" | "cohorts" | "retention" | "ltv" | "acquisition" | "products" | "insights";

const SOURCE_BADGE_DEMO = "inline-flex shrink-0 rounded-md border border-zinc-300/90 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700";
const SOURCE_BADGE_UPLOAD = "inline-flex shrink-0 rounded-md border border-emerald-300/90 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-900";
const SOURCE_BADGE_WARN = "inline-flex shrink-0 rounded-md border border-amber-300/90 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950";
const SESSION_PILL = "inline-flex shrink-0 rounded-md border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-950";

export function MetricSourceBanner({
  routeId,
  selection,
  reportingMeta,
}: {
  routeId: MetricSourceBannerRouteId;
  selection: CommandCentreDatasetSelection;
  reportingMeta?: DashboardReportingMeta;
}) {
  const scope = metricsBannerScopeLine(routeId);

  let badgeClass = SOURCE_BADGE_DEMO;
  let badgeLabel = `Demo — ${DEMO_BRAND_NAME}`;
  let provenanceDetail = `${DEMO_BRAND_NAME} demo data powers this page — fixture spend and margin assumptions included. Upload your Shopify Orders export on Data to analyse your own shop in this tab.`;
  let showSessionPill = false;

  if (selection.status === "pending") {
    badgeClass = SOURCE_BADGE_DEMO;
    badgeLabel = "Loading source…";
    provenanceDetail = "Resolving the active dataset for this browser tab.";
  } else if (selection.status === "lost_upload") {
    badgeClass = SOURCE_BADGE_WARN;
    badgeLabel = "Upload session lost";
    provenanceDetail = `You were analysing “${selection.sourceLabel}”, but the CSV payload is session-scoped and is no longer available. Demo metrics are not shown in its place — re-upload on Data or explicitly use the demo dataset.`;
    showSessionPill = true;
  } else if (selection.status === "uploaded") {
    badgeClass = SOURCE_BADGE_UPLOAD;
    badgeLabel = "Your upload";
    provenanceDetail =
      "Your uploaded orders power metrics on this page for this browser tab only. Data is not saved to the cloud — close the tab or end the session and you will need to upload again.";
    showSessionPill = true;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50/70 px-3 py-2 text-sm ring-1 ring-black/[0.02]">
        <span className={badgeClass}>{badgeLabel}</span>
        <span className="min-w-0 text-zinc-600">{scope}</span>
        {showSessionPill ? (
          <span className={SESSION_PILL} title="CSV payload is session-scoped; not persisted to cloud storage">
            Browser tab only
          </span>
        ) : null}
        <details className="ml-auto text-xs text-zinc-500">
          <summary className="cursor-pointer select-none font-medium text-zinc-600 hover:text-zinc-900">About this source</summary>
          <p className="mt-1.5 max-w-md leading-relaxed text-zinc-600">{provenanceDetail}</p>
        </details>
      </div>
      {reportingMeta ?
        <p className="px-0.5 text-xs text-zinc-600">
          <span className="font-medium text-zinc-800">{reportingMeta.reportingScopeLabel}</span>
          <span className="text-zinc-400"> · </span>
          {reportingMeta.freshnessLabel}
        </p>
      : null}
    </div>
  );
}
