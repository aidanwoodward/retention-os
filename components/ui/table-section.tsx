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
          {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </header>
      )}
      <DemoTable caption={caption} columns={columns} rows={rows} />
    </section>
  )
}

