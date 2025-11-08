import { formatCurrencyGBP, formatMonthLabel, formatPercent } from "./format"
import { createSeededRandom } from "./prng"
import { DemoMetric, DemoTableColumn, DemoTableRow } from "./types"

interface ProductDemoData {
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

const skuNames = [
  "Glow Serum",
  "Hydra Cleanse",
  "Repair Night Oil",
  "Daily Vitamin Gummies",
  "Silk Pillowcase",
]

const categories = ["Skincare", "Supplements", "Home", "Beauty", "Lifestyle"]

export function generateProductDemoData(seed: string): ProductDemoData {
  const random = createSeededRandom(`${seed}-products`)

  const topSku = skuNames[Math.floor(random() * skuNames.length)]
  const riskSku = skuNames[(Math.floor(random() * skuNames.length) + 2) % skuNames.length]

  const metrics: Record<string, DemoMetric> = {
    topSku: {
      value: topSku,
      change: {
        value: `+${(28 + random() * 9).toFixed(0)}%`,
        trend: "up",
        label: "retained revenue",
      },
      hint: "Drives replenishment and cross-sell lift.",
    },
    subscriptionMix: {
      value: formatPercent(32 + random() * 8, 0),
      change: {
        value: `+${(4 + random() * 4).toFixed(1)} pts`,
        trend: "up",
        label: "since last quarter",
      },
    },
    atRiskOffer: {
      value: riskSku,
      change: {
        value: `-${(6 + random() * 5).toFixed(1)}%`,
        trend: "down",
        label: "repeat rate",
      },
      hint: "Queue pricing and bundle experiment.",
    },
    newLaunchVelocity: {
      value: formatCurrencyGBP(70_000 + random() * 45_000),
      change: {
        value: formatPercent(12 + random() * 6, 0),
        trend: "up",
        label: "first 60 days",
      },
    },
  }

  const columns: DemoTableColumn[] = [
    { key: "product", label: "Product" },
    { key: "category", label: "Category" },
    { key: "retained", label: "Retained revenue", align: "right" },
    { key: "repeat", label: "Repeat rate", align: "right" },
  ]

  const rows: DemoTableRow[] = Array.from({ length: 4 }).map((_, index) => {
    const productName = skuNames[index % skuNames.length]
    const baseRevenue = 85_000 + random() * 60_000
    const repeatRate = 38 + random() * 18

    return {
      key: `${productName}-${index}`,
      values: {
        product: productName,
        category: categories[index % categories.length],
        retained: formatCurrencyGBP(baseRevenue),
        repeat: formatPercent(repeatRate, 1),
      },
    }
  })

  const insightData = Array.from({ length: 8 }).map((_, index) => {
    const baseDate = new Date()
    baseDate.setUTCMonth(baseDate.getUTCMonth() - (7 - index))
    baseDate.setUTCDate(1)

    return {
      label: formatMonthLabel(baseDate),
      value: Math.round(110_000 + random() * 50_000),
    }
  })

  return {
    metrics,
    table: {
      columns,
      rows,
      caption: "Top product SKUs ranked by retained revenue contribution",
    },
    insight: {
      title: "Retained revenue by launch month",
      description: "Track SKU momentum and replenishment velocity across recent launches.",
      metricLabel: "GBP",
      data: insightData,
      footer: "Target: Maintain £120k+ retained revenue for top launches.",
    },
  }
}

