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
import { formatCompactNumber } from "@/lib/chart-formatters"

interface ChurnRiskData {
  customer_id: string
  customer_name: string
  churn_risk_score: number
  risk_factors: string[]
  days_since_last_order: number
  order_frequency_decline: number
  spending_decline: number
  engagement_score: number
  last_interaction_date: string
  predicted_churn_date: string
  intervention_priority: "high" | "medium" | "low"
  recommended_actions: string[]
  customer_value: number
  segment: string
}

interface ChurnRiskChartProps {
  data: ChurnRiskData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  high_risk: {
    label: "High Risk",
    color: "hsl(0, 84%, 60%)",
  },
  medium_risk: {
    label: "Medium Risk",
    color: "hsl(38, 92%, 50%)",
  },
  low_risk: {
    label: "Low Risk",
    color: "hsl(142, 76%, 36%)",
  },
} satisfies ChartConfig

export function ChurnRiskChart({
  data,
  engine = "tremor",
}: ChurnRiskChartProps) {
  // Create chart data showing risk score distribution
  const scoreRanges = Array.from({ length: 10 }, (_, i) => {
    const min = i * 10
    const max = (i + 1) * 10
    const itemsInRange = data.filter(
      (item) => item.churn_risk_score >= min && item.churn_risk_score < max
    )
    const highRiskCount = itemsInRange.filter((item) => item.churn_risk_score >= 80).length
    const mediumRiskCount = itemsInRange.filter(
      (item) => item.churn_risk_score >= 40 && item.churn_risk_score < 80
    ).length
    const lowRiskCount = itemsInRange.filter((item) => item.churn_risk_score < 40).length

    return {
      range: `${min}-${max}%`,
      "High Risk": highRiskCount,
      "Medium Risk": mediumRiskCount,
      "Low Risk": lowRiskCount,
    }
  })

  const chartData = scoreRanges

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Churn Risk Distribution</CardTitle>
          <CardDescription>
            Distribution of customers by churn risk score ranges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorAreaChart
            data={chartData}
            index="range"
            categories={["Low Risk", "Medium Risk", "High Risk"]}
            valueFormatter={formatCompactNumber}
            title="Churn Risk Distribution"
            subtitle="Distribution of customers by churn risk score ranges"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Churn Risk Distribution</CardTitle>
        <CardDescription>
          Distribution of customers by churn risk score ranges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="range"
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
              dataKey="Low Risk"
              stackId="1"
              stroke="var(--color-low_risk)"
              fill="var(--color-low_risk)"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Medium Risk"
              stackId="1"
              stroke="var(--color-medium_risk)"
              fill="var(--color-medium_risk)"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="High Risk"
              stackId="1"
              stroke="var(--color-high_risk)"
              fill="var(--color-high_risk)"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

