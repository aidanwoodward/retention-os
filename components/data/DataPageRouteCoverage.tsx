"use client";

import Link from "next/link";

type Row = Readonly<{
  href: `/${string}`;
  headline: string;
  body: string;
}>;

function buildCoverageRows(hasUpload: boolean, demoBrandName: string): readonly Row[] {
  const kpiBody =
    hasUpload ?
      `Uses your saved upload for this browser tab (${demoBrandName} demo dormant until you revert). Same calculators — only the data source changes.`
    : `Uses the ${demoBrandName} demo dataset until you upload and save your own CSV on this page.`;

  return [
    { href: "/dashboard", headline: "Dashboard", body: `${kpiBody} Executive KPIs and durability snapshot.` },
    { href: "/cohorts", headline: "Cohort economics", body: `${kpiBody} Acquisition-month rollups.` },
    { href: "/retention", headline: "Retention & repeat", body: `${kpiBody} Journey + calendar-strip retention.` },
    { href: "/ltv", headline: "LTV ladders", body: `${kpiBody} Net revenue and contribution ladders.` },
    { href: "/acquisition", headline: "Acquisition economics", body: `${kpiBody} CAC, LTV:CAC, and payback when marketing spend is attached.` },
    { href: "/products", headline: "First-product quality", body: `${kpiBody} Which entry products create durable, repeat, profitable customers.` },
    { href: "/insights", headline: "Diagnostic Insights", body: `${kpiBody} Prioritized operator moves from deterministic rules.` },
    {
      href: "/data",
      headline: "Data",
      body: "Upload control centre: active source, CSV validation, spend and margin assumptions, and revert to demo.",
    },
  ];
}

export function DataPageRouteCoverageSection({ hasUpload, demoBrandName }: { hasUpload: boolean; demoBrandName: string }) {
  const rows = buildCoverageRows(hasUpload, demoBrandName);

  return (
    <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-zinc-900">Route coverage vs active source</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
        Dashboard, Cohorts, Retention, LTV, Acquisition, Products, and Insights always use the{" "}
        <strong className="font-medium text-zinc-900">same data source</strong> as this page.&nbsp;
        {hasUpload ?
          <>
            KPI routes use your <span className="font-semibold text-zinc-900">saved upload</span>; match the source banner atop each KPI page.
          </>
        : <>
            KPI routes use the <span className="font-semibold text-zinc-900">demo dataset ({demoBrandName})</span> until you upload and save here.
          </>
        }
      </p>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <li key={row.href} className="flex h-full flex-col rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 shadow-sm ring-1 ring-black/[0.02]">
            <Link
              href={row.href}
              className="text-sm font-semibold text-emerald-900 underline decoration-emerald-300 underline-offset-2 hover:decoration-emerald-600"
            >
              {row.headline}
            </Link>
            <p className="mt-2 grow text-xs leading-relaxed text-zinc-700">{row.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
