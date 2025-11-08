import * as React from "react"

import { cn } from "@/lib/utils"

type Alignment = "left" | "center" | "right"

interface DemoColumn {
  key: string
  label: string
  align?: Alignment
}

interface DemoRow {
  key: string
  values: Record<string, React.ReactNode>
}

interface DemoTableProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: DemoColumn[]
  rows?: DemoRow[]
  caption?: string
}

const defaultColumns: DemoColumn[] = [
  { key: "segment", label: "Segment" },
  { key: "customers", label: "Customers", align: "right" },
  { key: "retained", label: "Retained Revenue", align: "right" },
  { key: "trend", label: "Trend", align: "right" },
]

const defaultRows: DemoRow[] = [
  {
    key: "vip",
    values: {
      segment: "VIP Subscribers",
      customers: "1,248",
      retained: "$1.2M",
      trend: "+8.4%",
    },
  },
  {
    key: "relaunch",
    values: {
      segment: "Re-engaged Customers",
      customers: "980",
      retained: "$640K",
      trend: "+5.1%",
    },
  },
  {
    key: "first",
    values: {
      segment: "First Purchase",
      customers: "4,502",
      retained: "$410K",
      trend: "+2.7%",
    },
  },
]

export function DemoTable({
  columns = defaultColumns,
  rows = defaultRows,
  caption,
  className,
  ...rest
}: DemoTableProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...rest}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          {caption ? (
            <caption className="bg-muted/40 px-6 py-3 text-left text-sm text-muted-foreground">
              {caption}
            </caption>
          ) : null}
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.key} className="bg-background/40 transition hover:bg-muted/40">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-6 py-4 text-sm",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right"
                    )}
                  >
                    {row.values[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

