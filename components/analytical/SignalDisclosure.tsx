"use client";

import type { Insight, InsightObservation, InsightObservationUnit } from "@/lib/types/insight";

function formatObservation(obs: InsightObservation): string {
  const { value, unit } = obs;

  if (unit === "posture" && typeof value === "string") {
    return value;
  }

  if (value == null) return "—";

  switch (unit) {
    case "ratio":
      return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : String(value);
    case "usd":
      return typeof value === "number"
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
        : String(value);
    case "days":
      return typeof value === "number" ? `${Math.round(value)} days` : String(value);
    case "count":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    default:
      return String(value);
  }
}

function observationLabel(unit: InsightObservationUnit, index: number): string {
  if (unit === "posture") return "Durability posture";
  if (unit === "ratio" && index === 1) return "Month +1 active rate";
  if (unit === "usd") return "Cohort LTV spread";
  return "Observation";
}

export function SignalDisclosure({ signal }: { signal: Insight }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Evidence</p>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-800">{signal.evidence}</p>
      </div>

      {signal.observations.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Observations</p>
          <ul className="mt-2 space-y-1.5">
            {signal.observations.map((obs, index) => (
              <li key={`${obs.unit}-${index}`} className="flex flex-wrap items-baseline gap-x-2 text-sm text-zinc-800">
                <span className="text-zinc-500">{observationLabel(obs.unit, index)}:</span>
                <span className="font-medium tabular-nums">{formatObservation(obs)}</span>
                {obs.comparisonValue != null && obs.unit === "usd" ?
                  <span className="text-xs text-zinc-500">
                    (material threshold{" "}
                    {typeof obs.comparisonValue === "number"
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(obs.comparisonValue)
                      : obs.comparisonValue}
                    )
                  </span>
                : null}
                {obs.eligibleCount != null ?
                  <span className="text-xs text-zinc-500">· {obs.eligibleCount.toLocaleString()} eligible customers</span>
                : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {signal.caveats.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Caveats</p>
          <ul className="mt-2 space-y-1">
            {signal.caveats.map((caveat) => (
              <li key={caveat} className="text-sm leading-relaxed text-zinc-700">
                · {caveat}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {signal.recommendedAction ? (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/90 px-3.5 py-3 ring-1 ring-black/[0.02]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Recommended action</p>
          <p className="mt-1.5 text-sm leading-snug text-zinc-900">{signal.recommendedAction}</p>
        </div>
      ) : null}
    </div>
  );
}
