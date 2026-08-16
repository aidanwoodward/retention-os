"use client";

import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type { MetricDataQuality, MetricId } from "@/lib/metrics/metric-definitions";
import { cn } from "@/lib/utils";

export interface MetricStatProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly metricId?: MetricId;
  readonly dataQuality?: MetricDataQuality;
  readonly className?: string;
}

/**
 * Neutral KPI/stat tile. Callers supply formatted values and supporting copy.
 */
export function MetricStat({
  label,
  value,
  sub,
  metricId,
  dataQuality,
  className,
}: MetricStatProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <KpiMetricLabel metricId={metricId} dataQuality={dataQuality} tooltipSize="sm">
          {label}
        </KpiMetricLabel>
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-600">{sub}</p> : null}
    </div>
  );
}
