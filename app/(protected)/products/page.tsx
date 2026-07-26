"use client";

import { useMemo } from "react";
import { FirstProductQualityPanel } from "@/components/products/FirstProductQualityPanel";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildProductsPageViewModelFromDataset } from "@/lib/metrics/product-quality-view-model";

export default function ProductsPage() {
  const selection = useCommandCentreDatasetSelection();

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildProductsPageViewModelFromDataset(selection.dataset);
  }, [selection]);

  return (
    <CommandCentrePageFrame
      routeId="products"
      maxWidth="1600"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="products" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : vm != null ? (
        <>
          <FirstProductQualityPanel vm={vm} />
          <DiagnosisContinueSection
            links={[
              { href: "/retention", label: "Retention & repeat" },
              { href: "/dashboard", label: "Dashboard" },
            ]}
          />
        </>
      ) : null}
    </CommandCentrePageFrame>
  );
}
