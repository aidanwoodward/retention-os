"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SignalDisclosure } from "@/components/analytical/SignalDisclosure";
import { ProvenanceDisclosure } from "@/components/analytical/ProvenanceDisclosure";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type { DashboardCommandCentreHeroView, RevenueDurabilityStatus } from "@/lib/metrics/dashboard-view-model";
import type { SignalProvenance } from "@/lib/provenance";
import type { Insight, InsightSeverity } from "@/lib/types/insight";

function postureShellClass(status: RevenueDurabilityStatus): string {
  switch (status) {
    case "Healthy":
      return "border-emerald-200/80 bg-emerald-50/50";
    case "Watch":
      return "border-rose-200/80 bg-rose-50/40";
    default:
      return "border-amber-200/70 bg-amber-50/25";
  }
}

const POSTURE_WORD_STYLES: Record<RevenueDurabilityStatus, string> = {
  Healthy: "text-emerald-950",
  Mixed: "text-amber-950",
  Watch: "text-rose-950",
};

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

function leakAccentClass(posture: RevenueDurabilityStatus): string {
  if (posture === "Watch") return "border-l-rose-500";
  if (posture === "Mixed") return "border-l-amber-500";
  return "border-l-emerald-500";
}

function collapsedEvidenceLine(evidence: string): string {
  const firstSentence = evidence.split(/(?<=[.!?])\s+/)[0];
  return firstSentence ?? evidence;
}

export function DashboardCommandCentreHero({
  hero,
  dashboardSignal,
  signalProvenance,
}: {
  hero: DashboardCommandCentreHeroView;
  dashboardSignal: Insight | null;
  signalProvenance: SignalProvenance | null;
}) {
  const investigateHref = hero.investigate.href === "/dashboard" ? "/insights" : hero.investigate.href;

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <div className="grid gap-0 lg:grid-cols-2">
        <div
          className={`border-b px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r lg:border-zinc-100/80 ${postureShellClass(hero.posture)}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <KpiMetricLabel metricId="revenue_durability_posture">Revenue durability posture</KpiMetricLabel>
          </p>
          <p className={`mt-2 text-2xl font-semibold tracking-tight ${POSTURE_WORD_STYLES[hero.posture]}`}>{hero.posture}</p>
          <ul className="mt-3 space-y-1">
            {hero.whyBullets.map((line) => (
              <li key={line} className="text-xs leading-snug text-zinc-700">
                · {line}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] leading-snug text-zinc-500">{hero.caveat}</p>
        </div>

        <div className="px-4 py-4 sm:px-5">
          {dashboardSignal ?
            <div className="border-l-[3px] border-l-zinc-300 pl-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityBadgeClass(dashboardSignal.severity)}`}
                >
                  {severityLabel(dashboardSignal.severity)}
                </span>
                {dashboardSignal.sufficiency === "limited" ?
                  <span className="inline-flex rounded-md border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950">
                    Limited evidence
                  </span>
                : null}
              </div>
              <h2 className="mt-2 text-base font-semibold leading-snug text-zinc-900">{dashboardSignal.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{collapsedEvidenceLine(dashboardSignal.evidence)}</p>

              <Collapsible defaultOpen={false} className="mt-3">
                <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md py-1 text-left text-xs font-semibold text-zinc-800 hover:text-zinc-950 [&[data-state=open]>svg]:rotate-180">
                  <ChevronDown className="size-3.5 shrink-0 text-zinc-500 transition-transform" aria-hidden />
                  Show detail
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4 border-t border-zinc-100 pt-4">
                  <SignalDisclosure signal={dashboardSignal} />
                  {signalProvenance ? <ProvenanceDisclosure provenance={signalProvenance} /> : null}
                </CollapsibleContent>
              </Collapsible>
            </div>
          : <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Signal unavailable</p>
              <p className="mt-1 text-xs leading-relaxed">
                Insufficient customer population to evaluate revenue durability for this source.
              </p>
            </div>
          }
        </div>
      </div>

      <div className="grid gap-0 border-t border-zinc-100 sm:grid-cols-3">
        <div
          className={`border-b border-zinc-100 border-l-[3px] px-4 py-3 sm:border-b-0 sm:border-r ${leakAccentClass(hero.posture)} bg-white`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{hero.biggestLeak.label}</p>
          <p className="mt-1 text-sm leading-snug text-zinc-800">{hero.biggestLeak.detail}</p>
        </div>
        <div className="border-b border-zinc-100 border-l-[3px] border-l-emerald-500 bg-white px-4 py-3 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{hero.strongestProof.label}</p>
          <p className="mt-1 text-sm leading-snug text-zinc-800">{hero.strongestProof.detail}</p>
        </div>
        <div className="border-l-[3px] border-l-zinc-400 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Investigate next</p>
          <p className="mt-1 text-sm leading-snug text-zinc-800">{hero.investigate.detail}</p>
          <Link
            href={investigateHref}
            className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
          >
            {hero.investigate.label}
            <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
