"use client";

import type { CommandCentreDatasetSelection } from "@/lib/data-source/client-selected-source";
import { metricsBannerScopeLine } from "@/lib/mvp/cohesion";

const CHIP =
  "rounded-md border border-white/10 bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-zinc-200";

export type MetricSourceBannerRouteId = "dashboard" | "cohorts" | "retention" | "ltv" | "insights";

export function MetricSourceBanner({
  routeId,
  selection,
}: {
  routeId: MetricSourceBannerRouteId;
  selection: CommandCentreDatasetSelection;
}) {
  return (
    <div className="rounded-lg border border-zinc-700/90 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-3.5 shadow-sm ring-1 ring-black/30">
      <p className="text-sm leading-relaxed text-zinc-100">
        <span className="font-semibold text-white">
          Active source: {selection.isUploaded ? "Uploaded CSV session dataset" : "Demo dataset"}
        </span>
        <span className="text-zinc-500"> — </span>
        <span>{metricsBannerScopeLine(routeId)}</span>
      </p>
      <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-relaxed text-zinc-400">
        {selection.isUploaded ? (
          <>
            <span className="font-semibold text-zinc-200">Session-only</span> in <span className={CHIP}>sessionStorage</span> —{" "}
            <strong>not persisted to Supabase</strong>.{" "}
            {routeId === "insights" ?
              <>
                Diagnostic cards synthesize deterministic evidence bundles from your upload via <span className={CHIP}>
                  /lib/metrics
                </span>
                routed through <span className={CHIP}>/lib/insights</span>.
              </>
            : routeId === "dashboard" ?
              <>
                KPIs plus on-page diagnostic cards use this upload through <span className={CHIP}>/lib/metrics</span> and{" "}
                <span className={CHIP}>/lib/insights</span> view models.
              </>
            : <>
                KPIs and tables on this page use this upload through <span className={CHIP}>/lib/metrics</span> view models.
              </>
            }
          </>
        ) : (
          <>
            Deterministic metric engine <span className={CHIP}>getDemoDataset()</span> → <span className={CHIP}>/lib/metrics</span>. Live
            Shopify, warehouse materializations, and Supabase KPI paths are <span className="font-medium text-zinc-200">inactive</span> on
            this MVP surface. Save a valid CSV on <span className={CHIP}>/data</span> to <span className={CHIP}>sessionStorage</span> and
            revisit to analyse that slice on Dashboard, Cohorts, Retention, LTV, and Insights.
          </>
        )}
      </p>
    </div>
  );
}
