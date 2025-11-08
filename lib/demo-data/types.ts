export type TrendDirection = "up" | "down" | "flat"

export interface DemoMetric {
  value: string
  change?: {
    value: string
    trend: TrendDirection
    label?: string
  }
  hint?: string
}

export interface DemoTableColumn {
  key: string
  label: string
  align?: "left" | "center" | "right"
}

export interface DemoTableRow {
  key: string
  values: Record<string, string>
}

