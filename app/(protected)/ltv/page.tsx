"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AnalyticalPanel, MetricStat } from "@/components/analytical";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import {
  buildLTVPageViewModelFromDataset,
  type LTVCohortTableRowView,
  type LtvContributionSourcePath,
  type MaturityStatus,
} from "@/lib/metrics/ltv-view-model";

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

function MoneyCell({ value, maturity }: { value: number | null; maturity: MaturityStatus | null }) {
  if (maturity === "unavailable") {
    return <span className="tabular-nums text-zinc-400">—</span>;
  }

  if (maturity === "partial") {
    const formatted = formatMoney(value);
    return (
      <span
        className="tabular-nums text-zinc-600 underline decoration-dotted decoration-zinc-400 underline-offset-4"
        title="Partial observation — this cohort month has started but has not fully elapsed"
        aria-label={`${formatted} — partial observation`}
      >
        {formatted}
      </span>
    );
  }

  return <span className="tabular-nums">{formatMoney(value)}</span>;
}

function LatestObservedCell({
  value,
  offset,
  maturity,
}: {
  value: number | null;
  offset: number | null;
  maturity: MaturityStatus | null;
}) {
  if (maturity === "unavailable") {
    return <span className="tabular-nums text-zinc-400">—</span>;
  }

  const formatted = formatMoney(value);
  const offsetLabel = offset == null ? null : `M+${offset}`;

  if (maturity === "partial") {
    return (
      <span
        className="tabular-nums text-zinc-600 underline decoration-dotted decoration-zinc-400 underline-offset-4"
        title="Partial observation — this cohort month has started but has not fully elapsed"
        aria-label={`${formatted}${offsetLabel ? ` ${offsetLabel}` : ""} — partial observation`}
      >
        {formatted}
        {offsetLabel ? <span className="ml-1 text-xs font-normal text-zinc-500">{offsetLabel}</span> : null}
      </span>
    );
  }

  return (
    <span className="tabular-nums">
      {formatted}
      {offsetLabel ? <span className="ml-1 text-xs font-normal text-zinc-500">{offsetLabel}</span> : null}
    </span>
  );
}

function contributionUnlockCopy(path: LtvContributionSourcePath): string {
  if (path === "order_level") {
    return "Contribution LTV uses order-level contribution values across the observed orders.";
  }
  if (path === "margin_assumption") {
    return "Contribution LTV is modelled using the saved margin assumption.";
  }
  if (path === "mixed") {
    return "Contribution LTV combines available order-level contribution values with the saved margin assumption where order-level contribution is missing.";
  }
  if (path === "partial_order_level") {
    return "Contribution LTV uses available order-level contribution values. Some orders have no contribution input, so contribution coverage is incomplete.";
  }
  return "Contribution LTV is unavailable because no usable contribution input is available. Add contribution data or a margin assumption in Data.";
}

function RevenueLTVTable({ rows }: { rows: LTVCohortTableRowView[] }) {
  return (
    <table className="min-w-[900px] w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <th className="px-5 py-3.5">Cohort (first-order month)</th>
          <th className="px-5 py-3.5 text-right">Customers</th>
          <th className="px-5 py-3.5 text-right">Month +0</th>
          <th className="px-5 py-3.5 text-right">Month +1</th>
          <th className="px-5 py-3.5 text-right">Month +2</th>
          <th className="px-5 py-3.5 text-right">Month +3</th>
          <th className="px-5 py-3.5 text-right">Latest observed (M+N)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.cohortPeriod} className="border-b border-zinc-100 hover:bg-zinc-50/80">
            <td className="px-5 py-3 font-medium text-zinc-900 tabular-nums">{row.cohortPeriod}</td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{row.cohortSize.toLocaleString()}</td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.netRevenueLtvMonth0} maturity={row.monthPlus0Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.netRevenueLtvMonth1} maturity={row.monthPlus1Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.netRevenueLtvMonth2} maturity={row.monthPlus2Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.netRevenueLtvMonth3} maturity={row.monthPlus3Maturity} />
            </td>
            <td className="px-5 py-3 text-right font-medium text-zinc-900">
              <LatestObservedCell
                value={row.latestObservedNetRevenueLtv}
                offset={row.latestObservedOffset}
                maturity={row.latestObservedMaturity}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ContributionLTVTable({ rows }: { rows: LTVCohortTableRowView[] }) {
  return (
    <table className="min-w-[900px] w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <th className="px-5 py-3.5">Cohort (first-order month)</th>
          <th className="px-5 py-3.5 text-right">Customers</th>
          <th className="px-5 py-3.5 text-right">Month +0</th>
          <th className="px-5 py-3.5 text-right">Month +1</th>
          <th className="px-5 py-3.5 text-right">Month +2</th>
          <th className="px-5 py-3.5 text-right">Month +3</th>
          <th className="px-5 py-3.5 text-right">Latest observed (M+N)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.cohortPeriod} className="border-b border-zinc-100 hover:bg-zinc-50/80">
            <td className="px-5 py-3 font-medium text-zinc-900 tabular-nums">{row.cohortPeriod}</td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">{row.cohortSize.toLocaleString()}</td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.contributionLtvMonth0} maturity={row.monthPlus0Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.contributionLtvMonth1} maturity={row.monthPlus1Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.contributionLtvMonth2} maturity={row.monthPlus2Maturity} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              <MoneyCell value={row.contributionLtvMonth3} maturity={row.monthPlus3Maturity} />
            </td>
            <td className="px-5 py-3 text-right font-medium text-zinc-900">
              <LatestObservedCell
                value={row.latestObservedContributionLtv}
                offset={row.latestObservedOffset}
                maturity={row.latestObservedMaturity}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LTVPage() {
  const selection = useCommandCentreDatasetSelection();

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildLTVPageViewModelFromDataset(selection.dataset);
  }, [selection]);

  const contributionLocked = vm?.summary.contributionSourcePath === "none";

  return (
    <CommandCentrePageFrame
      routeId="ltv"
      maxWidth="7xl"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="ltv" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricStat
              label="Avg completed Month +1 Revenue LTV"
              sub="Completed Month +1 cohorts only · unweighted"
              value={formatMoney(vm.summary.avgCompletedMonthPlus1NetRevenueLtv)}
              metricId="revenue_ltv"
            />
            <MetricStat
              label="Avg completed Month +1 Contribution LTV"
              sub="Completed Month +1 cohorts only · unweighted"
              value={formatMoney(vm.summary.avgCompletedMonthPlus1ContributionLtv)}
              metricId="contribution_ltv"
              dataQuality={vm.summary.contributionDataQuality}
            />
            <MetricStat
              label="Avg completed Month +3 Revenue LTV"
              sub="Completed Month +3 cohorts only · unweighted"
              value={formatMoney(vm.summary.avgCompletedMonthPlus3NetRevenueLtv)}
              metricId="revenue_ltv"
            />
            <MetricStat
              label="Avg completed Month +3 Contribution LTV"
              sub="Completed Month +3 cohorts only · unweighted"
              value={formatMoney(vm.summary.avgCompletedMonthPlus3ContributionLtv)}
              metricId="contribution_ltv"
              dataQuality={vm.summary.contributionDataQuality}
            />
          </div>

          <div className="rounded-lg border border-zinc-200/90 bg-white px-4 py-3.5 text-sm leading-relaxed text-zinc-700 shadow-sm ring-1 ring-black/[0.02]">
            <p className="font-semibold text-zinc-900">How to read this page</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                Month +N is a calendar cohort offset from the first-order month — not an elapsed 30, 60, 90, or
                180-day window
              </li>
              <li>
                Revenue LTV is cumulative net merchandise value per customer after canonical discounts and refunds
              </li>
              <li>
                Contribution LTV needs order-level contribution values or a saved margin assumption on Data; it is
                not the same evidence quality as Revenue LTV
              </li>
              <li>
                Recent cohort points can be Partial because that calendar month is still being observed — that is
                incomplete observation, not weak value
              </li>
              <li>
                Latest observed is the last staircase point in this dataset for that cohort (offset shown as M+N),
                not a mature lifetime value
              </li>
              <li>CAC and payback analysis lives under Acquisition economics in this MVP</li>
            </ul>
          </div>

          <AnalyticalPanel
            title="Revenue LTV by cohort"
            description="Each row is customers acquired in that first-order month. Values are cumulative net merchandise LTV through that calendar Month +N. Partial means the cohort month has started but has not fully elapsed. Latest observed shows the last staircase point and its Month+N offset — not a mature lifetime value."
          >
            <RevenueLTVTable rows={vm.cohortRows} />
          </AnalyticalPanel>

          <AnalyticalPanel
            title="Contribution LTV by cohort"
            description={
              contributionLocked
                ? "Contribution LTV cannot be shown until a contribution path exists. Revenue LTV above remains valid."
                : "Same calendar Month +N offsets as Revenue LTV. Values are cumulative contribution dollars per customer. Partial means the cohort month has started but has not fully elapsed."
            }
            footer={
              contributionLocked ? (
                <p>
                  {contributionUnlockCopy("none")} Add a margin assumption on{" "}
                  <Link href="/data" className="font-medium text-zinc-900 underline underline-offset-2">
                    Data
                  </Link>{" "}
                  to unlock this analysis.
                </p>
              ) : (
                <p>{contributionUnlockCopy(vm.summary.contributionSourcePath)}</p>
              )
            }
          >
            <ContributionLTVTable rows={vm.cohortRows} />
          </AnalyticalPanel>

          <DiagnosisContinueSection
            links={[
              { href: "/cohorts", label: "Cohorts" },
              { href: "/acquisition", label: "Acquisition economics" },
              { href: "/insights", label: "Diagnostic Insights" },
            ]}
          />
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}
