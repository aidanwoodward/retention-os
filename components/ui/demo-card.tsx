import * as React from "react"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Trend = "up" | "down" | "flat"

interface DemoCardProps extends React.ComponentProps<typeof Card> {
  title: string
  value: string
  change?: {
    value: string
    trend?: Trend
    label?: string
  }
  hint?: string
}

const trendIcon: Record<Trend, React.ComponentType<{ className?: string }>> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

const trendColor: Record<Trend, string> = {
  up: "text-emerald-500",
  down: "text-rose-500",
  flat: "text-muted-foreground",
}

export function DemoCard({
  title,
  value,
  change,
  hint,
  className,
  ...rest
}: DemoCardProps) {
  const trend = change?.trend ?? "flat"
  const TrendIcon = trendIcon[trend]

  return (
    <Card className={cn("min-h-[160px]", className)} {...rest}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {change ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendIcon className={cn("size-4", trendColor[trend])} />
            <span className={trendColor[trend]}>{change.value}</span>
            {change.label ? (
              <span className="text-muted-foreground font-normal">
                {change.label}
              </span>
            ) : null}
          </div>
        ) : null}
        {hint ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

