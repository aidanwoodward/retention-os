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
   * For dashboard / cohorts / retention / ltv / insights: switches the white context card “What you’re looking at”
   * so it does not claim the demo fixture when `uploaded_csv` is active.
   */
  readonly activeMetricDatasetSource?: "demo" | "uploaded_csv";
}

const codeChip = "rounded-md border border-white/10 bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-zinc-200";

export function CommandCentrePageFrame({
  routeId,
  maxWidth,
  bannerKind,
  children,
  metricsBannerSlot,
  insightsBannerSlot,
  activeMetricDatasetSource = "demo",
}: CommandCentrePageFrameProps) {
  const copy =
    routeId === "dashboard" || routeId === "cohorts" || routeId === "retention" || routeId === "ltv" || routeId === "insights"
      ? getMvpPageCopyForActiveSource(routeId, activeMetricDatasetSource)
      : getMvpPageCopy(routeId);

  const isMetricSurface =
    routeId === "dashboard" || routeId === "cohorts" || routeId === "retention" || routeId === "ltv";

  const activeLabel = MVP_NAV.find((n) => n.id === routeId)?.label ?? routeId;

  const rulesEngineBody = RULES_ENGINE_INSIGHTS_NOTICE.replace(/^Rules-based engine\.\s*/, "");

  return (
    <div className="min-w-0">
      <div className={`mx-auto ${maxWidthClass[maxWidth]} space-y-5`}>
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200/90 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {MVP_COMMAND_CENTRE_NAME}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              <span className="text-zinc-400">View</span>{" "}
              <span className="font-semibold text-zinc-900">{activeLabel}</span>
              <span className="text-zinc-400"> · primary navigation is in the sidebar</span>
            </p>
          </div>
        </header>

        {bannerKind === "metrics" && isMetricSurface ? (
          metricsBannerSlot ?? (
            <div className="rounded-lg border border-zinc-700/90 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-3.5 shadow-sm ring-1 ring-black/30">
              <p className="text-sm leading-relaxed text-zinc-100">
                <span className="font-semibold text-white">{DEMO_DATASET_LABEL}</span>
                <span className="text-zinc-500"> — </span>
                <span>{metricsBannerScopeLine(routeId)}</span>
              </p>
              <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-relaxed text-zinc-400">
                Deterministic metric engine <span className={codeChip}>getDemoDataset()</span> →{" "}
                <span className={codeChip}>/lib/metrics</span>
                . Live Shopify, warehouse materializations, and Supabase KPI paths are{" "}
                <span className="font-medium text-zinc-200">inactive</span> on this surface. Session CSV lives on{" "}
                <span className={codeChip}>/data</span> (<span className={codeChip}>sessionStorage</span>, not persisted server-side).
              </p>
            </div>
          )
        ) : null}

        {bannerKind === "insights" ? (
          insightsBannerSlot ?? (
            <div className="rounded-lg border border-zinc-700/90 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-3.5 shadow-sm ring-1 ring-black/30">
              <p className="text-sm leading-relaxed text-zinc-100">{insightsDemoNotice()}</p>
              <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-200">Rules-based diagnostic engine.</span> {rulesEngineBody}
              </p>
            </div>
          )
        ) : null}

        {bannerKind === "data" ? (
          <div className="rounded-lg border border-zinc-700/90 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-3.5 shadow-sm ring-1 ring-black/30">
            <p className="text-sm leading-relaxed text-zinc-100">{dataModeBannerSentence()}</p>
          </div>
        ) : null}

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{copy.hook}</p>
        </div>

        <section className="grid gap-0 overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-zinc-100">
          <ContextColumn title="What you&apos;re looking at" body={copy.lookingAt} />
          <ContextColumn title="Why it matters" body={copy.matters} />
          <div className="bg-white px-4 py-3.5 sm:px-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">What to do next</h2>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-zinc-800">
              {copy.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
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
