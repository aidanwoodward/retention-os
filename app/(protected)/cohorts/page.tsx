"use client";

import { useMemo } from "react";
import Link from "next/link";
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
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-[960px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
            <th className="px-4 py-3">Cohort (first-order month)</th>
            <th className="px-4 py-3 text-right">Cohort size</th>
            <th className="px-4 py-3 text-right">Orders</th>
            <th className="px-4 py-3 text-right">Net revenue</th>
            <th className="px-4 py-3 text-right">Contribution</th>
            <th className="px-4 py-3 text-right">Latest avg revenue LTV</th>
            <th className="px-4 py-3 text-right">Latest avg contribution LTV</th>
            <th className="px-4 py-3 text-right">Month +1 active</th>
            <th className="px-4 py-3 text-right">Month +2 active</th>
            <th className="px-4 py-3 text-right">Month +3 active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortPeriod} className="border-b border-gray-100 hover:bg-gray-50/70">
              <td className="px-4 py-2.5 font-medium text-gray-900 tabular-nums">{row.cohortPeriod}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{row.cohortSize.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{row.totalOrders.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{formatMoney(row.netRevenue)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{formatMoney(row.contribution)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                {formatMoney(row.latestAvgNetRevenueLtv)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                {row.latestAvgContributionLtv != null ? formatMoney(row.latestAvgContributionLtv) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-800">
                <RateCell value={row.nextMonthActiveRate} />
              </td>
              <td className="px-4 py-2.5 text-right text-gray-800">
                <RateCell value={row.monthPlusTwoActiveRate} />
              </td>
              <td className="px-4 py-2.5 text-right text-gray-800">
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
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold">Demo dataset.</strong>{" "}
          These cohorts use the canonical Lumin &amp; River demo from <code className="rounded bg-amber-100 px-1">getDemoDataset()</code>{" "}
          and the <code className="rounded bg-amber-100 px-1">/lib/metrics</code> engine — not live Shopify/Supabase data.
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cohort economics</h1>
            <p className="mt-1 text-gray-600">
              First-order monthly cohorts with net revenue, contribution, and next-month active rates (UTC calendar months).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

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
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Cohort table</h2>
          <p className="mb-4 text-sm text-gray-600">
            Net revenue and contribution roll up orders from cohort members. Latest average revenue LTV is cumulative{" "}
            <strong>average net revenue per cohort customer</strong> through each cohort&apos;s latest observed month on the staircase.
            Month +n active columns are cohort customers with ≥1 order in acquisition month&nbsp;+&nbsp;n (calendar UTC).
          </p>
          <CohortEconomicsTable rows={cohortRows} />
        </div>
      </div>
    </div>
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
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-gray-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-600">{sub}</p> : null}
    </div>
  );
}
