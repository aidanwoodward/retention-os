import {
  formatCurrencyGBP,
  formatPercent,
  formatMonthLabel,
  formatNumber,
} from "./format"
import { createSeededRandom } from "./prng"
import { DemoMetric, DemoTableColumn, DemoTableRow } from "./types"

interface RetentionDemoData {
  metrics: Record<string, DemoMetric>
  table: {
    columns: DemoTableColumn[]
    rows: DemoTableRow[]
    caption: string
  }
  cohorts: Array<{
    month: string
    retainedRate: number
    revenue: number
  }>
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

export function generateRetentionDemoData(seed: string): RetentionDemoData {
  const random = createSeededRandom(`${seed}-retention`)

  const rollingImprovement = 3 + random() * 4
  const paybackImprovement = 0.3 + random() * 0.5

  const metrics: Record<string, DemoMetric> = {
    rollingRetention: {
      value: formatPercent(64 + random() * 6, 1),
      change: {
        value: `${rollingImprovement.toFixed(1)} pts`,
        trend: "up",
        label: "quarter-on-quarter",
      },
      hint: "Goal: 72% by year end",
    },
    paybackPeriod: {
      value: `${(2.6 + random() * 0.6).toFixed(1)} months`,
      change: {
        value: `-${paybackImprovement.toFixed(1)} mo`,
        trend: "down",
        label: "vs target",
      },
    },
    highRiskCohort: {
      value: formatMonthLabel(
        new Date(Date.UTC(2024, 3 + Math.round(random() * 2), 1))
      ),
      change: {
        value: `${(-6 - random() * 4).toFixed(1)}%`,
        trend: "down",
        label: "active rate",
      },
      hint: "Triggered reactivation drip on 12 Oct",
    },
    expansionRevenue: {
      value: formatCurrencyGBP(150_000 + random() * 70_000),
      change: {
        value: formatPercent(10 + random() * 6, 0),
        trend: "up",
        label: "from upgrades",
      },
    },
  }

  const columns: DemoTableColumn[] = [
    { key: "cohort", label: "Cohort" },
    { key: "size", label: "Size", align: "right" },
    { key: "retained", label: "Retained rate", align: "right" },
    { key: "note", label: "Notable signal" },
  ]

  const cohortRows: DemoTableRow[] = Array.from({ length: 4 }).map((_, index) => {
    const baseDate = new Date(Date.UTC(2024, index + 2, 1))
    const baseRetention = 55 + random() * 12
    const size = 1600 + Math.round(random() * 400)

    const notes = [
      "New loyalty perk lifted retention",
      "Gift-with-purchase drove higher repeat",
      "Shipping delays impacted month 3",
      "Reactivation offer testing in progress",
    ]

    return {
      key: baseDate.toISOString(),
      values: {
        cohort: formatMonthLabel(baseDate),
        size: formatNumber(size),
        retained: formatPercent(baseRetention, 1),
        note: notes[index % notes.length],
      },
    }
  })

  const cohorts = Array.from({ length: 12 }).map((_, index) => {
    const baseDate = new Date()
    baseDate.setUTCMonth(baseDate.getUTCMonth() - (11 - index))
    baseDate.setUTCDate(1)

    return {
      month: formatMonthLabel(baseDate),
      retainedRate: 55 + random() * 15,
      revenue: 140_000 + random() * 80_000,
    }
  })

  return {
    metrics,
    table: {
      columns,
      rows: cohortRows,
      caption: "Cohorts requiring attention over the next 30 days",
    },
    cohorts,
    insight: {
      title: "Retention curve by activation month",
      description: "Active customer rate measured three months post acquisition.",
      metricLabel: "% retained",
      data: cohorts.map((cohort) => ({
        label: cohort.month,
        value: Number(cohort.retainedRate.toFixed(1)),
      })),
      footer: "Rolling average retention sits at 63% across the past 12 cohorts.",
    },
  }
}

