import * as React from "react"

import { uiTokens } from "@/lib/ui-tokens"
import { cn } from "@/lib/utils"

interface InsightDatum {
  label: string
  value: number
}

interface InsightPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  metricLabel?: string
  data: InsightDatum[]
  footer?: React.ReactNode
}

export function InsightPanel({
  title,
  description,
  data,
  metricLabel = "",
  footer,
  className,
  ...rest
}: InsightPanelProps) {
  const maxValue = React.useMemo(
    () => (data.length ? Math.max(...data.map((datum) => datum.value)) : 0),
    [data]
  )

  return (
    <section
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border p-6 shadow-sm",
        className
      )}
      style={{ gap: uiTokens.spacing.md, borderRadius: uiTokens.radii.lg }}
      {...rest}
    >
      <header className="flex flex-col gap-2" style={{ gap: uiTokens.spacing.sm }}>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-4">
        <div
          className="relative flex h-48 items-end overflow-hidden bg-muted/40 p-3"
          aria-hidden="true"
          style={{ gap: uiTokens.spacing.xs, borderRadius: uiTokens.radii.md }}
        >
          {data.map((datum) => {
            const height =
              maxValue === 0 ? 0 : Math.max(4, Math.round((datum.value / maxValue) * 100))

            return (
              <div
                key={datum.label}
                className="bg-gradient-to-t from-primary/80 via-primary to-primary/60 relative flex-1 rounded-md"
                style={{ height: `${height}%` }}
              >
                <span className="sr-only">
                  {datum.label}: {datum.value.toLocaleString("en-GB")} {metricLabel}
                </span>
              </div>
            )
          })}
        </div>
        <dl
          className="grid grid-cols-2 text-xs text-muted-foreground sm:grid-cols-4"
          style={{ gap: uiTokens.spacing.md }}
        >
          {data.map((datum) => (
            <div key={datum.label} className="flex flex-col gap-1">
              <dt className="font-medium text-foreground">{datum.label}</dt>
              <dd>
                {datum.value.toLocaleString("en-GB")}
                {metricLabel ? ` ${metricLabel}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {footer ? (
        <footer
          className="text-sm text-muted-foreground"
          style={{ marginTop: uiTokens.spacing.sm }}
        >
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

