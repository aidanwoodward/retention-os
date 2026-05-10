import Link from "next/link";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { DEMO_WINDOW_END } from "@/lib/demo/demo-config";
import { buildDataPageViewModel } from "@/lib/metrics";

function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(d);
  } catch {
    return iso;
  }
}

export default function DataPage() {
  const vm = buildDataPageViewModel();
  const windowEndFormatted = formatIsoDate(DEMO_WINDOW_END);

  return (
    <CommandCentrePageFrame routeId="data" maxWidth="4xl" bannerKind="data">
      <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02]">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-white to-zinc-50/90 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Transparency mode</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">Trust ledger for what powers the command centre</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
            Every MVP route consumes the same deterministic demo dataset builder and metric engine primitives — no storefront mirage, no
            invented connectivity.
          </p>
        </div>
        <dl className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-zinc-100">
          <div className="border-b border-zinc-100 px-5 py-4 sm:border-b-0 sm:px-6">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Current source mode</dt>
            <dd className="mt-1 text-sm font-semibold capitalize text-zinc-900">{vm.dataMode} dataset</dd>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Fixture-driven only — not live multi-tenant pipelines in this checkpoint.
            </p>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Simulation order window (UTC)</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900">Through {windowEndFormatted}</dd>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              First-order cohort months below align with the fixture schedule in <span className="font-mono text-[11px]">/lib/demo</span>.
            </p>
          </div>
        </dl>
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3.5 sm:px-6">
          <p className="text-xs leading-relaxed text-zinc-700">
            <span className="font-semibold text-zinc-900">Metric engine status:</span> active on{" "}
            <span className="font-mono text-[11px]">getDemoDataset()</span> → <span className="font-mono text-[11px]">/lib/metrics</span>.
            <span className="font-semibold text-zinc-900"> Live Shopify / Supabase adapters:</span> off for these routes.{" "}
            <span className="font-semibold text-zinc-900">CSV upload / connector UI:</span> coming next (not implemented here).
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Demo brand</h2>
        <p className="mt-2 text-xl font-semibold text-zinc-900">{vm.demoBrandName}</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700">{vm.demoBrandTagline}</p>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Counts regenerate from <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">runDemoMetricSanityCheck()</code> plus order line rollups — identical stitching to the engine.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Fixture counts</h2>
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
        {vm.sanity.largestCohort ? (
          <p className="mt-4 text-sm text-zinc-600">
            Largest first-order cohort: <strong className="font-medium text-zinc-900">{vm.sanity.largestCohort.cohortPeriod}</strong> (
            {vm.sanity.largestCohort.cohortSize.toLocaleString()} customers).
          </p>
        ) : null}
        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/90 px-3.5 py-3 text-sm text-zinc-800 ring-1 ring-black/[0.02]">
          <strong className="font-medium text-zinc-900">Contribution modeling:</strong>{" "}
          <code className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px]">contributionMarginPct</code> ={" "}
          {formatPct(vm.marginContributionPct, 0)} of net revenue retained after modeled variable costs (
          <code className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px]">DEMO_MARGIN_ASSUMPTIONS</code>).
          {vm.netRevenueMultiplier != null ? (
            <>
              {" "}
              Net revenue multiplier: <span className="tabular-nums font-medium">{vm.netRevenueMultiplier}</span>.
            </>
          ) : null}
        </div>
        {vm.sanity.warnings.length > 0 ? (
          <div className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3.5 py-3 text-sm text-red-950">
            <p className="font-semibold">Sanity warnings</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {vm.sanity.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Canonical metric routes</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Each link below consumes <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">getDemoDataset()</code> —{" "}
          <strong className="font-medium text-zinc-900">not</strong> live telemetry in this MVP stack.
        </p>
        <ul className="mt-4 space-y-2">
          {vm.enginePoweredRoutes.map((route) => (
            <li
              key={route.href}
              className="flex flex-col rounded-lg border border-zinc-100 px-4 py-3.5 shadow-sm ring-1 ring-black/[0.02] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link href={route.href} className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600">
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
          Types live under <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">/lib/types</code>; demo builders emit compatible shapes into{" "}
          <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px]">/lib/demo</code>.
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
            <li key={item.title} className="rounded-lg border border-zinc-200/90 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/[0.02]">
              <p className="font-semibold text-zinc-900">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-700">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </CommandCentrePageFrame>
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
