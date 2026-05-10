import Link from "next/link";
import { CommandCentrePageFrame } from "@/components/mvp/CommandCentrePageFrame";
import { buildInsightsPageViewModel, type RevenueDurabilityStatus } from "@/lib/insights";
import type { InsightSeverity } from "@/lib/types/insight";

function durabilityShellClass(status: RevenueDurabilityStatus): string {
  switch (status) {
    case "Healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "Watch":
      return "border-amber-200 bg-amber-50 text-amber-950";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function insightCardClass(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50/80";
    case "warning":
      return "border-amber-200 bg-amber-50/60";
    default:
      return "border-slate-200 bg-white";
  }
}

function severityLabel(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Info";
  }
}

function severityBadgeClass(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-900";
    case "warning":
      return "bg-amber-100 text-amber-950";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export default function InsightsPage() {
  const vm = buildInsightsPageViewModel();

  return (
    <CommandCentrePageFrame routeId="insights" maxWidth="6xl" bannerKind="insights">
        <section className={`rounded-xl border p-5 ${durabilityShellClass(vm.durabilityStatus)}`}>
          <h2 className="text-lg font-semibold">Revenue durability snapshot</h2>
          <p className="mt-1 text-sm opacity-90">
            Plain-English posture (not a precision score): <strong>{vm.durabilityStatus}</strong>
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
            {vm.durabilityTransparencyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Insight cards</h2>
          <ul className="space-y-4">
            {vm.insights.map((insight) => (
              <li
                key={insight.id}
                className={`rounded-xl border p-5 shadow-sm ${insightCardClass(insight.severity)}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${severityBadgeClass(
                      insight.severity,
                    )}`}
                  >
                    {severityLabel(insight.severity)}
                  </span>
                  <h3 className="text-base font-semibold text-gray-900">{insight.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-800">{insight.evidence}</p>
                {insight.recommendedAction ? (
                  <div className="mt-4 rounded-lg border border-gray-200/80 bg-white/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommended action</p>
                    <p className="mt-1 text-sm text-gray-800">{insight.recommendedAction}</p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Metric references</span>
                  <div className="flex flex-wrap gap-1.5">
                    {insight.metricRefs.map((ref) => (
                      <code
                        key={ref}
                        className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-gray-800 ring-1 ring-gray-200"
                      >
                        {ref}
                      </code>
                    ))}
                  </div>
                </div>
                {insight.confidence != null ? (
                  <p className="mt-3 text-xs text-gray-600">
                    Qualitative confidence:{" "}
                    <span className="font-medium tabular-nums">{(insight.confidence * 100).toFixed(0)}%</span> (rule
                    coverage / sample depth — not a statistical confidence interval).
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Methodology</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-gray-700">
            {vm.insightsEngineMethodologyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Explore metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <NavCard
              href="/dashboard"
              title="Dashboard"
              description="Executive KPIs, Revenue durability snapshot, and demo observations."
            />
            <NavCard
              href="/data"
              title="Data"
              description="Fixture lineage, canonical objects, and an honest inventory of what is not live yet."
            />
            <NavCard
              href="/cohorts"
              title="Cohort economics"
              description="First-order month rollups, net revenue, contribution, and Month +N active rates."
            />
            <NavCard
              href="/retention"
              title="Retention & repeat"
              description="Portfolio repeat, first-to-second within 90 days, and cohort calendar retention."
            />
            <NavCard
              href="/ltv"
              title="LTV ladders"
              description="Cumulative average net revenue LTV and contribution LTV by cohort age."
            />
          </div>
        </section>
    </CommandCentrePageFrame>
  );
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow"
    >
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <p className="mt-3 text-sm font-medium text-blue-700">Open</p>
    </Link>
  );
}
