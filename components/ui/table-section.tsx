import * as React from "react"

import { uiTokens } from "@/lib/ui-tokens"
import { DemoTable } from "./demo-table"

interface TableSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  caption: string
  columns: Parameters<typeof DemoTable>[0]["columns"]
  rows: Parameters<typeof DemoTable>[0]["rows"]
}

export function TableSection({
  title,
  description,
  caption,
  columns,
  rows,
  className,
  ...rest
}: TableSectionProps) {
  return (
    <section className={className} {...rest}>
      {(title || description) && (
        <header
          className="flex flex-col"
          style={{ gap: uiTokens.spacing.xs, marginBottom: uiTokens.spacing.sm }}
        >
          {title ? (
            <h3
              className="text-foreground"
              style={{
                fontSize: uiTokens.typography.h3.fontSize,
                lineHeight: uiTokens.typography.h3.lineHeight,
                fontWeight: uiTokens.typography.h3.fontWeight,
              }}
            >
              {title}
            </h3>
          ) : null}
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
      )}
      <DemoTable caption={caption} columns={columns} rows={rows} />
    </section>
  )
}

