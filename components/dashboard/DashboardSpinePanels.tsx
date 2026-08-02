"use client";

import Link from "next/link";
import type {
  DashboardAcquisitionExecutiveView,
  DashboardDataCompletenessView,
  DashboardProductQualityExecutiveView,
  DataCompletenessStatus,
} from "@/lib/metrics/dashboard-executive-spine";

const COMPLETENESS_STYLES: Record<DataCompletenessStatus, string> = {
  unlocked: "border-emerald-200/90 bg-emerald-50/80 text-emerald-900",
  partial: "border-amber-200/90 bg-amber-50/80 text-amber-950",
  locked: "border-zinc-200/90 bg-zinc-100/90 text-zinc-700",
};

const COMPLETENESS_LABELS: Record<DataCompletenessStatus, string> = {
  unlocked: "Unlocked",
  partial: "Partial",
  locked: "Locked",
};

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

function acquisitionSummary(acquisition: DashboardAcquisitionExecutiveView, isUploaded: boolean): string {
  if (acquisition.lockedMissingSpend) {
    return isUploaded
      ? "Locked — attach marketing spend on Data to unlock CAC and payback."
      : "Locked — no marketing spend on the active demo source.";
  }
  if (acquisition.spendIsEstimated) {
    return `Estimated economics — CAC and LTV:CAC use spend assumptions from Data. Payback: ${acquisition.paybackLabel}.`;
  }
  return `Blended CAC and LTV:CAC available. Payback: ${acquisition.paybackLabel}.`;
}

function productSummary(productQuality: DashboardProductQualityExecutiveView): string {
  if (productQuality.state === "locked_no_line_items") {
    return "Locked — upload line items with product_id on Data.";
  }
  if (productQuality.state === "insufficient_segments") {
    return `Insufficient segments — ${productQuality.segmentCoverageLabel}.`;
  }
  if (productQuality.strongest && productQuality.weakest) {
    return `Strongest entry: ${productQuality.strongest.productTitle} (${formatPct(productQuality.strongest.repeatPurchaseRate)} repeat). Weakest: ${productQuality.weakest.productTitle}.`;
  }
  return productQuality.segmentCoverageLabel;
}

export function DashboardSpinePanels({
  acquisition,
  productQuality,
  dataCompleteness,
  isUploaded,
}: {
  acquisition: DashboardAcquisitionExecutiveView;
  productQuality: DashboardProductQualityExecutiveView;
  dataCompleteness: DashboardDataCompletenessView;
  isUploaded: boolean;
}) {
  return (
    <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Supporting evidence</h2>
      <div className="mt-4 space-y-3">
        <SupportingRow
          label="Acquisition"
          summary={acquisitionSummary(acquisition, isUploaded)}
          href="/acquisition"
        />
        <SupportingRow label="Products" summary={productSummary(productQuality)} href="/products" />
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Data completeness</p>
            <Link
              href="/data"
              className="text-xs font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
            >
              Manage on Data →
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {dataCompleteness.rows.map((row) => (
              <span
                key={row.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-100 bg-zinc-50/80 px-2.5 py-1.5 ring-1 ring-black/[0.02]"
                title={row.detail}
              >
                <span className="text-[11px] font-medium text-zinc-800">{row.label}</span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${COMPLETENESS_STYLES[row.status]}`}
                >
                  {COMPLETENESS_LABELS[row.status]}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportingRow({
  label,
  summary,
  href,
}: {
  label: string;
  summary: string;
  href: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
        <p className="mt-1 text-sm leading-snug text-zinc-800">{summary}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 text-xs font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
      >
        Open →
      </Link>
    </div>
  );
}
