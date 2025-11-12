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

interface ProductPerformanceData {
  product_id: string
  product_name: string
  category: string
  total_orders: number
  total_revenue: number
  avg_order_value: number
  units_sold: number
  conversion_rate: number
  return_rate: number
  customer_satisfaction: number
  inventory_turnover: number
  profit_margin: number
}

interface ProductPerformanceChartProps {
  data: ProductPerformanceData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  total_revenue: {
    label: "Total Revenue",
    color: "hsl(221, 83%, 53%)",
  },
  units_sold: {
    label: "Units Sold",
    color: "hsl(142, 76%, 36%)",
  },
} satisfies ChartConfig

export function ProductPerformanceChart({
  data,
  engine = "tremor",
}: ProductPerformanceChartProps) {
  // Get top 10 products by revenue
  const topProducts = [...data]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)
    .map((product) => ({
      name: product.product_name.length > 20
        ? product.product_name.substring(0, 20) + "..."
        : product.product_name,
      total_revenue: product.total_revenue,
      units_sold: product.units_sold,
    }))

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Performance Trends</CardTitle>
          <CardDescription>
            Top 10 products by revenue and units sold
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorBarChart
            data={topProducts}
            index="name"
            categories={["total_revenue"]}
            valueFormatter={formatCurrency}
            title="Product Performance Trends"
            subtitle="Top 10 products by revenue"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Performance Trends</CardTitle>
        <CardDescription>
          Top 10 products by revenue and units sold
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={topProducts} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
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

