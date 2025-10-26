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
      let cohortKey: string;
      if (viewMode === 'annual') {
        // For annual view, group cohorts by year only
        const cohortYear = new Date(cohort.cohort_month).getFullYear();
        cohortKey = `cohort_${cohortYear}`;
      } else if (viewMode === 'quarterly') {
        // For quarterly view, group cohorts by year-quarter
        const cohortYear = new Date(cohort.cohort_month).getFullYear();
        const cohortQuarter = Math.ceil(new Date(cohort.cohort_month).getMonth() / 3);
        cohortKey = `cohort_${cohortYear}_Q${cohortQuarter}`;
      } else {
        // For monthly view, use full month
        cohortKey = `cohort_${cohort.cohort_month.replace('-', '_')}`;
      }
      
      const currentValue = chartData[key][cohortKey] as number || 0;
      chartData[key][cohortKey] = currentValue + period.total_revenue;
    });
  });
  
  return Object.values(chartData).sort((a, b) => {
    if (viewMode === 'annual') {
      return parseInt(String(a.period)) - parseInt(String(b.period));
    } else if (viewMode === 'quarterly') {
      // Custom sort for quarterly: Q# YYYY format
      const [quarterA, yearA] = String(a.period).split(' ');
      const [quarterB, yearB] = String(b.period).split(' ');
      const yearANum = parseInt(yearA);
      const yearBNum = parseInt(yearB);
      const quarterANum = parseInt(quarterA.replace('Q', ''));
      const quarterBNum = parseInt(quarterB.replace('Q', ''));
      
      if (yearANum !== yearBNum) return yearANum - yearBNum;
      return quarterANum - quarterBNum;
    }
    // For monthly, sort by date
    return new Date(String(a.period)).getTime() - new Date(String(b.period)).getTime();
  });
};

// Generate chart config for all cohorts with navy to light blue gradient
const generateChartConfig = (cohorts: CohortData[], viewMode: 'monthly' | 'quarterly' | 'annual' = 'monthly'): ChartConfig => {
  const config: ChartConfig = {};
  const colors = [
    "var(--chart-1)", // Navy blue
    "var(--chart-2)", // Blue
    "var(--chart-3)", // Light blue
    "var(--chart-4)", // Lighter blue
    "var(--chart-5)", // Very light blue
    "var(--chart-6)", // Lightest blue
    "var(--chart-7)", // Cyan blue
    "var(--chart-8)", // Light cyan
    "var(--chart-9)", // Very light cyan
    "var(--chart-10)"  // Lightest cyan
  ];
  
  // Get unique cohort keys based on view mode
  const cohortKeys = new Set<string>();
  cohorts.forEach((cohort) => {
    let key: string;
    if (viewMode === 'annual') {
      const cohortYear = new Date(cohort.cohort_month).getFullYear();
      key = `cohort_${cohortYear}`;
    } else if (viewMode === 'quarterly') {
      const cohortYear = new Date(cohort.cohort_month).getFullYear();
      const cohortQuarter = Math.ceil(new Date(cohort.cohort_month).getMonth() / 3);
      key = `cohort_${cohortYear}_Q${cohortQuarter}`;
    } else {
      key = `cohort_${cohort.cohort_month.replace('-', '_')}`;
    }
    cohortKeys.add(key);
  });
  
  Array.from(cohortKeys).forEach((key, index) => {
    let label: string;
    if (viewMode === 'annual') {
      const year = key.replace('cohort_', '');
      label = year;
    } else if (viewMode === 'quarterly') {
      const parts = key.replace('cohort_', '').split('_Q');
      label = `${parts[0]}-Q${parts[1]}`;
    } else {
      label = key.replace('cohort_', '').replace('_', '-');
    }
    
    config[key] = {
      label: label,
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
  const chartConfig = generateChartConfig(cohorts, viewMode);
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

  // Custom tooltip component with colored squares
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: {
              dataKey: string;
              value: number;
              color: string;
            }, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700">
                  {chartConfig[entry.dataKey as keyof typeof chartConfig]?.label}: {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Revenue Cohort Trends</CardTitle>
        <CardDescription>
          Revenue contribution by cohort over time - {viewMode} view shows how each cohort contributes to {viewMode} revenue
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={chartData} margin={{ top: 20, right: 5, left: 20, bottom: 5 }} maxBarSize={80}>
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
            <ChartTooltip content={<CustomTooltip />} />
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
