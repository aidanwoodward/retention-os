/**
 * Pure view model for the post-parse imported dataset review checkpoint (Sprint 5A / 5V-A).
 * No React, no browser APIs — composes existing import summaries and metric completeness logic.
 */

import type { RetentionOSUploadFormat } from "../data-source/dataset-types";
import { buildImportedRetentionOSDataset } from "../data-source/imported-source";
import { buildDashboardDataCompletenessView } from "../metrics/dashboard-executive-spine";
import { buildProductsPageViewModelFromDataset } from "../metrics/product-quality-view-model";
import type { MarginAssumptions } from "../types";
import type { OrdersCsvImportFormat } from "./detect-orders-csv-format";
import { ordersCsvFormatLabel } from "./detect-orders-csv-format";
import type { CombineOrderCsvImportResult, CsvImportIssue } from "./import-types";
import {
  deriveImportReadiness,
  NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE,
  partitionTrustFindings,
  type ImportReadiness,
  type ImportTrustFinding,
} from "./import-trust";
import { buildImportedCsvMetricPreview } from "./metric-preview";

/** @deprecated Use ImportReadiness — kept as alias for transitional call sites. */
export type ImportReviewConfidence = ImportReadiness;
export type ImportReviewReadiness = ImportReadiness;
export type ImportReviewPresence = "detected" | "none";
export type ImportReviewMetricStatus = "unlocked" | "partial" | "locked";

export type ImportReviewMetricId =
  | "cohorts"
  | "retention"
  | "ltv"
  | "product_quality"
  | "acquisition"
  | "contribution_ltv";

export interface ImportReviewMetricRow {
  readonly id: ImportReviewMetricId;
  readonly label: string;
  readonly status: ImportReviewMetricStatus;
  readonly detail: string;
}

export interface ImportReviewCaveat {
  readonly code?: string;
  readonly message: string;
  readonly severity: "warning" | "info" | "limitation" | "notice";
}

export interface ImportReviewSessionContext {
  /** Saved marketing spend CSV rows in session. */
  readonly hasSavedMarketingSpendCsv?: boolean;
  /** Legacy unlock flag — treated as CSV saved when true. */
  readonly hasSavedMarketingSpend?: boolean;
  readonly hasSavedMarketingSpendAssumption?: boolean;
  readonly marketingSpendAssumptionPct?: number;
  readonly hasSavedMarginAssumptions?: boolean;
  readonly marginAssumptionPct?: number;
}

export interface BuildImportReviewViewModelInput {
  readonly format: OrdersCsvImportFormat;
  readonly result: CombineOrderCsvImportResult;
  readonly sessionContext?: ImportReviewSessionContext;
}

export interface ImportReviewViewModel {
  readonly kind: "review";
  readonly canSave: true;
  readonly formatLabel: string;
  readonly uploadFormat: RetentionOSUploadFormat;
  /** Dataset readiness (5V-A). Notices alone do not prevent `ready`. */
  readonly readiness: ImportReviewReadiness;
  /** Alias of `readiness` for existing UI bindings. */
  readonly confidence: ImportReviewReadiness;
  readonly statusHeadline: string;
  readonly statusDetail: string;
  readonly dateRange: { readonly firstOrderAt?: string; readonly lastOrderAt?: string };
  readonly counts: {
    readonly orders: number;
    readonly customers: number;
    readonly products: number;
    readonly lineItems: number;
  };
  readonly revenueBasis: { readonly headline: string; readonly formula: string };
  readonly financialSignals: {
    readonly discounts: { readonly presence: ImportReviewPresence; readonly orderCount?: number };
    readonly refunds: { readonly presence: ImportReviewPresence; readonly orderCount?: number };
    readonly taxShipping: { readonly treatment: "excluded"; readonly detail: string };
  };
  readonly customerIdentity: {
    readonly basis: "shopify_email" | "template_customer_id";
    readonly detail: string;
    readonly caveat?: string;
  };
  readonly metrics: readonly ImportReviewMetricRow[];
  readonly limitations: readonly ImportTrustFinding[];
  readonly notices: readonly ImportTrustFinding[];
  readonly caveats: readonly ImportReviewCaveat[];
}

export interface ImportReviewBlockedView {
  readonly kind: "blocked";
  readonly canSave: false;
  readonly readiness: "blocked";
  readonly formatLabel: string;
  readonly reason: string;
  readonly errors: readonly CsvImportIssue[];
}

export type ImportReviewViewModelResult = ImportReviewViewModel | ImportReviewBlockedView;

const SHOPIFY_EMAIL_CAVEAT =
  "Customer identity uses email from the Shopify export. Email changes, guest checkout, and shared inboxes can split or merge cohorts.";

function uploadFormatFromDetected(format: OrdersCsvImportFormat): RetentionOSUploadFormat | null {
  if (format === "shopify_orders" || format === "retentionos_template") return format;
  return null;
}

function revenueBasisForFormat(format: RetentionOSUploadFormat): { headline: string; formula: string } {
  const shared =
    "Net merchandise revenue = line-derived gross revenue - order discounts - order refunds. Tax and shipping are excluded.";
  if (format === "shopify_orders") {
    return {
      headline: "Net merchandise revenue (Shopify line items)",
      formula: `${shared} Shopify Total, Shipping, and Taxes columns are not used for LTV.`,
    };
  }
  return {
    headline: "Net merchandise revenue (RetentionOS template)",
    formula: shared,
  };
}

function countOrdersWhere(orders: CombineOrderCsvImportResult["orders"], pred: (o: (typeof orders)[0]) => boolean): number {
  let n = 0;
  for (const o of orders) {
    if (pred(o)) n++;
  }
  return n;
}

function applySessionMarginForLabeling(
  built: Extract<ReturnType<typeof buildImportedRetentionOSDataset>, { ok: true }>,
  sessionContext?: ImportReviewSessionContext,
) {
  let next = built.dataset;
  if (
    sessionContext?.hasSavedMarginAssumptions &&
    sessionContext.marginAssumptionPct != null &&
    Number.isFinite(sessionContext.marginAssumptionPct)
  ) {
    const marginAssumptions: MarginAssumptions = {
      contributionMarginPct: sessionContext.marginAssumptionPct,
    };
    next = { ...next, marginAssumptions };
  }
  return next;
}

function buildCoreMetricRows(
  hasPopulation: boolean,
  completeness: ReturnType<typeof buildDashboardDataCompletenessView>,
  sessionContext: ImportReviewSessionContext | undefined,
  hasNegativeContributionMargin: boolean,
): ImportReviewMetricRow[] {
  const cohortStatus: ImportReviewMetricStatus = hasPopulation ? "unlocked" : "locked";
  const cohortDetail = hasPopulation
    ? "Cohort months derived from first order date per customer."
    : "No customers or orders to build cohorts.";

  const productRow = completeness.rows.find((r) => r.id === "product_quality");
  const marginRow = completeness.rows.find((r) => r.id === "margin_contribution");

  const hasCsvSpend =
    sessionContext?.hasSavedMarketingSpendCsv === true || sessionContext?.hasSavedMarketingSpend === true;
  const hasAssumptionSpend = sessionContext?.hasSavedMarketingSpendAssumption === true;
  const acquisitionUnlocked = hasCsvSpend || hasAssumptionSpend;

  const acquisitionDetail = !acquisitionUnlocked
    ? "Locked until marketing spend data or an assumption is added on /data."
    : hasCsvSpend
      ? "Marketing spend CSV is saved in this browser session — acquisition metrics unlock after save."
      : "Estimated marketing spend assumption saved in this browser session — acquisition metrics unlock after save.";

  let contributionStatus: ImportReviewMetricStatus = marginRow?.status ?? "locked";
  let contributionDetail =
    marginRow?.detail ??
    "Contribution LTV unavailable - add order-level contribution margin or save margin assumptions on /data.";

  if (hasNegativeContributionMargin) {
    contributionStatus = contributionStatus === "locked" ? "locked" : "partial";
    contributionDetail =
      "Limited — negative order contribution_margin is accepted, but the engine floors negative contribution to 0, which can overstate contribution LTV, contribution LTV:CAC, and payback.";
  } else if (sessionContext?.hasSavedMarginAssumptions && contributionStatus === "partial") {
    contributionDetail = `Estimated — ${contributionDetail}`;
  }

  return [
    { id: "cohorts", label: "Cohorts", status: cohortStatus, detail: cohortDetail },
    {
      id: "retention",
      label: "Retention",
      status: cohortStatus,
      detail: hasPopulation
        ? "Repeat purchase and Month+N active rates from imported orders."
        : "Requires customers and orders.",
    },
    {
      id: "ltv",
      label: "LTV (revenue)",
      status: cohortStatus,
      detail: hasPopulation
        ? "Revenue LTV uses net merchandise revenue per order."
        : "Requires customers and orders.",
    },
    {
      id: "product_quality",
      label: "Product quality",
      status: productRow?.status ?? "locked",
      detail: productRow?.detail ?? "Requires line items with product identifiers.",
    },
    {
      id: "acquisition",
      label: "Acquisition",
      status: acquisitionUnlocked ? (hasCsvSpend ? "unlocked" : "partial") : "locked",
      detail: acquisitionDetail,
    },
    {
      id: "contribution_ltv",
      label: "Contribution LTV",
      status: contributionStatus,
      detail: contributionDetail,
    },
  ];
}

function metricLimitationsFromRows(metrics: readonly ImportReviewMetricRow[]): ImportTrustFinding[] {
  const out: ImportTrustFinding[] = [];
  for (const m of metrics) {
    if (m.status === "unlocked") continue;
    out.push({
      severity: "limitation",
      code: `METRIC_${m.id.toUpperCase()}`,
      message: `${m.label}: ${m.detail}`,
    });
  }
  return out;
}

function dedupeFindings(findings: readonly ImportTrustFinding[]): ImportTrustFinding[] {
  const seen = new Set<string>();
  const out: ImportTrustFinding[] = [];
  for (const f of findings) {
    const key = `${f.severity}|${f.code ?? ""}|${f.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function statusCopy(
  readiness: ImportReviewReadiness,
  counts: ImportReviewViewModel["counts"],
): { headline: string; detail: string } {
  if (readiness === "ready") {
    return {
      headline: "Import looks good - review before saving",
      detail: `${counts.orders.toLocaleString()} orders across ${counts.customers.toLocaleString()} customers with no source or metric limitations. Confirm the assumptions below, then save.`,
    };
  }
  return {
    headline: "Import accepted with limitations",
    detail: `${counts.orders.toLocaleString()} orders across ${counts.customers.toLocaleString()} customers imported. Limitations below do not block save but constrain which metrics are trustworthy.`,
  };
}

function customerIdentityForFormat(format: RetentionOSUploadFormat): ImportReviewViewModel["customerIdentity"] {
  if (format === "shopify_orders") {
    return {
      basis: "shopify_email",
      detail: "Shopify Email column maps to canonical customer_id (normalised lowercase).",
      caveat: SHOPIFY_EMAIL_CAVEAT,
    };
  }
  return {
    basis: "template_customer_id",
    detail: "RetentionOS template customer_id column used as canonical customer identity.",
  };
}

function caveatsFromFindings(
  limitations: readonly ImportTrustFinding[],
  notices: readonly ImportTrustFinding[],
): ImportReviewCaveat[] {
  const out: ImportReviewCaveat[] = [];
  for (const f of limitations) {
    out.push({
      code: f.code,
      message: f.message,
      severity: "limitation",
    });
  }
  for (const f of notices) {
    out.push({
      code: f.code,
      message: f.message,
      severity: "notice",
    });
  }
  return out;
}

/** Build founder-readable review state between parse and session save. */
export function buildImportReviewViewModel(
  input: BuildImportReviewViewModelInput,
): ImportReviewViewModelResult {
  const { format, result, sessionContext } = input;
  const formatLabel = ordersCsvFormatLabel(format);
  const uploadFormat = uploadFormatFromDetected(format);

  if (format === "unsupported" || result.errors.length > 0) {
    return {
      kind: "blocked",
      canSave: false,
      readiness: "blocked",
      formatLabel,
      reason:
        format === "unsupported"
          ? "Unsupported orders CSV - upload a Shopify Orders export or RetentionOS template."
          : "Import blocked by validation errors - fix the file before saving.",
      errors: result.errors,
    };
  }

  if (result.summary.rawRowCount === 0 || result.orders.length === 0) {
    return {
      kind: "blocked",
      canSave: false,
      readiness: "blocked",
      formatLabel,
      reason: "No data rows - the file parsed but produced no orders.",
      errors: result.errors,
    };
  }

  if (uploadFormat == null) {
    return {
      kind: "blocked",
      canSave: false,
      readiness: "blocked",
      formatLabel,
      reason: "Unknown upload format.",
      errors: result.errors,
    };
  }

  const { summary, customers, orders, products, warnings } = result;
  const metricPreview = buildImportedCsvMetricPreview(customers, orders, products);
  const built = buildImportedRetentionOSDataset(result, { uploadFormat });
  if (!built.ok) {
    return {
      kind: "blocked",
      canSave: false,
      readiness: "blocked",
      formatLabel,
      reason: "Dataset build failed despite zero import errors.",
      errors: result.errors,
    };
  }

  const ephemeralDataset = applySessionMarginForLabeling(built, sessionContext);
  const productsVm = buildProductsPageViewModelFromDataset(ephemeralDataset);
  const completeness = buildDashboardDataCompletenessView(ephemeralDataset, productsVm);

  const discountOrderCount = countOrdersWhere(orders, (o) => o.discounts > 0);
  const refundOrderCount = countOrdersWhere(orders, (o) => o.refunds > 0);
  const hasPopulation = customers.length > 0 && orders.length > 0;

  const hasNegativeContributionMargin =
    warnings.some((w) => w.code === NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE) ||
    orders.some((o) => o.contributionMargin != null && o.contributionMargin < 0);

  const metrics = buildCoreMetricRows(
    hasPopulation,
    completeness,
    sessionContext,
    hasNegativeContributionMargin,
  );

  const partitioned = partitionTrustFindings(warnings);
  // Metric-preview sample-size strings are informational notices only — not dataset readiness gates.
  const previewNotices: ImportTrustFinding[] = metricPreview.warnings.map((message) => ({
    severity: "notice" as const,
    message,
  }));

  const identityNotices: ImportTrustFinding[] = [];
  if (uploadFormat === "shopify_orders") {
    identityNotices.push({
      severity: "notice",
      code: "SHOPIFY_EMAIL_IDENTITY",
      message: SHOPIFY_EMAIL_CAVEAT,
    });
  }

  const sourceLimitations = partitioned.limitations;
  const metricLimitations = metricLimitationsFromRows(metrics);
  const limitations = dedupeFindings([...sourceLimitations, ...metricLimitations]);
  const notices = dedupeFindings([...partitioned.notices, ...previewNotices, ...identityNotices]);

  const readiness = deriveImportReadiness({
    blocked: false,
    hasLimitations: limitations.length > 0,
  });

  const { headline, detail } = statusCopy(readiness, {
    orders: summary.orderCount,
    customers: summary.customerCount,
    products: summary.productCount,
    lineItems: summary.lineItemCount,
  });

  return {
    kind: "review",
    canSave: true,
    formatLabel,
    uploadFormat,
    readiness,
    confidence: readiness,
    statusHeadline: headline,
    statusDetail: detail,
    dateRange: {
      firstOrderAt: summary.firstOrderAt,
      lastOrderAt: summary.lastOrderAt,
    },
    counts: {
      orders: summary.orderCount,
      customers: summary.customerCount,
      products: summary.productCount,
      lineItems: summary.lineItemCount,
    },
    revenueBasis: revenueBasisForFormat(uploadFormat),
    financialSignals: {
      discounts: {
        presence: discountOrderCount > 0 ? "detected" : "none",
        ...(discountOrderCount > 0 ? { orderCount: discountOrderCount } : {}),
      },
      refunds: {
        presence: refundOrderCount > 0 ? "detected" : "none",
        ...(refundOrderCount > 0 ? { orderCount: refundOrderCount } : {}),
      },
      taxShipping: {
        treatment: "excluded",
        detail:
          uploadFormat === "shopify_orders"
            ? "Tax and shipping are not imported. Shopify Total, Shipping, and Taxes columns are ignored for LTV."
            : "Tax and shipping are not part of the RetentionOS template contract - metrics use merchandise line totals only.",
      },
    },
    customerIdentity: customerIdentityForFormat(uploadFormat),
    metrics,
    limitations,
    notices,
    caveats: caveatsFromFindings(limitations, notices),
  };
}
