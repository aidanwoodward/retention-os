"use client"

import { DonutChart as TremorDonutChart } from "@tremor/react"
import { cn } from "@/lib/utils"
import { uiTokens } from "@/lib/ui-tokens"
import type { ValueFormatter } from "@tremor/react"

interface DonutChartProps {
  data: Array<Record<string, unknown>>
  index: string
  category: string
  valueFormatter?: ValueFormatter
  title?: string
  subtitle?: string
  className?: string
}

export function DonutChart({
  data,
  index,
  category,
  valueFormatter,
  title,
  subtitle,
  className,
}: DonutChartProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 transition-all duration-200",
        "shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)]",
        className
      )}
      style={{
        borderRadius: uiTokens.radii.xl,
        padding: uiTokens.spacing.md,
        transitionDuration: uiTokens.motion.duration,
        transitionTimingFunction: uiTokens.motion.easing,
      }}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}
      <TremorDonutChart
        data={data}
        index={index}
        category={category}
        valueFormatter={valueFormatter}
        className="h-80"
        showAnimation
      />
    </div>
  )
}

