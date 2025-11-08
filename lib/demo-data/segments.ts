import {
  formatCurrencyGBP,
  formatMonthLabel,
  formatNumber,
  formatPercent,
} from "./format"
import { createSeededRandom } from "./prng"
import { DemoMetric, DemoTableColumn, DemoTableRow } from "./types"

interface SegmentDemoData {
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

const segmentNames = [
  "Loyalists 3+ orders",
  "Latent churn risk",
  "Cross-sell ready",
  "First-time VIP",
  "Dormant 90 days",
]

export function generateSegmentDemoData(seed: string): SegmentDemoData {
  const random = createSeededRandom(`${seed}-segments`)

  const metrics: Record<string, DemoMetric> = {
    totalSegments: {
      value: formatNumber(38 + Math.round(random() * 6)),
      change: {
        value: `+${(3 + random() * 2).toFixed(0)}`,
        trend: "up",
        label: "since last quarter",
      },
    },
    dynamicAudiences: {
      value: formatNumber(12 + Math.round(random() * 4)),
      change: {
        value: `+${(2 + random()).toFixed(1)}`,
        trend: "up",
        label: "powered by AI",
      },
    },
    segmentCoverage: {
      value: formatPercent(78 + random() * 8, 0),
      change: {
        value: `+${(5 + random() * 2).toFixed(1)} pts`,
        trend: "up",
        label: "customers mapped",
      },
    },
    lifecycleGaps: {
      value: formatNumber(2 + Math.round(random() * 2)),
      change: {
        value: `-${(1 + random()).toFixed(0)}`,
        trend: "down",
        label: "needs attention",
      },
      hint: "Focus on post-purchase and churn recovery.",
    },
  }

  const columns: DemoTableColumn[] = [
    { key: "segment", label: "Segment" },
    { key: "size", label: "Size", align: "right" },
    { key: "value", label: "Retained value", align: "right" },
    { key: "health", label: "Health" },
  ]

  const rows: DemoTableRow[] = segmentNames.slice(0, 4).map((name, index) => {
    const size = 1200 + Math.round(random() * 800) + index * 150
    const value = 180_000 + random() * 120_000
    const healthStates = ["Growing", "Stable", "Needs outreach", "Testing playbook"]
    return {
      key: `${name}-${index}`,
      values: {
        segment: name,
        size: formatNumber(size),
        value: formatCurrencyGBP(value),
        health: healthStates[index % healthStates.length],
      },
    }
  })

  const insightData = Array.from({ length: 6 }).map((_, index) => {
    const baseDate = new Date()
    baseDate.setUTCMonth(baseDate.getUTCMonth() - (5 - index))
    baseDate.setUTCDate(1)

    return {
      label: formatMonthLabel(baseDate),
      value: Math.round(58 + random() * 12),
    }
  })

  return {
    metrics,
    table: {
      columns,
      rows,
      caption: "High-performing lifecycle segments at a glance",
    },
    insight: {
      title: "Segment retention health",
      description: "Average retained revenue share across top lifecycle segments.",
      metricLabel: "% retained",
      data: insightData,
      footer: "Maintain above 60% retention across strategic segments.",
    },
  }
}

