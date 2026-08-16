"use client";

import Link from "next/link";
import { AnalyticalPanel, MetricStat } from "@/components/analytical";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type { ProductQualitySignal } from "@/lib/metrics/product-quality";
import {
  ATTRIBUTION_COVERAGE_TRUST_COPY,
  CONTRIBUTION_LTV_TRUST_COPY,
  OVERALL_QUALITY_LEADER_METHODOLOGY_COPY,
  type FirstProductTableRowView,
  type ProductsPageViewModel,
} from "@/lib/metrics/product-quality-view-model";

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) return "â€”";
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "â€”";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
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

const NO_SUFFICIENT_SEGMENTS_SUB =
  "No entry product has enough customers for a quality comparison yet";

function QualitySignalBadge({ signal }: { signal: ProductQualitySignal }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SIGNAL_STYLES[signal]}`}
    >
      {SIGNAL_LABELS[signal]}
    </span>
  );
}

function AttributionCoverageStrip({ vm }: { vm: ProductsPageViewModel }) {
  const { attributionCoverage, summary } = vm;
  const items = [
    {
      label: "Single-product attribution",
      count: attributionCoverage.singleProductCustomerCount,
      share: attributionCoverage.singleProductShare,
    },
    {
      label: "Multi-product first baskets",
      count: attributionCoverage.multiProductCustomerCount,
      share: attributionCoverage.multiProductShare,
    },
    {
      label: "Unknown first-product attribution",
      count: attributionCoverage.unknownFirstProductCustomerCount,
      share: attributionCoverage.unknownShare,
    },
  ];

  return (
    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3.5 text-sm leading-relaxed text-zinc-800 shadow-sm ring-1 ring-black/[0.02]">
      <p className="font-semibold text-zinc-900">Attribution coverage</p>
      <p className="mt-2">{ATTRIBUTION_COVERAGE_TRUST_COPY}</p>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-zinc-200/80 bg-white px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{item.label}</dt>
            <dd className="mt-1 tabular-nums text-base font-semibold text-zinc-900">
              {item.count.toLocaleString()}
              <span className="ml-2 text-sm font-normal text-zinc-600">
                ({formatPct(item.share)})
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-zinc-600">
        {summary.totalCustomers.toLocaleString()} customers in snapshot â€” populations reconcile to 100%.
      </p>
    </div>
  );
}

function ExecutiveCards({ vm }: { vm: ProductsPageViewModel }) {
  const { executive } = vm;
  const hasLeaders = executive.hasSufficientSegments;

  const leaderValue = hasLeaders && executive.overallQualityLeader.productTitle
    ? executive.overallQualityLeader.productTitle
    : "â€”";
  const leaderSub = hasLeaders
    ? OVERALL_QUALITY_LEADER_METHODOLOGY_COPY
    : NO_SUFFICIENT_SEGMENTS_SUB;

  const repeatValue =
    hasLeaders && executive.highestRepeatRate.productTitle
      ? `${executive.highestRepeatRate.productTitle} Â· ${formatPct(executive.highestRepeatRate.repeatPurchaseRate)}`
      : "â€”";
  const repeatSub = hasLeaders
    ? "Highest repeat purchase rate among segments with sufficient volume"
    : NO_SUFFICIENT_SEGMENTS_SUB;

  const ltvValue =
    hasLeaders && executive.highestRevenueLtv.productTitle
      ? `${executive.highestRevenueLtv.productTitle} Â· ${formatMoney(executive.highestRevenueLtv.avgRevenueLtv)}`
      : "â€”";
  const ltvSub = hasLeaders ? "Snapshot lifetime average" : NO_SUFFICIENT_SEGMENTS_SUB;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricStat label="Overall quality leader" value={leaderValue} sub={leaderSub} metricId="product_quality" />
      <MetricStat label="Highest repeat rate" value={repeatValue} sub={repeatSub} />
      <MetricStat label="Highest Revenue LTV" value={ltvValue} sub={ltvSub} />
    </div>
  );
}

function FirstProductQualityTable({
  rows,
  withinDays,
}: {
  rows: readonly FirstProductTableRowView[];
  withinDays: number;
}) {
  return (
    <table className="min-w-[1100px] w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <th className="px-5 py-3.5">First product</th>
          <th className="px-5 py-3.5">Signal</th>
          <th className="px-5 py-3.5 text-right">Customers</th>
          <th className="px-5 py-3.5 text-right">Share</th>
          <th className="px-5 py-3.5 text-right">Repeat</th>
          <th className="px-5 py-3.5 text-right">F2S â‰¤{withinDays}d</th>
          <th className="px-5 py-3.5 text-right">Revenue LTV</th>
          <th className="px-5 py-3.5 text-right">Contribution LTV</th>
          <th className="px-5 py-3.5 text-right">Discount drag</th>
          <th className="px-5 py-3.5 text-right">Refund drag</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.productId} className="border-b border-zinc-100 hover:bg-zinc-50/80">
            <td className="px-5 py-3">
              <p className="font-medium text-zinc-900">{row.productTitle}</p>
              <p className="mt-0.5 font-mono text-xs text-zinc-500">
                {row.productId}
                {row.sku ? ` Â· ${row.sku}` : ""}
              </p>
            </td>
            <td className="px-5 py-3">
              <QualitySignalBadge signal={row.qualitySignal} />
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {row.customerCount.toLocaleString()}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatPct(row.shareOfSnapshotCustomers)}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatPct(row.repeatPurchaseRate)}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatPct(row.firstToSecondWithinWindowRate)}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatMoney(row.avgRevenueLtv)}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatMoney(row.avgContributionLtv)}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatPct(row.discountDragRate)}
            </td>
            <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
              {formatPct(row.refundDragRate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FirstProductQualityPanel({ vm }: { vm: ProductsPageViewModel }) {
  const {
    summary,
    tableRows,
    engineWarnings,
    attributionCaveat,
    revenueContributionCaveat,
    missingLineItemCoverage,
  } = vm;

  if (missingLineItemCoverage) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3.5 text-sm leading-relaxed text-amber-950">
          <p className="font-semibold">Line-item product data required</p>
          <p className="mt-2">
            First-product customer quality needs combined order and line-item rows with{" "}
            <span className="font-mono text-xs">product_id</span> on each line. Upload a passing CSV on{" "}
            <Link
              href="/data"
              className="font-medium underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700"
            >
              /data
            </Link>{" "}
            to unlock this view for your session dataset.
          </p>
        </div>
        {engineWarnings.length > 0 ? <EngineWarningsList warnings={engineWarnings} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AttributionCoverageStrip vm={vm} />

      <ExecutiveCards vm={vm} />

      <AnalyticalPanel
        title="First-product customer quality"
        description="Each row groups customers by a single-product canonical first order â€” repeat behaviour, LTV, and drag reflect downstream customer economics, not SKU sales volume."
        footer={
          <div className="space-y-2">
            <p>{attributionCaveat}</p>
            <p className="text-xs text-zinc-600">
              <KpiMetricLabel metricId="product_quality">Product quality signal</KpiMetricLabel>{" "}
              uses portfolio-relative thresholds and is separate from the overall quality leader rank.
            </p>
          </div>
        }
      >
        <FirstProductQualityTable rows={tableRows} withinDays={summary.withinDays} />
      </AnalyticalPanel>

      <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3.5 text-sm leading-relaxed text-zinc-800">
        <p className="font-semibold text-zinc-900">Contribution LTV</p>
        <p className="mt-2">{CONTRIBUTION_LTV_TRUST_COPY}</p>
        {revenueContributionCaveat ? <p className="mt-2">{revenueContributionCaveat}</p> : null}
        {!summary.hasContributionCoverage ?
          <p className="mt-2">
            Add order-level{" "}
            <span className="font-mono text-xs">contribution_margin</span> or save margin assumptions on{" "}
            <Link
              href="/data"
              className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
            >
              /data
            </Link>
            .
          </p>
        : null}
      </div>

      {engineWarnings.length > 0 ? <EngineWarningsList warnings={engineWarnings} /> : null}
    </div>
  );
}

function EngineWarningsList({ warnings }: { warnings: readonly string[] }) {
  const filtered = warnings.filter(
    (w) =>
      !w.startsWith("First product attribution uses single_product") &&
      !w.startsWith("Discount and refund drag are order-level"),
  );
  if (filtered.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white px-4 py-3.5 text-sm leading-relaxed text-zinc-800 shadow-sm ring-1 ring-black/[0.02]">
      <p className="font-semibold text-zinc-900">Engine notes</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-700">
        {filtered.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
