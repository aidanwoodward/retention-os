import Link from "next/link";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { buildDataPageViewModel } from "@/lib/metrics";

function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export default function DataPage() {
  const vm = buildDataPageViewModel();

  return (
    <CommandCentrePageFrame routeId="data" maxWidth="4xl" bannerKind="data">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Demo brand</h2>
          <p className="mt-2 text-xl font-semibold text-gray-900">{vm.demoBrandName}</p>
          <p className="mt-2 text-sm text-gray-700">{vm.demoBrandTagline}</p>
          <p className="mt-3 text-xs text-gray-500">
            Counts below are regenerated from <code className="rounded bg-gray-100 px-1">runDemoMetricSanityCheck()</code> plus order line
            rollups — same primitives the deterministic metric engine consumes.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Fixture counts</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
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
            <p className="mt-4 text-sm text-gray-600">
              Largest first-order cohort: <strong>{vm.sanity.largestCohort.cohortPeriod}</strong> (
              {vm.sanity.largestCohort.cohortSize.toLocaleString()} customers).
            </p>
          ) : null}
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800">
            <strong className="font-medium">Contribution modeling:</strong>{" "}
            <code className="rounded bg-white px-1 ring-1 ring-slate-200">contributionMarginPct</code> ={" "}
            {formatPct(vm.marginContributionPct, 0)} of net revenue retained after modeled variable costs (
            <code className="rounded bg-white px-1 ring-1 ring-slate-200">DEMO_MARGIN_ASSUMPTIONS</code>).
            {vm.netRevenueMultiplier != null ? (
              <>
                {" "}
                Net revenue multiplier: <span className="tabular-nums font-medium">{vm.netRevenueMultiplier}</span>.
              </>
            ) : null}
          </div>
          {vm.sanity.warnings.length > 0 ? (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-950">
              <p className="font-semibold">Sanity warnings</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {vm.sanity.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Routes on the canonical metric engine</h2>
          <p className="mt-2 text-sm text-gray-600">
            Each route below pulls from <code className="rounded bg-gray-100 px-1">getDemoDataset()</code> (
            <strong>not</strong> live storefront telemetry in this MVP checkpoint).
          </p>
          <ul className="mt-4 space-y-3">
            {vm.enginePoweredRoutes.map((route) => (
              <li
                key={route.href}
                className="flex flex-col rounded-lg border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link href={route.href} className="font-semibold text-blue-700 hover:underline">
                    {route.label}
                  </Link>
                  <p className="mt-1 text-sm text-gray-600">{route.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Canonical data model</h2>
          <p className="mt-2 text-sm text-gray-600">
            Types live under <code className="rounded bg-gray-100 px-1">/lib/types</code>; demo builders emit compatible shapes into{" "}
            <code className="rounded bg-gray-100 px-1">/lib/demo</code>.
          </p>
          <ul className="mt-4 space-y-4">
            {vm.canonicalModelEntities.map((row) => (
              <li key={row.title} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <h3 className="font-semibold text-gray-900">{row.title}</h3>
                <p className="mt-1 text-sm text-gray-700">{row.notes}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Not live yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Intentionally absent surfaces — descriptions are factual for this codebase state (no simulated green checkmarks, no destructive
            seed buttons on this page).
          </p>
          <ul className="mt-4 space-y-3">
            {vm.comingNext.map((item) => (
              <li key={item.title} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-gray-700">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
    </CommandCentrePageFrame>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-slate-50/80 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{value}</dd>
    </div>
  );
}
