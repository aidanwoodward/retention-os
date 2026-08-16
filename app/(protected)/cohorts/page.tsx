"use client";

import { useMemo } from "react";
import { AnalyticalPanel, MetricStat } from "@/components/analytical";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import {
  buildCohortsPageViewModelFromDataset,
  type CohortMonthTableRowView,
  type MaturityStatus,
} from "@/lib/metrics";

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) {
    return "—";
  }
  return `${(rate * 100).toFixed(digits)}%`;
}

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

function ActiveRateCell({ value, maturity }: { value: number | null; maturity: MaturityStatus | null }) {
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

function RevenueLtvCell({ value, maturity }: { value: number | null; maturity: MaturityStatus | null }) {
  if (maturity === "unavailable") {
    return <span className="tabular-nums text-zinc-400">—</span>;
  }

  if (maturity === "partial") {
    const formatted = formatMoney(value);
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

  return <span className="tabular-nums">{formatMoney(value)}</span>;
}

function CohortComparisonTable({ rows }: { rows: CohortMonthTableRowView[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No cohort rows to display for this dataset.</p>;
  }

  return (
    <table className="min-w-[900px] w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <th className="px-5 py-3.5">Cohort (first-order month)</th>
          <th className="px-5 py-3.5 text-right">Size</th>
          <th className="px-5 py-3.5 text-right">M+1 active</th>
          <th className="px-5 py-3.5 text-right">M+3 active</th>
          <th className="px-5 py-3.5 text-right">M+1 Revenue LTV</th>
          <th className="px-5 py-3.5 text-right">M+3 Revenue LTV</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.cohortPeriod} className="border-b border-zinc-100 hover:bg-zinc-50/80">
            <td className="px-5 py-3 font-medium text-zinc-900 tabular-nums">{row.cohortPeriod}</td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{row.cohortSize.toLocaleString()}</td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <ActiveRateCell value={row.monthPlus1ActiveRate} maturity={row.monthPlus1ActiveMaturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <ActiveRateCell value={row.monthPlus3ActiveRate} maturity={row.monthPlus3ActiveMaturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <RevenueLtvCell value={row.monthPlus1RevenueLtv} maturity={row.monthPlus1RevenueLtvMaturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <RevenueLtvCell value={row.monthPlus3RevenueLtv} maturity={row.monthPlus3RevenueLtvMaturity} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CohortsPage() {
  const selection = useCommandCentreDatasetSelection();

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildCohortsPageViewModelFromDataset(selection.dataset);
  }, [selection]);

  const comparableDisplay =
    vm == null ? "—" : `${vm.summary.completedMonthPlus3CohortCount} / ${vm.summary.totalCohortCount}`;

  return (
    <CommandCentrePageFrame
      routeId="cohorts"
      maxWidth="7xl"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="cohorts" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricStat
              label="Avg completed M+1 active rate"
              sub="Completed observations only · unweighted across included cohorts"
              value={formatPct(vm.summary.avgCompletedMonthPlus1ActiveRate)}
              metricId="cohort_retention"
            />
            <MetricStat
              label="Avg completed M+3 Revenue LTV"
              sub="Completed cohorts only · unweighted"
              value={formatMoney(vm.summary.avgCompletedMonthPlus3RevenueLtv)}
            />
            <MetricStat
              label="Comparable cohorts at M+3"
              sub="Cohorts with a completed M+3 observation"
              value={comparableDisplay}
            />
          </div>

          <div className="rounded-lg border border-zinc-200/90 bg-white px-4 py-3.5 text-sm leading-relaxed text-zinc-700 shadow-sm ring-1 ring-black/[0.02]">
            <p className="font-semibold text-zinc-900">How to read this page</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                Each row is an acquisition cohort (first-order calendar month, UTC). Compare cohorts at the same
                age — M+1 with M+1, M+3 with M+3 — not latest observed values across different ages.
              </li>
              <li>
                Month+N is a calendar cohort-month offset, not an elapsed-day window. Executive averages include
                completed observations only.
              </li>
              <li>
                M+1 active and M+3 active count customers with at least one identified order in that calendar month,
                divided by cohort size. This is not cohort revenue retention.
              </li>
              <li>
                Partial cells show observed values while that month is still in progress — incomplete observation,
                not weak performance. Unavailable months show an em dash.
              </li>
              <li>
                Revenue LTV deep dives and contribution provenance live on{" "}
                <span className="font-medium text-zinc-900">LTV</span>; retention journey metrics live on{" "}
                <span className="font-medium text-zinc-900">Retention</span>.
              </li>
            </ul>
          </div>

          <AnalyticalPanel
            title="Cohort comparison at same age"
            description="Each row is customers acquired in that first-order month. Active rates and Revenue LTV are read at the same calendar Month+N offset across cohorts. Partial means Month+N has started but has not fully elapsed relative to the observation date."
          >
            <CohortComparisonTable rows={vm.cohortRows} />
          </AnalyticalPanel>

          <DiagnosisContinueSection
            links={[
              { href: "/retention", label: "Retention" },
              { href: "/ltv", label: "LTV" },
              { href: "/insights", label: "Diagnostic Insights" },
            ]}
          />
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}
