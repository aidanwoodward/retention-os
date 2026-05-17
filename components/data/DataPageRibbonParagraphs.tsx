"use client";

type DataPageRibbonParagraphsProps = {
  readonly hasUpload: boolean;
};

/** Ribbon copy under transparency card — aligns with hero source state (`hasUpload` from session summary). */
export function DataPageMetricEngineRibbonBody({ hasUpload }: DataPageRibbonParagraphsProps) {
  return hasUpload ? (
    <>
      <span className="font-semibold text-zinc-900">Command-centre source:</span> all KPI routes below read your{" "}
      <strong className="font-medium text-zinc-900">uploaded CSV session dataset</strong> via{" "}
      <span className="font-mono text-[11px]">sessionStorage</span> (<span className="font-mono text-[11px]">/lib/metrics</span> +{" "}
      <span className="font-mono text-[11px]">/lib/insights</span>). <span className="font-semibold text-zinc-900">Session-only.</span>{" "}
      <span className="font-semibold text-zinc-900">Not persisted to Supabase.</span> Fixture tables further down still mirror the canonical{" "}
      <span className="font-mono text-[11px]">getDemoDataset()</span> lineage for auditing.
      <span className="font-semibold text-zinc-900"> Live Shopify / Supabase adapters:</span> off on these routes.
    </>
  ) : (
    <>
      <span className="font-semibold text-zinc-900">Command-centre source:</span> KPI routes consume the canonical demo fixture through{" "}
      <span className="font-mono text-[11px]">getDemoDataset()</span> → <span className="font-mono text-[11px]">/lib/metrics</span> until you
      save a passing CSV to <span className="font-mono text-[11px]">sessionStorage</span> below. Saved uploads apply to Dashboard, Cohorts,
      Retention, LTV, and Insights in <span className="font-semibold text-zinc-900">this tab only</span> — still{" "}
      <span className="font-semibold text-zinc-900">not persisted to Supabase.</span>
      <span className="font-semibold text-zinc-900"> Live Shopify / Supabase adapters:</span> off.
    </>
  );
}

export function DataPageCanonicalRoutesIntroBody({ hasUpload }: DataPageRibbonParagraphsProps) {
  return hasUpload ? (
    <>
      While this tab retains a saved session CSV, Dashboard, Cohorts, Retention, LTV, and Insights use that uploaded snapshot{" "}
      <strong className="font-medium text-zinc-900">instead of</strong> <span className="font-mono text-[11px]">getDemoDataset()</span>.{" "}
      <span className="font-mono text-[11px]">/data</span> is where you inspect fixtures, preview imports, revert to demo, and confirm trust
      lineage — none of these links are live multi-tenant pipelines in this MVP. Use{" "}
      <strong className="font-medium text-zinc-900">Revert to demo dataset</strong> above to restore the demo command-centre source for all KPI
      routes.
    </>
  ) : (
    <>
      Dashboard, Cohorts, Retention, LTV, and Insights all read <span className="font-mono text-[11px]">getDemoDataset()</span> today —{" "}
      <strong className="font-medium text-zinc-900">not</strong> live storefront telemetry here. Saving a validated CSV snapshot on this tab
      switches those routes (this browser session only) to your uploaded slice. Visit every route&apos;s banner to confirm the{" "}
      <strong className="font-medium text-zinc-900">Active source</strong> line matches what you expect.
    </>
  );
}
