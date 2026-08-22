"use client";

import { DataPageBody } from "@/components/data/DataPageBody";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import type { DataPageViewModel } from "@/lib/metrics";

export function DataPageClient({
  vm,
  windowEndFormatted,
  demoDatasetSourceLabel,
}: {
  vm: DataPageViewModel;
  windowEndFormatted: string;
  demoDatasetSourceLabel: string;
}) {
  const selection = useCommandCentreDatasetSelection();
  const frameSource = frameSourceFromSelection(selection);

  return (
    <CommandCentrePageFrame
      routeId="data"
      maxWidth="6xl"
      bannerKind="data"
      showNextSteps
      activeMetricDatasetSource={frameSource}
    >
      <DataPageBody vm={vm} windowEndFormatted={windowEndFormatted} demoDatasetSourceLabel={demoDatasetSourceLabel} />
    </CommandCentrePageFrame>
  );
}
