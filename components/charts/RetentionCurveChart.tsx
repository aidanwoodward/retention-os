"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart as TremorLineChart } from "@/components/charts/tremor/Line"
import { formatPercent } from "@/lib/chart-formatters"

interface RetentionCurveData {
  period: string
  cohort_size: number
  retention_rate: number
  revenue_retention: number
  churn_rate: number
  reactivation_rate: number
  avg_order_value: number
  customer_satisfaction: number
}

interface RetentionCurveChartProps {
  data: RetentionCurveData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  retention_rate: {
    label: "Retention Rate",
    color: "hsl(var(--chart-1))",
  },
  revenue_retention: {
    label: "Revenue Retention",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function RetentionCurveChart({
  data,
  engine = "tremor",
}: RetentionCurveChartProps) {
  const chartData = data.map((item) => ({
    period: item.period,
    retention_rate: Number(item.retention_rate.toFixed(1)),
    revenue_retention: Number(item.revenue_retention.toFixed(1)),
  }))

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retention Curve Visualization</CardTitle>
          <CardDescription>
            Customer retention rate and revenue retention over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorLineChart
            data={chartData}
            index="period"
            categories={["retention_rate", "revenue_retention"]}
            valueFormatter={formatPercent}
            title="Retention Curve"
            subtitle="Customer retention rate and revenue retention over time"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Curve Visualization</CardTitle>
        <CardDescription>
          Customer retention rate and revenue retention over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="period"
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
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="retention_rate"
              stroke="var(--color-retention_rate)"
              strokeWidth={2}
              dot={false}
              name="Retention Rate"
            />
            <Line
              type="monotone"
              dataKey="revenue_retention"
              stroke="var(--color-revenue_retention)"
              strokeWidth={2}
              dot={false}
              name="Revenue Retention"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

