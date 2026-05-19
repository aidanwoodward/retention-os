"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import {
  buildDemoCommandCentreSelection,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "@/lib/data-source/client-selected-source";
import {
  buildCohortMatrixFromDataset,
  buildCohortsPageViewModelFromDataset,
  type CohortMatrixCell,
  type CohortMatrixMetricKind,
  type CohortMatrixModel,
  type CohortMonthTableRowView,
} from "@/lib/metrics";

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

function formatMatrixCell(cell: CohortMatrixCell): string {
  if (!cell.available) return "·";
  if (cell.value == null || Number.isNaN(cell.value)) return "—";
  switch (cell.formattedType) {
    case "percent":
      return `${(cell.value * 100).toFixed(1)}%`;
    case "currency":
      return formatMoney(cell.value);
    case "count":
      return Math.round(cell.value).toLocaleString();
    case "ratio":
      return cell.value.toFixed(2);
    default: {
      const _e: never = cell.formattedType;
      return String(_e);
    }
  }
}

type CohortMatrixUiMetric = Extract<
  CohortMatrixMetricKind,
  "retention_rate" | "revenue_ltv" | "contribution_ltv"
>;

const MATRIX_METRIC_OPTIONS: readonly { id: CohortMatrixUiMetric; label: string }[] = [
  { id: "retention_rate", label: "Retention %" },
  { id: "revenue_ltv", label: "Revenue LTV" },
  { id: "contribution_ltv", label: "Contribution LTV" },
];

function CohortMatrixTable({ model }: { model: CohortMatrixModel }) {
  const { columnOffsets, rows } = model;
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No cohort rows to display for this dataset.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200/90 bg-white ring-1 ring-black/[0.02]">
      <table className="min-w-max w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            <th className="sticky left-0 z-20 whitespace-nowrap border-r border-zinc-100 bg-zinc-50 px-2.5 py-2 pl-3">
              Cohort month
            </th>
            <th className="sticky left-[5.5rem] z-20 whitespace-nowrap border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-right shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
              Size
            </th>
            {columnOffsets.map((off) => (
              <th key={off} className="px-2 py-2 text-right tabular-nums text-zinc-700">
                M{off}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortPeriod} className="border-b border-zinc-100 hover:bg-zinc-50/70">
              <td className="sticky left-0 z-10 whitespace-nowrap border-r border-zinc-100 bg-white px-2.5 py-1.5 pl-3 font-medium tabular-nums text-zinc-900">
                {row.cohortPeriod}
              </td>
              <td className="sticky left-[5.5rem] z-10 whitespace-nowrap border-r border-zinc-200 bg-white px-2 py-1.5 text-right tabular-nums text-zinc-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                {row.cohortSize.toLocaleString()}
              </td>
              {row.cells.map((cell) => (
                <td
                  key={cell.offset}
                  className={`px-2 py-1.5 text-right tabular-nums ${
                    !cell.available ? "text-zinc-300"
                    : cell.value == null || Number.isNaN(cell.value) ?
                      "text-zinc-400"
                    : "text-zinc-900"
                  }`}
                >
                  {formatMatrixCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  const [selection, setSelection] = useState<CommandCentreDatasetSelection>(() => buildDemoCommandCentreSelection());
  const [matrixMetric, setMatrixMetric] = useState<CohortMatrixUiMetric>("retention_rate");

  useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource());
  }, []);

  const vm = useMemo(() => buildCohortsPageViewModelFromDataset(selection.dataset), [selection.dataset]);
  const cohortMatrix = useMemo(
    () => buildCohortMatrixFromDataset(selection.dataset, { metric: matrixMetric }),
    [selection.dataset, matrixMetric],
  );
  const { summary, cohortRows } = vm;

  return (
    <CommandCentrePageFrame
      routeId="cohorts"
      maxWidth="7xl"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="cohorts" selection={selection} />}
      activeMetricDatasetSource={selection.isUploaded ? "uploaded_csv" : "demo"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi title="Cohort months" value={String(summary.cohortCount)} />
        <Kpi title="Customers" value={summary.totalCustomers.toLocaleString()} />
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
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-zinc-500">Cohort matrix</h2>
        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-zinc-700">
          <strong className="font-medium text-zinc-900">Rows are acquisition cohorts</strong> (first-order calendar month, UTC).{" "}
          <strong className="font-medium text-zinc-900">Columns show months since first purchase</strong> (M0 = acquisition month, M1 = one month later,
          …). Blank triangle cells (·) are months not yet observed for that cohort in this dataset slice.{" "}
          <strong className="font-medium text-zinc-900">Revenue LTV</strong> is cumulative net revenue per cohort customer through each age.{" "}
          <strong className="font-medium text-zinc-900">Contribution LTV</strong> uses order-level{" "}
          <code className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[10px]">contribution_margin</code> or explicit
          margin assumptions when available.
        </p>

        {cohortMatrix.contributionLtvCaveat ?
          <div className="mb-4 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3.5 py-3 text-sm text-amber-950 ring-1 ring-amber-900/10">
            {cohortMatrix.contributionLtvCaveat}
          </div>
        : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Cell metric</span>
          <div className="flex flex-wrap gap-1.5">
            {MATRIX_METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMatrixMetric(opt.id)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                  matrixMetric === opt.id ?
                    "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <CohortMatrixTable model={cohortMatrix} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-zinc-500">Cohort summary table</h2>
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
