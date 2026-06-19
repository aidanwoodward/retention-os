"use client";

import * as React from "react";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type { MetricId } from "@/lib/metrics/metric-definitions";
import {
  buildDemoCommandCentreSelection,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "@/lib/data-source/client-selected-source";
import { buildRetentionPageViewModelFromDataset } from "@/lib/metrics/retention-view-model";
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
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <table className="min-w-[900px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-5 py-3.5">Cohort (first-order month)</th>
            <th className="px-5 py-3.5 text-right">Cohort size</th>
            <th className="px-5 py-3.5 text-right">Month +0 active</th>
            <th className="px-5 py-3.5 text-right">Month +1 active</th>
            <th className="px-5 py-3.5 text-right">Month +2 active</th>
            <th className="px-5 py-3.5 text-right">Month +3 active</th>
            <th className="px-5 py-3.5 text-right">Month +6 active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortPeriod} className="border-b border-zinc-100 hover:bg-zinc-50/80">
              <td className="px-5 py-3 font-medium text-zinc-900 tabular-nums">{row.cohortPeriod}</td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{row.cohortSize.toLocaleString()}</td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                <RateCell value={row.monthPlus0ActiveRate} />
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                <RateCell value={row.monthPlus1ActiveRate} />
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                <RateCell value={row.monthPlus2ActiveRate} />
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                <RateCell value={row.monthPlus3ActiveRate} />
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
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
  const [selection, setSelection] = React.useState<CommandCentreDatasetSelection>(() => buildDemoCommandCentreSelection());

  React.useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource());
  }, []);

  const vm = React.useMemo(() => buildRetentionPageViewModelFromDataset(selection.dataset), [selection.dataset]);
  const { summary, cohortRows } = vm;

  return (
    <CommandCentrePageFrame
      routeId="retention"
      maxWidth="7xl"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="retention" selection={selection} />}
      activeMetricDatasetSource={selection.isUploaded ? "uploaded_csv" : "demo"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Customers" value={summary.totalCustomers.toLocaleString()} />
        <Kpi
          title="All-time repeat purchase rate"
          sub="Share with 2+ orders"
          value={formatPct(summary.allTimeRepeatPurchaseRate)}
          metricId="repeat_purchase_rate"
        />
        <Kpi
          title="First-to-second within 90 days"
          sub="Second order ≤90 days after first"
          value={formatPct(summary.firstToSecondWithin90DaysRate)}
          metricId="first_to_second_conversion"
        />
        <Kpi title="Avg days first → second" value={formatDays(summary.averageDaysToSecondOrder)} />
        <Kpi title="Median days first → second" value={formatDays(summary.medianDaysToSecondOrder)} />
        <Kpi
          title="Avg Month +1 active rate"
          sub="Across cohorts with data"
          value={formatPct(summary.averageMonthPlus1ActiveRate)}
          metricId="cohort_retention"
        />
        <Kpi title="Avg Month +2 active rate" value={formatPct(summary.averageMonthPlus2ActiveRate)} metricId="cohort_retention" />
        <Kpi title="Avg Month +3 active rate" value={formatPct(summary.averageMonthPlus3ActiveRate)} metricId="cohort_retention" />
      </div>

      <p className="rounded-lg border border-zinc-200/90 bg-white px-4 py-3.5 text-sm leading-relaxed text-zinc-700 shadow-sm ring-1 ring-black/[0.02]">
        <strong className="font-semibold text-zinc-900">How to read these metrics.</strong> Month +N active rate is the share of the cohort
        who placed at least one order in calendar month acquisition&nbsp;month&nbsp;+&nbsp;N (UTC boundaries). First-to-second within 90 days
        is a separate journey metric: among all customers, the share whose second order occurred within 90 days of their first —
        regardless of calendar month alignment.
      </p>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-zinc-500">Retention by cohort</h2>
        <p className="mb-4 text-sm leading-relaxed text-zinc-700">
          Each row is customers acquired in that first-order month. Active rates count shoppers with ≥1 qualifying order in the target
          calendar month (see metric engine definitions). Month +6 appears when the active dataset timeline includes that horizon for a
          cohort.
        </p>
        <RetentionCohortTable rows={cohortRows} />
      </div>

      <DiagnosisContinueSection
        links={[
          { href: "/ltv", label: "LTV ladders" },
          { href: "/insights", label: "Diagnostic Insights" },
        ]}
      />
    </CommandCentrePageFrame>
  );
}

function Kpi({ title, value, sub, metricId }: { title: string; value: string; sub?: string; metricId?: MetricId }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <KpiMetricLabel metricId={metricId} tooltipSize="sm">
          {title}
        </KpiMetricLabel>
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-600">{sub}</p> : null}
    </div>
  );
}
