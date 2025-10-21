"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface CohortData {
  cohort_month: string;
  cohort_size: number;
  periods: Array<{
    period_number: number;
    order_month: string;
    active_customers: number;
    total_orders: number;
    total_revenue: number;
    retention_rate_percent: number;
  }>;
}

interface RevenueCohortsChartProps {
  cohorts: CohortData[];
}

// Transform cohort data into chart format
const transformCohortData = (cohorts: CohortData[]) => {
  const chartData: Record<string, Record<string, number | string>> = {};
  
  cohorts.forEach((cohort) => {
    cohort.periods.forEach((period) => {
      const key = period.order_month;
      if (!chartData[key]) {
        chartData[key] = { month: key };
      }
      
      // Create a unique key for each cohort's contribution to this period
      const cohortKey = `cohort_${cohort.cohort_month.replace('-', '_')}`;
      chartData[key][cohortKey] = period.total_revenue;
    });
  });
  
  return Object.values(chartData).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );
};

// Generate chart config for all cohorts
const generateChartConfig = (cohorts: CohortData[]): ChartConfig => {
  const config: ChartConfig = {};
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  
  cohorts.forEach((cohort, index) => {
    const key = `cohort_${cohort.cohort_month.replace('-', '_')}`;
    config[key] = {
      label: cohort.cohort_month,
      color: colors[index % colors.length],
    };
  });
  
  return config;
};

export function RevenueCohortsChart({ cohorts }: RevenueCohortsChartProps) {
  if (!cohorts || cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Cohort Trends</CardTitle>
          <CardDescription>
            Revenue contribution by cohort over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No cohort data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = transformCohortData(cohorts);
  const chartConfig = generateChartConfig(cohorts);
  const cohortKeys = Object.keys(chartConfig);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Cohort Trends</CardTitle>
        <CardDescription>
          Revenue contribution by cohort over time - stacked view shows how each cohort contributes to monthly revenue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    chartConfig[name as keyof typeof chartConfig]?.label || name,
                  ]}
                  labelFormatter={(value) => 
                    new Date(value).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  }
                />
              }
            />
            {cohortKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="revenue"
                fill={`var(--color-${key})`}
                radius={index === cohortKeys.length - 1 ? [0, 0, 4, 4] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
