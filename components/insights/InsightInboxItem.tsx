"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  INSIGHT_SEVERITY_LABEL,
  resolveInsightDestinationLabel,
} from "@/lib/insights/insights-presentation";
import type { Insight, InsightSeverity } from "@/lib/types/insight";
import { InsightObservations } from "./InsightObservations";

const rail: Record<InsightSeverity, string> = {
  critical: "before:bg-red-600",
  warning: "before:bg-amber-500",
  info: "before:bg-zinc-400",
};

const pill: Record<InsightSeverity, string> = {
  critical: "border-red-200/80 bg-red-50 text-red-900",
  warning: "border-amber-200/80 bg-amber-50 text-amber-950",
  info: "border-zinc-300 bg-zinc-100 text-zinc-800",
};

export function InsightInboxItem({
  insight,
  open,
  onOpenChange,
}: {
  insight: Insight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const severityLabel = INSIGHT_SEVERITY_LABEL[insight.severity];
  const destinationLabel = resolveInsightDestinationLabel(insight.destination.route);
  const shownRefs = insight.metricRefs.slice(0, 3);
  const hiddenRefs = insight.metricRefs.length - shownRefs.length;

  return (
    <Collapsible asChild open={open} onOpenChange={onOpenChange}>
      <article
        className={cn(
          "relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white transition-colors hover:border-zinc-300",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]",
          "before:absolute before:inset-y-0 before:left-0 before:w-1",
          rail[insight.severity],
        )}
      >
        <div className="p-4 pl-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                pill[insight.severity],
              )}
            >
              {severityLabel}
            </span>
            {insight.sufficiency === "limited" ? (
              <span className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                Limited evidence
              </span>
            ) : null}
          </div>

          <CollapsibleTrigger className="mt-2 block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
            <h3 className="text-[15px] font-semibold leading-snug text-zinc-900">{insight.title}</h3>
            <p
              className={cn(
                "mt-1 text-[13px] leading-relaxed text-zinc-700",
                !open && "line-clamp-2",
              )}
            >
              {insight.evidence}
            </p>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-3 space-y-3.5">
              {insight.recommendedAction ? (
                <p className="text-[13px] leading-relaxed text-zinc-900">
                  <span className="font-semibold">Recommended next step: </span>
                  {insight.recommendedAction}
                </p>
              ) : null}

              {insight.observations.length > 0 ? (
                <Block title="Observations">
                  <InsightObservations observations={insight.observations} />
                </Block>
              ) : null}

              {insight.metricRefs.length > 0 ? (
                <Block title="Metrics referenced">
                  <ul className="flex flex-wrap gap-1.5">
                    {insight.metricRefs.map((m) => (
                      <li
                        key={m}
                        className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11.5px] text-zinc-700"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </Block>
              ) : null}

              <Block title="Data sufficiency">
                <p className="text-[12.5px] leading-snug text-zinc-700">
                  {insight.sufficiency === "limited"
                    ? "Evidence is limited — this reading is directional and should be re-read as the underlying data matures."
                    : "Evidence is sufficient for this reading."}
                </p>
              </Block>

              {insight.caveats.length > 0 ? (
                <Block title="Caveats">
                  <ul className="space-y-1.5">
                    {insight.caveats.map((c) => (
                      <li
                        key={c}
                        className="rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-[12.5px] leading-snug text-zinc-900"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </Block>
              ) : null}
            </div>
          </CollapsibleContent>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-100 pt-2.5">
            {!open && shownRefs.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-1.5">
                {shownRefs.map((m) => (
                  <li
                    key={m}
                    className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700"
                  >
                    {m}
                  </li>
                ))}
                {hiddenRefs > 0 ? (
                  <li className="tabular-nums text-[11px] text-zinc-600">+{hiddenRefs}</li>
                ) : null}
              </ul>
            ) : null}

            <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
              <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
                {open ? "Hide detail" : "Details"}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                  aria-hidden
                />
              </CollapsibleTrigger>
              <Link
                href={insight.destination.route}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:ml-0"
              >
                Investigate in {destinationLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </article>
    </Collapsible>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      {children}
    </div>
  );
}
