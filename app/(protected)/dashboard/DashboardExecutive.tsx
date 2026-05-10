"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { buildInsightsPageViewModel } from "@/lib/insights";
import { buildDashboardExecutiveViewModel } from "@/lib/metrics/dashboard-view-model";
import type { RevenueDurabilityStatus } from "@/lib/metrics/dashboard-view-model";

const MUTED_BAND = "#e7e5e4";

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) {
    return "—";
  }
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatDays(days: number | null): string {
  if (days == null || Number.isNaN(days)) {
    return "—";
  }
  return `${days.toFixed(1)} days`;
}

function severityOrder(s: "critical" | "warning" | "info"): number {
  switch (s) {
    case "critical":
      return 0;
    case "warning":
      return 1;
    default:
      return 2;
  }
}

function postureDiscColors(status: RevenueDurabilityStatus): { h: string; m: string; w: string } {
  switch (status) {
    case "Healthy":
      return {
        h: "#059669",
        m: MUTED_BAND,
        w: MUTED_BAND,
      };
    case "Mixed":
      return {
        h: MUTED_BAND,
        m: "#ca8a04",
        w: MUTED_BAND,
      };
    default:
      return {
        h: MUTED_BAND,
        m: MUTED_BAND,
        w: "#ea580c",
      };
  }
}

function PostureDisc({ status }: { readonly status: RevenueDurabilityStatus }) {
  const { h, m, w } = postureDiscColors(status);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative h-28 w-28 shrink-0 rounded-full border border-zinc-200/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]"
        style={{
          background: `conic-gradient(from -90deg, ${h} 0deg 120deg, ${m} 120deg 240deg, ${w} 240deg 360deg)`,
        }}
        role="img"
        aria-label="Illustrative posture disc: three equal bands (Healthy · Mixed · Watch). Not a composite score or weighted index."
      />
      <p className="max-w-[7.5rem] text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        Posture visual — not scored
      </p>
    </div>
  );
}

const kpiPrimary =
  "rounded-lg border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]";
const kpiSecondary =
  "rounded-lg border border-zinc-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]";
const kpiTertiary =
  "rounded-lg border border-zinc-100 bg-zinc-50/70 p-3.5 ring-1 ring-black/[0.02]";

export default function DashboardExecutive() {
  const vm = useMemo(() => buildDashboardExecutiveViewModel(), []);
  const insightVm = useMemo(() => buildInsightsPageViewModel(), []);
  const { summary, durability, observations } = vm;

  const riskSignals = useMemo(() => {
    const ranked = [...insightVm.insights].sort((a, b) => {
      const o = severityOrder(a.severity) - severityOrder(b.severity);
      if (o !== 0) return o;
      return a.title.localeCompare(b.title);
    });
    return ranked.filter((i) => i.severity === "critical" || i.severity === "warning").slice(0, 3);
  }, [insightVm.insights]);

  const nextMoves = useMemo(() => {
    const ranked = [...insightVm.insights].sort((a, b) => {
      const o = severityOrder(a.severity) - severityOrder(b.severity);
      if (o !== 0) return o;
      return a.title.localeCompare(b.title);
    });
    const outs: string[] = [];
    for (const row of ranked) {
      const a = row.recommendedAction?.trim();
      if (a && !outs.includes(a)) outs.push(a);
      if (outs.length >= 4) break;
    }
    return outs;
  }, [insightVm.insights]);

  return (
    <CommandCentrePageFrame routeId="dashboard" maxWidth="6xl" bannerKind="metrics">
      <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
        <div className="border-b border-zinc-100 bg-gradient-to-br from-white to-zinc-50/70 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <PostureDisc status={durability.status} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Revenue durability posture
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{durability.status}</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
                  Informal MVP label driven by repeatable threshold checks — identical transparency copy underpins Diagnostic
                  Insights. This is posture, not a finance-grade durability index.
                </p>
                <ul className="mt-3 space-y-1 text-xs leading-relaxed text-zinc-500">
                  {durability.methodologyNotes.map((note) => (
                    <li key={note}>· {note}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-4 border-t border-zinc-100 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Deterministic signals</p>
                {riskSignals.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-600">No warning or critical diagnostics in this fixture slice.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {riskSignals.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-800 shadow-sm ring-1 ring-black/[0.02]"
                      >
                        <span
                          className={
                            s.severity === "critical"
                              ? "mr-2 font-semibold text-red-700"
                              : "mr-2 font-semibold text-amber-700"
                          }
                        >
                          {s.severity === "critical" ? "Risk" : "Watch"}
                        </span>
                        <span>{s.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Recommended moves</p>
                {nextMoves.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-600">Extend rules coverage to unlock more prioritized actions.</p>
                ) : (
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-snug text-zinc-700">
                    {nextMoves.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                )}
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Derived from deterministic insight cards (<span className="font-mono text-[11px]">/lib/insights</span>
                  ).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Executive KPIs</h2>
        <p className="mt-1 text-xs text-zinc-600">Primary portfolio levers, then fundamentals, then dispersion context.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            className={kpiPrimary}
            prominent
            title="All-time repeat purchase rate"
            sub="Customers with ≥2 qualifying orders"
            value={formatPct(summary.allTimeRepeatPurchaseRate)}
          />
          <MetricCard
            className={kpiPrimary}
            prominent
            title="First→second within 90 days"
            sub="Vs first qualifying order timestamp"
            value={formatPct(summary.firstToSecondWithin90DaysRate)}
          />
          <MetricCard
            className={kpiPrimary}
            prominent
            title="Avg terminal net revenue LTV"
            sub="Across cohort staircase tails"
            value={formatMoney(summary.avgTerminalNetRevenueLtvAcrossCohorts)}
          />
          <MetricCard
            className={kpiPrimary}
            prominent
            title="Avg terminal contribution LTV"
            sub="Where margin model applies"
            value={formatMoney(summary.avgTerminalContributionLtvAcrossCohorts)}
          />
        </div>

        <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Portfolio fundamentals</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            className={kpiSecondary}
            title="Customers"
            value={summary.totalCustomers.toLocaleString()}
          />
          <MetricCard className={kpiSecondary} title="Orders" value={summary.totalOrders.toLocaleString()} />
          <MetricCard
            className={kpiSecondary}
            title="Total net revenue"
            sub="Gross minus discounts & refunds"
            value={formatMoney(summary.totalNetRevenue)}
          />
          <MetricCard
            className={kpiSecondary}
            title="Total contribution"
            sub="Modeled from margin assumptions"
            value={formatMoney(summary.totalContribution)}
          />
          <MetricCard className={kpiSecondary} title="Cohort months (first-order)" value={String(summary.cohortCount)} />
          <MetricCard
            className={kpiSecondary}
            title="Avg days first → second"
            sub="Among customers with ≥2 orders"
            value={formatDays(summary.averageDaysToSecondOrder)}
          />
        </div>

        <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Calendar retention & dispersion</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            className={kpiTertiary}
            title="Largest cohort"
            value={summary.largestCohort ? summary.largestCohort.cohortPeriod : "—"}
            sub={summary.largestCohort ? `${summary.largestCohort.cohortSize.toLocaleString()} customers` : undefined}
          />
          <MetricCard
            className={kpiTertiary}
            title="Avg Month +1 active"
            sub="UTC calendar months"
            value={formatPct(summary.averageMonthPlus1ActiveRate)}
          />
          <MetricCard className={kpiTertiary} title="Avg Month +2 active" value={formatPct(summary.averageMonthPlus2ActiveRate)} />
          <MetricCard className={kpiTertiary} title="Avg Month +3 active" value={formatPct(summary.averageMonthPlus3ActiveRate)} />
          <MetricCard
            className={kpiTertiary}
            title="Strongest net rev LTV cohort"
            value={summary.bestNetRevenueLtvCohort ? summary.bestNetRevenueLtvCohort.cohortPeriod : "—"}
            sub={
              summary.bestNetRevenueLtvCohort
                ? formatMoney(summary.bestNetRevenueLtvCohort.terminalNetRevenueLtv)
                : undefined
            }
          />
          <MetricCard
            className={kpiTertiary}
            title="Weakest net rev LTV cohort"
            value={summary.weakestNetRevenueLtvCohort ? summary.weakestNetRevenueLtvCohort.cohortPeriod : "—"}
            sub={
              summary.weakestNetRevenueLtvCohort
                ? formatMoney(summary.weakestNetRevenueLtvCohort.terminalNetRevenueLtv)
                : undefined
            }
          />
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">What we see in this demo</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-700">
          {observations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Go deeper</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <NavCard
            href="/insights"
            title="Diagnostic Insights"
            description="Rules-based operator cards with evidence, actions, and metric refs."
          />
          <NavCard href="/data" title="Data & sources" description="Fixture lineage and honest integration posture." />
          <NavCard href="/cohorts" title="Cohort economics" description="Acquisition-month rollups and Month +N breadth." />
          <NavCard href="/retention" title="Retention & repeat" description="Journey pacing plus calendar strips." />
          <NavCard href="/ltv" title="LTV ladders" description="Cumulative net revenue vs contribution staircases." />
        </div>
      </section>
    </CommandCentrePageFrame>
  );
}

function MetricCard({
  className,
  title,
  value,
  sub,
  prominent,
}: {
  className: string;
  title: string;
  value: string;
  sub?: string;
  prominent?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
      <p className={`mt-2 font-semibold tabular-nums text-zinc-900 ${prominent ? "text-2xl" : "text-xl"}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs leading-snug text-zinc-600">{sub}</p> : null}
    </div>
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
      <p className="mt-3 text-xs font-medium text-zinc-700 group-hover:text-zinc-900">Continue →</p>
    </Link>
  );
}
