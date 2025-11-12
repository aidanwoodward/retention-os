"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart as TremorAreaChart } from "@/components/charts/tremor/Area"
import { formatPercent } from "@/lib/chart-formatters"

interface ReplenishmentData {
  product_id: string
  product_name: string
  category: string
  current_stock: number
  reorder_point: number
  reorder_quantity: number
  lead_time_days: number
  stock_turnover: number
  stockout_risk: number
  overstock_risk: number
  last_reorder_date: string
  next_reorder_date: string
  supplier_performance: number
}

interface ReplenishmentChartProps {
  data: ReplenishmentData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  stockout_risk: {
    label: "Stockout Risk",
    color: "hsl(0, 84%, 60%)",
  },
  overstock_risk: {
    label: "Overstock Risk",
    color: "hsl(38, 92%, 50%)",
  },
} satisfies ChartConfig

export function ReplenishmentChart({
  data,
  engine = "tremor",
}: ReplenishmentChartProps) {
  // Group by risk level based on stockout_risk
  const riskData = ["high", "medium", "low"].map((risk) => {
    let items: typeof data = []
    if (risk === "high") {
      items = data.filter((item) => item.stockout_risk >= 70)
    } else if (risk === "medium") {
      items = data.filter((item) => item.stockout_risk >= 30 && item.stockout_risk < 70)
    } else {
      items = data.filter((item) => item.stockout_risk < 30)
    }
    return {
      risk: risk.charAt(0).toUpperCase() + risk.slice(1),
      avg_stockout_risk: items.length > 0
        ? items.reduce((sum, item) => sum + item.stockout_risk, 0) / items.length
        : 0,
      avg_overstock_risk: items.length > 0
        ? items.reduce((sum, item) => sum + item.overstock_risk, 0) / items.length
        : 0,
    }
  })

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Risk Analysis</CardTitle>
          <CardDescription>
            Replenishment rate and forecasted demand by risk level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorAreaChart
            data={riskData}
            index="risk"
            categories={["avg_stockout_risk", "avg_overstock_risk"]}
            valueFormatter={formatPercent}
            title="Inventory Risk Analysis"
            subtitle="Stockout and overstock risk by level"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Risk Analysis</CardTitle>
        <CardDescription>
          Replenishment rate and forecasted demand by risk level
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <AreaChart data={riskData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="risk"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="avg_stockout_risk"
              stroke="var(--color-stockout_risk)"
              fill="var(--color-stockout_risk)"
              fillOpacity={0.6}
              name="Stockout Risk"
            />
            <Area
              type="monotone"
              dataKey="avg_overstock_risk"
              stroke="var(--color-overstock_risk)"
              fill="var(--color-overstock_risk)"
              fillOpacity={0.4}
              name="Overstock Risk"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

