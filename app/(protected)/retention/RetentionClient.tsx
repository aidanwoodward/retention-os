"use client";

import * as React from "react";
import Link from "next/link";
import { buildRetentionPageViewModel } from "@/lib/metrics/retention-view-model";
import type { RetentionCohortTableRowView } from "@/lib/metrics/retention-view-model";

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

function RateCell({ value }: { value: number | null }) {
  return <span className="tabular-nums">{formatPct(value)}</span>;
}

function RetentionCohortTable({ rows }: { rows: RetentionCohortTableRowView[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-[900px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
            <th className="px-4 py-3">Cohort (first-order month)</th>
            <th className="px-4 py-3 text-right">Cohort size</th>
            <th className="px-4 py-3 text-right">Month +0 active</th>
            <th className="px-4 py-3 text-right">Month +1 active</th>
            <th className="px-4 py-3 text-right">Month +2 active</th>
            <th className="px-4 py-3 text-right">Month +3 active</th>
            <th className="px-4 py-3 text-right">Month +6 active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortPeriod} className="border-b border-gray-100 hover:bg-gray-50/70">
              <td className="px-4 py-2.5 font-medium text-gray-900 tabular-nums">{row.cohortPeriod}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{row.cohortSize.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right text-gray-800">
                <RateCell value={row.monthPlus0ActiveRate} />
              </td>
              <td className="px-4 py-2.5 text-right text-gray-800">
                <RateCell value={row.monthPlus1ActiveRate} />
              </td>
              <td className="px-4 py-2.5 text-right text-gray-800">
                <RateCell value={row.monthPlus2ActiveRate} />
              </td>
              <td className="px-4 py-2.5 text-right text-gray-800">
                <RateCell value={row.monthPlus3ActiveRate} />
              </td>
              <td className="px-4 py-2.5 text-right text-gray-800">
                <RateCell value={row.monthPlus6ActiveRate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RetentionClient() {
  const vm = React.useMemo(() => buildRetentionPageViewModel(), []);
  const { summary, cohortRows } = vm;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold">Demo dataset.</strong>{" "}
          Repeat and calendar-month retention below use the canonical Lumin &amp; River demo from{" "}
          <code className="rounded bg-amber-100 px-1">getDemoDataset()</code> and{" "}
          <code className="rounded bg-amber-100 px-1">/lib/metrics</code>, not live store data.
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retention &amp; repeat behaviour</h1>
            <p className="mt-1 text-gray-600">
              Portfolio repeat metrics and cohort-level calendar-month active rates (UTC), by first-order month.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/cohorts"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cohort economics
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi title="Customers in demo" value={summary.totalCustomers.toLocaleString()} />
          <Kpi title="All-time repeat purchase rate" sub="Share with 2+ orders" value={formatPct(summary.allTimeRepeatPurchaseRate)} />
          <Kpi
            title="First-to-second within 90 days"
            sub="Second order ≤90 days after first"
            value={formatPct(summary.firstToSecondWithin90DaysRate)}
          />
          <Kpi title="Avg days first → second" value={formatDays(summary.averageDaysToSecondOrder)} />
          <Kpi title="Median days first → second" value={formatDays(summary.medianDaysToSecondOrder)} />
          <Kpi title="Avg Month +1 active rate" sub="Across cohorts with data" value={formatPct(summary.averageMonthPlus1ActiveRate)} />
          <Kpi title="Avg Month +2 active rate" value={formatPct(summary.averageMonthPlus2ActiveRate)} />
          <Kpi title="Avg Month +3 active rate" value={formatPct(summary.averageMonthPlus3ActiveRate)} />
        </div>

        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <strong className="font-semibold">How to read these metrics.</strong> Month +N active rate is the share of the cohort who
          placed at least one order in calendar month acquisition&nbsp;month&nbsp;+&nbsp;N (UTC boundaries). First-to-second within 90 days
          is a separate journey metric: among all customers, the share whose second order occurred within 90 days of their first —
          regardless of calendar month alignment.
        </p>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Retention by cohort</h2>
          <p className="mb-4 text-sm text-gray-600">
            Each row is customers acquired in that first-order month. Active rates count shoppers with ≥1 qualifying order in the target
            calendar month (see metric engine definitions). Month +6 appears only when the demo timeline includes that horizon for a cohort.
          </p>
          <RetentionCohortTable rows={cohortRows} />
        </div>
      </div>
    </div>
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
