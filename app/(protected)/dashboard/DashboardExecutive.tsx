"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { MetricSourceBanner } from "@/components/mvp/MetricSourceBanner";
import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type { MetricDataQuality, MetricId } from "@/lib/metrics/metric-definitions";
import { DashboardSpinePanels } from "@/components/dashboard/DashboardSpinePanels";
import {
  buildDemoCommandCentreSelection,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "@/lib/data-source/client-selected-source";
import { buildDashboardExecutiveViewModelFromDataset } from "@/lib/metrics/dashboard-view-model";

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) {
    return "—";
  }
  return `${(rate * 100).toFixed(digits)}%`;
}

const kpiPrimary =
  "rounded-lg border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]";
const kpiSecondary =
  "rounded-lg border border-zinc-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]";

export default function DashboardExecutive() {
  const [selection, setSelection] = useState<CommandCentreDatasetSelection>(() => buildDemoCommandCentreSelection());

  useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource());
  }, []);

  const vm = useMemo(() => buildDashboardExecutiveViewModelFromDataset(selection.dataset), [selection.dataset]);
  const { summary, durability, acquisition, productQuality, dataCompleteness } = vm;

  return (
    <CommandCentrePageFrame
      routeId="dashboard"
      maxWidth="6xl"
      bannerKind="metrics"
      metricsBannerSlot={<MetricSourceBanner routeId="dashboard" selection={selection} />}
      activeMetricDatasetSource={selection.isUploaded ? "uploaded_csv" : "demo"}
    >
      <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
        <div className="border-b border-zinc-100 bg-gradient-to-br from-white to-zinc-50/70 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <KpiMetricLabel metricId="revenue_durability_posture">Revenue durability posture</KpiMetricLabel>
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{durability.status}</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
            Informal label from repeatable threshold checks — not a finance-grade index. Full methodology and prioritized moves live on Diagnostic
            Insights.
          </p>
          <Link
            href="/insights"
            className="mt-4 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-black/[0.02] transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Open Diagnostic Insights →
          </Link>
        </div>
      </section>

      <DashboardSpinePanels
        acquisition={acquisition}
        productQuality={productQuality}
        dataCompleteness={dataCompleteness}
        isUploaded={selection.isUploaded}
      />

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Executive KPIs</h2>
        <p className="mt-1 text-xs text-zinc-600">Primary portfolio levers, then fundamentals.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            className={kpiPrimary}
            prominent
            metricId="repeat_purchase_rate"
            title="All-time repeat purchase rate"
            sub="Customers with ≥2 qualifying orders"
            value={formatPct(summary.allTimeRepeatPurchaseRate)}
          />
          <MetricCard
            className={kpiPrimary}
            prominent
            metricId="first_to_second_conversion"
            title="First→second within 90 days"
            sub="Vs first qualifying order timestamp"
            value={formatPct(summary.firstToSecondWithin90DaysRate)}
          />
          <MetricCard
            className={kpiPrimary}
            prominent
            metricId="revenue_ltv"
            title="Avg terminal net revenue LTV"
            sub="Across cohort staircase tails"
            value={formatMoney(summary.avgTerminalNetRevenueLtvAcrossCohorts)}
          />
          <MetricCard
            className={kpiPrimary}
            prominent
            metricId="contribution_ltv"
            title="Avg terminal contribution LTV"
            sub="Where margin model applies"
            value={formatMoney(summary.avgTerminalContributionLtvAcrossCohorts)}
          />
        </div>

        <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Portfolio fundamentals</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetricCard className={kpiSecondary} title="Customers" value={summary.totalCustomers.toLocaleString()} />
          <MetricCard
            className={kpiSecondary}
            metricId="net_revenue"
            title="Total net revenue"
            sub="Gross minus discounts & refunds"
            value={formatMoney(summary.totalNetRevenue)}
          />
          <MetricCard className={kpiSecondary} title="Cohort months (first-order)" value={String(summary.cohortCount)} />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Go deeper</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NavCard href="/insights" title="Diagnostic Insights" description="Evidence, actions, and metric refs from transparent rules." />
          <NavCard href="/acquisition" title="Acquisition economics" description="CAC, LTV:CAC, and payback when spend is attached." />
          <NavCard href="/products" title="First-product quality" description="Which entry products create durable customers." />
          <NavCard href="/data" title="Data & sources" description="Upload orders, set spend and margin assumptions." />
        </div>
      </section>
    </CommandCentrePageFrame>
  );
}

function MetricCard({
  className,
  title,
  value,
  sub,
  prominent,
  metricId,
  dataQuality,
}: {
  className: string;
  title: string;
  value: string;
  sub?: string;
  prominent?: boolean;
  metricId?: MetricId;
  dataQuality?: MetricDataQuality;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <KpiMetricLabel metricId={metricId} dataQuality={dataQuality} tooltipSize="sm">
          {title}
        </KpiMetricLabel>
      </p>
      <p className={`mt-2 font-semibold tabular-nums text-zinc-900 ${prominent ? "text-2xl" : "text-xl"}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs leading-snug text-zinc-600">{sub}</p> : null}
    </div>
  );
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] transition hover:border-zinc-300 hover:shadow-md"
    >
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">{description}</p>
      <p className="mt-3 text-xs font-medium text-zinc-700 group-hover:text-zinc-900">Open route →</p>
    </Link>
  );
}
