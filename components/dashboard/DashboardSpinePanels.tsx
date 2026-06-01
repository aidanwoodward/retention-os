"use client";

import Link from "next/link";
import type {
  DashboardAcquisitionExecutiveView,
  DashboardDataCompletenessView,
  DashboardProductHighlightView,
  DashboardProductQualityExecutiveView,
  DataCompletenessStatus,
} from "@/lib/metrics/dashboard-executive-spine";
import { MIN_CUSTOMERS_FOR_SIGNAL } from "@/lib/metrics/product-quality";
import type { ProductQualitySignal } from "@/lib/metrics/product-quality";

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRatio(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}×`;
}

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

const SIGNAL_STYLES: Record<ProductQualitySignal, string> = {
  strong: "border-emerald-200/90 bg-emerald-50 text-emerald-900",
  watch: "border-amber-200/90 bg-amber-50 text-amber-950",
  weak: "border-rose-200/90 bg-rose-50 text-rose-950",
  insufficient_data: "border-zinc-200/90 bg-zinc-100 text-zinc-700",
};

const SIGNAL_LABELS: Record<ProductQualitySignal, string> = {
  strong: "Strong",
  watch: "Watch",
  weak: "Weak",
  insufficient_data: "Insufficient data",
};

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

function QualitySignalBadge({ signal }: { signal: ProductQualitySignal }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SIGNAL_STYLES[signal]}`}
    >
      {SIGNAL_LABELS[signal]}
    </span>
  );
}

function CompactKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] leading-snug text-zinc-600">{sub}</p> : null}
    </div>
  );
}

function ProductHighlight({
  label,
  highlight,
}: {
  label: string;
  highlight: DashboardProductHighlightView;
}) {
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{highlight.productTitle}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <QualitySignalBadge signal={highlight.qualitySignal} />
        <span className="text-[11px] tabular-nums text-zinc-600">
          Repeat {formatPct(highlight.repeatPurchaseRate)} · F2S {formatPct(highlight.firstToSecondWithinWindowRate)}
        </span>
      </div>
    </div>
  );
}

function AcquisitionEconomicsCard({
  acquisition,
  isUploaded,
}: {
  acquisition: DashboardAcquisitionExecutiveView;
  isUploaded: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Acquisition economics</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">Blended CAC, LTV:CAC, and payback posture.</p>
        </div>
        <Link
          href="/acquisition"
          className="shrink-0 text-xs font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 hover:decoration-zinc-500"
        >
          Open →
        </Link>
      </div>

      {acquisition.lockedMissingSpend ?
        <div className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-3 text-sm leading-relaxed text-amber-950">
          <p className="font-semibold">Locked — marketing spend required</p>
          <p className="mt-1.5 text-xs">
            {isUploaded ?
              "Uploaded orders are active, but no marketing spend is attached to this session source."
            : "No marketing spend is attached to the active demo source for acquisition economics."}{" "}
            Save spend on{" "}
            <Link href="/data" className="font-medium underline decoration-amber-400 underline-offset-2">
              /data
            </Link>{" "}
            to unlock CAC, LTV:CAC, and payback here.
          </p>
        </div>
      : <div className="mt-4 grid grid-cols-2 gap-4">
          <CompactKpi label="Blended CAC" value={formatMoney(acquisition.blendedCac)} sub="Total spend ÷ customers" />
          <CompactKpi label="Rev LTV:CAC" value={formatRatio(acquisition.revenueLtvToCac)} sub="Terminal revenue lens" />
          <CompactKpi
            label="Contrib LTV:CAC"
            value={formatRatio(acquisition.contributionLtvToCac)}
            sub="Requires contribution path"
          />
          <CompactKpi label="Payback" value={acquisition.paybackLabel} />
        </div>
      }

      {!acquisition.lockedMissingSpend && acquisition.paybackStatus === "locked_no_contribution" ?
        <p className="mt-3 text-xs leading-relaxed text-zinc-600">
          Contribution payback needs imported contribution_margin or margin assumptions on{" "}
          <Link href="/data" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2">
            /data
          </Link>
          .
        </p>
      : null}
    </div>
  );
}

function ProductQualityCard({ productQuality }: { productQuality: DashboardProductQualityExecutiveView }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Product quality</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">First-product customer quality — not SKU volume.</p>
        </div>
        <Link
          href="/products"
          className="shrink-0 text-xs font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 hover:decoration-zinc-500"
        >
          Open →
        </Link>
      </div>

      <div className="mt-4">
        <CompactKpi
          label="Segment coverage"
          value={productQuality.segmentCoverageLabel}
          sub={`≥${MIN_CUSTOMERS_FOR_SIGNAL} customers per entry-product segment`}
        />
      </div>

      {productQuality.state === "locked_no_line_items" ?
        <div className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-3 text-sm leading-relaxed text-amber-950">
          <p className="font-semibold">Locked — line-item product data required</p>
          <p className="mt-1.5 text-xs">
            Upload combined order + line-item CSV with{" "}
            <span className="font-mono text-[11px]">product_id</span> on{" "}
            <Link href="/data" className="font-medium underline decoration-amber-400 underline-offset-2">
              /data
            </Link>
            .
          </p>
        </div>
      : null}

      {productQuality.state === "insufficient_segments" ?
        <div className="mt-4 rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-3 py-3 text-sm leading-relaxed text-zinc-800">
          <p className="font-semibold text-zinc-900">Insufficient data — segments below threshold</p>
          <p className="mt-1.5 text-xs">
            Line items are present, but no entry-product segment meets the {MIN_CUSTOMERS_FOR_SIGNAL}-customer minimum. This
            is insufficient data, not a weak/strong ranking.
          </p>
        </div>
      : null}

      {productQuality.state === "ready" && productQuality.strongest && productQuality.weakest ?
        <div className="mt-4 space-y-2">
          <ProductHighlight label="Strongest entry product" highlight={productQuality.strongest} />
          <ProductHighlight label="Weakest entry product" highlight={productQuality.weakest} />
        </div>
      : null}
    </div>
  );
}

function DataCompletenessStrip({ dataCompleteness }: { dataCompleteness: DashboardDataCompletenessView }) {
  return (
    <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Data completeness</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">What this session source unlocks — not a KPI wall.</p>
        </div>
        <Link
          href="/data"
          className="text-xs font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
        >
          Manage on /data →
        </Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {dataCompleteness.rows.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2.5 ring-1 ring-black/[0.02]"
            title={row.detail}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{row.label}</p>
              <span
                className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${COMPLETENESS_STYLES[row.status]}`}
              >
                {COMPLETENESS_LABELS[row.status]}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-zinc-700">{row.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
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
    <div className="space-y-4">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Command-centre spine</h2>
        <p className="mt-1 text-xs text-zinc-600">Executive snapshots from acquisition and product-quality routes — drill down for tables.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AcquisitionEconomicsCard acquisition={acquisition} isUploaded={isUploaded} />
        <ProductQualityCard productQuality={productQuality} />
      </div>
      <DataCompletenessStrip dataCompleteness={dataCompleteness} />
    </div>
  );
}
