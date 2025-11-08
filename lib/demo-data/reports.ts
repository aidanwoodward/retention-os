import {
  formatCurrencyGBP,
  formatLondonDateTime,
  formatMonthLabel,
  formatNumber,
  formatPercent,
} from "./format"
import { createSeededRandom } from "./prng"
import { DemoMetric, DemoTableColumn, DemoTableRow } from "./types"

interface ReportsDemoData {
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
  weeklySummary: {
    generatedAt: string
    keyInsights: string[]
  }
}

export function generateReportsDemoData(seed: string): ReportsDemoData {
  const random = createSeededRandom(`${seed}-reports`)
  const generatedAt = new Date()

  const metrics: Record<string, DemoMetric> = {
    weeklyRevenue: {
      value: formatCurrencyGBP(92_000 + random() * 24_000),
      change: {
        value: formatPercent(4 + random() * 3, 1),
        trend: "up",
        label: "week-over-week",
      },
    },
  newCustomers: {
      value: formatNumber(1_240 + Math.round(random() * 220)),
      change: {
        value: formatPercent(6 + random() * 4, 1),
        trend: "up",
        label: "new to repeat flow",
      },
    },
    retentionTrend: {
      value: formatPercent(67 + random() * 5, 1),
      change: {
        value: `${(random() * 2 - 1).toFixed(1)} pts`,
        trend: random() > 0.5 ? "up" : "down",
        label: "rolling 90-day",
      },
    },
    reportsReady: {
      value: `${3 + Math.floor(random() * 2)} ready`,
      change: {
        value: "2 drafts awaiting approval",
        trend: "flat",
      },
      hint: "Latest exec deck compiled 2 hours ago.",
    },
  }

  const columns: DemoTableColumn[] = [
    { key: "report", label: "Report" },
    { key: "period", label: "Period" },
    { key: "status", label: "Status" },
    { key: "updated", label: "Last updated", align: "right" },
  ]

  const reportTypes = [
    "Weekly performance recap",
    "Retention command briefing",
    "Merchandising update",
    "Executive deck",
  ]

  const statusOptions = ["Ready", "Draft", "Scheduled"]

  const rows: DemoTableRow[] = reportTypes.map((label, index) => {
    const updated = new Date(generatedAt.getTime() - (index + 1) * 90 * 60 * 1000)
    const status = statusOptions[index % statusOptions.length]

    return {
      key: `${label}-${index}`,
      values: {
        report: label,
        period: `Week of ${formatMonthLabel(
          new Date(generatedAt.getTime() - index * 7 * 24 * 60 * 60 * 1000)
        )}`,
        status,
        updated: formatLondonDateTime(updated),
      },
    }
  })

  const insightData = Array.from({ length: 6 }).map((_, index) => {
    const weekDate = new Date()
    weekDate.setUTCDate(weekDate.getUTCDate() - (5 - index) * 7)

    return {
      label: `Week ${formatMonthLabel(weekDate)}`,
      value: Math.round(48 + random() * 12),
    }
  })

  return {
    metrics,
    table: {
      columns,
      rows,
      caption: "Recent executive and weekly reports ready for review",
    },
    insight: {
      title: "Week-over-week retained revenue",
      description: "Shows retained revenue trend for the past six weeks across key segments.",
      metricLabel: "% retained",
      data: insightData,
      footer: "Retention growth of 4.2 pts QoQ driven by replenishment and subscription cohorts.",
    },
    weeklySummary: {
      generatedAt: formatLondonDateTime(generatedAt),
      keyInsights: [
        "Retention-led revenue exceeded plan by 6.4% last week.",
        "Reactivation playbook delivered +14% uplift for dormant shoppers.",
        "Repeat contribution reached 58% of total revenue, up 3 pts WoW.",
      ],
    },
  }
}

