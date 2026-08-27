"use client";

import { useMemo } from "react";
import Link from "next/link";
import { EvidenceMetric } from "@/components/analytical/EvidenceMetric";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { DashboardCommandCentreHero } from "@/components/dashboard/DashboardCommandCentreHero";
import { DashboardSpinePanels } from "@/components/dashboard/DashboardSpinePanels";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildDashboardPresentationViewModelFromDataset } from "@/lib/mvp/dashboard-presentation-view-model";

export default function DashboardExecutive() {
  const selection = useCommandCentreDatasetSelection();

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildDashboardPresentationViewModelFromDataset(selection.dataset);
  }, [selection]);

  return (
    <CommandCentrePageFrame
      routeId="dashboard"
      maxWidth="6xl"
      bannerKind="metrics"
      hideContextCard
      metricsBannerSlot={
        vm != null ?
          <MetricSourceBanner routeId="dashboard" selection={selection} reportingMeta={vm.reportingMeta} />
        : <MetricSourceBanner routeId="dashboard" selection={selection} />
      }
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
          <DashboardCommandCentreHero
            hero={vm.metric.hero}
            dashboardSignal={vm.dashboardSignal}
            signalProvenance={vm.signalProvenance}
          />

          {vm.evidenceMetrics.length > 0 ?
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Proof metrics</h2>
              <p className="mt-1 text-xs text-zinc-600">Essential evidence supporting the durability read.</p>
              <div
                className={`mt-4 grid gap-4 ${
                  vm.evidenceMetrics.length >= 4
                    ? "sm:grid-cols-2 lg:grid-cols-4"
                    : vm.evidenceMetrics.length === 3
                      ? "sm:grid-cols-2 lg:grid-cols-3"
                      : "sm:grid-cols-2"
                }`}
              >
                {vm.evidenceMetrics.map((metric) => (
                  <EvidenceMetric
                    key={metric.id}
                    title={metric.title}
                    value={metric.value}
                    sub={metric.sub}
                    metricId={metric.metricId}
                    dataQuality={metric.dataQuality}
                  />
                ))}
              </div>
            </section>
          : null}

          <DashboardSpinePanels
            acquisition={vm.metric.acquisition}
            productQuality={vm.metric.productQuality}
            dataCompleteness={vm.metric.dataCompleteness}
            isUploaded={selection.isUploaded}
          />

          <p className="text-center text-xs text-zinc-600">
            <Link href="/insights" className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950">
              View all diagnoses
            </Link>
          </p>
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}
