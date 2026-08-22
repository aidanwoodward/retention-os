"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { CsvImportPreview } from "@/components/data/CsvImportPreview";
import type { DataPageDemoLedgerSnapshot } from "@/components/data/DataPageSourceHero";
import { DataPageSourceHero } from "@/components/data/DataPageSourceHero";
import { DataPageAnalysisReadinessPanel } from "@/components/data/DataPageAnalysisReadinessPanel";
import { DataUploadedMarginAssumptionsSection } from "@/components/data/DataUploadedMarginAssumptionsSection";
import { DataUploadedMarketingSpendAssumptionSection } from "@/components/data/DataUploadedMarketingSpendAssumptionSection";
import { AcquisitionDataPreview } from "@/components/data/AcquisitionDataPreview";
import { MarketingSpendCsvPreview } from "@/components/data/MarketingSpendCsvPreview";
import { useDataPageSessionSummary } from "@/components/data/useDataPageSessionSummary";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MVP_NAV } from "@/lib/mvp/cohesion";
import { useCommandCentreDatasetSelection } from "@/lib/data-source/use-command-centre-dataset-selection";
import type { DataPageViewModel } from "@/lib/metrics";

function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

function buildDemoSnapshot(
  vm: DataPageViewModel,
  windowEndFormatted: string,
  demoDatasetSourceLabel: string,
): DataPageDemoLedgerSnapshot {
  return {
    demoBrandName: vm.demoBrandName,
    demoBrandTagline: vm.demoBrandTagline,
    sourceLabelDemo: demoDatasetSourceLabel,
    windowEndFormatted,
    customerCount: vm.sanity.customerCount,
    orderCount: vm.sanity.orderCount,
    orderLineItemCount: vm.orderLineItemCount,
    productCount: vm.sanity.productCount,
    marketingSpendRows: vm.sanity.marketingSpendRowCount,
    cohortMonthCount: vm.sanity.cohortCount,
    firstCohort: vm.sanity.firstCohort,
    lastCohort: vm.sanity.lastCohort,
    largestCohortLabel: vm.sanity.largestCohort?.cohortPeriod ?? null,
    largestCohortCustomers: vm.sanity.largestCohort?.cohortSize ?? null,
  };
}

const KPI_ROUTE_IDS = new Set(["dashboard", "cohorts", "retention", "ltv", "acquisition", "products", "insights"]);

export function DataPageBody({
  vm,
  windowEndFormatted,
  demoDatasetSourceLabel,
}: {
  vm: DataPageViewModel;
  windowEndFormatted: string;
  demoDatasetSourceLabel: string;
}) {
  const [uploadSummary, refreshSessionDataset] = useDataPageSessionSummary();
  const demoSnapshot = buildDemoSnapshot(vm, windowEndFormatted, demoDatasetSourceLabel);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const selection = useCommandCentreDatasetSelection(undefined, sessionEpoch);
  const hasUpload = selection.status === "uploaded" && uploadSummary != null;

  const reconcileSessionSlices = useCallback(() => {
    refreshSessionDataset();
    setSessionEpoch((e) => e + 1);
  }, [refreshSessionDataset]);

  const kpiRoutes = MVP_NAV.filter((n) => KPI_ROUTE_IDS.has(n.id));

  return (
    <>
      <DataPageSourceHero
        demo={demoSnapshot}
        selection={selection}
        uploadSummary={uploadSummary}
        onUploadCleared={reconcileSessionSlices}
      />

      <DataPageAnalysisReadinessPanel selection={selection} />

      <section
        id="orders-upload"
        className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6"
      >
        <div className="border-b border-zinc-100 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Upload & import review</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">Shopify Orders CSV</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Export from Shopify Admin (Orders → Export), upload here, review quality, then save. Saving switches KPI routes on this tab to your data.
          </p>
        </div>
        <div className="pt-5">
          <CsvImportPreview sessionSyncEpoch={sessionEpoch} onSessionDatasetChange={reconcileSessionSlices} />
        </div>
      </section>

      <div id="marketing-spend-assumption">
        <DataUploadedMarketingSpendAssumptionSection
          hasUpload={hasUpload}
          sessionSyncEpoch={sessionEpoch}
          onSessionAssumptionChange={reconcileSessionSlices}
        />
      </div>

      <div id="margin-assumption">
        <DataUploadedMarginAssumptionsSection
          hasUpload={hasUpload}
          sessionSyncEpoch={sessionEpoch}
          onSessionMarginChange={reconcileSessionSlices}
        />
      </div>

      <CollapsibleSection title="Advanced: marketing spend CSV" subtitle="Optional actual spend — overrides the % assumption when saved">
        <div className="px-5 py-5 sm:px-6">
          <MarketingSpendCsvPreview sessionSyncEpoch={sessionEpoch} onSessionSpendChange={reconcileSessionSlices} />
        </div>
      </CollapsibleSection>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Acquisition sanity check</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Quick check that spend wiring unlocks CAC and payback on the same source as the Acquisition page.
            </p>
          </div>
          <Link
            href="/acquisition"
            className="text-xs font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
          >
            Open Acquisition →
          </Link>
        </div>
        <div className="pt-5">
          <AcquisitionDataPreview sessionEpoch={sessionEpoch} />
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300/90 bg-zinc-50/80 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Future sources</h2>
        <p className="mt-1 text-sm text-zinc-600">Planned capabilities not yet in this release.</p>
        <ul className="mt-4 space-y-2">
          {vm.comingNext.map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-zinc-200/90 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/[0.02]"
            >
              <p className="font-semibold text-zinc-900">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-700">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
        <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-zinc-900 sm:px-6">
          About the demo dataset (reference)
        </summary>
        <div className="border-t border-zinc-100 px-5 py-4 sm:px-6">
          <p className="text-lg font-semibold text-zinc-900">{vm.demoBrandName}</p>
          <p className="mt-1 text-sm text-zinc-700">{vm.demoBrandTagline}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Order window through {windowEndFormatted} (UTC). Counts below describe the demo baseline only — not your upload.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Count label="Customers" value={vm.sanity.customerCount.toLocaleString()} />
            <Count label="Orders" value={vm.sanity.orderCount.toLocaleString()} />
            <Count label="Cohort months" value={vm.sanity.cohortCount.toLocaleString()} />
            <Count label="Products" value={vm.sanity.productCount.toLocaleString()} />
          </dl>
          {vm.sanity.largestCohort ?
            <p className="mt-3 text-sm text-zinc-600">
              Largest cohort: {vm.sanity.largestCohort.cohortPeriod} ({vm.sanity.largestCohort.cohortSize.toLocaleString()} customers)
            </p>
          : null}
          <p className="mt-3 text-xs text-zinc-600">
            Demo contribution margin: {formatPct(vm.marginContributionPct, 0)} of net revenue after modeled variable costs.
          </p>
          {vm.sanity.warnings.length > 0 ?
            <div className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3.5 py-3 text-sm text-red-950">
              <p className="font-semibold">Demo sanity warnings</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {vm.sanity.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {kpiRoutes.map((route) => (
              <Link
                key={route.id}
                href={route.href}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
              >
                {route.label}
              </Link>
            ))}
          </div>
        </div>
      </details>
    </>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Collapsible>
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6">
          <div>
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
            <p className="mt-0.5 text-xs text-zinc-600">{subtitle}</p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-zinc-500 transition group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-zinc-100">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3.5 ring-1 ring-black/[0.02]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{value}</dd>
    </div>
  );
}
