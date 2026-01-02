import * as React from "react"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
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

  // Extract percentage from value if it contains a percentage
  const percentageMatch = value.match(/([\d.]+)%/)
  const percentage = percentageMatch ? parseFloat(percentageMatch[1]) : null

  return (
    <Card
      className={cn(
        "rounded-xl border border-border/70 bg-card/95 shadow-sm transition duration-200",
        "hover:shadow-md focus-within:shadow-md",
        className
      )}
      style={{ boxShadow: uiTokens.shadows.card }}
      {...rest}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          {/* Title */}
          <CardTitle
            className="text-muted-foreground text-xs font-medium"
            style={{
              fontSize: uiTokens.typography.caption.fontSize,
              lineHeight: uiTokens.typography.caption.lineHeight,
            }}
          >
            {title}
          </CardTitle>

          {/* Value and change inline */}
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div
                className="tracking-tight text-foreground font-semibold"
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.2,
                }}
              >
                {value}
              </div>
              {change ? (
                <div
                  className="flex items-center gap-1.5 text-muted-foreground"
                  style={{
                    fontSize: "0.75rem",
                    lineHeight: 1.2,
                  }}
                >
                  <TrendIcon className={cn("size-3", trendColor[trend])} />
                  <span className={trendColor[trend]}>{change.value}</span>
                  {change.label ? (
                    <span className="font-normal text-muted-foreground/80">
                      {change.label}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Visual progress indicator */}
            {percentage !== null && (
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }, (_, i) => {
                  const filled = Math.round((percentage / 100) * 5)
                  const isFilled = i < filled
                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-4 rounded-sm transition-colors",
                        isFilled
                          ? trend === "up"
                            ? "bg-emerald-500"
                            : trend === "down"
                              ? "bg-rose-500"
                              : "bg-blue-500"
                          : "bg-muted/30"
                      )}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Hint */}
          {hint ? (
            <p
              className="text-muted-foreground mt-1"
              style={{
                fontSize: "0.7rem",
                lineHeight: 1.3,
              }}
            >
              {hint}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

