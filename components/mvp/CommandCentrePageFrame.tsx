"use client";

import type { ReactNode } from "react";
import {
  DEMO_DATASET_LABEL,
  dataModeBannerSentence,
  getMvpPageCopy,
  getMvpPageCopyForActiveSource,
  insightsDemoNotice,
  metricsBannerScopeLine,
  MVP_COMMAND_CENTRE_NAME,
  MVP_NAV,
  RULES_ENGINE_INSIGHTS_NOTICE,
  type MvpRouteId,
} from "@/lib/mvp/cohesion";

export type CommandCentreMaxWidth = "4xl" | "6xl" | "7xl" | "1600";

const maxWidthClass: Record<CommandCentreMaxWidth, string> = {
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  "1600": "max-w-[1600px]",
};

export interface CommandCentrePageFrameProps {
  readonly routeId: MvpRouteId;
  readonly maxWidth: CommandCentreMaxWidth;
  readonly bannerKind: "metrics" | "insights" | "data";
  readonly children: ReactNode;
  /**
   * When `bannerKind` is `metrics` on a metric-heavy route, replaces the default demo-only top banner
   * (e.g. /dashboard with a session-uploaded dataset).
   */
  readonly metricsBannerSlot?: ReactNode;
  /** When `bannerKind` is `insights`, replaces the default demo-static top banner with source-aware METRIC-style slot. */
  readonly insightsBannerSlot?: ReactNode;
  /**
   * For dashboard / cohorts / retention / ltv / acquisition / products / insights: switches the white context card “What you’re looking at”
   * so it does not claim the demo fixture when `uploaded_csv` is active.
   */
  readonly activeMetricDatasetSource?: "demo" | "uploaded_csv" | "pending" | "lost_upload";
  /** When true, shows actionable next steps below the two-column intro (default: only on /data). */
  readonly showNextSteps?: boolean;
}

function CompactDemoBadge({ scope }: { scope: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/70 px-3 py-2 text-sm ring-1 ring-black/[0.02]">
      <span className="inline-flex shrink-0 rounded-md border border-zinc-300/90 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
        {DEMO_DATASET_LABEL}
      </span>
      <span className="text-zinc-600">{scope}</span>
      <details className="ml-auto text-xs text-zinc-500">
        <summary className="cursor-pointer select-none font-medium text-zinc-600 hover:text-zinc-900">About this source</summary>
        <p className="mt-1.5 max-w-md leading-relaxed text-zinc-600">
          Demo brand data powers this page. Upload your Shopify Orders export on Data to analyse your own shop in this tab.
        </p>
      </details>
    </div>
  );
}

export function CommandCentrePageFrame({
  routeId,
  maxWidth,
  bannerKind,
  children,
  metricsBannerSlot,
  insightsBannerSlot,
  activeMetricDatasetSource = "demo",
  showNextSteps = routeId === "data",
}: CommandCentrePageFrameProps) {
  const copy =
    routeId === "dashboard" ||
    routeId === "cohorts" ||
    routeId === "retention" ||
    routeId === "ltv" ||
    routeId === "acquisition" ||
    routeId === "products" ||
    routeId === "insights"
      ? getMvpPageCopyForActiveSource(routeId, activeMetricDatasetSource)
      : getMvpPageCopy(routeId);

  const isMetricSurface =
    routeId === "dashboard" ||
    routeId === "cohorts" ||
    routeId === "retention" ||
    routeId === "ltv" ||
    routeId === "acquisition" ||
    routeId === "products";

  const activeLabel = MVP_NAV.find((n) => n.id === routeId)?.label ?? routeId;

  const rulesEngineBody = RULES_ENGINE_INSIGHTS_NOTICE.replace(/^Rules-based engine\.\s*/, "");

  return (
    <div className="min-w-0">
      <div className={`mx-auto ${maxWidthClass[maxWidth]} space-y-5`}>
        <header className="border-b border-zinc-200/90 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{MVP_COMMAND_CENTRE_NAME}</p>
          <p className="mt-1 text-xs font-semibold text-zinc-900">{activeLabel}</p>
        </header>

        {bannerKind === "metrics" && isMetricSurface ?
          metricsBannerSlot ?? <CompactDemoBadge scope={metricsBannerScopeLine(routeId)} />
        : null}

        {bannerKind === "insights" ?
          insightsBannerSlot ?? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/70 px-3 py-2 text-sm ring-1 ring-black/[0.02]">
              <span className="inline-flex shrink-0 rounded-md border border-zinc-300/90 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
                {DEMO_DATASET_LABEL}
              </span>
              <span className="text-zinc-600">{insightsDemoNotice()}</span>
              <details className="ml-auto text-xs text-zinc-500">
                <summary className="cursor-pointer select-none font-medium text-zinc-600 hover:text-zinc-900">Rules engine</summary>
                <p className="mt-1.5 max-w-md leading-relaxed text-zinc-600">{rulesEngineBody}</p>
              </details>
            </div>
          )
        : null}

        {bannerKind === "data" ?
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/70 px-3 py-2 text-sm ring-1 ring-black/[0.02]">
            <span className="inline-flex shrink-0 rounded-md border border-zinc-300/90 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
              Data control
            </span>
            <span className="text-zinc-600">{dataModeBannerSentence()}</span>
          </div>
        : null}

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{copy.hook}</p>
        </div>

        <section className="overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-sm">
          <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-zinc-100">
            <ContextColumn title="What this page tells you" body={copy.lookingAt} />
            <ContextColumn title="Why it matters" body={copy.matters} />
          </div>
          {showNextSteps && copy.nextSteps.length > 0 ?
            <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-3.5 sm:px-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Next steps</h2>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-zinc-800">
                {copy.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          : null}
        </section>

        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
}

function ContextColumn({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white px-4 py-3.5 sm:px-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-800">{body}</p>
    </div>
  );
}
