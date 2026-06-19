"use client";

type DataPageRibbonParagraphsProps = {
  readonly hasUpload: boolean;
};

/** Ribbon copy under transparency card — aligns with hero source state (`hasUpload` from session summary). */
export function DataPageMetricEngineRibbonBody({ hasUpload }: DataPageRibbonParagraphsProps) {
  return hasUpload ? (
    <>
      <span className="font-semibold text-zinc-900">Active source:</span> all KPI routes below read your{" "}
      <strong className="font-medium text-zinc-900">saved upload</strong> for this browser tab. Data is not stored in the cloud. Fixture tables
      further down still show the demo dataset for reference.
    </>
  ) : (
    <>
      <span className="font-semibold text-zinc-900">Active source:</span> KPI routes use the demo dataset until you upload and save a CSV below.
      Saved uploads apply to Dashboard, Cohorts, Retention, LTV, Acquisition, Products, and Insights in{" "}
      <span className="font-semibold text-zinc-900">this tab only</span>.
    </>
  );
}

export function DataPageCanonicalRoutesIntroBody({ hasUpload }: DataPageRibbonParagraphsProps) {
  return hasUpload ? (
    <>
      While this tab has a saved upload, Dashboard, Cohorts, Retention, LTV, Acquisition, Products, and Insights use that snapshot{" "}
      <strong className="font-medium text-zinc-900">instead of</strong> the demo dataset. Use{" "}
      <strong className="font-medium text-zinc-900">Revert to demo dataset</strong> above to restore the demo source for all KPI routes.
    </>
  ) : (
    <>
      Dashboard, Cohorts, Retention, LTV, Acquisition, Products, and Insights all read the demo dataset today. Saving a validated CSV on this tab
      switches those routes to your upload for this browser session. Visit each route&apos;s source banner to confirm what is active.
    </>
  );
}
