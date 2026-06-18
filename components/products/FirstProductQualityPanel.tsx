"use client";

import Link from "next/link";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type {
  FirstProductTableRowView,
  ProductsPageSummaryView,
  ProductsPageViewModel,
} from "@/lib/metrics/product-quality-view-model";
import { MIN_CUSTOMERS_FOR_SIGNAL } from "@/lib/metrics/product-quality";
import type { ProductQualitySignal } from "@/lib/metrics/product-quality";

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
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

function QualitySignalBadge({ signal }: { signal: ProductQualitySignal }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SIGNAL_STYLES[signal]}`}
    >
      {SIGNAL_LABELS[signal]}
    </span>
  );
}

function SummaryKpi({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

function HighlightCard({
  label,
  productTitle,
  productId,
  signal,
  repeatRate,
  f2sRate,
  avgRevenueLtv,
}: {
  label: string;
  productTitle: string;
  productId: string;
  signal: ProductQualitySignal | null;
  repeatRate: number | null;
  f2sRate: number | null;
  avgRevenueLtv: number | null;
}) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 font-semibold text-zinc-900">{productTitle}</p>
      <p className="mt-0.5 font-mono text-xs text-zinc-500">{productId}</p>
      {signal ? (
        <div className="mt-3">
          <QualitySignalBadge signal={signal} />
        </div>
      ) : null}
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Repeat</dt>
          <dd className="mt-1 tabular-nums font-medium text-zinc-900">{formatPct(repeatRate)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">F2S ≤90d</dt>
          <dd className="mt-1 tabular-nums font-medium text-zinc-900">{formatPct(f2sRate)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Avg rev LTV</dt>
          <dd className="mt-1 tabular-nums font-medium text-zinc-900">{formatMoney(avgRevenueLtv)}</dd>
        </div>
      </dl>
    </div>
  );
}

function findRow(rows: readonly FirstProductTableRowView[], productId: string | null) {
  if (!productId) return undefined;
  return rows.find((r) => r.productId === productId);
}

function FirstProductQualityTable({
  rows,
  withinDays,
}: {
  rows: readonly FirstProductTableRowView[];
  withinDays: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <table className="min-w-[1100px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-5 py-3.5">Entry product</th>
            <th className="px-5 py-3.5">Signal</th>
            <th className="px-5 py-3.5 text-right">Customers</th>
            <th className="px-5 py-3.5 text-right">Repeat</th>
            <th className="px-5 py-3.5 text-right">F2S ≤{withinDays}d</th>
            <th className="px-5 py-3.5 text-right">3+ orders</th>
            <th className="px-5 py-3.5 text-right">Avg rev LTV</th>
            <th className="px-5 py-3.5 text-right">Avg contrib LTV</th>
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
                  {row.sku ? ` · ${row.sku}` : ""}
                </p>
              </td>
              <td className="px-5 py-3">
                <QualitySignalBadge signal={row.qualitySignal} />
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                {row.customerCount.toLocaleString()}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                {formatPct(row.repeatPurchaseRate)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                {formatPct(row.firstToSecondWithinWindowRate)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                {formatPct(row.thirdPurchaseRate)}
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
    </div>
  );
}

function SummarySection({ summary }: { summary: ProductsPageSummaryView }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Customer quality summary
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryKpi title="Customers in snapshot" value={summary.totalCustomers.toLocaleString()} />
        <SummaryKpi
          title="Entry-product segments"
          value={String(summary.productCount)}
          sub="Distinct first products with assigned customers"
        />
        <SummaryKpi
          title="Segments with enough data"
          value={String(summary.groupsWithEnoughCustomers)}
          sub={`At least ${MIN_CUSTOMERS_FOR_SIGNAL} customers per segment`}
        />
        <SummaryKpi
          title="Unassigned customers"
          value={summary.unassignedCustomerCount.toLocaleString()}
          sub="No identifiable first-product anchor"
        />
      </div>
    </div>
  );
}

function StrongestWeakestSection({
  summary,
  tableRows,
}: {
  summary: ProductsPageSummaryView;
  tableRows: readonly FirstProductTableRowView[];
}) {
  if (summary.groupsWithEnoughCustomers === 0) {
    return (
      <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3.5 text-sm leading-relaxed text-zinc-800">
        <p className="font-semibold text-zinc-900">No segments with enough customers yet</p>
        <p className="mt-2">
          Quality signals require at least {MIN_CUSTOMERS_FOR_SIGNAL} customers per entry product. Segments below that
          threshold are labelled insufficient data — this reflects sample size, not a verdict on the product.
        </p>
      </div>
    );
  }

  const strongest = findRow(tableRows, summary.strongestProductId);
  const weakest = findRow(tableRows, summary.weakestProductId);

  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Strongest and weakest entry products
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {strongest && summary.strongestProductTitle ?
          <HighlightCard
            label="Strongest entry product"
            productTitle={summary.strongestProductTitle}
            productId={strongest.productId}
            signal={strongest.qualitySignal}
            repeatRate={strongest.repeatPurchaseRate}
            f2sRate={strongest.firstToSecondWithinWindowRate}
            avgRevenueLtv={strongest.avgRevenueLtv}
          />
        : null}
        {weakest && summary.weakestProductTitle ?
          <HighlightCard
            label="Weakest entry product"
            productTitle={summary.weakestProductTitle}
            productId={weakest.productId}
            signal={weakest.qualitySignal}
            repeatRate={weakest.repeatPurchaseRate}
            f2sRate={weakest.firstToSecondWithinWindowRate}
            avgRevenueLtv={weakest.avgRevenueLtv}
          />
        : null}
      </div>
    </div>
  );
}

export function FirstProductQualityPanel({ vm }: { vm: ProductsPageViewModel }) {
  const { summary, tableRows, engineWarnings, attributionCaveat, revenueContributionCaveat, missingLineItemCoverage } =
    vm;

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
        {engineWarnings.length > 0 ?
          <EngineWarningsList warnings={engineWarnings} />
        : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SummarySection summary={summary} />

      <StrongestWeakestSection summary={summary} tableRows={tableRows} />

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <KpiMetricLabel metricId="product_quality">First-product customer quality</KpiMetricLabel>
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
          Each row groups customers by the product on their first order line — repeat behaviour, LTV, and drag reflect
          downstream customer economics, not SKU sales volume.
        </p>
        <div className="mt-3 rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3 text-sm leading-relaxed text-zinc-800">
          <p>{attributionCaveat}</p>
        </div>
        <div className="mt-4">
          <FirstProductQualityTable rows={tableRows} withinDays={summary.withinDays} />
        </div>
      </div>

      {revenueContributionCaveat ?
        <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3.5 text-sm leading-relaxed text-zinc-800">
          <p className="font-semibold text-zinc-900">Revenue vs contribution LTV</p>
          <p className="mt-2">{revenueContributionCaveat}</p>
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
      : null}

      {engineWarnings.length > 0 ?
        <EngineWarningsList warnings={engineWarnings} />
      : null}
    </div>
  );
}

function EngineWarningsList({ warnings }: { warnings: readonly string[] }) {
  const filtered = warnings.filter(
    (w) =>
      !w.startsWith("First product is the first line item") &&
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
