/**
 * Dashboard presentation composition — orchestrates metric VM, canonical Signals,
 * Matrix placement, and Provenance. No metric calculations here.
 */

import { inferConservativeAsOfDateFromDataset } from "../analysis-context";
import type { RetentionOSDataset } from "../data-source";
import { getDatasetSummary } from "../data-source/dataset-helpers";
import {
  buildDiagnosticInsightsBundle,
  generateDiagnosticInsights,
  selectSignalsForSurface,
} from "../insights";
import {
  buildDashboardExecutiveViewModelFromDataset,
  type DashboardExecutiveViewModel,
} from "../metrics/dashboard-view-model";
import type { MetricDataQuality, MetricId } from "../metrics/metric-definitions";
import { buildSignalProvenance } from "../provenance";
import type { ProvenanceAssumptions, ProvenanceSourceIdentity, SignalProvenance } from "../provenance";
import type { Insight } from "../types/insight";

export interface DashboardReportingMeta {
  readonly reportingScopeLabel: string;
  readonly freshnessLabel: string;
  readonly asOfDate: string | null;
}

export interface DashboardEvidenceMetricView {
  readonly id: string;
  readonly title: string;
  readonly value: string;
  readonly sub?: string;
  readonly metricId?: MetricId;
  readonly dataQuality?: MetricDataQuality;
}

export interface DashboardPresentationViewModel {
  readonly metric: DashboardExecutiveViewModel;
  readonly dashboardSignal: Insight | null;
  readonly signalProvenance: SignalProvenance | null;
  readonly evidenceMetrics: readonly DashboardEvidenceMetricView[];
  readonly reportingMeta: DashboardReportingMeta;
  readonly hasPopulation: boolean;
}

function formatDisplayPct(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatDisplayMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDisplayRatio(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}×`;
}

function formatFreshnessLabel(lastOrderAt: string | undefined): string {
  if (!lastOrderAt) return "Freshness unavailable";
  const d = new Date(lastOrderAt);
  if (Number.isNaN(d.getTime())) return "Freshness unavailable";
  return `Data through ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function provenanceSourceFromDataset(meta: RetentionOSDataset["meta"]): ProvenanceSourceIdentity {
  return {
    sourceType: meta.sourceType,
    ...(meta.uploadFormat !== undefined ? { uploadFormat: meta.uploadFormat } : {}),
    sourceLabel: meta.sourceLabel,
    isDemo: meta.isDemo,
    isUploaded: meta.isUploaded,
  };
}

function provenanceAssumptionsFromDataset(dataset: RetentionOSDataset): ProvenanceAssumptions | undefined {
  const summary = getDatasetSummary(dataset);
  const out: {
    contributionMarginPct?: number;
    netRevenueMultiplier?: number;
    marketingSpendPctOfNetRevenue?: number;
    marketingSpendSource?: ProvenanceAssumptions["marketingSpendSource"];
  } = {};

  if (dataset.marginAssumptions?.contributionMarginPct !== undefined) {
    out.contributionMarginPct = dataset.marginAssumptions.contributionMarginPct;
  }
  if (dataset.marginAssumptions?.netRevenueMultiplier !== undefined) {
    out.netRevenueMultiplier = dataset.marginAssumptions.netRevenueMultiplier;
  }
  if (dataset.marketingSpendAssumptions?.marketingSpendPctOfNetRevenue !== undefined) {
    out.marketingSpendPctOfNetRevenue = dataset.marketingSpendAssumptions.marketingSpendPctOfNetRevenue;
  }
  if (summary.marketingSpendSource !== undefined) {
    out.marketingSpendSource = summary.marketingSpendSource;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function resolveAsOfDate(dataset: RetentionOSDataset): string | null {
  return (
    inferConservativeAsOfDateFromDataset(dataset) ??
    dataset.meta.lastOrderAt ??
    dataset.meta.firstOrderAt ??
    null
  );
}

function buildReportingMeta(dataset: RetentionOSDataset): DashboardReportingMeta {
  return {
    reportingScopeLabel: "All order history",
    freshnessLabel: formatFreshnessLabel(dataset.meta.lastOrderAt ?? dataset.meta.firstOrderAt),
    asOfDate: resolveAsOfDate(dataset),
  };
}

function buildEvidenceMetrics(metric: DashboardExecutiveViewModel): DashboardEvidenceMetricView[] {
  const { summary, acquisition } = metric;
  if (summary.totalCustomers === 0) return [];

  const metrics: DashboardEvidenceMetricView[] = [
    {
      id: "repeat",
      title: "All-time repeat purchase rate",
      value: formatDisplayPct(summary.allTimeRepeatPurchaseRate),
      sub: "Customers with ≥2 qualifying orders",
      metricId: "repeat_purchase_rate",
    },
    {
      id: "f2s90",
      title: "First→second within 90 days",
      value: formatDisplayPct(summary.firstToSecondWithin90DaysRate),
      sub: "Vs first qualifying order timestamp",
      metricId: "first_to_second_conversion",
    },
  ];

  if (!acquisition.lockedMissingSpend) {
    const est = acquisition.spendIsEstimated;
    metrics.push({
      id: "ltv_cac",
      title: est ? "Rev LTV:CAC (est.)" : "Rev LTV:CAC",
      value: formatDisplayRatio(acquisition.revenueLtvToCac),
      sub: "Terminal revenue lens",
      metricId: "revenue_ltv_cac",
      dataQuality: est ? "estimated" : "actual",
    });

    const paybackUnlocked =
      acquisition.paybackStatus !== "locked_no_spend" &&
      acquisition.paybackStatus !== "locked_no_contribution";
    if (paybackUnlocked) {
      metrics.push({
        id: "payback",
        title: est ? "Payback (est.)" : "Payback",
        value: acquisition.paybackLabel,
        metricId: "payback",
        dataQuality: est ? "estimated" : "partial",
      });
    }
  } else if (summary.avgTerminalNetRevenueLtvAcrossCohorts != null) {
    metrics.push({
      id: "terminal_ltv",
      title: "Avg terminal net revenue LTV",
      value: formatDisplayMoney(summary.avgTerminalNetRevenueLtvAcrossCohorts),
      sub: "Across cohort staircase tails",
      metricId: "revenue_ltv",
    });
  }

  return metrics.slice(0, 4);
}

export function buildDashboardPresentationViewModelFromDataset(
  dataset: RetentionOSDataset,
): DashboardPresentationViewModel {
  const metric = buildDashboardExecutiveViewModelFromDataset(dataset);

  const bundle = buildDiagnosticInsightsBundle(
    dataset.customers,
    dataset.orders,
    dataset.marginAssumptions,
  );
  const allSignals = generateDiagnosticInsights(bundle, bundle.recentOffsetLtvComparison);
  const dashboardSignal = selectSignalsForSurface(allSignals, "dashboard")[0] ?? null;

  const asOfDate = resolveAsOfDate(dataset);
  const assumptions = provenanceAssumptionsFromDataset(dataset);
  const signalProvenance =
    dashboardSignal != null && asOfDate != null
      ? buildSignalProvenance({
          signal: dashboardSignal,
          source: provenanceSourceFromDataset(dataset.meta),
          reportingScope: { asOfDate },
          population: {
            eligibleCustomerCount: metric.summary.totalCustomers,
            reportingOrderCount: metric.summary.totalOrders,
          },
          ...(assumptions !== undefined ? { assumptions } : {}),
          maturity: { completedOffsetsOnly: true },
        })
      : null;

  return {
    metric,
    dashboardSignal,
    signalProvenance,
    evidenceMetrics: buildEvidenceMetrics(metric),
    reportingMeta: buildReportingMeta(dataset),
    hasPopulation: metric.summary.totalCustomers > 0,
  };
}
