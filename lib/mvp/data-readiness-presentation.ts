/**
 * Presentation-only labels for /data readiness rows — maps canonical
 * `DataCompletenessStatus` without introducing new engine enums.
 */

import type { CommandCentreDatasetSelection } from "../data-source/client-selected-source";
import type { MarketingSpendSource } from "../data-source/dataset-types";
import type {
  DashboardDataCompletenessRow,
} from "../metrics/dashboard-executive-spine";

export type DataReadinessPresentationLabel =
  | "Available"
  | "Partial"
  | "Missing"
  | "Estimated"
  | "Observed"
  | "Locked";

export interface DataReadinessPresentationContext {
  readonly isDemo: boolean;
  readonly marketingSpendSource?: MarketingSpendSource;
  readonly hasImportedContributionMargin: boolean;
  readonly hasMarginAssumptions: boolean;
}

export interface ImportMetricPresentationContext {
  readonly hasSavedMarginAssumptions?: boolean;
}

export function canRenderDataReadinessCompleteness(
  selection: Pick<CommandCentreDatasetSelection, "status" | "metricsAllowed" | "dataset">,
): boolean {
  if (selection.status === "pending" || selection.status === "lost_upload") {
    return false;
  }
  return selection.metricsAllowed && selection.dataset != null;
}

export function mapCompletenessRowToPresentationLabel(
  row: Pick<DashboardDataCompletenessRow, "id" | "status">,
  context: DataReadinessPresentationContext,
): DataReadinessPresentationLabel {
  const { id, status } = row;

  if (status === "locked") {
    return "Missing";
  }

  if (status === "partial") {
    if (id === "marketing_spend" && context.marketingSpendSource === "assumption") {
      return "Estimated";
    }
    if (id === "margin_contribution" && context.hasMarginAssumptions) {
      return "Estimated";
    }
    return "Partial";
  }

  if (context.isDemo) {
    return "Available";
  }

  switch (id) {
    case "orders":
      return "Available";
    case "line_items":
      return "Observed";
    case "margin_contribution":
      return context.hasImportedContributionMargin ? "Observed" : "Available";
    case "marketing_spend":
      return context.marketingSpendSource === "actual_csv" ? "Observed" : "Available";
    case "product_quality":
      return "Observed";
    default:
      return "Available";
  }
}

export function mapImportMetricStatusToPresentationLabel(
  row: Pick<{ id: string; status: "unlocked" | "partial" | "locked" }, "id" | "status">,
  context?: ImportMetricPresentationContext,
): DataReadinessPresentationLabel {
  const { id, status } = row;

  if (status === "locked") {
    return "Missing";
  }

  if (status === "partial") {
    if (id === "acquisition") {
      return "Estimated";
    }
    if (id === "contribution_ltv" && context?.hasSavedMarginAssumptions) {
      return "Estimated";
    }
    return "Partial";
  }

  return "Available";
}
