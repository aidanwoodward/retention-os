"use client";

import * as React from "react";
import { AnalyticalPanel, MetricStat } from "@/components/analytical";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildRetentionPageViewModelFromDataset } from "@/lib/metrics/retention-view-model";
import type { MaturityStatus, RetentionCohortTableRowView } from "@/lib/metrics/retention-view-model";

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

function RateCell({ value, maturity }: { value: number | null; maturity: MaturityStatus | null }) {
  if (maturity === "unavailable") {
    return <span className="tabular-nums text-zinc-400">—</span>;
  }

  if (maturity === "partial") {
    const formatted = formatPct(value);
    return (
      <span
        className="tabular-nums text-zinc-600 underline decoration-dotted decoration-zinc-400 underline-offset-4"
        title="Partial observation — Month +N has started but not fully elapsed"
        aria-label={`${formatted} — partial observation`}
      >
        {formatted}
      </span>
    );
  }

  return <span className="tabular-nums">{formatPct(value)}</span>;
}

function RetentionCohortTable({ rows }: { rows: RetentionCohortTableRowView[] }) {
  return (
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
              <RateCell value={row.monthPlus0ActiveRate} maturity={row.monthPlus0Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <RateCell value={row.monthPlus1ActiveRate} maturity={row.monthPlus1Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <RateCell value={row.monthPlus2ActiveRate} maturity={row.monthPlus2Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <RateCell value={row.monthPlus3ActiveRate} maturity={row.monthPlus3Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <RateCell value={row.monthPlus6ActiveRate} maturity={row.monthPlus6Maturity} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function RetentionClient() {
  const selection = useCommandCentreDatasetSelection();

  const vm = React.useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildRetentionPageViewModelFromDataset(selection.dataset);
  }, [selection]);

  return (
    <CommandCentrePageFrame
      routeId="retention"
      maxWidth="7xl"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="retention" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricStat
              label="First → second within 90 days"
              sub="Share of all customers whose second order fell within 90 days of the first"
              value={formatPct(vm.summary.firstToSecondWithin90DaysRate)}
              metricId="first_to_second_conversion"
            />
            <MetricStat
              label="All-time repeat purchase rate"
              sub="Share of all customers with 2+ orders"
              value={formatPct(vm.summary.allTimeRepeatPurchaseRate)}
              metricId="repeat_purchase_rate"
            />
            <MetricStat
              label="Median days first → second"
              sub={`Among customers with a second order · n = ${vm.summary.customersWithSecondOrder.toLocaleString()}`}
              value={formatDays(vm.summary.medianDaysToSecondOrder)}
            />
            <MetricStat
              label="Avg Month +1 active rate"
              sub="Completed Month +1 cohorts only"
              value={formatPct(vm.summary.averageMonthPlus1ActiveRate)}
              metricId="cohort_retention"
            />
          </div>

          <div className="rounded-lg border border-zinc-200/90 bg-white px-4 py-3.5 text-sm leading-relaxed text-zinc-700 shadow-sm ring-1 ring-black/[0.02]">
            <p className="font-semibold text-zinc-900">How to read this page</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                Customers means everyone in this dataset, not a reporting-period acquire count
              </li>
              <li>
                First → second uses a 90-day journey window from the first order. Customers still
                inside that window stay in the denominator — they are not excluded, and that is not
                the same as a cohort Month +N being incomplete
              </li>
              <li>
                Median days to second order is measured only among customers who already placed a
                second order
              </li>
              <li>
                Cohort Month +N maturity is whether that calendar month has fully elapsed relative
                to the dataset observation date
              </li>
            </ul>
          </div>

          <AnalyticalPanel
            title="Retention by cohort"
            description="Each row is customers acquired in that first-order month. Active rates count shoppers with ≥1 qualifying order in the target calendar month. Partial means Month +N has started but has not fully elapsed relative to the observation date — the rate is observed, not complete. Unavailable months show an em dash."
          >
            <RetentionCohortTable rows={vm.cohortRows} />
          </AnalyticalPanel>

          <DiagnosisContinueSection
            links={[
              { href: "/cohorts", label: "Cohorts" },
              { href: "/ltv", label: "LTV ladders" },
              { href: "/insights", label: "Diagnostic Insights" },
            ]}
          />
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}
