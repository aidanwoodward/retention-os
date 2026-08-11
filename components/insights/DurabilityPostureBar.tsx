"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  INSIGHT_SEVERITY_LABEL,
  INSIGHT_SEVERITY_ORDER,
} from "@/lib/insights/insights-presentation";
import type { RevenueDurabilityStatus } from "@/lib/insights/context";
import type { InsightSeverity } from "@/lib/types/insight";

const countPill: Record<InsightSeverity, string> = {
  critical: "border-red-200/80 bg-red-50 text-red-900",
  warning: "border-amber-200/80 bg-amber-50 text-amber-950",
  info: "border-zinc-300 bg-zinc-100 text-zinc-800",
};

/**
 * Compact orientation strip. Posture word comes from production rules only;
 * supporting detail lives in collapsible transparency/methodology notes.
 */
export function DurabilityPostureBar({
  status,
  durabilityNotes,
  methodologyNotes,
  counts,
}: {
  status: RevenueDurabilityStatus;
  durabilityNotes: readonly string[];
  methodologyNotes: readonly string[];
  counts: Record<InsightSeverity, number>;
}) {
  const [openNotes, setOpenNotes] = useState(false);
  const [openMethod, setOpenMethod] = useState(false);

  return (
    <section className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Revenue durability</p>
          <p className="mt-1 text-[17px] font-semibold tracking-tight text-zinc-900">Posture: {status}</p>
          <p className="mt-1 max-w-xl text-[13px] leading-snug text-zinc-700">
            Qualitative rules snapshot — not a precision score. Expand the notes below for the inputs behind this
            label.
          </p>
        </div>

        <ul className="flex flex-wrap items-center gap-2">
          {INSIGHT_SEVERITY_ORDER.map((s) => (
            <li key={s}>
              <span
                className={cn(
                  "tabular-nums inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold",
                  counts[s] === 0 ? "border-zinc-200 bg-zinc-50 text-zinc-500" : countPill[s],
                )}
              >
                {counts[s]}
                <span className="font-medium">{INSIGHT_SEVERITY_LABEL[s]}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2 border-t border-zinc-100 pt-2.5">
        <Disclosure label="Why this posture" open={openNotes} onOpenChange={setOpenNotes} notes={durabilityNotes} />
        <Disclosure
          label="How Signals are produced"
          open={openMethod}
          onOpenChange={setOpenMethod}
          notes={methodologyNotes}
        />
        <p className="text-[11.5px] leading-snug text-zinc-600 lg:ml-auto">Deterministic, rules-based — not AI-generated</p>
      </div>
    </section>
  );
}

function Disclosure({
  label,
  open,
  onOpenChange,
  notes,
}: {
  label: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  notes: readonly string[];
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="w-full lg:w-auto lg:max-w-md">
      <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md text-[12px] font-semibold text-indigo-700 transition-colors hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5">
          {notes.map((n) => (
            <li key={n} className="flex gap-2 text-[12.5px] leading-snug text-zinc-700">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
