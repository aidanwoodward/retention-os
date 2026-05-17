"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CsvImportPreview } from "@/components/data/CsvImportPreview";
import { DataPageCanonicalRoutesIntroBody, DataPageMetricEngineRibbonBody } from "@/components/data/DataPageRibbonParagraphs";
import { DataPageRouteCoverageSection } from "@/components/data/DataPageRouteCoverage";
import type { DataPageDemoLedgerSnapshot } from "@/components/data/DataPageSourceHero";
import { DataPageSourceHero } from "@/components/data/DataPageSourceHero";
import { DataUploadedMarginAssumptionsSection } from "@/components/data/DataUploadedMarginAssumptionsSection";
import { useDataPageSessionSummary } from "@/components/data/useDataPageSessionSummary";
import type { DataPageViewModel } from "@/lib/metrics";

function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

function buildDemoSnapshot(vm: DataPageViewModel, windowEndFormatted: string, demoDatasetSourceLabel: string): DataPageDemoLedgerSnapshot {
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
  const hasUpload = uploadSummary != null;
  const demoSnapshot = buildDemoSnapshot(vm, windowEndFormatted, demoDatasetSourceLabel);
  const [sessionEpoch, setSessionEpoch] = useState(0);

  const reconcileSessionSlices = useCallback(() => {
    refreshSessionDataset();
    setSessionEpoch((e) => e + 1);
  }, [refreshSessionDataset]);

  return (
    <>
      <DataPageSourceHero demo={demoSnapshot} uploadSummary={uploadSummary} onUploadCleared={reconcileSessionSlices} />

      <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02]">
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Transparency mode</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">What this page anchors</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Use the control banner above to see which snapshot is powering KPI tabs. Sections below rehearse deterministic lineage, ingestion preview,
            and fixture counts pulled from canonical demo aggregates — unaffected by uploads except where noted.
          </p>
        </div>
        <dl className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-zinc-100">
          <div className="border-b border-zinc-100 px-5 py-4 sm:border-b-0 sm:px-6">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Canonical fixture ledger</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">Transparency snapshot stays demo-aligned</dd>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Customer/order counts in <span className="font-semibold">Fixture counts</span> below always describe the seeded demo dataset so you have a
              static audit trail beside session uploads.
            </p>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Simulation order window (UTC)</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">Through {windowEndFormatted}</dd>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              First-order cohort months track the fixture horizon from <span className="font-mono text-[11px]">/lib/demo</span>.
            </p>
          </div>
        </dl>
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3.5 sm:px-6">
          <p className="text-xs leading-relaxed text-zinc-700">
            <DataPageMetricEngineRibbonBody hasUpload={hasUpload} />
          </p>
        </div>
      </section>

      <DataPageRouteCoverageSection hasUpload={hasUpload} demoBrandName={vm.demoBrandName} />

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6">
        <div className="border-b border-zinc-100 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">CSV upload workflow</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">CSV onboarding preview</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Validate combined order + line rows against /lib/import contracts, preview metrics, then save to sessionStorage. Saving switches KPI routes on
            this tab to uploaded data; reverting restores the seeded demo spine.
          </p>
        </div>
        <div className="pt-5">
          <CsvImportPreview sessionSyncEpoch={sessionEpoch} onSessionDatasetChange={reconcileSessionSlices} />
        </div>
      </section>

      <DataUploadedMarginAssumptionsSection
        hasUpload={hasUpload}
        sessionSyncEpoch={sessionEpoch}
        onSessionMarginChange={reconcileSessionSlices}
      />

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Demo brand (canonical fixture identity)</h2>
        <p className="mt-2 text-xl font-semibold text-zinc-900">{vm.demoBrandName}</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700">{vm.demoBrandTagline}</p>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Matches <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">runDemoMetricSanityCheck()</code>
          aggregates — mirrored by every KPI banner when uploads are inactive.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Fixture counts (canonical demo)</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          These metrics never hide when an upload exists — keeping the baseline truthful even while KPI charts read CSV data.&nbsp;
          <strong className="font-medium text-zinc-900">Need to reconcile?</strong> Compare against the snapshot card in the banner above once you revert.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Count label="Customers" value={vm.sanity.customerCount.toLocaleString()} />
          <Count label="Orders" value={vm.sanity.orderCount.toLocaleString()} />
          <Count label="Order line items (total rows)" value={vm.orderLineItemCount.toLocaleString()} />
          <Count label="Products (catalog slice)" value={vm.sanity.productCount.toLocaleString()} />
          <Count label="Marketing spend rows (fixture)" value={vm.sanity.marketingSpendRowCount.toLocaleString()} />
          <Count label="Cohort months (first-order)" value={vm.sanity.cohortCount.toLocaleString()} />
          <Count label="First cohort month" value={vm.sanity.firstCohort ?? "—"} />
          <Count label="Last cohort month" value={vm.sanity.lastCohort ?? "—"} />
        </dl>
        {vm.sanity.largestCohort ?
          <p className="mt-4 text-sm text-zinc-600">
            Largest first-order cohort: <strong className="font-medium text-zinc-900">{vm.sanity.largestCohort.cohortPeriod}</strong> (
            {vm.sanity.largestCohort.cohortSize.toLocaleString()} customers).
          </p>
        : null}
        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/90 px-3.5 py-3 text-sm text-zinc-800 ring-1 ring-black/[0.02]">
          <strong className="font-medium text-zinc-900">Contribution modeling:</strong>{" "}
          <code className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px]">contributionMarginPct</code> ={" "}
          {formatPct(vm.marginContributionPct, 0)} of net revenue retained after modeled variable costs (
          <code className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px]">DEMO_MARGIN_ASSUMPTIONS</code>
          ).
          {vm.netRevenueMultiplier != null ?
            <>
              {" "}
              Net revenue multiplier: <span className="tabular-nums font-medium">{vm.netRevenueMultiplier}</span>.
            </>
          : null}
        </div>
        {vm.sanity.warnings.length > 0 ?
          <div className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3.5 py-3 text-sm text-red-950">
            <p className="font-semibold">Sanity warnings</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {vm.sanity.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        : null}
      </section>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Historical route descriptions</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          <DataPageCanonicalRoutesIntroBody hasUpload={hasUpload} />
        </p>
        <ul className="mt-4 space-y-2">
          {vm.enginePoweredRoutes.map((route) => (
            <li
              key={route.href}
              className="flex flex-col rounded-lg border border-zinc-100 px-4 py-3.5 shadow-sm ring-1 ring-black/[0.02] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={route.href}
                  className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                >
                  {route.label}
                </Link>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">{route.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Canonical data model</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Types live under <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">/lib/types</code>; demo
          builders emit compatible shapes into <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">
            /lib/demo
          </code>
          .
        </p>
        <ul className="mt-4 space-y-4">
          {vm.canonicalModelEntities.map((row) => (
            <li key={row.title} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
              <h3 className="text-sm font-semibold text-zinc-900">{row.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700">{row.notes}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300/90 bg-zinc-50/80 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Not live yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Intentionally absent — descriptions match this codebase (no fake green checkmarks, no destructive seed UI on this page).
        </p>
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
    </>
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
