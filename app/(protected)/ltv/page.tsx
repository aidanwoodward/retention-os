"use client";

import { useMemo } from "react";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type { MetricId } from "@/lib/metrics/metric-definitions";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildLTVPageViewModelFromDataset } from "@/lib/metrics/ltv-view-model";
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
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <table className="min-w-[1200px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-4 py-3.5">Cohort (first-order month)</th>
            <th className="px-4 py-3.5 text-right">Size</th>
            <th className="px-4 py-3.5 text-right">Net rev LTV M0</th>
            <th className="px-4 py-3.5 text-right">Net rev LTV M+1</th>
            <th className="px-4 py-3.5 text-right">Net rev LTV M+2</th>
            <th className="px-4 py-3.5 text-right">Net rev LTV M+3</th>
            <th className="px-4 py-3.5 text-right">Terminal net rev LTV</th>
            <th className="px-4 py-3.5 text-right">Terminal contribution LTV</th>
            <th className="px-4 py-3.5 text-right">Contrib LTV M0</th>
            <th className="px-4 py-3.5 text-right">Contrib LTV M+1</th>
            <th className="px-4 py-3.5 text-right">Contrib LTV M+2</th>
            <th className="px-4 py-3.5 text-right">Contrib LTV M+3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortPeriod} className="border-b border-zinc-100 hover:bg-zinc-50/80">
              <td className="px-4 py-3 font-medium text-zinc-900 tabular-nums">{row.cohortPeriod}</td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{row.cohortSize.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                <MoneyCell value={row.netRevenueLtvMonth0} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                <MoneyCell value={row.netRevenueLtvMonth1} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                <MoneyCell value={row.netRevenueLtvMonth2} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                <MoneyCell value={row.netRevenueLtvMonth3} />
              </td>
              <td className="px-4 py-3 text-right font-medium text-zinc-900">
                <MoneyCell value={row.terminalNetRevenueLtv} />
              </td>
              <td className="px-4 py-3 text-right font-medium text-zinc-900">
                <MoneyCell value={row.terminalContributionLtv} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                <MoneyCell value={row.contributionLtvMonth0} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                <MoneyCell value={row.contributionLtvMonth1} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                <MoneyCell value={row.contributionLtvMonth2} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
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
  const selection = useCommandCentreDatasetSelection();

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildLTVPageViewModelFromDataset(selection.dataset);
  }, [selection]);

  return (
    <CommandCentrePageFrame
      routeId="ltv"
      maxWidth="1600"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="ltv" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
      <div className="space-y-6">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Staircase tails & cohort quality</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              title="Avg terminal net revenue LTV"
              sub="Mean across cohort staircase terminals"
              value={formatMoney(vm.summary.avgTerminalNetRevenueLtvAcrossCohorts)}
              metricId="revenue_ltv"
            />
            <Kpi
              title="Avg terminal contribution LTV"
              sub="Where margin model applies"
              value={formatMoney(vm.summary.avgTerminalContributionLtvAcrossCohorts)}
              metricId="contribution_ltv"
            />
            <Kpi
              title="Strongest net revenue LTV cohort"
              value={vm.summary.bestNetRevenueLtvCohort ? vm.summary.bestNetRevenueLtvCohort.cohortPeriod : "—"}
              sub={
                vm.summary.bestNetRevenueLtvCohort
                  ? formatMoney(vm.summary.bestNetRevenueLtvCohort.terminalNetRevenueLtv)
                  : undefined
              }
            />
            <Kpi
              title="Weakest net revenue LTV cohort"
              value={vm.summary.weakestNetRevenueLtvCohort ? vm.summary.weakestNetRevenueLtvCohort.cohortPeriod : "—"}
              sub={
                vm.summary.weakestNetRevenueLtvCohort
                  ? formatMoney(vm.summary.weakestNetRevenueLtvCohort.terminalNetRevenueLtv)
                  : undefined
              }
            />
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Portfolio context</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi title="First-order cohort months" value={String(vm.summary.totalCohorts)} />
            <Kpi title="Customers" value={vm.summary.totalCustomers.toLocaleString()} />
            <Kpi title="All-time repeat purchase rate" sub="Customers with ≥2 orders" value={formatPct(vm.summary.repeatPurchaseRate)} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-zinc-500">Cohort LTV ladder table</h2>
        <p className="mb-4 text-sm leading-relaxed text-zinc-700">
          Each column is cumulative through that cohort-age offset (calendar month from acquisition month, UTC). Terminal values trace
          the latest observed staircase month in the active dataset window — use strongest vs weakest rows above when judging
          acquisition-quality variance alongside net revenue versus contribution ladders.
        </p>
        <CohortLTVTable rows={vm.cohortRows} />
      </div>

      <DiagnosisContinueSection
        links={[
          { href: "/acquisition", label: "Acquisition economics" },
          { href: "/insights", label: "Diagnostic Insights" },
        ]}
      />
        </>
      ) : null}
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
