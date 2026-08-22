"use client";

import { useMemo } from "react";
import { AnalyticalPanel } from "@/components/analytical";
import type { CommandCentreDatasetSelection } from "@/lib/data-source/client-selected-source";
import {
  buildDashboardDataCompletenessView,
  type DashboardDataCompletenessRow,
} from "@/lib/metrics/dashboard-executive-spine";
import { buildProductsPageViewModelFromDataset } from "@/lib/metrics/product-quality-view-model";
import { getDatasetSummary } from "@/lib/data-source/dataset-helpers";
import {
  canRenderDataReadinessCompleteness,
  mapCompletenessRowToPresentationLabel,
} from "@/lib/mvp/data-readiness-presentation";
import { DataTrustLabel } from "@/components/data/DataTrustLabel";

const ROW_ACTION: Partial<Record<DashboardDataCompletenessRow["id"], string>> = {
  marketing_spend: "Add marketing spend % or CSV below",
  margin_contribution: "Add margin assumption below",
  line_items: "Upload combined orders CSV with product_id",
  product_quality: "Ensure line items include product_id",
};

export function DataPageAnalysisReadinessPanel({
  selection,
}: {
  readonly selection: CommandCentreDatasetSelection;
}) {
  const view = useMemo(() => {
    if (!canRenderDataReadinessCompleteness(selection)) {
      return null;
    }
    const dataset = selection.dataset!;
    const productsVm = buildProductsPageViewModelFromDataset(dataset);
    const completeness = buildDashboardDataCompletenessView(dataset, productsVm);
    const summary = getDatasetSummary(dataset);
    const presentationContext = {
      isDemo: dataset.meta.isDemo,
      marketingSpendSource: summary.marketingSpendSource,
      hasImportedContributionMargin: summary.hasFullOrderContributionMargin,
      hasMarginAssumptions: summary.hasMarginAssumptions,
    };
    return { rows: completeness.rows, presentationContext };
  }, [selection]);

  if (view == null) {
    return null;
  }

  const lockedCount = view.rows.filter((r) => r.status === "locked").length;
  const partialCount = view.rows.filter((r) => r.status === "partial").length;

  let summary = "Core inputs are available for customer-economics metrics on this source.";
  if (lockedCount > 0) {
    summary = `${lockedCount} required input${lockedCount === 1 ? "" : "s"} still missing — add them below to unlock locked metrics.`;
  } else if (partialCount > 0) {
    summary = `${partialCount} input${partialCount === 1 ? "" : "s"} rely on assumptions or partial coverage — review before scaling spend.`;
  }

  return (
    <AnalyticalPanel
      title="Analysis readiness"
      description="What the active source supplies today, and what still blocks or limits customer-economics metrics."
      footer={summary}
    >
      <ul className="divide-y divide-zinc-100">
        {view.rows.map((row) => {
          const label = mapCompletenessRowToPresentationLabel(row, view.presentationContext);
          const action = row.status !== "unlocked" ? ROW_ACTION[row.id] : undefined;
          return (
            <li key={row.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{row.label}</p>
                  <DataTrustLabel label={label} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{row.detail}</p>
                {action ?
                  <p className="mt-1 text-xs font-medium text-emerald-900">{action}</p>
                : null}
              </div>
            </li>
          );
        })}
      </ul>
    </AnalyticalPanel>
  );
}
