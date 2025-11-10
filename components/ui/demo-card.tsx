import * as React from "react"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { uiTokens } from "@/lib/ui-tokens"

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
    <Card
      className={cn(
        "min-h-[160px] rounded-2xl border border-border/70 bg-card/95 shadow-sm transition duration-200",
        "ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 hover:shadow-md focus-within:-translate-y-0.5 focus-within:shadow-md",
        className
      )}
      style={{ boxShadow: uiTokens.shadow.card }}
      {...rest}
    >
      <CardHeader className="pb-0">
        <CardTitle
          className="text-muted-foreground"
          style={{
            fontSize: uiTokens.typography.caption.fontSize,
            lineHeight: uiTokens.typography.caption.lineHeight,
            fontWeight: uiTokens.typography.caption.fontWeight,
          }}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-3">
        <div
          className="tracking-tight text-foreground"
          style={{
            fontSize: "1.5rem",
            lineHeight: uiTokens.typography.h2.lineHeight,
            fontWeight: 600,
          }}
        >
          {value}
        </div>
        {change ? (
          <div
            className="flex items-center gap-2 text-muted-foreground"
            style={{
              fontSize: uiTokens.typography.caption.fontSize,
              lineHeight: uiTokens.typography.caption.lineHeight,
            }}
          >
            <TrendIcon className={cn("size-4", trendColor[trend])} />
            <span className={trendColor[trend]}>{change.value}</span>
            {change.label ? (
              <span className="font-normal">
                {change.label}
              </span>
            ) : null}
          </div>
        ) : null}
        {hint ? (
          <p
            className="text-muted-foreground"
            style={{
              fontSize: uiTokens.typography.caption.fontSize,
              lineHeight: uiTokens.typography.caption.lineHeight,
            }}
          >
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

