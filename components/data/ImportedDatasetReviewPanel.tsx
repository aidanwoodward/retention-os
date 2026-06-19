"use client";

import type { ImportReviewMetricRow, ImportReviewViewModel } from "@/lib/import/import-review-view-model";

function formatIsoDate(iso: string | undefined): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function confidenceBadge(confidence: ImportReviewViewModel["confidence"]) {
  if (confidence === "ready") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
        Ready to review
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-200">
      Review warnings
    </span>
  );
}

function metricStatusBadge(status: ImportReviewMetricRow["status"]) {
  switch (status) {
    case "unlocked":
      return (
        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-200">
          Unlocked
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950 ring-1 ring-amber-200">
          Partial
        </span>
      );
    case "locked":
      return (
        <span className="inline-flex rounded-full bg-zinc-200/90 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 ring-1 ring-zinc-300">
          Locked
        </span>
      );
  }
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 ring-1 ring-black/[0.02]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-900">{value}</dd>
    </div>
  );
}

function presenceLabel(presence: "detected" | "none", count?: number): string {
  if (presence === "none") return "None detected";
  return count != null ? `Detected (${count.toLocaleString()} order${count === 1 ? "" : "s"})` : "Detected";
}

export function ImportedDatasetReviewPanel({
  viewModel,
  fileName,
  onConfirmSave,
  onDismissPreview,
  saveError,
}: {
  readonly viewModel: ImportReviewViewModel;
  readonly fileName: string | null;
  readonly onConfirmSave: () => void;
  readonly onDismissPreview: () => void;
  readonly saveError?: string | null;
}) {
  const unlockedMetrics = viewModel.metrics.filter((m) => m.status === "unlocked");
  const limitedMetrics = viewModel.metrics.filter((m) => m.status !== "unlocked");
  const acquisitionLocked = viewModel.metrics.some((m) => m.id === "acquisition" && m.status === "locked");

  return (
    <div className="rounded-xl border border-zinc-300/90 bg-gradient-to-b from-white to-zinc-50/80 p-5 shadow-sm ring-1 ring-black/[0.03] sm:p-6">
      <section className="space-y-3 border-b border-zinc-200/80 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Review imported dataset</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
            {viewModel.formatLabel}
          </span>
          {confidenceBadge(viewModel.confidence)}
        </div>
        {fileName ? (
          <p className="text-sm text-zinc-600">
            File: <span className="font-medium text-zinc-900">{fileName}</span>
          </p>
        ) : null}
        <div>
          <p className="text-base font-semibold text-zinc-900">{viewModel.statusHeadline}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">{viewModel.statusDetail}</p>
        </div>
      </section>

      <section className="space-y-3 border-b border-zinc-200/80 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Dataset coverage</h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem
            label="Date range (UTC)"
            value={`${formatIsoDate(viewModel.dateRange.firstOrderAt)} -> ${formatIsoDate(viewModel.dateRange.lastOrderAt)}`}
          />
          <SummaryItem label="Orders" value={String(viewModel.counts.orders)} />
          <SummaryItem label="Customers" value={String(viewModel.counts.customers)} />
          <SummaryItem label="Products" value={String(viewModel.counts.products)} />
          <SummaryItem label="Line items" value={String(viewModel.counts.lineItems)} />
        </dl>
      </section>

      <section className="space-y-3 border-b border-zinc-200/80 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Revenue and financial treatment
        </h3>
        <div className="rounded-lg border border-zinc-200/90 bg-white/80 px-4 py-3 text-sm text-zinc-800">
          <p className="font-semibold text-zinc-900">{viewModel.revenueBasis.headline}</p>
          <p className="mt-2 leading-relaxed text-zinc-700">{viewModel.revenueBasis.formula}</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <SummaryItem
            label="Discounts"
            value={presenceLabel(viewModel.financialSignals.discounts.presence, viewModel.financialSignals.discounts.orderCount)}
          />
          <SummaryItem
            label="Refunds"
            value={presenceLabel(viewModel.financialSignals.refunds.presence, viewModel.financialSignals.refunds.orderCount)}
          />
          <SummaryItem label="Tax / shipping" value="Excluded from LTV" />
        </dl>
        <p className="text-xs leading-relaxed text-zinc-600">{viewModel.financialSignals.taxShipping.detail}</p>
      </section>

      <section className="space-y-3 border-b border-zinc-200/80 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Customer identity</h3>
        <p className="text-sm leading-relaxed text-zinc-800">{viewModel.customerIdentity.detail}</p>
        {viewModel.customerIdentity.caveat ? (
          <p className="rounded-lg border border-amber-200/90 bg-amber-50/70 px-3.5 py-3 text-xs leading-relaxed text-amber-950">
            {viewModel.customerIdentity.caveat}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 border-b border-zinc-200/80 py-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Metrics unlocked / limited</h3>
        {unlockedMetrics.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-800">Unlocked after save</p>
            <ul className="space-y-2">
              {unlockedMetrics.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-2 rounded-lg border border-emerald-100/90 bg-emerald-50/40 px-3.5 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{m.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-700">{m.detail}</p>
                  </div>
                  {metricStatusBadge(m.status)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {limitedMetrics.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-600">Limited or locked</p>
            <ul className="space-y-2">
              {limitedMetrics.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3.5 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{m.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-700">{m.detail}</p>
                  </div>
                  {metricStatusBadge(m.status)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {acquisitionLocked ?
          <p className="rounded-lg border border-amber-200/90 bg-amber-50/70 px-3.5 py-3 text-xs leading-relaxed text-amber-950">
            <strong className="font-semibold">Acquisition economics is locked.</strong> After you save, scroll down to add marketing spend as a % of
            net revenue — that unlocks CAC, LTV:CAC, and payback on Acquisition and Dashboard.
          </p>
        : null}
      </section>

      {viewModel.caveats.length > 0 ? (
        <section className="space-y-3 border-b border-zinc-200/80 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Warnings and caveats</h3>
          <ul className="space-y-2 text-sm">
            {viewModel.caveats.map((c, i) => (
              <li key={`${c.code ?? "msg"}-${i}`} className="rounded-md border border-amber-100/90 bg-amber-50/60 px-3 py-2 text-amber-950">
                {c.code ? (
                  <span className="font-mono text-[11px] text-amber-900">{c.code}</span>
                ) : null}
                <p className={c.code ? "mt-1 leading-relaxed" : "leading-relaxed"}>{c.message}</p>
              </li>
            ))}
          </ul>
          {viewModel.canSave ? (
            <p className="text-xs text-zinc-600">These warnings do not block saving - confirm only if you accept them.</p>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={onConfirmSave}
          className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          Confirm and save dataset
        </button>
        <button
          type="button"
          onClick={onDismissPreview}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Clear preview
        </button>
      </div>

      {saveError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Could not save</p>
          <p className="mt-1">{saveError}</p>
        </div>
      ) : null}
    </div>
  );
}
