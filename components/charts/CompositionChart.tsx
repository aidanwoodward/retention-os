"use client"

import { PieChart, Pie, Cell, Legend } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DonutChart as TremorDonutChart } from "@/components/charts/tremor/Donut"
import { formatCompactNumber } from "@/lib/chart-formatters"

interface CompositionData {
  segment: string
  count: number
  percentage: number
  avg_order_value: number
  total_revenue: number
  repeat_rate: number
  avg_orders_per_customer: number
}

interface CompositionChartProps {
  data: CompositionData[]
  engine?: "tremor" | "recharts"
}

const COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(330, 81%, 60%)",
]

const chartConfig = {
  count: {
    label: "Customer Count",
  },
} satisfies ChartConfig

export function CompositionChart({
  data,
  engine = "tremor",
}: CompositionChartProps) {
  const chartData = data.map((item) => ({
    name: item.segment,
    value: item.count,
    percentage: item.percentage,
  }))

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Composition</CardTitle>
          <CardDescription>
            Distribution of customers by segment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorDonutChart
            data={chartData}
            index="name"
            category="value"
            valueFormatter={formatCompactNumber}
            title="Customer Composition"
            subtitle="Distribution of customers by segment"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Composition</CardTitle>
        <CardDescription>
          Distribution of customers by segment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

