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

interface CrossSellData {
  product_id: string
  product_name: string
  category: string
  cross_sell_rate: number
  cross_sell_revenue: number
  cross_sell_orders: number
  avg_cross_sell_value: number
  top_cross_sell_products: string[]
  customer_segments: string[]
  conversion_rate: number
}

interface CrossSellChartProps {
  data: CrossSellData[]
  engine?: "tremor" | "recharts"
}

const chartConfig = {
  cross_sell_rate: {
    label: "Cross-Sell Rate",
    color: "hsl(330, 81%, 60%)",
  },
  cross_sell_revenue: {
    label: "Cross-Sell Revenue",
    color: "hsl(38, 92%, 50%)",
  },
} satisfies ChartConfig

export function CrossSellChart({
  data,
  engine = "tremor",
}: CrossSellChartProps) {
  // Get top 10 products by cross-sell rate
  const topProducts = [...data]
    .sort((a, b) => b.cross_sell_rate - a.cross_sell_rate)
    .slice(0, 10)
    .map((product) => ({
      name: product.product_name.length > 20
        ? product.product_name.substring(0, 20) + "..."
        : product.product_name,
      cross_sell_rate: Number(product.cross_sell_rate.toFixed(1)),
      cross_sell_revenue: product.cross_sell_revenue,
    }))

  if (engine === "tremor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cross-sell Performance</CardTitle>
          <CardDescription>
            Top 10 products by cross-sell rate and revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TremorBarChart
            data={topProducts}
            index="name"
            categories={["cross_sell_rate"]}
            valueFormatter={formatPercent}
            title="Cross-sell Performance"
            subtitle="Top 10 products by cross-sell rate"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross-sell Performance</CardTitle>
        <CardDescription>
          Top 10 products by cross-sell rate and revenue
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
              dataKey="cross_sell_rate"
              fill="var(--color-cross_sell_rate)"
              radius={[4, 4, 0, 0]}
              name="Cross-Sell Rate %"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

