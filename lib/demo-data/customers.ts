import {
  formatCurrencyGBP,
  formatMonthLabel,
  formatNumber,
  formatPercent,
} from "./format"
import { createSeededRandom } from "./prng"
import { DemoMetric, DemoTableColumn, DemoTableRow } from "./types"

interface CustomerDemoData {
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
}

const segmentTemplates = [
  {
    key: "vip",
    label: "VIP Subscribers",
    customers: 1200,
    retained: 1_200_000,
    trend: 8.4,
  },
  {
    key: "reengaged",
    label: "Re-engaged Customers",
    customers: 950,
    retained: 640_000,
    trend: 5.1,
  },
  {
    key: "firstPurchase",
    label: "First Purchase",
    customers: 4500,
    retained: 410_000,
    trend: 2.7,
  },
]

export function generateCustomerDemoData(seed: string): CustomerDemoData {
  const random = createSeededRandom(`${seed}-customers`)

  const metrics: Record<string, DemoMetric> = {
    activeCustomers: {
      value: formatNumber(18000 + Math.round(random() * 2200)),
      change: {
        value: formatPercent(4 + random() * 3, 1),
        trend: "up",
        label: "vs last 30 days",
      },
    },
    averageLtv: {
      value: formatCurrencyGBP(420 + random() * 120),
      change: {
        value: formatCurrencyGBP(24 + random() * 30),
        trend: "up",
        label: "rolling 90-day",
      },
    },
    churnRisk: {
      value: formatPercent(10 + random() * 6, 1),
      change: {
        value: `${formatPercent(1 + random() * 1.5, 1)} pts`,
        trend: "down",
        label: "projected",
      },
    },
    reactivationWins: {
      value: formatNumber(260 + Math.round(random() * 120)),
      change: {
        value: formatPercent(12 + random() * 8, 0),
        trend: "up",
        label: "campaign uplift",
      },
    },
  }

  metrics.averageLtv.hint = "Top quartile, target £500"
  metrics.churnRisk.hint = "Keep below 13% for healthy mix"

  const columns: DemoTableColumn[] = [
    { key: "segment", label: "Segment" },
    { key: "customers", label: "Customers", align: "right" },
    { key: "retained", label: "Retained revenue", align: "right" },
    { key: "trend", label: "Trend", align: "right" },
  ]

  const rows: DemoTableRow[] = segmentTemplates.map((template) => {
    const customers =
      template.customers + Math.round((random() - 0.5) * template.customers * 0.1)
    const retained =
      template.retained + (random() - 0.5) * template.retained * 0.15
    const trend = template.trend + (random() - 0.5) * 2.5

    return {
      key: template.key,
      values: {
        segment: template.label,
        customers: formatNumber(customers),
        retained: formatCurrencyGBP(retained),
        trend: `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`,
      },
    }
  })

  const insightData = Array.from({ length: 8 }).map((_, index) => {
    const baseDate = new Date()
    baseDate.setUTCMonth(baseDate.getUTCMonth() - (7 - index))
    baseDate.setUTCDate(1)

    const growth = 120_000 + random() * 60_000

    return {
      label: formatMonthLabel(baseDate),
      value: Math.round(growth),
    }
  })

  return {
    metrics,
    table: {
      columns,
      rows,
      caption: "Top customer segments ranked by retained revenue",
    },
    insight: {
      title: "Retained revenue momentum",
      description:
        "Monthly retained revenue tracked across the last eight cohorts.",
      metricLabel: "GBP",
      data: insightData,
      footer: "Goal: sustain £150k+ retained revenue per month through Q4.",
    },
  }
}

