"use client";

import { useMemo } from "react";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { buildCohortsPageViewModel } from "@/lib/metrics/cohort-view-model";
import type { CohortMonthTableRowView } from "@/lib/metrics/cohort-view-model";

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) {
    return "—";
  }
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function RateCell({ value }: { value: number | null }) {
  return <span className="tabular-nums">{formatPct(value)}</span>;
}

function CohortEconomicsTable({ rows }: { rows: CohortMonthTableRowView[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <table className="min-w-[960px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-5 py-3.5">Cohort (first-order month)</th>
            <th className="px-5 py-3.5 text-right">Cohort size</th>
            <th className="px-5 py-3.5 text-right">Orders</th>
            <th className="px-5 py-3.5 text-right">Net revenue</th>
            <th className="px-5 py-3.5 text-right">Contribution</th>
            <th className="px-5 py-3.5 text-right">Latest avg revenue LTV</th>
            <th className="px-5 py-3.5 text-right">Latest avg contribution LTV</th>
            <th className="px-5 py-3.5 text-right">Month +1 active</th>
            <th className="px-5 py-3.5 text-right">Month +2 active</th>
            <th className="px-5 py-3.5 text-right">Month +3 active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortPeriod} className="border-b border-zinc-100 hover:bg-zinc-50/80">
              <td className="px-5 py-3 font-medium text-zinc-900 tabular-nums">{row.cohortPeriod}</td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{row.cohortSize.toLocaleString()}</td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{row.totalOrders.toLocaleString()}</td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{formatMoney(row.netRevenue)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{formatMoney(row.contribution)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                {formatMoney(row.latestAvgNetRevenueLtv)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                {row.latestAvgContributionLtv != null ? formatMoney(row.latestAvgContributionLtv) : "—"}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                <RateCell value={row.nextMonthActiveRate} />
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                <RateCell value={row.monthPlusTwoActiveRate} />
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                <RateCell value={row.monthPlusThreeActiveRate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CohortsPage() {
  const vm = useMemo(() => buildCohortsPageViewModel(), []);
  const { summary, cohortRows } = vm;

  return (
    <CommandCentrePageFrame routeId="cohorts" maxWidth="7xl" bannerKind="metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi title="Cohort months" value={String(summary.cohortCount)} />
          <Kpi title="Customers in demo" value={summary.totalCustomers.toLocaleString()} />
          <Kpi
            title="Largest cohort"
            value={`${summary.largestCohort.cohortPeriod}`}
            sub={`${summary.largestCohort.cohortSize.toLocaleString()} customers`}
          />
          <Kpi title="All-time repeat rate" value={formatPct(summary.repeatPurchaseRate)} />
          <Kpi title="First→second (90d)" value={formatPct(summary.firstToSecondWithin90DaysRate)} />
          <Kpi title="Aggregate net revenue" value={formatMoney(summary.aggregateNetRevenue)} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-zinc-500">Cohort table</h2>
          <p className="mb-4 text-sm leading-relaxed text-zinc-700">
            Net revenue and contribution roll up orders from cohort members. Latest average revenue LTV is cumulative{" "}
            <strong>average net revenue per cohort customer</strong> through each cohort&apos;s latest observed month on the staircase.
            Month +n active columns are cohort customers with ≥1 order in acquisition month&nbsp;+&nbsp;n (calendar UTC).
          </p>
          <CohortEconomicsTable rows={cohortRows} />
        </div>
    </CommandCentrePageFrame>
  );
}

function Kpi({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-600">{sub}</p> : null}
    </div>
  );
}
