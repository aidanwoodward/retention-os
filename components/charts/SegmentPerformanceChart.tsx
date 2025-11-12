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

interface CustomerSegmentData {
  segment_name: string
  segment_type: "value" | "activity" | "frequency" | "aov"
  customer_count: number
  total_revenue: number
  avg_revenue_per_customer: number
  avg_orders_per_customer: number
  retention_rate: number
  churn_rate: number
  avg_lifetime_value: number
  growth_rate: number
  top_products: string[]
  customer_satisfaction: number
}

interface SegmentPerformanceChartProps {
  data: CustomerSegmentData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  total_revenue: {
    label: "Total Revenue",
    color: "hsl(262, 83%, 58%)",
  },
  customer_count: {
    label: "Customer Count",
    color: "hsl(221, 83%, 53%)",
  },
} satisfies ChartConfig

export function SegmentPerformanceChart({
  data,
  engine = "tremor",
}: SegmentPerformanceChartProps) {
  const chartData = data.map((segment) => ({
    name: segment.segment_name,
    total_revenue: segment.total_revenue,
    customer_count: segment.customer_count,
  }))

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Performance Trends</CardTitle>
          <CardDescription>
            Revenue and customer count by segment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorBarChart
            data={chartData}
            index="name"
            categories={["total_revenue"]}
            valueFormatter={formatCurrency}
            title="Segment Performance Trends"
            subtitle="Revenue by segment"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Performance Trends</CardTitle>
        <CardDescription>
          Revenue and customer count by segment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
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

