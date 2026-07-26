"use client";

import type { ReactNode } from "react";
import type { CommandCentreDatasetSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { MetricSourceBanner, type MetricSourceBannerRouteId } from "@/components/mvp/MetricSourceBanner";

/**
 * Central pending/lost_upload gate for KPI shells. Status resolution comes only from the shared hook.
 */
export function DatasetSourceGate({
  routeId,
  children,
}: {
  readonly routeId: MetricSourceBannerRouteId;
  readonly children: (selection: Extract<CommandCentreDatasetSelection, { metricsAllowed: true }>) => ReactNode;
}) {
  const selection = useCommandCentreDatasetSelection();

  if (selection.status === "pending" || selection.status === "lost_upload") {
    return (
      <div className="space-y-4">
        <MetricSourceBanner routeId={routeId} selection={selection} />
        <DatasetSourceUnavailablePanel selection={selection} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MetricSourceBanner routeId={routeId} selection={selection} />
      {children(selection)}
    </div>
  );
}
