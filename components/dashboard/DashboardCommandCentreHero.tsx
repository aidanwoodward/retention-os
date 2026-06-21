"use client";

import Link from "next/link";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type {
  DashboardCommandCentreHeroView,
  DashboardHeroSignalTileView,
  RevenueDurabilityStatus,
} from "@/lib/metrics/dashboard-view-model";

const POSTURE_STYLES: Record<RevenueDurabilityStatus, string> = {
  Healthy: "border-emerald-200/90 bg-emerald-50 text-emerald-900",
  Mixed: "border-zinc-200/90 bg-zinc-100 text-zinc-800",
  Watch: "border-amber-200/90 bg-amber-50 text-amber-950",
};

const TILE_TONE_STYLES: Record<DashboardHeroSignalTileView["tone"], string> = {
  neutral: "border-zinc-200/90 bg-white",
  positive: "border-emerald-200/80 bg-emerald-50/40",
  watch: "border-amber-200/80 bg-amber-50/40",
  locked: "border-zinc-200/90 bg-zinc-50/80",
};

const TILE_VALUE_STYLES: Record<DashboardHeroSignalTileView["tone"], string> = {
  neutral: "text-zinc-900",
  positive: "text-emerald-950",
  watch: "text-amber-950",
  locked: "text-zinc-600",
};

function SignalTile({ tile }: { tile: DashboardHeroSignalTileView }) {
  return (
    <div className={`rounded-lg border p-3 ring-1 ring-black/[0.02] ${TILE_TONE_STYLES[tile.tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <KpiMetricLabel metricId={tile.metricId} dataQuality={tile.dataQuality} tooltipSize="sm">
          {tile.title}
        </KpiMetricLabel>
      </p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${TILE_VALUE_STYLES[tile.tone]}`}>{tile.value}</p>
      {tile.sub ? <p className="mt-0.5 text-[11px] leading-snug text-zinc-600">{tile.sub}</p> : null}
    </div>
  );
}

export function DashboardCommandCentreHero({ hero }: { hero: DashboardCommandCentreHeroView }) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02]">
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-zinc-100 bg-gradient-to-br from-white to-zinc-50/70 px-5 py-5 sm:px-6 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <KpiMetricLabel metricId="revenue_durability_posture">Revenue durability posture</KpiMetricLabel>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-md border px-3 py-1 text-sm font-semibold tracking-tight ${POSTURE_STYLES[hero.posture]}`}
            >
              {hero.posture}
            </span>
          </div>
          <ul className="mt-4 space-y-1.5">
            {hero.whyBullets.map((line) => (
              <li key={line} className="text-sm leading-snug text-zinc-700">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">{hero.caveat}</p>
          <Link
            href="/insights"
            className="mt-4 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-sm ring-1 ring-black/[0.02] transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Open Diagnostic Insights →
          </Link>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Customer economics signals</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {hero.signals.map((tile) => (
              <SignalTile key={tile.id} tile={tile} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 border-t border-zinc-100 sm:grid-cols-3">
        <div className="border-b border-zinc-100 px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{hero.biggestLeak.label}</p>
          <p className="mt-1.5 text-sm leading-snug text-zinc-700">{hero.biggestLeak.detail}</p>
        </div>
        <div className="border-b border-zinc-100 px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{hero.strongestProof.label}</p>
          <p className="mt-1.5 text-sm leading-snug text-zinc-700">{hero.strongestProof.detail}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Investigate next</p>
          <p className="mt-1.5 text-sm leading-snug text-zinc-700">{hero.investigate.detail}</p>
          <Link
            href={hero.investigate.href}
            className="mt-2 inline-flex text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
          >
            {hero.investigate.label} →
          </Link>
        </div>
      </div>
    </section>
  );
}
