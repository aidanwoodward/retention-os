"use client";

import type { ReactNode } from "react";
import { deleteUploadedDatasetAndUseDemo } from "@/lib/data-source";
import type { CommandCentreDatasetSelection } from "@/lib/data-source/client-selected-source";
import type { RetentionOSDatasetSummary } from "@/lib/data-source";
import { UploadedSessionDatasetDl } from "@/components/data/UploadedSessionDatasetSnapshot";
import { DatasetSourceUnavailablePanel } from "@/components/mvp/DatasetSourceUnavailablePanel";

export type DataPageDemoLedgerSnapshot = Readonly<{
  demoBrandName: string;
  demoBrandTagline: string;
  sourceLabelDemo: string;
  windowEndFormatted: string;
  customerCount: number;
  orderCount: number;
  orderLineItemCount: number;
  productCount: number;
  marketingSpendRows: number;
  cohortMonthCount: number;
  firstCohort: string | null;
  lastCohort: string | null;
  largestCohortLabel: string | null;
  largestCohortCustomers: number | null;
}>;

export function DataPageSourceHero({
  demo,
  selection,
  uploadSummary,
  onUploadCleared,
}: {
  demo: DataPageDemoLedgerSnapshot;
  /** Shared resolve path — drives lost_upload honesty (not session-summary alone). */
  selection: CommandCentreDatasetSelection;
  uploadSummary: RetentionOSDatasetSummary | null;
  /** Clear storage + reconcile parent CSV preview state via session epoch bump */
  readonly onUploadCleared: () => void;
}) {
  const revert = () => {
    deleteUploadedDatasetAndUseDemo();
    onUploadCleared();
  };

  if (selection.status === "pending") {
    return (
      <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02]">
        <div className="border-b border-zinc-200/90 bg-gradient-to-r from-slate-900 via-zinc-900 to-zinc-950 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Data source control centre</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Resolving active dataset…</h2>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <DatasetSourceUnavailablePanel selection={selection} />
        </div>
      </section>
    );
  }

  if (selection.status === "lost_upload") {
    return (
      <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02]">
        <div className="border-b border-zinc-200/90 bg-gradient-to-r from-slate-900 via-zinc-900 to-zinc-950 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Data source control centre</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Uploaded session lost — re-upload required
          </h2>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 bg-amber-50/80 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800/90">Current active source</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">
              Intent: uploaded · payload unavailable
            </p>
          </div>
          <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-700/25">
            Session lost
          </span>
        </div>
        <div className="bg-white px-5 py-5 sm:px-6 sm:py-6">
          <DatasetSourceUnavailablePanel selection={selection} onRecoveredToDemo={onUploadCleared} />
        </div>
      </section>
    );
  }

  const hasUpload = selection.status === "uploaded" && uploadSummary != null;

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02]">
      <div className="border-b border-zinc-200/90 bg-gradient-to-r from-slate-900 via-zinc-900 to-zinc-950 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Data source control centre</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Active command-centre dataset for this browser tab
        </h2>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Current active source</p>
          <p className="mt-2 text-lg font-semibold text-zinc-950">
            {hasUpload ?
              <>
                Uploaded <span className="text-emerald-800">CSV session dataset</span>
              </>
            : <>
                Canonical <span className="text-sky-800">demo dataset</span>
              </>
            }
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            hasUpload ?
              "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-700/25"
            : "bg-sky-100 text-sky-950 ring-1 ring-sky-800/25"
          }`}
        >
          {hasUpload ? "Session-scoped CSV" : "Demo fixture"}
        </span>
      </div>

      <div className="bg-white px-5 py-5 sm:px-6 sm:py-6">
        {hasUpload && uploadSummary ?
          <UploadedModePanel summary={uploadSummary} demoBrandName={demo.demoBrandName} onRevert={revert} />
        : <DemoModePanel demo={demo} />}
      </div>
    </section>
  );
}

function UploadedModePanel({
  summary,
  demoBrandName,
  onRevert,
}: {
  summary: RetentionOSDatasetSummary;
  demoBrandName: string;
  onRevert: () => void;
}) {
  return (
    <div>
      <div className="rounded-lg border border-amber-200/90 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-900/10">
        <p className="font-semibold">Session-only retention</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-amber-950/95">
          <li>Saved only in this browser tab — not synced to the cloud or shared across devices.</li>
          <li>Refreshing this tab keeps your upload until you clear it or close the tab.</li>
          <li>Closing the tab clears the CSV payload; RetentionOS will show uploaded session lost until you re-upload or switch to demo.</li>
          <li>Reverting immediately switches Dashboard, Cohorts, Retention, LTV, Acquisition, Products, and Insights back to the demo dataset.</li>
        </ul>
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Uploaded snapshot (session)</p>

      <UploadedSessionDatasetDl
        className="mt-6 border-t border-zinc-200/90 pt-5"
        summary={summary}
        footer={
          <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-4">
            <p className="text-sm font-semibold text-zinc-900">Revert to demo dataset</p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">
              This removes the session CSV snapshot for this tab and resets durable source intent to demo. All KPI pages will align with{" "}
              <span className="font-mono text-[11px]">getDemoDataset()</span> / <strong className="font-medium">{demoBrandName}</strong>. No
              server data is wiped — there is nothing persisted remotely for this MVP path.
            </p>
            <button
              type="button"
              onClick={onRevert}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border-2 border-amber-700/80 bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 sm:w-auto"
            >
              Revert to demo dataset
            </button>
          </div>
        }
      />
    </div>
  );
}

function DemoModePanel({ demo }: { demo: DataPageDemoLedgerSnapshot }) {
  const largest =
    demo.largestCohortLabel != null ?
      <>
        <strong className="font-semibold">{demo.largestCohortLabel}</strong> ({demo.largestCohortCustomers?.toLocaleString() ?? "—"}{" "}
        customers)
      </>
    : "—";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-sky-200/90 bg-sky-50/70 px-4 py-3 text-sm leading-relaxed text-sky-950 ring-1 ring-sky-900/10">
        <p className="font-semibold">{demo.demoBrandName}</p>
        <p className="mt-1.5 text-sky-950/90">{demo.demoBrandTagline}</p>
        <p className="mt-2 text-sky-950/90">
          Fixture ledger below is the audit trail for demo mode. Upload a Shopify Orders CSV to analyse your own shop in this tab.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
        <DemoStat label="Source label" value={demo.sourceLabelDemo} />
        <DemoStat label="Window end" value={demo.windowEndFormatted} />
        <DemoStat label="Customers" value={demo.customerCount.toLocaleString()} />
        <DemoStat label="Orders" value={demo.orderCount.toLocaleString()} />
        <DemoStat label="Line items" value={demo.orderLineItemCount.toLocaleString()} />
        <DemoStat label="Products" value={demo.productCount.toLocaleString()} />
        <DemoStat label="Marketing spend rows" value={String(demo.marketingSpendRows)} />
        <DemoStat label="Cohort months" value={String(demo.cohortMonthCount)} />
        <DemoStat label="First cohort" value={demo.firstCohort ?? "—"} />
        <DemoStat label="Last cohort" value={demo.lastCohort ?? "—"} />
        <DemoStat label="Largest cohort" value={largest} />
      </dl>
    </div>
  );
}

function DemoStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
