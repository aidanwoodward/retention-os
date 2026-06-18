"use client";

import type { ReactNode } from "react";
import { MetricInfoTooltip } from "@/components/ui/metric-info-tooltip";
import type { MetricDataQuality, MetricId } from "@/lib/metrics/metric-definitions";
import { cn } from "@/lib/utils";

export interface KpiMetricLabelProps {
  readonly children: ReactNode;
  readonly metricId?: MetricId;
  readonly dataQuality?: MetricDataQuality;
  readonly className?: string;
  readonly tooltipSize?: "sm" | "md";
}

export function KpiMetricLabel({
  children,
  metricId,
  dataQuality,
  className,
  tooltipSize = "md",
}: KpiMetricLabelProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{children}</span>
      {metricId ?
        <MetricInfoTooltip metricId={metricId} dataQuality={dataQuality} size={tooltipSize} />
      : null}
    </span>
  );
}
