"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { FirstProductQualityPanel } from "@/components/products/FirstProductQualityPanel";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DiagnosisContinueSection } from "@/components/mvp/DiagnosisContinueSection";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import {
  buildDemoCommandCentreSelection,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "@/lib/data-source/client-selected-source";
import { buildProductsPageViewModelFromDataset } from "@/lib/metrics/product-quality-view-model";

export default function ProductsPage() {
  const [selection, setSelection] = useState<CommandCentreDatasetSelection>(() => buildDemoCommandCentreSelection());

  useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource());
  }, []);

  const vm = useMemo(
    () => buildProductsPageViewModelFromDataset(selection.dataset),
    [selection.dataset],
  );

  return (
    <CommandCentrePageFrame
      routeId="products"
      maxWidth="1600"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="products" selection={selection} />}
      activeMetricDatasetSource={selection.isUploaded ? "uploaded_csv" : "demo"}
    >
      <FirstProductQualityPanel vm={vm} />

      <DiagnosisContinueSection
        links={[
          { href: "/retention", label: "Retention & repeat" },
          { href: "/dashboard", label: "Dashboard" },
        ]}
      />
    </CommandCentrePageFrame>
  );
}
