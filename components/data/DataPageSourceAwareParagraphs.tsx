"use client";

import { useSessionUploadPresence } from "@/components/data/useSessionUploadPresence";

/** Metric-engine / session CSV banner body on /data — updates after hydrate when sessionStorage holds an uploaded dataset. */
export function DataPageMetricEngineRibbonBody() {
  const hasUpload = useSessionUploadPresence();
  return hasUpload ? (
    <>
      <span className="font-semibold text-zinc-900">Metric engine status:</span>{" "}
      <strong className="font-medium text-zinc-900">This uploaded dataset powers Dashboard, Cohorts, Retention, LTV, and Insights in this
      browser session</strong>
      {" "}
      (via <span className="font-mono text-[11px]">/lib/metrics</span> and <span className="font-mono text-[11px]">/lib/insights</span> view
      models). <span className="font-semibold text-zinc-900">Session-only</span> in{" "}
      <span className="font-mono text-[11px]">sessionStorage</span> — <span className="font-semibold text-zinc-900">not persisted to
      Supabase.</span> The fixture ledger counts below remain the canonical <span className="font-mono text-[11px]">
        getDemoDataset()
      </span> snapshot for lineage transparency on this route.
      <span className="font-semibold text-zinc-900"> Live Shopify / Supabase adapters:</span> off.{" "}
      <span className="font-semibold text-zinc-900">CSV onboarding:</span> local preview plus session controls below.
    </>
  ) : (
    <>
      <span className="font-semibold text-zinc-900">Metric engine status:</span> active on{" "}
      <span className="font-mono text-[11px]">getDemoDataset()</span> → <span className="font-mono text-[11px]">/lib/metrics</span> for the
      command centre until you save a valid CSV import to session on this tab.{" "}
      <span className="font-semibold text-zinc-900"> Live Shopify / Supabase adapters:</span> off for these routes.{" "}
      <span className="font-semibold text-zinc-900">CSV onboarding:</span> local preview below — save a passing import to{" "}
      <span className="font-mono text-[11px]">sessionStorage</span> to power Dashboard, Cohorts, Retention, LTV, and Insights in this
      browser session (still not persisted to Supabase).
    </>
  );
}

/** Intro line above canonical route links — clarifies demo fixture vs optional session CSV. */
export function DataPageCanonicalRoutesIntroBody() {
  const hasUpload = useSessionUploadPresence();
  return hasUpload ? (
    <>
      While this tab keeps a saved session CSV, Dashboard, Cohorts, Retention, LTV, and Insights read that uploaded snapshot rather than{" "}
      <span className="font-mono text-[11px]">getDemoDataset()</span>. The list below describes each route&apos;s KPI surface —{" "}
      <strong className="font-medium text-zinc-900">not</strong> live telemetry in this MVP stack. Clearing the uploaded dataset restores
      the demo command-centre source.
    </>
  ) : (
    <>
      Without a saved session CSV on this tab, each link consumes <span className="font-mono text-[11px]">getDemoDataset()</span> —{" "}
      <strong className="font-medium text-zinc-900">not</strong> live telemetry in this MVP stack. Save a valid import under CSV
      onboarding to steer those routes toward your uploaded slice for this browser session only.
    </>
  );
}
