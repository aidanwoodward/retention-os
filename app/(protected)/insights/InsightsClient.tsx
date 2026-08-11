"use client";

import { useMemo, useState } from "react";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { DurabilityPostureBar } from "@/components/insights/DurabilityPostureBar";
import { InsightInboxItem } from "@/components/insights/InsightInboxItem";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { frameSourceFromSelection } from "@/lib/data-source/client-selected-source";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import { buildInsightsPageViewModelFromDataset } from "@/lib/insights";
import { mapInsightsInboxPresentation } from "@/lib/insights/insights-presentation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function InsightsClient() {
  const selection = useCommandCentreDatasetSelection();
  const isMobile = useIsMobile();
  const [openIds, setOpenIds] = useState<readonly string[]>([]);

  const vm = useMemo(() => {
    if (!selection.metricsAllowed) return null;
    return buildInsightsPageViewModelFromDataset(selection.dataset);
  }, [selection]);

  const presentation = useMemo(() => (vm != null ? mapInsightsInboxPresentation(vm) : null), [vm]);

  const setOpen = (id: string, open: boolean) => {
    setOpenIds((prev) => {
      if (!open) return prev.filter((x) => x !== id);
      return isMobile ? [id] : [...prev, id];
    });
  };

  return (
    <CommandCentrePageFrame
      routeId="insights"
      maxWidth="6xl"
      bannerKind="insights"
      insightsBannerSlot={<MetricSourceBanner routeId="insights" selection={selection} />}
      activeMetricDatasetSource={frameSourceFromSelection(selection)}
    >
      {selection.status === "pending" || selection.status === "lost_upload" ? (
        <DatasetSourceUnavailablePanel selection={selection} />
      ) : presentation != null ? (
        <div className="mx-auto max-w-[880px] space-y-5">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">Signal inbox</p>
            <h2 className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight text-zinc-900">
              What deserves attention, why, and where should I investigate next?
            </h2>
          </header>

          <DurabilityPostureBar
            status={presentation.durabilityStatus}
            durabilityNotes={presentation.durabilityNotes}
            methodologyNotes={presentation.methodologyNotes}
            counts={presentation.severityCounts}
          />

          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-zinc-900">Current Signals</h2>
              <p className="text-[11.5px] text-zinc-600">Registry order — ordering carries no priority meaning</p>
            </div>

            {presentation.items.length === 0 ? (
              <Empty className="border border-dashed border-zinc-200 bg-zinc-50/50">
                <EmptyHeader>
                  <EmptyTitle>No Signals currently raised</EmptyTitle>
                  <EmptyDescription>
                    Every rule was evaluated and none met its evidence threshold for this dataset slice. This is a
                    valid state, not a data failure.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="space-y-2.5">
                {presentation.items.map((insight) => (
                  <li key={insight.id}>
                    <InsightInboxItem
                      insight={insight}
                      open={openIds.includes(insight.id)}
                      onOpenChange={(o) => setOpen(insight.id, o)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="border-t border-zinc-200 pt-4 text-[11.5px] leading-snug text-zinc-600">
            Signals are produced by deterministic rules over canonical metrics. Rules suppress themselves when evidence
            is insufficient, so this list varies in length.
          </p>
        </div>
      ) : null}
    </CommandCentrePageFrame>
  );
}
