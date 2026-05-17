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
      `Uses selected source — uploaded CSV session dataset in sessionStorage for this browser tab (${demoBrandName} demo dormant until you revert). KPI calculators are unchanged — only inputs switch.`
    : `Uses selected source — canonical demo dataset (${demoBrandName}) resolved through getDemoDataset() → /lib/metrics (and /lib/insights for diagnostic cards).`;

  return [
    { href: "/dashboard", headline: "Dashboard (/dashboard)", body: `${kpiBody} Executive KPIs and durability snapshot.` },
    { href: "/cohorts", headline: "Cohort economics (/cohorts)", body: `${kpiBody} Acquisition-month rollups.` },
    { href: "/retention", headline: "Retention & repeat (/retention)", body: `${kpiBody} Journey + calendar-strip retention.` },
    { href: "/ltv", headline: "LTV ladders (/ltv)", body: `${kpiBody} Net revenue and contribution ladders.` },
    { href: "/insights", headline: "Diagnostic Insights (/insights)", body: `${kpiBody} Deterministic diagnostic cards.` },
    {
      href: "/data",
      headline: "Data (/data)",
      body:
        "Trust + control hub for this MVP: lineage tables, canonical demo counts, CSV validation via /lib/import, metric previews, saving or clearing sessionStorage uploads, and reverting every KPI route to the demo fixture. Does not hydrate Supabase or external connectors.",
    },
  ];
}

export function DataPageRouteCoverageSection({ hasUpload, demoBrandName }: { hasUpload: boolean; demoBrandName: string }) {
  const rows = buildCoverageRows(hasUpload, demoBrandName);

  return (
    <section className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-zinc-900">Route coverage vs active source</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
        Dashboard, cohorts, retention, LTV, and Insights always honour the{" "}
        <strong className="font-medium text-zinc-900">same browser-tab session selection</strong> as this page.&nbsp;
        {hasUpload ?
          <>
            KPI routes resolve <span className="font-semibold text-zinc-900">Uploaded CSV session dataset</span>; match the dark banner atop each KPI
            page.
          </>
        : <>
            KPI routes resolve <span className="font-semibold text-zinc-900">Demo dataset ({demoBrandName})</span> until an upload replaces it for this
            tab.
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
