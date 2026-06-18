"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatMetricDefinitionTooltip,
  getMetricDefinition,
  type MetricDataQuality,
  type MetricId,
} from "@/lib/metrics/metric-definitions";
import { cn } from "@/lib/utils";

export interface MetricInfoTooltipProps {
  readonly metricId: MetricId;
  readonly dataQuality?: MetricDataQuality;
  readonly size?: "sm" | "md";
  readonly side?: "top" | "right" | "bottom" | "left";
  readonly className?: string;
}

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
} as const;

export function MetricInfoTooltip({
  metricId,
  dataQuality,
  size = "md",
  side = "top",
  className,
}: MetricInfoTooltipProps) {
  const def = getMetricDefinition(metricId);
  const sections = formatMetricDefinitionTooltip(def, dataQuality);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-sm text-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60",
            className,
          )}
          aria-label={`Definition: ${def.name}`}
        >
          <Info className={cn(ICON_SIZES[size], "cursor-help")} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={4}
        className="max-w-[280px] border-0 bg-gray-900 px-3 py-2 text-white"
      >
        <div className="space-y-2 text-xs leading-relaxed">
          <p className="font-semibold text-white">{def.name}</p>
          {sections.map((section) => (
            <div key={section.label}>
              <p className="font-medium text-gray-300">{section.label}</p>
              <p className="text-gray-100">{section.body}</p>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
