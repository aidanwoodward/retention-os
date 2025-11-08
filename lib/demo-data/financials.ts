import {
  formatCurrencyGBP,
  formatLondonDateTime,
  formatMonthLabel,
  formatPercent,
} from "./format"
import { createSeededRandom } from "./prng"
import { DemoMetric, DemoTableColumn, DemoTableRow } from "./types"

interface FinancialDemoData {
  metrics: Record<string, DemoMetric>
  table: {
    columns: DemoTableColumn[]
    rows: DemoTableRow[]
    caption: string
  }
  insight: {
    title: string
    description: string
    metricLabel: string
    data: Array<{
      label: string
      value: number
    }>
    footer: string
  }
  summary: {
    refreshedAt: string
    nextUpdate: string
  }
}

export function generateFinancialDemoData(seed: string): FinancialDemoData {
  const random = createSeededRandom(`${seed}-financials`)
  const generatedAt = new Date()

  const metrics: Record<string, DemoMetric> = {
    netRevenue: {
      value: formatCurrencyGBP(380_000 + random() * 120_000),
      change: {
        value: formatPercent(6 + random() * 4, 1),
        trend: "up",
        label: "vs last 4 weeks",
      },
    },
    grossMargin: {
      value: formatPercent(64 + random() * 8, 1),
      change: {
        value: `${(random() * 2 - 1).toFixed(1)} pts`,
        trend: random() > 0.5 ? "up" : "down",
        label: "mix impact",
      },
    },
    refundRate: {
      value: formatPercent(2.4 + random(), 1),
      change: {
        value: `${(-0.6 + random()).toFixed(1)} pts`,
        trend: random() > 0.4 ? "down" : "up",
        label: "MoM",
      },
    },
    forecastConfidence: {
      value: `${(82 + random() * 6).toFixed(0)}%`,
      change: {
        value: formatCurrencyGBP(35_000 + random() * 18_000),
        trend: "up",
        label: "expected uplift this quarter",
      },
      hint: "Confidence driven by retention-adjusted models.",
    },
  }

  const columns: DemoTableColumn[] = [
    { key: "month", label: "Month" },
    { key: "netRevenue", label: "Net revenue", align: "right" },
    { key: "grossMargin", label: "Gross margin", align: "right" },
    { key: "refunds", label: "Refunds", align: "right" },
  ]

  const rows: DemoTableRow[] = Array.from({ length: 4 }).map((_, index) => {
    const monthDate = new Date()
    monthDate.setUTCMonth(monthDate.getUTCMonth() - index)
    monthDate.setUTCDate(1)

    const netRevenue = 360_000 + random() * 140_000
    const grossMargin = 62 + random() * 8
    const refunds = 7_500 + random() * 3_000

    return {
      key: monthDate.toISOString(),
      values: {
        month: formatMonthLabel(monthDate),
        netRevenue: formatCurrencyGBP(netRevenue),
        grossMargin: formatPercent(grossMargin, 1),
        refunds: formatCurrencyGBP(refunds),
      },
    }
  })

  const insightData = Array.from({ length: 8 }).map((_, index) => {
    const monthDate = new Date()
    monthDate.setUTCMonth(monthDate.getUTCMonth() - (7 - index))
    monthDate.setUTCDate(1)
    return {
      label: formatMonthLabel(monthDate),
      value: Math.round(58 + random() * 14),
    }
  })

  return {
    metrics,
    table: {
      columns,
      rows,
      caption: "Monthly net revenue, gross margin, and refunds overview",
    },
    insight: {
      title: "Retention-adjusted EBITDA margin",
      description: "Margin outlook blending cohort retention with forward-looking CAC assumptions.",
      metricLabel: "% margin",
      data: insightData,
      footer: "Target: Keep retention-adjusted EBITDA above 60% through peak season.",
    },
    summary: {
      refreshedAt: formatLondonDateTime(generatedAt),
      nextUpdate: formatLondonDateTime(
        new Date(generatedAt.getTime() + 6 * 60 * 60 * 1000)
      ),
    },
  }
}

