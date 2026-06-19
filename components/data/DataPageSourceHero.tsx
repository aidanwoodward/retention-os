"use client";

import { clearUploadedRetentionOSDataset } from "@/lib/data-source";
import type { RetentionOSDatasetSummary } from "@/lib/data-source";
import { UploadedSessionDatasetDl } from "@/components/data/UploadedSessionDatasetSnapshot";

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
  uploadSummary,
  onUploadCleared,
}: {
  demo: DataPageDemoLedgerSnapshot;
  uploadSummary: RetentionOSDatasetSummary | null;
  /** Clear storage + reconcile parent CSV preview state via session epoch bump */
  readonly onUploadCleared: () => void;
}) {
  const hasUpload = uploadSummary != null;

  const revert = () => {
    clearUploadedRetentionOSDataset();
    onUploadCleared();
  };

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
              This removes the session CSV snapshot for this tab. All KPI pages will reload their source selection on navigation and align with{" "}
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
      <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-4 py-3 text-sm leading-relaxed text-sky-950 ring-1 ring-sky-900/10">
        <p className="font-semibold">Demo-source mode</p>
        <p className="mt-2 text-sky-950/95">
          The KPI spine consumes one deterministic MVP demo fixture audited through{" "}
          <span className="font-mono text-[11px]">runDemoMetricSanityCheck()</span>: repeatable, intentional, not live storefront telemetry yet. CSV
          uploads below reuse the exact same calculator stack for this browser session only.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Canonical demo lineage</p>
        <p className="mt-2 text-xl font-semibold text-zinc-900">{demo.demoBrandName}</p>
        <p className="mt-1 text-sm text-zinc-700">{demo.demoBrandTagline}</p>
        <p className="mt-3 text-xs text-zinc-600">
          Provenance tag:{" "}
          <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">{demo.sourceLabelDemo}</code> · Simulation
          calendar window UTC through{" "}
          <span className="font-mono tabular-nums text-[13px] text-zinc-900">{demo.windowEndFormatted}</span>.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Fixture breadth (canonical demo)</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LedgerStat label="Customers" value={demo.customerCount.toLocaleString()} />
          <LedgerStat label="Orders" value={demo.orderCount.toLocaleString()} />
          <LedgerStat label="Line items (all orders)" value={demo.orderLineItemCount.toLocaleString()} />
          <LedgerStat label="Products (catalog slice)" value={demo.productCount.toLocaleString()} />
          <LedgerStat label="Marketing spend rows" value={demo.marketingSpendRows.toLocaleString()} />
          <LedgerStat label="Cohort months tracked" value={demo.cohortMonthCount.toLocaleString()} />
          <LedgerStat label="First cohort month" value={demo.firstCohort ?? "—"} monospace={false} />
          <LedgerStat label="Last cohort month" value={demo.lastCohort ?? "—"} monospace={false} />
        </dl>
      </div>

      <p className="text-sm leading-relaxed text-zinc-700">
        <strong className="font-medium text-zinc-900">Largest sampled cohort:</strong> {largest}. Full fidelity tables remain in{" "}
        <span className="font-semibold text-zinc-900">Fixture counts</span> below for audit exports.
      </p>
    </div>
  );
}

function LedgerStat({ label, value, monospace = true }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3.5 ring-1 ring-black/[0.02]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className={`mt-2 text-lg font-semibold text-zinc-900 ${monospace ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
