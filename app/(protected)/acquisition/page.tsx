"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AnalyticalPanel, MetricStat } from "@/components/analytical";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { frameSourceFromSelection, getDatasetSummary } from "@/lib/data-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import {
  buildAcquisitionPageViewModelFromDataset,
  type AcquisitionMonthRowView,
  type PaybackDisplayState,
} from "@/lib/metrics/acquisition-view-model";

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function PaybackCell({ state, label }: { state: PaybackDisplayState; label: string }) {
  if (state.kind === "unavailable_no_spend" || state.kind === "unavailable_no_contribution") {
    return <span className="text-zinc-500">Locked</span>;
  }
  if (state.kind === "unavailable_no_cac") {
    return <span className="tabular-nums text-zinc-400">—</span>;
  }
  return <span className="tabular-nums text-zinc-800">{label}</span>;
}

function AcquisitionMonthTable({ rows }: { rows: readonly AcquisitionMonthRowView[] }) {
  if (rows.length === 0) {
    return <p className="px-5 py-4 text-sm text-zinc-600">No acquisition months to display for this dataset.</p>;
  }

  return (
    <table className="min-w-[720px] w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <th className="px-5 py-3.5">Month</th>
          <th className="px-5 py-3.5 text-right">New customers</th>
          <th className="px-5 py-3.5 text-right">Marketing spend</th>
          <th className="px-5 py-3.5 text-right">Monthly CAC</th>
          <th className="px-5 py-3.5 text-right">Payback</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.month} className="border-b border-zinc-100 hover:bg-zinc-50/80">
            <td className="px-5 py-3 font-medium tabular-nums text-zinc-900">{row.month}</td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {row.newCustomers.toLocaleString()}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatMoney(row.marketingSpend)}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-900">
              {row.monthlyCac != null ? formatMoney(row.monthlyCac) : "—"}
            </td>
            <td className="px-5 py-3 text-right text-sm">
              <PaybackCell state={row.payback} label={row.paybackLabel} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AcquisitionPage() {
  const selection = useCommandCentreDatasetSelection();

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    const spendSource = getDatasetSummary(selection.dataset).marketingSpendSource;
    return buildAcquisitionPageViewModelFromDataset(
      selection.dataset.customers,
      selection.dataset.orders,
      selection.dataset.marginAssumptions,
      selection.dataset.marketingSpend ?? [],
      spendSource,
    );
  }, [selection]);

  const paybackCoverageLocked =
    vm != null &&
    (!vm.summary.hasSpend ||
      !vm.summary.hasContributionEconomics ||
      vm.summary.paybackEligibleCohortCount === 0);

  return (
    <CommandCentrePageFrame
      routeId="acquisition"
      maxWidth="1600"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="acquisition" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricStat
              label="Marketing spend supplied"
              value={vm.summary.hasSpend ? formatMoney(vm.summary.totalSpend) : "—"}
              sub={vm.summary.spendSourceLabel}
            />
            <MetricStat
              label="Months with calculable CAC"
              value={
                vm.summary.hasSpend
                  ? `${vm.summary.monthsWithCalculableCac} / ${vm.summary.acquisitionMonthsRepresented}`
                  : "—"
              }
              sub="Coverage of analysed months with finite monthly CAC — not a performance score"
            />
            <MetricStat
              label="Cohorts reaching payback"
              value={
                paybackCoverageLocked
                  ? "—"
                  : `${vm.summary.cohortsReachingPayback} / ${vm.summary.paybackEligibleCohortCount}`
              }
              sub={
                paybackCoverageLocked
                  ? "Locked — requires months with positive monthly CAC and a usable contribution LTV path"
                  : "Cohorts where cumulative contribution LTV recovers monthly CAC by an observed Month+N"
              }
            />
          </div>

          {!vm.summary.hasSpend ? (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3.5 text-sm leading-relaxed text-amber-950">
              <p className="font-semibold">Marketing spend required for acquisition economics</p>
              {selection.isUploaded ? (
                <p className="mt-2">
                  Uploaded orders are active, but no marketing spend is attached. Save a marketing spend % assumption
                  or CSV on{" "}
                  <Link
                    href="/data"
                    className="font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700"
                  >
                    Data
                  </Link>{" "}
                  to unlock monthly CAC and contribution payback on this page.
                </p>
              ) : (
                <p className="mt-2">
                  Marketing spend is not attached to the active dataset. Open{" "}
                  <Link
                    href="/data"
                    className="font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700"
                  >
                    Data
                  </Link>{" "}
                  to add a marketing spend % assumption or upload a spend CSV alongside your orders.
                </p>
              )}
            </div>
          ) : null}

          {vm.summary.spendIsEstimated ? (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50/70 px-4 py-3 text-sm leading-relaxed text-amber-950">
              <p className="font-semibold">Estimated · assumption-based spend</p>
              <p className="mt-1.5 text-xs">
                Monthly CAC and payback below use marketing spend synthesized from your % of net revenue assumption —
                not imported spend data.
              </p>
            </div>
          ) : null}

          {vm.preview.calendarOverlapWarnings.length > 0 ? (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Calendar / coverage</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {vm.preview.calendarOverlapWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {vm.summary.hasSpend && !vm.summary.hasContributionEconomics ? (
            <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3.5 text-sm leading-relaxed text-zinc-800">
              <p className="font-semibold text-zinc-900">Contribution economics required for payback</p>
              <p className="mt-2">
                Monthly CAC is available, but contribution payback needs a contribution LTV path. Add an order-level{" "}
                <span className="font-mono text-xs">contribution_margin</span> column or save margin assumptions on{" "}
                <Link
                  href="/data"
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                >
                  Data
                </Link>{" "}
                , or review contribution build on{" "}
                <Link
                  href="/ltv"
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                >
                  LTV
                </Link>
                .
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3.5 text-sm leading-relaxed text-zinc-800">
            <p className="font-semibold text-zinc-900">How to read this page</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-700">
              <li>Monthly CAC is marketing spend for that acquisition month divided by new customers in that month</li>
              <li>Payback uses contribution LTV only — first Month+N where cumulative average contribution meets monthly CAC</li>
              <li>Month+N is a calendar cohort offset, not elapsed days</li>
              <li>Unavailable or locked cells are not zero CAC and not failed payback</li>
              <li>Assumption-backed spend is estimated, not imported ad-platform spend</li>
            </ul>
          </div>

          {vm.summary.hasSpend ? (
            <AnalyticalPanel
              title="Acquisition month economics"
              description="Monthly CAC and contribution payback by first-order month. Unavailable cells mean the metric cannot be calculated from the attached inputs — not poor performance."
            >
              <AcquisitionMonthTable rows={vm.monthRows} />
            </AnalyticalPanel>
          ) : null}

          <DiagnosisContinueSection
            links={[
              { href: "/data", label: "Data & sources" },
              { href: "/ltv", label: "LTV ladders" },
              { href: "/cohorts", label: "Cohorts" },
            ]}
          />
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}
