"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart as TremorBarChart } from "@/components/charts/tremor/Bar"
import { formatCurrency } from "@/lib/chart-formatters"

interface CategoryCohortData {
  category: string
  customers: number
  total_revenue: number
  avg_order_value: number
  retention_rate: number
  repeat_customers: number
  avg_orders_per_customer: number
  cross_sell_rate: number
}

interface CategoryCohortsChartProps {
  data: CategoryCohortData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  total_revenue: {
    label: "Total Revenue",
    color: "hsl(25, 95%, 53%)",
  },
  retention_rate: {
    label: "Retention Rate",
    color: "hsl(142, 76%, 36%)",
  },
} satisfies ChartConfig

export function CategoryCohortsChart({
  data,
  engine = "tremor",
}: CategoryCohortsChartProps) {
  const chartData = data.map((cohort) => ({
    category: cohort.category,
    total_revenue: cohort.total_revenue,
    retention_rate: Number(cohort.retention_rate.toFixed(1)),
  }))

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
          <CardDescription>
            Revenue and retention rate by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorBarChart
            data={chartData}
            index="category"
            categories={["total_revenue"]}
            valueFormatter={formatCurrency}
            title="Category Performance"
            subtitle="Revenue by category"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
        <CardDescription>
          Revenue and retention rate by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-45}
              textAnchor="end"
              height={80}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="total_revenue"
              fill="var(--color-total_revenue)"
              radius={[4, 4, 0, 0]}
              name="Revenue"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

