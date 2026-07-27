/**
 * Analysis-context contract — reporting period, acquisition cohort period,
 * maturity horizon, and explicit as-of (Sprint 6A-ANALYSIS-CONTEXT).
 *
 * Calendar basis: UTC only (MVP). No merchant-timezone support.
 */

import type { RetentionOSDataset } from "../data-source/dataset-types";
import type { CustomerId } from "../types/customer";
import type { MarketingSpend } from "../types/marketing";
import type { Order } from "../types/order";

/** Identifiable order (non-null customerId). */
export type IdentifiedOrder = Order & { customerId: CustomerId };

/**
 * Half-open UTC instant window: startDate <= t < endDateExclusive.
 * Reporting periods may be arbitrary (week, MTD, campaign). Acquisition periods
 * must be UTC-month-aligned (validated separately).
 */
export type AnalysisPeriod = {
  readonly startDate: string;
  readonly endDateExclusive: string;
};

export type AcquisitionScope = "all" | "bounded";

export type MaturityStatus = "complete" | "partial" | "unavailable";

/**
 * Shared analysis context.
 *
 * `asOfDate` is mandatory: the dataset is trusted and observed through this UTC instant.
 * It is a maturity / trust clock — not a fourth §4.1 UI filter concept.
 */
export type AnalysisContext = {
  readonly reportingPeriod?: AnalysisPeriod;
  readonly acquisitionPeriod?: AnalysisPeriod;
  readonly asOfDate: string;
  /** Inclusive maximum Month+N cap; non-negative integer when set. */
  readonly maturityHorizonMonths?: number;
};

export type AnalysisSelectionCompleteness = {
  readonly reportingOrderCount: number;
  readonly identifiableReportingOrderCount: number;
  readonly guestReportingOrderCount: number;
  readonly eligibleCustomerCount: number;
  readonly acquisitionScope: AcquisitionScope;
  /**
   * When bounded: count of UTC month keys covered by acquisitionPeriod.
   * When all: distinct first-order month keys among eligible customers
   * (never used alone to imply an empty unbounded population).
   */
  readonly acquisitionMonthKeyCount: number;
  readonly marketingSpendRowCount: number;
};

/**
 * Selection over a canonical full-history dataset.
 * Never invents a truncated RetentionOSDataset or rewritten firstOrderAt values.
 */
export type AnalysisSelection = {
  readonly context: AnalysisContext;
  readonly fullDataset: RetentionOSDataset;
  /** Orders in reportingPeriod (or all orders if reportingPeriod omitted); includes guests. */
  readonly reportingOrders: readonly Order[];
  readonly identifiableReportingOrders: readonly IdentifiedOrder[];
  /**
   * Identified reporting orders owned by eligible customers
   * (reporting ∩ identifiable ∩ eligibleCustomerIds).
   */
  readonly reportingOrdersForEligibleCustomers: readonly IdentifiedOrder[];
  readonly eligibleCustomerIds: ReadonlySet<CustomerId>;
  readonly selectedMarketingSpend: readonly MarketingSpend[];
  readonly completeness: AnalysisSelectionCompleteness;
};
