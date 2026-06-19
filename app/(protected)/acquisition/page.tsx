"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useState } from "react";
import { AcquisitionEconomicsPanel } from "@/components/acquisition/AcquisitionEconomicsPanel";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import {
  buildDemoCommandCentreSelection,
  getDatasetSummary,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "@/lib/data-source";
import { buildAcquisitionPageViewModelFromDataset } from "@/lib/metrics/acquisition-view-model";

export default function AcquisitionPage() {
  const [selection, setSelection] = useState<CommandCentreDatasetSelection>(() => buildDemoCommandCentreSelection());

  useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource());
  }, []);

  const vm = useMemo(() => {
    const spendSource = getDatasetSummary(selection.dataset).marketingSpendSource;
    return buildAcquisitionPageViewModelFromDataset(
      selection.dataset.customers,
      selection.dataset.orders,
      selection.dataset.marginAssumptions,
      selection.dataset.marketingSpend ?? [],
      spendSource,
    );
  }, [selection.dataset]);

  const { summary, preview } = vm;
  const spendIsEstimated = summary.spendIsEstimated;

  return (
    <CommandCentrePageFrame
      routeId="acquisition"
      maxWidth="1600"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="acquisition" selection={selection} />}
      activeMetricDatasetSource={selection.isUploaded ? "uploaded_csv" : "demo"}
    >
      {!summary.hasSpend ?
        <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3.5 text-sm leading-relaxed text-amber-950">
          <p className="font-semibold">Marketing spend required for acquisition economics</p>
          {selection.isUploaded ?
            <p className="mt-2">
              Uploaded orders are active, but no marketing spend is attached. Save a marketing spend % assumption or CSV on{" "}
              <Link href="/data" className="font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700">
                Data
              </Link>{" "}
              to unlock CAC, LTV:CAC, and payback on this page.
            </p>
          : <p className="mt-2">
              Marketing spend is not attached to the active dataset. Open{" "}
              <Link href="/data" className="font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700">
                Data
              </Link>{" "}
              to add a marketing spend % assumption or upload a spend CSV alongside your orders.
            </p>
          }
        </div>
      : null}

      {summary.hasSpend ?
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Coverage summary</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryKpi title="Customers in snapshot" value={summary.customerCount.toLocaleString()} />
            <SummaryKpi title="Months with finite CAC" value={String(summary.cohortMonthsWithCac)} />
            <SummaryKpi title="Cohorts with payback" value={String(summary.cohortMonthsWithPayback)} />
          </div>
        </div>
      : null}

      <AcquisitionEconomicsPanel model={preview} variant="page" spendIsEstimated={spendIsEstimated} />

      {!summary.hasSpend ?
        <p className="text-sm leading-relaxed text-zinc-600">
          CAC, LTV:CAC, and payback require marketing spend co-located with the selected orders source. Revenue LTV context lives on{" "}
          <Link href="/ltv" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600">
            /ltv
          </Link>
          .
        </p>
      : null}

      {summary.hasSpend && preview.ltvCac.rows.some((r) => r.cac != null && r.avgContributionLtv == null) ?
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
      : null}
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
