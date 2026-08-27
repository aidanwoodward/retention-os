"use client";

import { KpiMetricLabel } from "@/components/ui/kpi-metric-label";
import type { MetricDataQuality, MetricId } from "@/lib/metrics/metric-definitions";

export interface EvidenceMetricProps {
  readonly title: string;
  readonly value: string;
  readonly sub?: string;
  readonly metricId?: MetricId;
  readonly dataQuality?: MetricDataQuality;
}

export function EvidenceMetric({ title, value, sub, metricId, dataQuality }: EvidenceMetricProps) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <KpiMetricLabel metricId={metricId} dataQuality={dataQuality} tooltipSize="sm">
          {title}
        </KpiMetricLabel>
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub ? <p className="mt-1 text-xs leading-snug text-zinc-600">{sub}</p> : null}
    </div>
  );
}
