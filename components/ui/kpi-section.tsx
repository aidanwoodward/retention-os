import type { DemoMetric } from "@/lib/demo-data/types"

import { uiTokens } from "@/lib/ui-tokens"
import { DemoCard } from "./demo-card"

interface KpiSectionProps {
  items: Array<{
    id: string
    label: string
    metric?: DemoMetric
  }>
}

export function KpiSection({ items }: KpiSectionProps) {
  if (!items.length) {
    return null
  }

  return (
    <section
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
      style={{ gap: uiTokens.layout.gridGap }}
    >
      {items.map((item) =>
        item.metric ? (
          <DemoCard
            key={item.id}
            title={item.label}
            value={item.metric.value}
            change={item.metric.change}
            hint={item.metric.hint}
          />
        ) : null
      )}
    </section>
  )
}

