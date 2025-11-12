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
import { formatPercent } from "@/lib/chart-formatters"

interface ReactivationData {
  customer_id: string
  customer_name: string
  reactivation_score: number
  days_since_last_order: number
  previous_order_frequency: number
  potential_value: number
  reactivation_probability: number
  recommended_campaigns: string[]
  last_engagement_date: string
  preferred_communication: string
  reactivation_priority: "high" | "medium" | "low"
  success_factors: string[]
  customer_segment: string
  lifetime_value: number
}

interface ReactivationChartProps {
  data: ReactivationData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  reactivation_probability: {
    label: "Reactivation Probability",
    color: "hsl(142, 76%, 36%)",
  },
  potential_value: {
    label: "Potential Value",
    color: "hsl(38, 92%, 50%)",
  },
} satisfies ChartConfig

export function ReactivationChart({
  data,
  engine = "tremor",
}: ReactivationChartProps) {
  // Group by priority and calculate averages
  const priorityData = ["high", "medium", "low"].map((priority) => {
    const items = data.filter((item) => item.reactivation_priority === priority)
    return {
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count: items.length,
      avg_probability: items.length > 0
        ? items.reduce((sum, item) => sum + item.reactivation_probability, 0) / items.length
        : 0,
      avg_potential_value: items.length > 0
        ? items.reduce((sum, item) => sum + item.potential_value, 0) / items.length
        : 0,
    }
  })

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reactivation Score Distribution</CardTitle>
          <CardDescription>
            Reactivation probability and potential value by priority level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorBarChart
            data={priorityData}
            index="priority"
            categories={["avg_probability"]}
            valueFormatter={formatPercent}
            title="Reactivation Score Distribution"
            subtitle="Reactivation probability by priority level"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reactivation Score Distribution</CardTitle>
        <CardDescription>
          Reactivation probability and potential value by priority level
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={priorityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="priority"
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
            <Bar
              dataKey="avg_probability"
              fill="var(--color-reactivation_probability)"
              radius={[4, 4, 0, 0]}
              name="Avg Probability"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

