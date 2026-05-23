"use client";

import type { AcquisitionPreviewModel } from "@/lib/metrics";

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatRatio(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export type AcquisitionEconomicsPanelVariant = "page" | "preview";

export function AcquisitionEconomicsPanel({
  model,
  variant = "preview",
}: {
  readonly model: AcquisitionPreviewModel;
  readonly variant?: AcquisitionEconomicsPanelVariant;
}) {
  const isPage = variant === "page";

  return (
    <div className="space-y-6">
      {isPage ?
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Spend & blended CAC</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi title="Total spend" value={model.hasSpend ? formatMoney(model.totalSpend) : "—"} />
            <Kpi
              title="Blended CAC"
              sub="Total spend ÷ all customers"
              value={model.blendedCac.blendedCac != null ? formatMoney(model.blendedCac.blendedCac) : "—"}
            />
            <Kpi title="Spend rows" value={String(model.spendRowCount)} />
            <Kpi
              title="Spend months"
              value={model.spendMonths.length > 0 ? String(model.spendMonths.length) : "—"}
              sub={model.spendChannels.length > 0 ? model.spendChannels.join(", ") : undefined}
            />
          </div>
        </div>
      : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Spend rows" value={String(model.spendRowCount)} />
          <Metric label="Total spend" value={model.hasSpend ? formatMoney(model.totalSpend) : "—"} />
          <Metric
            label="Blended CAC (preview)"
            value={model.blendedCac.blendedCac != null ? formatMoney(model.blendedCac.blendedCac) : "—"}
          />
        </div>
      }

      {!isPage ?
        <div className="text-xs text-zinc-600">
          <span className="font-semibold text-zinc-800">Months in spend file:</span>{" "}
          {model.spendMonths.length > 0 ? model.spendMonths.join(", ") : "—"}
          <span className="mx-2 text-zinc-300">·</span>
          <span className="font-semibold text-zinc-800">Channels:</span>{" "}
          {model.spendChannels.length > 0 ? model.spendChannels.join(", ") : "—"}
        </div>
      : null}

      {model.calendarOverlapWarnings.length > 0 ?
        <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Calendar / coverage</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {model.calendarOverlapWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      : null}

      {model.blendedCac.warnings.length > 0 ?
        <WarningList title="Blended CAC notes" items={model.blendedCac.warnings} />
      : null}

      {model.cacByMonth.warnings.length > 0 ?
        <WarningList title="Monthly CAC notes" items={model.cacByMonth.warnings} />
      : null}

      {model.cacByMonth.rows.length > 0 ?
        <div>
          {isPage ?
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Monthly CAC</h2>
          : null}
          <div className="overflow-x-auto rounded-lg border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
            <table className="min-w-[720px] w-full border-collapse text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2 text-right">Spend</th>
                  <th className="px-3 py-2 text-right">New customers</th>
                  <th className="px-3 py-2 text-right">CAC</th>
                </tr>
              </thead>
              <tbody>
                {model.cacByMonth.rows.map((r) => (
                  <tr key={r.month} className="border-b border-zinc-100">
                    <td className="px-3 py-2 font-mono tabular-nums text-zinc-900">{r.month}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{formatMoney(r.monthlySpend)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{r.acquiredCustomers.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{r.cac != null ? formatMoney(r.cac) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      : null}

      {model.ltvCac.rows.length > 0 ?
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">LTV:CAC (terminal ladder)</h3>
          <p className="mt-1 text-xs text-zinc-600">
            Revenue LTV is cumulative average net revenue per cohort customer. Contribution uses the metric engine when margin data or assumptions exist.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
            <table className="min-w-[920px] w-full border-collapse text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Cohort</th>
                  <th className="px-3 py-2 text-right">CAC</th>
                  <th className="px-3 py-2 text-right">Rev LTV</th>
                  <th className="px-3 py-2 text-right">Rev LTV:CAC</th>
                  <th className="px-3 py-2 text-right">Contrib LTV</th>
                  <th className="px-3 py-2 text-right">Contrib LTV:CAC</th>
                </tr>
              </thead>
              <tbody>
                {model.ltvCac.rows.map((r) => (
                  <tr key={r.cohortMonth} className="border-b border-zinc-100">
                    <td className="px-3 py-2 font-mono tabular-nums text-zinc-900">{r.cohortMonth}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{r.cac != null ? formatMoney(r.cac) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{formatMoney(r.avgRevenueLtv)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{formatRatio(r.revenueLtvToCac)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                      {r.avgContributionLtv != null ? formatMoney(r.avgContributionLtv) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{formatRatio(r.contributionLtvToCac)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      : null}

      {model.ltvCac.warnings.length > 0 ?
        <WarningList title="LTV:CAC notes" items={model.ltvCac.warnings} />
      : null}

      {model.payback.rows.length > 0 ?
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Payback (contribution LTV vs CAC)</h3>
          <p className="mt-1 text-xs text-zinc-600">
            First cohort-age month where cumulative <span className="font-medium">average</span> contribution LTV meets or exceeds CAC for that acquisition
            month.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
            <table className="min-w-[520px] w-full border-collapse text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Cohort</th>
                  <th className="px-3 py-2 text-right">CAC</th>
                  <th className="px-3 py-2 text-right">Payback (M)</th>
                </tr>
              </thead>
              <tbody>
                {model.payback.rows.map((r) => (
                  <tr key={r.cohortMonth} className="border-b border-zinc-100">
                    <td className="px-3 py-2 font-mono tabular-nums text-zinc-900">{r.cohortMonth}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{r.cac != null ? formatMoney(r.cac) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                      {r.monthsToPayback != null ? `M${r.monthsToPayback}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      : null}

      {model.payback.warnings.length > 0 ?
        <WarningList title="Payback notes" items={model.payback.warnings} />
      : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3 ring-1 ring-black/[0.02]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-1.5 text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function Kpi({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-600">{sub}</p> : null}
    </div>
  );
}

function WarningList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-4 py-3 text-sm text-zinc-800">
      <p className="font-semibold text-zinc-900">{title}</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-700">
        {items.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
