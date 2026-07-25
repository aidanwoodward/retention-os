"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type {
  DashboardCommandCentreHeroView,
  DashboardHeroSignalTileView,
  RevenueDurabilityStatus,
} from "@/lib/metrics/dashboard-view-model";

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

const TILE_TONE_STYLES: Record<DashboardHeroSignalTileView["tone"], string> = {
  neutral: "border-zinc-200/90 bg-white",
  positive: "border-emerald-200/80 bg-emerald-50/40",
  watch: "border-amber-200/80 bg-amber-50/40",
  locked: "border-amber-200/90 bg-amber-50/80",
};

const TILE_VALUE_STYLES: Record<DashboardHeroSignalTileView["tone"], string> = {
  neutral: "text-zinc-900",
  positive: "text-emerald-950",
  watch: "text-amber-950",
  locked: "text-amber-950",
};

function leakAccentClass(hero: DashboardCommandCentreHeroView): string {
  const hasLocked = hero.signals.some((s) => s.tone === "locked");
  if (hero.posture === "Watch" || hero.signals.some((s) => s.tone === "watch")) {
    return "border-l-rose-500";
  }
  if (hasLocked || hero.posture === "Mixed") {
    return "border-l-amber-500";
  }
  return "border-l-rose-400";
}

function SignalTile({ tile }: { tile: DashboardHeroSignalTileView }) {
  const isLocked = tile.tone === "locked";

  return (
    <div className={`rounded-lg border p-2.5 ring-1 ring-black/[0.02] sm:p-3 ${TILE_TONE_STYLES[tile.tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <KpiMetricLabel metricId={tile.metricId} dataQuality={tile.dataQuality} tooltipSize="sm">
          {tile.title}
        </KpiMetricLabel>
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {isLocked ?
          <Lock className="size-3.5 shrink-0 text-amber-800/80" aria-hidden />
        : null}
        <p className={`text-base font-semibold tabular-nums sm:text-lg ${TILE_VALUE_STYLES[tile.tone]}`}>{tile.value}</p>
      </div>
      {tile.sub ?
        <p className={`mt-0.5 text-[11px] leading-snug ${isLocked ? "text-amber-900/80" : "text-zinc-600"}`}>{tile.sub}</p>
      : null}
    </div>
  );
}

export function DashboardCommandCentreHero({ hero }: { hero: DashboardCommandCentreHeroView }) {
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
          <Link
            href="/insights"
            className="mt-3 inline-flex items-center rounded-lg border border-zinc-200/90 bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm ring-1 ring-black/[0.02] transition hover:border-zinc-300 hover:bg-white"
          >
            Open Diagnostic Insights →
          </Link>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Customer economics signals</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {hero.signals.map((tile) => (
              <SignalTile key={tile.id} tile={tile} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 border-t border-zinc-100 sm:grid-cols-3">
        <div
          className={`border-b border-zinc-100 border-l-[3px] px-4 py-3 sm:border-b-0 sm:border-r ${leakAccentClass(hero)} bg-white`}
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
            href={hero.investigate.href}
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
