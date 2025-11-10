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
        "bg-card text-card-foreground flex flex-col rounded-2xl border border-border/70 p-4 shadow-sm transition duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
        className
      )}
      style={{ gap: uiTokens.spacing.md, boxShadow: uiTokens.shadow.card }}
      {...rest}
    >
      <header className="flex flex-col gap-2" style={{ gap: uiTokens.spacing.sm }}>
        <h2
          className="text-foreground"
          style={{
            fontSize: uiTokens.typography.h2.fontSize,
            lineHeight: uiTokens.typography.h2.lineHeight,
            fontWeight: uiTokens.typography.h2.fontWeight,
          }}
        >
          {title}
        </h2>
        {description ? (
          <p
            className="text-muted-foreground"
            style={{
              fontSize: uiTokens.typography.bodySm.fontSize,
              lineHeight: uiTokens.typography.bodySm.lineHeight,
            }}
          >
            {description}
          </p>
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
          className="grid grid-cols-2 text-muted-foreground sm:grid-cols-4"
          style={{ gap: uiTokens.spacing.md }}
        >
          {data.map((datum) => (
            <div key={datum.label} className="flex flex-col gap-1">
              <dt
                className="font-medium text-foreground"
                style={{
                  fontSize: uiTokens.typography.caption.fontSize,
                  lineHeight: uiTokens.typography.caption.lineHeight,
                }}
              >
                {datum.label}
              </dt>
              <dd
                className="text-foreground"
                style={{
                  fontSize: uiTokens.typography.body.fontSize,
                  lineHeight: uiTokens.typography.body.lineHeight,
                }}
              >
                {datum.value.toLocaleString("en-GB")}
                {metricLabel ? ` ${metricLabel}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {footer ? (
        <footer
          className="text-muted-foreground"
          style={{ marginTop: uiTokens.spacing.sm }}
        >
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

