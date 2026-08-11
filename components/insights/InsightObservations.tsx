import type { InsightObservation } from "@/lib/types/insight";

/**
 * Observation presentation. Canonical values are rendered as supplied; the only
 * transformation is unit-based display formatting (ratio -> %, usd -> $, days).
 */
export function InsightObservations({
  observations,
}: {
  observations: readonly InsightObservation[];
}) {
  if (observations.length === 0) return null;

  return (
    <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-zinc-50/80">
      {observations.map((o, i) => {
        const denominator =
          o.affectedCount !== undefined && o.eligibleCount !== undefined
            ? `${formatCount(o.affectedCount)} of ${formatCount(o.eligibleCount)}`
            : o.affectedCount !== undefined
              ? `${formatCount(o.affectedCount)} affected`
              : o.eligibleCount !== undefined
                ? `${formatCount(o.eligibleCount)} eligible`
                : null;

        return (
          <div
            key={i}
            className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <dt className="text-[12.5px] leading-snug text-zinc-600">{unitLabel(o.unit)}</dt>
            <dd className="sm:text-right">
              {o.value === null ? (
                <span className="text-[13px] text-zinc-600">
                  <span aria-hidden>—</span>
                  <span className="ml-1.5">not yet observed</span>
                </span>
              ) : (
                <span className="tabular-nums text-[13.5px] font-semibold text-zinc-900">
                  {formatValue(o.value, o.unit)}
                </span>
              )}
              {o.comparisonValue !== undefined && o.comparisonValue !== null ? (
                <span className="tabular-nums block text-[11.5px] text-zinc-600">
                  vs {formatValue(o.comparisonValue, o.unit)}
                </span>
              ) : null}
              {denominator ? (
                <span className="tabular-nums block text-[11.5px] text-zinc-600">{denominator}</span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function unitLabel(unit: string) {
  switch (unit) {
    case "ratio":
      return "Observed rate";
    case "usd":
      return "Observed value";
    case "days":
      return "Observed timing";
    case "posture":
      return "Observed posture";
    case "count":
      return "Observed count";
    default:
      return "Observed";
  }
}

function formatValue(value: number | string, unit: string) {
  if (typeof value === "string") return value;
  switch (unit) {
    case "ratio":
      return `${(value * 100).toFixed(1)}%`;
    case "usd":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "days":
      return `${Math.round(value).toLocaleString("en-US")} days`;
    default:
      return value.toLocaleString("en-US");
  }
}

function formatCount(n: number) {
  return n.toLocaleString("en-US");
}
