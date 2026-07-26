"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AcquisitionEconomicsPanel } from "@/components/acquisition/AcquisitionEconomicsPanel";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { frameSourceFromSelection, getDatasetSummary } from "@/lib/data-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildAcquisitionPageViewModelFromDataset } from "@/lib/metrics/acquisition-view-model";

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
          {!vm.summary.hasSpend ? (
            <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3.5 text-sm leading-relaxed text-amber-950">
              <p className="font-semibold">Marketing spend required for acquisition economics</p>
              {selection.isUploaded ? (
                <p className="mt-2">
                  Uploaded orders are active, but no marketing spend is attached. Save a marketing spend % assumption or CSV on{" "}
                  <Link href="/data" className="font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700">
                    Data
                  </Link>{" "}
                  to unlock CAC, LTV:CAC, and payback on this page.
                </p>
              ) : (
                <p className="mt-2">
                  Marketing spend is not attached to the active dataset. Open{" "}
                  <Link href="/data" className="font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700">
                    Data
                  </Link>{" "}
                  to add a marketing spend % assumption or upload a spend CSV alongside your orders.
                </p>
              )}
            </div>
          ) : null}

          {vm.summary.hasSpend ? (
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Coverage summary</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryKpi title="Customers in snapshot" value={vm.summary.customerCount.toLocaleString()} />
                <SummaryKpi title="Months with finite CAC" value={String(vm.summary.cohortMonthsWithCac)} />
                <SummaryKpi title="Cohorts with payback" value={String(vm.summary.cohortMonthsWithPayback)} />
              </div>
            </div>
          ) : null}

          <AcquisitionEconomicsPanel
            model={vm.preview}
            variant="page"
            spendIsEstimated={vm.summary.spendIsEstimated}
          />

          {!vm.summary.hasSpend ? (
            <p className="text-sm leading-relaxed text-zinc-600">
              CAC, LTV:CAC, and payback require marketing spend co-located with the selected orders source. Revenue LTV context lives on{" "}
              <Link href="/ltv" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600">
                /ltv
              </Link>
              .
            </p>
          ) : null}

          {vm.summary.hasSpend && vm.preview.ltvCac.rows.some((r) => r.cac != null && r.avgContributionLtv == null) ? (
            <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3.5 text-sm leading-relaxed text-zinc-800">
              <p className="font-semibold text-zinc-900">Contribution LTV gaps</p>
              <p className="mt-2">
                Some cohort months have CAC but no cumulative contribution LTV. Add an order-level{" "}
                <span className="font-mono text-xs">contribution_margin</span> column or save margin assumptions on{" "}
                <Link href="/data" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600">
                  /data
                </Link>{" "}
                for contribution LTV:CAC and payback.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}

function SummaryKpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}
