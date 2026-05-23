import type { Customer } from "../types/customer";
import type { MarketingSpend } from "../types/marketing";
import type { Order } from "../types/order";
import type { MarginAssumptions } from "../types/scenario";
import { buildAcquisitionPreviewFromDataset, type AcquisitionPreviewModel } from "./acquisition";

export interface AcquisitionPageSummaryView {
  readonly totalSpend: number;
  readonly blendedCac: number | null;
  readonly spendRowCount: number;
  readonly hasSpend: boolean;
  readonly cohortMonthsWithCac: number;
  readonly cohortMonthsWithPayback: number;
  readonly customerCount: number;
}

export interface AcquisitionPageViewModel {
  readonly summary: AcquisitionPageSummaryView;
  readonly preview: AcquisitionPreviewModel;
}

export function buildAcquisitionPageViewModelFromDataset(
  customers: readonly Customer[],
  orders: readonly Order[],
  marginAssumptions: MarginAssumptions | undefined,
  marketingSpend: readonly MarketingSpend[],
): AcquisitionPageViewModel {
  const preview = buildAcquisitionPreviewFromDataset(customers, orders, marginAssumptions, marketingSpend);

  const cohortMonthsWithCac = preview.cacByMonth.rows.filter(
    (r) => r.cac != null && Number.isFinite(r.cac) && r.cac > 0,
  ).length;
  const cohortMonthsWithPayback = preview.payback.rows.filter((r) => r.monthsToPayback != null).length;

  return {
    summary: {
      totalSpend: preview.totalSpend,
      blendedCac: preview.blendedCac.blendedCac,
      spendRowCount: preview.spendRowCount,
      hasSpend: preview.hasSpend,
      cohortMonthsWithCac,
      cohortMonthsWithPayback,
      customerCount: customers.length,
    },
    preview,
  };
}
