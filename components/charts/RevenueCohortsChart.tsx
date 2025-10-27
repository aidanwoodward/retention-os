"use client";

import { Bar, BarChart, XAxis, YAxis, LabelList } from "recharts";
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
          const month = new Date(period.order_month).getMonth(); // 0-11
          const quarter = Math.floor(month / 3) + 1; // Convert to 1-4
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
        const cohortMonth = new Date(cohort.cohort_month).getMonth(); // 0-11
        const cohortQuarter = Math.floor(cohortMonth / 3) + 1; // Convert to 1-4
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

// Generate chart config for all cohorts with distinct colors
const generateChartConfig = (cohorts: CohortData[], viewMode: 'monthly' | 'quarterly' | 'annual' = 'monthly'): ChartConfig => {
  const config: ChartConfig = {};
  const colors = [
    "#1e40af", // Deep blue
    "#3b82f6", // Blue
    "#60a5fa", // Light blue
    "#93c5fd", // Lighter blue
    "#dbeafe", // Very light blue
    "#1e3a8a", // Dark blue
    "#2563eb", // Medium blue
    "#1d4ed8", // Blue-700
    "#1e40af", // Blue-800
    "#1e3a8a"  // Blue-900
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

  // Always use quarterly view for the bar chart to avoid visual clutter
  const chartData = transformCohortData(cohorts, 'quarterly');
  const chartConfig = generateChartConfig(cohorts, 'quarterly');
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

  // Custom label component for displaying total on top of each bar
  const renderCustomLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    payload?: Record<string, number | string>;
  }) => {
    const { x = 0, y = 0, width = 0, payload = {} } = props;
    
    // Calculate total for this bar by summing all cohort values
    let total = 0;
    Object.keys(chartConfig).forEach((key) => {
      const val = payload[key] as number;
      if (typeof val === 'number' && !isNaN(val)) {
        total += val;
      }
    });
    
    // Only show label if there's a valid total
    if (total === 0) return null;
    
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#374151"
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
      >
        {formatCurrency(total)}
      </text>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Revenue Cohort Trends</CardTitle>
        <CardDescription>
          Revenue contribution by cohort over time - quarterly view shows how each cohort contributes to quarterly revenue
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={chartData} margin={{ top: 35, right: 5, left: 20, bottom: 5 }} maxBarSize={80}>
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
                fill={chartConfig[key]?.color}
              >
                {/* Only show label on the last bar (topmost in stack) */}
                {index === cohortKeys.length - 1 && (
                  <LabelList
                    dataKey={key}
                    content={renderCustomLabel}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
