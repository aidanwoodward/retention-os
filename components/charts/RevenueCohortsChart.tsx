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
  viewMode?: 'monthly' | 'quarterly' | 'annual';
}

// Transform cohort data into chart format based on view mode
const transformCohortData = (cohorts: CohortData[], viewMode: 'monthly' | 'quarterly' | 'annual' = 'monthly') => {
  const chartData: Record<string, Record<string, number | string>> = {};
  
  cohorts.forEach((cohort) => {
    cohort.periods.forEach((period) => {
      let key: string;
      
      // Group data by time period based on view mode
      switch (viewMode) {
        case 'quarterly':
          const quarter = Math.ceil(new Date(period.order_month).getMonth() / 3);
          const year = new Date(period.order_month).getFullYear();
          key = `Q${quarter} ${year}`;
          break;
        case 'annual':
          key = new Date(period.order_month).getFullYear().toString();
          break;
        default: // monthly
          key = period.order_month;
      }
      
      if (!chartData[key]) {
        chartData[key] = { period: key };
      }
      
      // Create a unique key for each cohort's contribution to this period
      const cohortKey = `cohort_${cohort.cohort_month.replace('-', '_')}`;
      const currentValue = chartData[key][cohortKey] as number || 0;
      chartData[key][cohortKey] = currentValue + period.total_revenue;
    });
  });
  
  return Object.values(chartData).sort((a, b) => {
    if (viewMode === 'annual') {
      return parseInt(String(a.period)) - parseInt(String(b.period));
    }
    return new Date(String(a.period)).getTime() - new Date(String(b.period)).getTime();
  });
};

// Generate chart config for all cohorts with navy to light blue gradient
const generateChartConfig = (cohorts: CohortData[]): ChartConfig => {
  const config: ChartConfig = {};
  const colors = [
    "#1E3A8A", // Navy blue
    "#2563EB", // Blue
    "#3B82F6", // Light blue
    "#60A5FA", // Lighter blue
    "#93C5FD", // Very light blue
    "#DBEAFE", // Lightest blue
    "#0EA5E9", // Cyan blue
    "#06B6D4", // Light cyan
    "#67E8F9", // Very light cyan
    "#A5F3FC"  // Lightest cyan
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

export function RevenueCohortsChart({ cohorts, viewMode = 'monthly' }: RevenueCohortsChartProps) {
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

  const chartData = transformCohortData(cohorts, viewMode);
  const chartConfig = generateChartConfig(cohorts);
  const cohortKeys = Object.keys(chartConfig);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
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
          Revenue contribution by cohort over time - {viewMode} view shows how each cohort contributes to {viewMode} revenue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="period"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                if (viewMode === 'annual') {
                  return value;
                } else if (viewMode === 'quarterly') {
                  return value;
                } else {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  });
                }
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
                         labelFormatter={(value) => {
                           if (viewMode === 'annual') {
                             return value;
                           } else if (viewMode === 'quarterly') {
                             return value;
                           } else {
                             return new Date(value).toLocaleDateString("en-US", {
                               month: "short",
                               year: "numeric",
                             });
                           }
                         }}
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
