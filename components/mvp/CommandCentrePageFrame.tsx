"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  DEMO_DATASET_LABEL,
  dataModeBannerSentence,
  getMvpPageCopy,
  getMvpSuggestedLinks,
  insightsDemoNotice,
  metricsBannerScopeLine,
  MVP_COMMAND_CENTRE_NAME,
  MVP_NAV,
  RULES_ENGINE_INSIGHTS_NOTICE,
  type MvpRouteId,
} from "@/lib/mvp/cohesion";

export type CommandCentreMaxWidth = "4xl" | "6xl" | "7xl" | "1600";

const maxWidthClass: Record<CommandCentreMaxWidth, string> = {
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  "1600": "max-w-[1600px]",
};

export interface CommandCentrePageFrameProps {
  readonly routeId: MvpRouteId;
  readonly maxWidth: CommandCentreMaxWidth;
  readonly bannerKind: "metrics" | "insights" | "data";
  readonly children: ReactNode;
}

export function CommandCentrePageFrame({
  routeId,
  maxWidth,
  bannerKind,
  children,
}: CommandCentrePageFrameProps) {
  const copy = getMvpPageCopy(routeId);
  const quickLinks = getMvpSuggestedLinks(routeId);

  const isMetricSurface =
    routeId === "dashboard" || routeId === "cohorts" || routeId === "retention" || routeId === "ltv";

  const rulesEngineBody = RULES_ENGINE_INSIGHTS_NOTICE.replace(/^Rules-based engine\.\s*/, "");

  return (
    <div className="p-6">
      <div className={`mx-auto ${maxWidthClass[maxWidth]} space-y-8`}>
        <header className="space-y-4 border-b border-gray-100 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{MVP_COMMAND_CENTRE_NAME}</p>
          <nav aria-label="Command centre sections" className="flex flex-wrap gap-2">
            {MVP_NAV.map((item) => {
              const active = item.id === routeId;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-gray-900 text-white shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        {bannerKind === "metrics" && isMetricSurface ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p>
              <strong className="font-semibold">{DEMO_DATASET_LABEL}.</strong> {metricsBannerScopeLine(routeId)}
            </p>
            <p className="mt-2 text-amber-900/95">
              Deterministic metric engine:{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">getDemoDataset()</code>
              {" → "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">/lib/metrics</code>. Live Shopify, Supabase
              materialized views, and CSV imports are <span className="font-medium">not</span> connected on these MVP routes.
            </p>
          </div>
        ) : null}

        {bannerKind === "insights" ? (
          <>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
              {insightsDemoNotice()}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
              <strong className="font-semibold">Rules-based engine.</strong> {rulesEngineBody}
            </div>
          </>
        ) : null}

        {bannerKind === "data" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
            {dataModeBannerSentence()}
          </div>
        ) : null}

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-gray-600">{copy.hook}</p>
        </div>

        {quickLinks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick links</span>
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-gray-50"
              >
                {q.label}
              </Link>
            ))}
          </div>
        ) : null}

        <section className="grid gap-6 rounded-xl border border-gray-200 bg-gray-50/80 p-5 md:grid-cols-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">What you&apos;re looking at</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-800">{copy.lookingAt}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Why it matters</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-800">{copy.matters}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">What to do next</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-800">
              {copy.nextSteps.map((step) => (
                <li key={step} className="text-sm leading-relaxed">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
}
