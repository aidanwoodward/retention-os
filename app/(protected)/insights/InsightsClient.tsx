"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildInsightsPageViewModelFromDataset, type RevenueDurabilityStatus } from "@/lib/insights";
import type { InsightSeverity } from "@/lib/types/insight";

function durabilityShellClass(status: RevenueDurabilityStatus): string {
  switch (status) {
    case "Healthy":
      return "border-emerald-200/80 bg-emerald-50/50";
    case "Watch":
      return "border-amber-200/80 bg-amber-50/40";
    default:
      return "border-zinc-200/90 bg-zinc-50/70";
  }
}

function insightOuterClass(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "border-l-[3px] border-l-red-600 border-y border-r border-zinc-200/90 bg-white";
    case "warning":
      return "border-l-[3px] border-l-amber-500 border-y border-r border-zinc-200/90 bg-white";
    default:
      return "border-l-[3px] border-l-zinc-400 border-y border-r border-zinc-200/90 bg-white";
  }
}

function severityLabel(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical priority";
    case "warning":
      return "Elevated attention";
    default:
      return "Informative signal";
  }
}

function severityBadgeClass(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-950 text-white";
    case "warning":
      return "bg-amber-900 text-white";
    default:
      return "bg-zinc-800 text-white";
  }
}

export default function InsightsClient() {
  const selection = useCommandCentreDatasetSelection();

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildInsightsPageViewModelFromDataset(selection.dataset);
  }, [selection]);

  const navDashboardDescription =
    selection.isUploaded ? "Executive KPIs, posture hero, and observations driven by your session CSV snapshot." :
      "Executive KPIs, posture hero, and demo observations.";

  return (
    <CommandCentrePageFrame
      routeId="insights"
      maxWidth="6xl"
      bannerKind="insights"
      insightsBannerSlot={<MetricSourceBanner routeId="insights" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
      <section className={`rounded-xl border px-5 py-5 shadow-sm sm:px-6 sm:py-6 ${durabilityShellClass(vm.durabilityStatus)}`}>
        <h2 className="text-sm font-semibold text-zinc-900">Revenue durability posture (rules snapshot)</h2>
        <p className="mt-1.5 text-sm text-zinc-700">
          Plain-English label from the same deterministic guardrails as the dashboard —{" "}
          <span className="font-semibold text-zinc-900">not an AI summary</span> and not a precision score.
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{vm.durabilityStatus}</p>
        <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-zinc-600">
          {vm.durabilityTransparencyNotes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Operator decision cards</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
              Each card ties evidence to a commercial move — transparent rules, not black-box diagnostics.
            </p>
          </div>
        </div>
        <ul className="space-y-4">
          {vm.insights.map((insight) => (
            <li
              key={insight.id}
              className={`rounded-lg p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] ${insightOuterClass(
                insight.severity,
              )}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityBadgeClass(
                    insight.severity,
                  )}`}
                >
                  {severityLabel(insight.severity)}
                </span>
                <h3 className="text-base font-semibold leading-snug text-zinc-900">{insight.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700">{insight.evidence}</p>
              {insight.recommendedAction ?
                <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/90 px-3.5 py-3 ring-1 ring-black/[0.02]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Recommended operator move</p>
                  <p className="mt-1.5 text-sm leading-snug text-zinc-900">{insight.recommendedAction}</p>
                </div>
              : null}
              <div className="mt-4 flex flex-wrap items-baseline gap-2 border-t border-zinc-100 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Metric references</span>
                <div className="flex flex-wrap gap-1.5">
                  {insight.metricRefs.map((ref) => (
                    <code key={ref} className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] text-zinc-800">
                      {ref}
                    </code>
                  ))}
                </div>
              </div>
              {insight.confidence != null ?
                <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                  Rule coverage confidence:{" "}
                  <span className="font-semibold tabular-nums text-zinc-900">{(insight.confidence * 100).toFixed(0)}%</span>{" "}
                  (qualitative depth — <span className="font-medium">not</span> a statistical confidence interval).
                </p>
              : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200/90 bg-white px-5 py-5 shadow-sm sm:px-6">
        <h2 className="text-sm font-semibold text-zinc-900">Rules engine methodology</h2>
        <p className="mt-1 text-xs text-zinc-600">Explicit thresholds and metric definitions — transparent by design.</p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-700">
          {vm.insightsEngineMethodologyNotes.map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Explore supporting metrics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <NavCard href="/dashboard" title="Dashboard" description={navDashboardDescription} />
          <NavCard href="/acquisition" title="Acquisition economics" description="CAC, LTV:CAC, and payback when spend is attached." />
          <NavCard href="/products" title="First-product quality" description="Which entry products create durable customers." />
          <NavCard href="/data" title="Data" description="Upload, assumptions, and active source control." />
          <NavCard href="/cohorts" title="Cohort economics" description="Acquisition-month rollups and Month +N breadth." />
          <NavCard href="/retention" title="Retention & repeat" description="Journey pacing plus calendar strips." />
          <NavCard href="/ltv" title="LTV ladders" description="Staircase averages for net revenue vs contribution." />
        </div>
      </section>
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] transition hover:border-zinc-300 hover:shadow-md"
    >
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">{description}</p>
      <p className="mt-3 text-xs font-medium text-zinc-700 group-hover:text-zinc-900">Open →</p>
    </Link>
  );
}
