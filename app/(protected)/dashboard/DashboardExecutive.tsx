"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { buildDashboardExecutiveViewModel } from "@/lib/metrics/dashboard-view-model";
import type { RevenueDurabilityStatus } from "@/lib/metrics/dashboard-view-model";

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

function durabilityCardClass(status: RevenueDurabilityStatus): string {
  switch (status) {
    case "Healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "Watch":
      return "border-amber-200 bg-amber-50 text-amber-950";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

export default function DashboardExecutive() {
  const vm = useMemo(() => buildDashboardExecutiveViewModel(), []);
  const { summary, durability, observations } = vm;

  return (
    <CommandCentrePageFrame routeId="dashboard" maxWidth="6xl" bannerKind="metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi title="Customers" value={summary.totalCustomers.toLocaleString()} />
          <Kpi title="Orders" value={summary.totalOrders.toLocaleString()} />
          <Kpi title="Total net revenue" sub="Gross minus discounts & refunds" value={formatMoney(summary.totalNetRevenue)} />
          <Kpi title="Total contribution" sub="Modeled from margin assumptions" value={formatMoney(summary.totalContribution)} />
          <Kpi title="Cohort months" value={String(summary.cohortCount)} />
          <Kpi
            title="Largest cohort"
            value={summary.largestCohort ? summary.largestCohort.cohortPeriod : "—"}
            sub={summary.largestCohort ? `${summary.largestCohort.cohortSize.toLocaleString()} customers` : undefined}
          />
          <Kpi title="All-time repeat purchase rate" sub="Share with 2+ orders" value={formatPct(summary.allTimeRepeatPurchaseRate)} />
          <Kpi
            title="First-to-second within 90 days"
            sub="Journey conversion vs first order"
            value={formatPct(summary.firstToSecondWithin90DaysRate)}
          />
          <Kpi title="Avg days first to second" sub="Among customers with a second order" value={formatDays(summary.averageDaysToSecondOrder)} />
          <Kpi title="Avg Month +1 active rate" sub="Calendar months, UTC" value={formatPct(summary.averageMonthPlus1ActiveRate)} />
          <Kpi title="Avg Month +2 active rate" value={formatPct(summary.averageMonthPlus2ActiveRate)} />
          <Kpi title="Avg Month +3 active rate" value={formatPct(summary.averageMonthPlus3ActiveRate)} />
          <Kpi
            title="Avg terminal net revenue LTV"
            sub="Mean of cohort staircase tails"
            value={formatMoney(summary.avgTerminalNetRevenueLtvAcrossCohorts)}
          />
          <Kpi
            title="Avg terminal contribution LTV"
            sub="Where modeled"
            value={formatMoney(summary.avgTerminalContributionLtvAcrossCohorts)}
          />
          <Kpi
            title="Strongest net revenue LTV cohort"
            value={summary.bestNetRevenueLtvCohort ? summary.bestNetRevenueLtvCohort.cohortPeriod : "—"}
            sub={
              summary.bestNetRevenueLtvCohort
                ? formatMoney(summary.bestNetRevenueLtvCohort.terminalNetRevenueLtv)
                : undefined
            }
          />
          <Kpi
            title="Weakest net revenue LTV cohort"
            value={summary.weakestNetRevenueLtvCohort ? summary.weakestNetRevenueLtvCohort.cohortPeriod : "—"}
            sub={
              summary.weakestNetRevenueLtvCohort
                ? formatMoney(summary.weakestNetRevenueLtvCohort.terminalNetRevenueLtv)
                : undefined
            }
          />
        </div>

        <section className={`rounded-xl border p-4 ${durabilityCardClass(durability.status)}`}>
          <h2 className="text-lg font-semibold">Revenue durability snapshot</h2>
          <p className="mt-1 text-sm opacity-90">
            Informal label (not a scored index): <strong>{durability.status}</strong>
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
            {durability.methodologyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">What we see in this demo</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
            {observations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Go deeper</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <NavCard
              href="/insights"
              title="Diagnostic Insights"
              description="Rules-based engine: evidence, recommended actions, and metric references from /lib/insights."
            />
            <NavCard
              href="/data"
              title="Data & sources"
              description="Fixture counts, canonical objects, and what is not live yet — no fake integrations."
            />
            <NavCard
              href="/cohorts"
              title="Cohort economics"
              description="First-order month rollups, revenue, contribution, and Month +N active rates."
            />
            <NavCard
              href="/retention"
              title="Retention & repeat"
              description="Portfolio repeat, first-to-second within 90 days, and cohort calendar retention table."
            />
            <NavCard
              href="/ltv"
              title="LTV ladders"
              description="Cumulative average net revenue and contribution LTV by cohort age."
            />
          </div>
        </section>
    </CommandCentrePageFrame>
  );
}

function Kpi({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-gray-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-600">{sub}</p> : null}
    </div>
  );
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow"
    >
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <p className="mt-3 text-sm font-medium text-blue-700">Continue</p>
    </Link>
  );
}
