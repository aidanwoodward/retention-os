"use client";

import { useMemo } from "react";
import Link from "next/link";
import { buildLTVPageViewModel } from "@/lib/metrics/ltv-view-model";
import type { LTVCohortTableRowView } from "@/lib/metrics/ltv-view-model";

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

function MoneyCell({ value }: { value: number | null }) {
  return <span className="tabular-nums">{formatMoney(value)}</span>;
}

function CohortLTVTable({ rows }: { rows: LTVCohortTableRowView[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-[1200px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
            <th className="px-3 py-3">Cohort (first-order month)</th>
            <th className="px-3 py-3 text-right">Size</th>
            <th className="px-3 py-3 text-right">Net rev LTV M0</th>
            <th className="px-3 py-3 text-right">Net rev LTV M+1</th>
            <th className="px-3 py-3 text-right">Net rev LTV M+2</th>
            <th className="px-3 py-3 text-right">Net rev LTV M+3</th>
            <th className="px-3 py-3 text-right">Terminal net rev LTV</th>
            <th className="px-3 py-3 text-right">Terminal contribution LTV</th>
            <th className="px-3 py-3 text-right">Contrib LTV M0</th>
            <th className="px-3 py-3 text-right">Contrib LTV M+1</th>
            <th className="px-3 py-3 text-right">Contrib LTV M+2</th>
            <th className="px-3 py-3 text-right">Contrib LTV M+3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortPeriod} className="border-b border-gray-100 hover:bg-gray-50/70">
              <td className="px-3 py-2.5 font-medium text-gray-900 tabular-nums">{row.cohortPeriod}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{row.cohortSize.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.netRevenueLtvMonth0} />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.netRevenueLtvMonth1} />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.netRevenueLtvMonth2} />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.netRevenueLtvMonth3} />
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                <MoneyCell value={row.terminalNetRevenueLtv} />
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                <MoneyCell value={row.terminalContributionLtv} />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.contributionLtvMonth0} />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.contributionLtvMonth1} />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.contributionLtvMonth2} />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-800">
                <MoneyCell value={row.contributionLtvMonth3} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LTVPage() {
  const vm = useMemo(() => buildLTVPageViewModel(), []);
  const { summary, cohortRows } = vm;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold">Demo dataset.</strong>{" "}
          LTV ladders use the canonical Lumin &amp; River demo from <code className="rounded bg-amber-100 px-1">getDemoDataset()</code>{" "}
          and <code className="rounded bg-amber-100 px-1">/lib/metrics</code> — not live store data.
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LTV by acquisition cohort</h1>
            <p className="mt-1 text-gray-600">
              Cumulative <strong>average net revenue</strong> and <strong>contribution</strong> per customer in each first-order month
              cohort (gross revenue minus discounts and refunds for the net revenue LTV staircase).
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
              href="/retention"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Retention
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
          <Kpi title="Cohort months" value={String(summary.totalCohorts)} />
          <Kpi title="Customers in demo" value={summary.totalCustomers.toLocaleString()} />
          <Kpi
            title="Avg terminal net revenue LTV"
            sub="Mean of cohort terminal staircase values"
            value={formatMoney(summary.avgTerminalNetRevenueLtvAcrossCohorts)}
          />
          <Kpi
            title="Avg terminal contribution LTV"
            sub="Where margin model applies"
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
          <Kpi title="All-time repeat purchase rate" sub="Customers with 2+ orders" value={formatPct(summary.repeatPurchaseRate)} />
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Cohort LTV table</h2>
          <p className="mb-4 text-sm text-gray-600">
            Each column is cumulative through the end of that cohort age (calendar month offsets from acquisition month, UTC).
            Terminal values are through the latest month observed for that cohort in the demo window.
          </p>
          <CohortLTVTable rows={cohortRows} />
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
