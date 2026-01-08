"use client";

import { useState, useMemo, useEffect } from "react";
import { Bar, XAxis, YAxis, LabelList, ComposedChart, CartesianGrid } from "recharts";
import { Download, Info } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Get cohort label based on aggregation mode
const getCohortLabel = (
  cohortMonth: string, 
  viewMode: 'monthly' | 'quarterly' | 'annual',
  aggregationMode: 'quarterly' | 'annual'
): string => {
  const cohortDate = new Date(cohortMonth);
  
  if (aggregationMode === 'annual') {
    return cohortDate.getFullYear().toString();
  } else {
    // quarterly aggregation
    const year = cohortDate.getFullYear();
    const quarter = Math.floor(cohortDate.getMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  }
};

// Parse cohort label to get sortable date
const parseCohortLabelDate = (label: string, aggregationMode: 'quarterly' | 'annual'): Date => {
  if (label.startsWith('Older cohorts') || label.startsWith('≤')) {
    // Return a very old date to ensure it sorts first
    return new Date('1900-01-01');
  }
  
  if (aggregationMode === 'annual') {
    return new Date(parseInt(label), 0, 1);
  } else {
    // quarterly format: "2023-Q1" or "2023-Q2"
    const [year, quarter] = label.split('-Q');
    const month = (parseInt(quarter) - 1) * 3;
    return new Date(parseInt(year), month, 1);
  }
};

// Transform data for cohort view with quarterly aggregation
const transformCohortData = (
  cohorts: CohortData[], 
  viewMode: 'monthly' | 'quarterly' | 'annual',
  showCohorts: Set<string>
) => {
  const chartData: Record<string, Record<string, number | string>> = {};
  
  // Determine aggregation mode based on viewMode
  // Always use quarterly buckets for the chart (unless annual is explicitly selected)
  // Monthly view aggregates to quarterly for cleaner visualization
  const aggregationMode: 'quarterly' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'quarterly';
  
  // Find the earliest cohort date dynamically
  const _earliestCohortDate = cohorts.length > 0 
    ? cohorts.reduce((earliest, cohort) => {
        const cohortDate = new Date(cohort.cohort_month);
        return cohortDate < earliest ? cohortDate : earliest;
      }, new Date(cohorts[0].cohort_month))
    : new Date();
  
  // Get all unique cohort labels using aggregation mode
  const cohortLabels = new Set<string>();
  cohorts.forEach((cohort) => {
    const label = getCohortLabel(cohort.cohort_month, viewMode, aggregationMode);
    cohortLabels.add(label);
  });
  
  // Sort labels chronologically (oldest first)
  const sortedLabels = Array.from(cohortLabels)
    .filter(label => showCohorts.has(label))
    .sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateA.getTime() - dateB.getTime();
    });
  
  // Determine which cohorts to group into "Older cohorts"
  // For annual view, always group years before 2020 regardless of total count
  // For other views, group if there are more cohorts than color scale length
  const cutoffYear = 2020;
  let olderCohorts: string[] = [];
  let individualCohorts: string[] = [];
  let olderCohortsLabel: string | null = null;
  
  if (aggregationMode === 'annual') {
    // For annual view, always group years before 2020
    olderCohorts = sortedLabels.filter(label => {
      const date = parseCohortLabelDate(label, aggregationMode);
      return date.getFullYear() < cutoffYear;
    });
    individualCohorts = sortedLabels.filter(label => {
      const date = parseCohortLabelDate(label, aggregationMode);
      return date.getFullYear() >= cutoffYear;
    });
    
    // Only create "≤ 2019" label if it's actually selected in showCohorts
    // This allows users to hide it by deselecting it in the filter buttons
    if (olderCohorts.length > 0 && showCohorts.has(`≤ ${cutoffYear - 1}`)) {
      olderCohortsLabel = `≤ ${cutoffYear - 1}`;
    }
  } else {
    // For quarterly view, use color scale length limit
    const maxIndividualCohorts = COHORT_COLOR_SCALE.length;
    individualCohorts = sortedLabels.slice(-maxIndividualCohorts); // Newest ones
    olderCohorts = sortedLabels.slice(0, -maxIndividualCohorts); // Oldest ones
    
    if (olderCohorts.length > 0 && individualCohorts.length > 0) {
      const firstIndividualLabel = individualCohorts[0];
      const firstDate = parseCohortLabelDate(firstIndividualLabel, aggregationMode);
      
      // For quarterly aggregation - determine the label
      const [labelYear, labelQuarter] = firstIndividualLabel.split('-Q');
      const quarterNum = parseInt(labelQuarter);
      let potentialLabel: string;
      if (quarterNum === 1) {
        potentialLabel = `≤ ${parseInt(labelYear) - 1}`;
      } else {
        const q1OfSameYear = `${labelYear}-Q1`;
        if (olderCohorts.includes(q1OfSameYear)) {
          potentialLabel = `≤ ${parseInt(labelYear) - 1}`;
        } else {
          potentialLabel = `≤ ${labelYear}-Q1`;
        }
      }
      
      // Only use the label if it's actually selected in showCohorts
      if (showCohorts.has(potentialLabel)) {
        olderCohortsLabel = potentialLabel;
      }
    }
  }
  
  cohorts.forEach((cohort) => {
    const cohortLabel = getCohortLabel(cohort.cohort_month, viewMode, aggregationMode);
    
    // Skip if cohort is hidden
    if (!showCohorts.has(cohortLabel)) {
      return;
    }
    
    // Determine target label: use "Older cohorts" if this is in the older group AND the label is selected, otherwise use the label
    // Only group into "≤ 2019" if that label is actually selected in showCohorts
    const targetLabel = olderCohorts.includes(cohortLabel) && olderCohortsLabel && showCohorts.has(olderCohortsLabel)
      ? olderCohortsLabel 
      : cohortLabel;
    
    cohort.periods.forEach((period) => {
      let periodKey: string;
      
      // Group data by time period based on aggregation mode
      const orderDate = new Date(period.order_month);
      if (aggregationMode === 'annual') {
        periodKey = orderDate.getFullYear().toString();
      } else {
        // quarterly aggregation
        const year = orderDate.getFullYear();
        const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
        periodKey = `${year}-Q${quarter}`;
      }
      
      if (!chartData[periodKey]) {
        chartData[periodKey] = { period: periodKey };
      }
      
      const currentValue = (chartData[periodKey][targetLabel] as number) || 0;
      chartData[periodKey][targetLabel] = currentValue + period.total_revenue;
    });
  });
  
  // Sort period data chronologically
  return Object.values(chartData).sort((a, b) => {
    const periodA = String(a.period);
    const periodB = String(b.period);
    
    if (aggregationMode === 'annual') {
      return parseInt(periodA) - parseInt(periodB);
    } else {
      // quarterly format: "2023-Q1" or "2023-Q2"
      const [yearA, quarterA] = periodA.split('-Q');
      const [yearB, quarterB] = periodB.split('-Q');
      const yearANum = parseInt(yearA);
      const yearBNum = parseInt(yearB);
      if (yearANum !== yearBNum) return yearANum - yearBNum;
      return parseInt(quarterA) - parseInt(quarterB);
    }
  });
};

// Transform data for new vs returning revenue view
const transformNewReturningData = (
  cohorts: CohortData[],
  viewMode: 'monthly' | 'quarterly' | 'annual'
) => {
  const chartData: Record<string, { period: string; new_revenue: number; returning_revenue: number }> = {};
  
  // Determine aggregation mode (same as cohort view - always quarterly unless annual)
  const aggregationMode: 'quarterly' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'quarterly';
  
  cohorts.forEach((cohort) => {
    cohort.periods.forEach((period) => {
      let periodKey: string;
      
      const orderDate = new Date(period.order_month);
      if (aggregationMode === 'annual') {
        periodKey = orderDate.getFullYear().toString();
      } else {
        // quarterly aggregation
        const year = orderDate.getFullYear();
        const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
        periodKey = `${year}-Q${quarter}`;
      }
      
      if (!chartData[periodKey]) {
        chartData[periodKey] = { period: periodKey, new_revenue: 0, returning_revenue: 0 };
      }
      
      // period_number === 0 means first purchase (new revenue)
      // period_number > 0 means returning customer (returning revenue)
      if (period.period_number === 0) {
        chartData[periodKey].new_revenue += period.total_revenue;
      } else {
        chartData[periodKey].returning_revenue += period.total_revenue;
      }
    });
  });
  
  return Object.values(chartData).sort((a, b) => {
    const periodA = a.period;
    const periodB = b.period;
    
    if (aggregationMode === 'annual') {
      return parseInt(periodA) - parseInt(periodB);
    } else {
      // quarterly format: "2023-Q1" or "2023-Q2"
      const [yearA, quarterA] = periodA.split('-Q');
      const [yearB, quarterB] = periodB.split('-Q');
      const yearANum = parseInt(yearA);
      const yearBNum = parseInt(yearB);
      if (yearANum !== yearBNum) return yearANum - yearBNum;
      return parseInt(quarterA) - parseInt(quarterB);
    }
  });
};

// Fixed color scale from oldest (dark) to newest (light)
const COHORT_COLOR_SCALE = [
  "#1e3a8a", // blue-900
  "#1e40af", // blue-800
  "#1d4ed8", // blue-700
  "#2563eb", // blue-600
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#10b981", // green-600
  "#34d399", // green-500
  "#6ee7b7", // green-400
  "#525252", // neutral-600
  "#737373", // neutral-500
  "#a3a3a3", // neutral-400
];

const OLDER_COHORTS_COLOR = "#d4d4d4"; // neutral-300

// Get consistent color for a cohort label based on the year/period itself
// This ensures each year always gets the same color, matching filter buttons
const getCohortColor = (label: string, aggregationMode: 'quarterly' | 'annual'): string => {
  // Handle "Older cohorts" or "≤ 2019" labels - always gray
  if (label.startsWith('≤') || label.includes('Pre-2020') || label.includes('Older')) {
    return OLDER_COHORTS_COLOR;
  }
  
  if (aggregationMode === 'annual') {
    // Annual view: each year gets a specific color
    const yearMatch = label.match(/(\d{4})/);
    if (!yearMatch) return COHORT_COLOR_SCALE[0]; // fallback
    
    const year = parseInt(yearMatch[1]);
    
    // Pre-2020: gray
    if (year < 2020) {
      return OLDER_COHORTS_COLOR;
    }
    
    // Map years to colors:
    // 2020 -> blue-900 (index 0)
    // 2021 -> blue-800 (index 1)
    // 2022 -> blue-700 (index 2)
    // 2023 -> blue-600 (index 3)
    // 2024 -> blue-500 (index 4)
    // 2025 -> blue-400 (index 5)
    // 2026+ -> continue with remaining colors
    const colorIndex = year - 2020;
    return COHORT_COLOR_SCALE[Math.min(colorIndex, COHORT_COLOR_SCALE.length - 1)];
  } else {
    // Quarterly view: each quarter gets a specific color
    // Format: "2020-Q1" or "2020-Q2"
    const quarterlyMatch = label.match(/(\d{4})-Q(\d+)/);
    if (!quarterlyMatch) {
      // Fallback: try to extract just the year
      const yearMatch = label.match(/(\d{4})/);
      if (!yearMatch) return COHORT_COLOR_SCALE[0];
      
      const year = parseInt(yearMatch[1]);
      if (year < 2020) return OLDER_COHORTS_COLOR;
      
      // If no quarter specified, use Q1 color
      const colorIndex = (year - 2020) * 4;
      return COHORT_COLOR_SCALE[Math.min(colorIndex, COHORT_COLOR_SCALE.length - 1)];
    }
    
    const year = parseInt(quarterlyMatch[1]);
    const quarter = parseInt(quarterlyMatch[2]); // 1, 2, 3, or 4
    
    // Pre-2020: gray
    if (year < 2020) {
      return OLDER_COHORTS_COLOR;
    }
    
    // Map quarters to colors:
    // 2020 Q1 -> blue-900 (index 0)
    // 2020 Q2 -> blue-800 (index 1)
    // 2020 Q3 -> blue-700 (index 2)
    // 2020 Q4 -> blue-600 (index 3)
    // 2021 Q1 -> blue-500 (index 4)
    // etc.
    const yearsSince2020 = year - 2020;
    const quarterOffset = quarter - 1; // Q1=0, Q2=1, Q3=2, Q4=3
    const colorIndex = (yearsSince2020 * 4) + quarterOffset;
    
    return COHORT_COLOR_SCALE[Math.min(colorIndex, COHORT_COLOR_SCALE.length - 1)];
  }
};

// Generate chart config for cohorts with dynamic color mapping
const generateCohortConfig = (
  cohorts: CohortData[],
  viewMode: 'monthly' | 'quarterly' | 'annual',
  showCohorts: Set<string>
): ChartConfig => {
  const config: ChartConfig = {};
  
  // Determine aggregation mode (always quarterly unless annual)
  const aggregationMode: 'quarterly' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'quarterly';
  
  // Get unique cohort labels using aggregation mode
  const cohortLabels = new Set<string>();
  cohorts.forEach((cohort) => {
    const label = getCohortLabel(cohort.cohort_month, viewMode, aggregationMode);
    cohortLabels.add(label);
  });
  
  // Sort labels chronologically (oldest first)
  const sortedLabels = Array.from(cohortLabels)
    .filter(label => showCohorts.has(label))
    .sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateA.getTime() - dateB.getTime(); // Oldest first
    });
  
  // Determine which cohorts to group into "Older cohorts"
  // For annual view, always group years before 2020 regardless of total count
  // For other views, group if there are more cohorts than color scale length
  const cutoffYear = 2020;
  let olderCohorts: string[] = [];
  let individualCohorts: string[] = [];
  let olderCohortsLabel: string | null = null;
  
  if (aggregationMode === 'annual') {
    // For annual view, always group years before 2020
    olderCohorts = sortedLabels.filter(label => {
      const date = parseCohortLabelDate(label, aggregationMode);
      return date.getFullYear() < cutoffYear;
    });
    individualCohorts = sortedLabels.filter(label => {
      const date = parseCohortLabelDate(label, aggregationMode);
      return date.getFullYear() >= cutoffYear;
    });
    
    // Only create "≤ 2019" label if it's actually selected in showCohorts
    // This allows users to hide it by deselecting it in the filter buttons
    if (olderCohorts.length > 0 && showCohorts.has(`≤ ${cutoffYear - 1}`)) {
      olderCohortsLabel = `≤ ${cutoffYear - 1}`;
    }
  } else {
    // For quarterly view, use color scale length limit
    const maxIndividualCohorts = COHORT_COLOR_SCALE.length;
    individualCohorts = sortedLabels.slice(-maxIndividualCohorts); // Newest ones
    olderCohorts = sortedLabels.slice(0, -maxIndividualCohorts); // Oldest ones
    
    if (olderCohorts.length > 0 && individualCohorts.length > 0) {
      const firstIndividualLabel = individualCohorts[0];
      const firstDate = parseCohortLabelDate(firstIndividualLabel, aggregationMode);
      
      // For quarterly aggregation - determine the label
      const [labelYear, labelQuarter] = firstIndividualLabel.split('-Q');
      const quarterNum = parseInt(labelQuarter);
      let potentialLabel: string;
      if (quarterNum === 1) {
        potentialLabel = `≤ ${parseInt(labelYear) - 1}`;
      } else {
        const q1OfSameYear = `${labelYear}-Q1`;
        if (olderCohorts.includes(q1OfSameYear)) {
          potentialLabel = `≤ ${parseInt(labelYear) - 1}`;
        } else {
          potentialLabel = `≤ ${labelYear}-Q1`;
        }
      }
      
      // Only use the label if it's actually selected in showCohorts
      if (showCohorts.has(potentialLabel)) {
        olderCohortsLabel = potentialLabel;
      }
    }
  }
  
  // Add "Older cohorts" config if needed
  if (olderCohortsLabel && olderCohorts.length > 0) {
    config[olderCohortsLabel] = {
      label: olderCohortsLabel,
      color: OLDER_COHORTS_COLOR,
    };
  }
  
  // Assign colors to individual cohorts using consistent color mapping
  // Each cohort label gets a consistent color based on the year/period itself
  // This ensures the same color is used in both filter buttons and chart bars
  // Colors don't shift when other cohorts are hidden
  individualCohorts.forEach((label) => {
    config[label] = {
      label: label,
      color: getCohortColor(label, aggregationMode),
    };
  });
  
  return config;
};

// Generate config for new vs returning
const generateNewReturningConfig = (): ChartConfig => ({
  returning_revenue: {
    label: 'Returning Revenue',
    color: '#2563eb', // blue-600 - medium/dark blue (bottom stack)
  },
  new_revenue: {
    label: 'New Revenue',
    color: '#93c5fd', // blue-300 - lighter blue (top stack)
  },
});

export function RevenueCohortsChart({ cohorts, viewMode = 'monthly' }: RevenueCohortsChartProps) {
  // Determine aggregation mode for chart display
  // Always use quarterly aggregation for the chart (unless annual is selected)
  // This keeps the visualization clean and readable
  const aggregationMode: 'quarterly' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'quarterly';
  
  // Debug: Log cohorts to see what we're receiving
  console.log('RevenueCohortsChart - cohorts:', cohorts?.length, cohorts);
  console.log('RevenueCohortsChart - cohorts with periods:', cohorts?.filter(c => c.periods && c.periods.length > 0).length);
  
  // Get all unique cohort labels (only from cohorts with data)
  const cohortsWithData = useMemo(() => {
    return cohorts?.filter(c => c.periods && c.periods.length > 0) || [];
  }, [cohorts]);
  
  const allCohortLabels = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length === 0) return [];
    const labels = new Set<string>();
    cohortsWithData.forEach((cohort) => {
      labels.add(getCohortLabel(cohort.cohort_month, viewMode, aggregationMode));
    });
    return Array.from(labels);
  }, [cohortsWithData, viewMode, aggregationMode]);
  
  // State for showing/hiding cohorts
  const [showCohorts, setShowCohorts] = useState<Set<string>>(new Set());
  const [showCohortView, setShowCohortView] = useState(true);
  
  // Update showCohorts when allCohortLabels changes
  // Initialize with all cohorts selected, but ensure ≤ 2019 is included if it exists
  useEffect(() => {
    if (allCohortLabels.length > 0) {
      const initialSet = new Set(allCohortLabels);
      // Check if there are pre-2020 cohorts and add ≤ 2019 label if needed
      const cutoffYear = 2020;
      const hasPre2020Cohorts = allCohortLabels.some(label => {
        try {
          const date = parseCohortLabelDate(label, aggregationMode);
          return date.getFullYear() < cutoffYear;
        } catch {
          return false;
        }
      });
      
      if (hasPre2020Cohorts) {
        const pre2020Label = `≤ ${cutoffYear - 1}`;
        initialSet.add(pre2020Label);
      }
      setShowCohorts(initialSet);
    }
  }, [allCohortLabels, aggregationMode]);
  
  // Toggle cohort visibility
  const toggleCohort = (label: string) => {
    setShowCohorts((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };
  
  // Transform data based on view mode
  const cohortData = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length === 0) return [];
    let data;
    if (showCohortView && showCohorts.size > 0) {
      data = transformCohortData(cohortsWithData, viewMode, showCohorts);
    } else {
      data = transformNewReturningData(cohortsWithData, viewMode);
    }
    
    // Calculate total revenue for each period and add as a property
    return data.map((period: Record<string, string | number>) => {
      let total = 0;
      Object.keys(period).forEach((key) => {
        if (key !== 'period' && typeof period[key] === 'number') {
          total += period[key] as number;
        }
      });
      return { ...period, total_revenue: total };
    });
  }, [cohortsWithData, viewMode, showCohorts, showCohortView]);
  
  // Calculate max value and generate evenly spaced Y-axis ticks
  // Tighten Y-axis to reduce empty space at top
  const { maxValue, yAxisTicks } = useMemo(() => {
    if (!cohortData || cohortData.length === 0) {
      return { maxValue: 0, yAxisTicks: [0] };
    }
    
    const max = Math.max(...cohortData.map((d: { total_revenue?: number }) => d.total_revenue || 0));
    const rawMax = max * 1.03; // 3% headroom (tightened Y-axis for better space usage)
    
    // Calculate nice round intervals
    // Find a nice round number that divides the maxValue into 4-5 intervals
    const rawInterval = rawMax / 4;
    
    // Round to a nice number (powers of 10, or multiples of 1, 2, 5)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalized = rawInterval / magnitude;
    
    let niceInterval: number;
    if (normalized <= 1) {
      niceInterval = magnitude;
    } else if (normalized <= 2) {
      niceInterval = 2 * magnitude;
    } else if (normalized <= 5) {
      niceInterval = 5 * magnitude;
    } else {
      niceInterval = 10 * magnitude;
    }
    
    // Round maxValue up to the next nice interval
    const roundedMax = Math.ceil(rawMax / niceInterval) * niceInterval;
    
    // Generate evenly spaced ticks from 0 to roundedMax
    const ticks: number[] = [];
    for (let i = 0; i <= roundedMax; i += niceInterval) {
      ticks.push(i);
    }
    
    return { maxValue: roundedMax, yAxisTicks: ticks };
  }, [cohortData]);
  
  // Generate config for ALL cohorts (for legend display)
  const allCohortsConfig = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length === 0) return {};
    if (showCohortView) {
      // Generate config with all cohorts visible (use allCohortLabels as showCohorts)
      const allCohortsSet = new Set(allCohortLabels);
      const config = generateCohortConfig(cohortsWithData, viewMode, allCohortsSet);
      
      // Ensure "≤ 2019" is always in the config if there are pre-2020 cohorts
      // This ensures it appears in the legend filter buttons even if not selected
      const cutoffYear = 2020;
      const hasPre2020Cohorts = allCohortLabels.some(label => {
        try {
          const date = parseCohortLabelDate(label, aggregationMode);
          return date.getFullYear() < cutoffYear;
        } catch {
          return false;
        }
      });
      
      const pre2020Label = `≤ ${cutoffYear - 1}`;
      if (hasPre2020Cohorts && !config[pre2020Label]) {
        config[pre2020Label] = {
          label: pre2020Label,
          color: OLDER_COHORTS_COLOR,
        };
      }
      
      return config;
    } else {
      return generateNewReturningConfig();
    }
  }, [cohortsWithData, viewMode, allCohortLabels, showCohortView, aggregationMode]);
  
  // Generate config for visible cohorts only (for chart rendering)
  const cohortConfig = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length === 0) return {};
    if (showCohortView) {
      return generateCohortConfig(cohortsWithData, viewMode, showCohorts);
    } else {
      return generateNewReturningConfig();
    }
  }, [cohortsWithData, viewMode, showCohorts, showCohortView]);
  
  // Get all cohort keys for legend (always show all cohorts)
  const allLegendKeys = useMemo(() => {
    if (!showCohortView) {
      return ['returning_revenue', 'new_revenue'];
    }
    
    // Get all keys from allCohortsConfig (includes all cohorts, not filtered)
    // "≤ 2019" should already be included if there are pre-2020 cohorts
    const configKeys = Object.keys(allCohortsConfig);
    
    // Sort by cohort date (oldest first)
    const sortedKeys = configKeys.sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateA.getTime() - dateB.getTime();
    });
    
    return sortedKeys;
  }, [allCohortsConfig, showCohortView, aggregationMode]); // allCohortLabels omitted: not used in this useMemo
  
  // Get cohort keys for bars (only visible cohorts)
  const cohortKeys = useMemo(() => {
    if (!showCohortView) {
      // For New vs Returning: returning first (bottom), then new (top)
      return ['returning_revenue', 'new_revenue'];
    }
    
    // For By Cohort: filter to only show visible cohorts
    const configKeys = Object.keys(cohortConfig).filter(key => {
      // Include all keys that are either in showCohorts or are the "Older cohorts" label
      if (key.startsWith('≤')) return true;
      return showCohorts.has(key);
    });
    
    // Sort by cohort date (oldest first)
    const sortedKeys = configKeys.sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateA.getTime() - dateB.getTime();
    });
    
    return sortedKeys;
  }, [cohortConfig, showCohortView, showCohorts, aggregationMode]);
  
  /**
   * CANONICAL DEFINITION: Revenue CAGR Calculation
   * 
   * CAGR (Compound Annual Growth Rate) is calculated from the same series data shown in the trend chart.
   * This ensures CAGR matches what users see visually.
   * 
   * Formula: CAGR = ((End / Start) ^ (1 / years)) - 1
   * 
   * Where:
   * - Start: First non-zero total revenue value in the chart data (first period)
   * - End: Last non-zero total revenue value in the chart data (last period)
   * - years: Time difference between first and last periods (in years)
   *   - Annual: (lastYear - firstYear)
   *   - Quarterly: (lastIndex - firstIndex) / 4 where index = year * 4 + quarterIndex
   *   - Quarterly: (lastYear - firstYear) + (lastQuarter - firstQuarter) / 4
   *   - Monthly: (lastYear - firstYear) + (lastMonth - firstMonth) / 12
   * 
   * Exclusions:
   * - Exclude "Pre-2020" periods
   * - Exclude current incomplete period (if current year/quarter is incomplete)
   * - Use only complete periods for CAGR calculation
   * 
   * Alignment:
   * - CAGR must match the exact time window shown in the trend chart
   * - CAGR reflects the same aggregation mode as the chart (quarterly unless annual)
   * - CAGR only calculated when showing cohort view (not new vs returning view)
   */
  const cagrData = useMemo(() => {
    // Only calculate CAGR when showing cohort view (not new vs returning)
    if (!showCohortView || !cohortData || cohortData.length < 2) return null;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Filter chart data to exclude pre-2020 and incomplete periods
    const completePeriods = cohortData.filter((period: Record<string, string | number>) => {
      const periodKey = String(period.period);
      
      // Exclude pre-2020 periods
      if (periodKey.startsWith('Pre-') || periodKey.startsWith('≤')) return false;
      
      // Calculate total revenue for this period (sum of all cohorts)
      const totalRevenue = Object.keys(period).reduce((sum, key) => {
        if (key === 'period' || key === 'total_revenue') return sum;
        const value = period[key];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
      
      // Skip periods with zero revenue
      if (totalRevenue === 0) return false;
      
      // Exclude incomplete periods
      if (aggregationMode === 'annual') {
        const year = parseInt(periodKey);
        // Exclude current year if incomplete
        return year >= 2020 && year < currentYear;
      } else {
        // Quarterly aggregation
        const [yearStr, quarterStr] = periodKey.split('-Q');
        const year = parseInt(yearStr);
        const quarter = parseInt(quarterStr);
        // Exclude 2019 and earlier
        if (year < 2020) return false;
        // Exclude current quarter if incomplete
        if (year === currentYear) {
          const currentQuarter = Math.floor(currentMonth / 3) + 1;
          // If we're in Q1 and this is Q1, exclude it (incomplete)
          // If we're in Q2 and this is Q2, exclude it (incomplete)
          // etc.
          if (quarter >= currentQuarter) return false;
        }
        return true;
      }
    });
    
    if (completePeriods.length < 2) return null;
    
    // Get first and last complete periods
    const firstPeriod = completePeriods[0] as Record<string, string | number>;
    const lastPeriod = completePeriods[completePeriods.length - 1] as Record<string, string | number>;
    
    // Calculate total revenue for first and last periods (sum of all cohorts)
    const calculateTotalRevenue = (period: Record<string, string | number>): number => {
      return Object.keys(period).reduce((sum, key) => {
        if (key === 'period' || key === 'total_revenue') return sum;
        const value = period[key];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    };
    
    const firstRevenue = calculateTotalRevenue(firstPeriod);
    const lastRevenue = calculateTotalRevenue(lastPeriod);
    
    if (firstRevenue <= 0) return null;
    
    // Calculate years difference between first and last periods using index-based approach
    const firstPeriodKey = String(firstPeriod.period);
    const lastPeriodKey = String(lastPeriod.period);
    
    let yearsDiff: number;
    if (aggregationMode === 'annual') {
      // Annual: years = endYear - startYear
      // Example: 2020 → 2024 = 4 years
      const firstYear = parseInt(firstPeriodKey);
      const lastYear = parseInt(lastPeriodKey);
      yearsDiff = lastYear - firstYear;
    } else {
      // Quarterly: Convert to integer index, then divide by 4 to get years
      // Index formula: year * 4 + quarterIndex (Q1=0, Q2=1, Q3=2, Q4=3)
      // Example: 2020 Q1 → index 8080, 2024 Q1 → index 8096, years = (8096-8080)/4 = 4 years
      // Example: 2020 Q1 → index 8080, 2024 Q2 → index 8097, years = (8097-8080)/4 = 4.25 years
      const [firstYearStr, firstQuarterStr] = firstPeriodKey.split('-Q');
      const [lastYearStr, lastQuarterStr] = lastPeriodKey.split('-Q');
      const firstYear = parseInt(firstYearStr);
      const lastYear = parseInt(lastYearStr);
      const firstQuarter = parseInt(firstQuarterStr); // 1, 2, 3, or 4
      const lastQuarter = parseInt(lastQuarterStr);
      const firstQuarterIndex = firstQuarter - 1; // Q1=0, Q2=1, Q3=2, Q4=3
      const lastQuarterIndex = lastQuarter - 1;
      const firstIndex = firstYear * 4 + firstQuarterIndex;
      const lastIndex = lastYear * 4 + lastQuarterIndex;
      yearsDiff = (lastIndex - firstIndex) / 4;
    }
    
    if (yearsDiff <= 0) return null;
    
    // CAGR formula: ((Ending Value / Beginning Value) ^ (1 / Number of Years)) - 1
    const cagrValue = (Math.pow(lastRevenue / firstRevenue, 1 / yearsDiff) - 1) * 100;
    
    // Format year range
    let yearRange: string;
    if (aggregationMode === 'annual') {
      const firstYear = parseInt(firstPeriodKey);
      const lastYear = parseInt(lastPeriodKey);
      if (lastYear - firstYear < 10) {
        yearRange = `${firstYear}-${lastYear.toString().slice(-2)}`;
      } else {
        yearRange = `${firstYear}-${lastYear}`;
      }
    } else {
      // Quarterly format: "Q1 2020-Q1 2025"
      const [firstYear, firstQuarter] = firstPeriodKey.split('-Q');
      const [lastYear, lastQuarter] = lastPeriodKey.split('-Q');
      yearRange = `Q${firstQuarter} ${firstYear}-Q${lastQuarter} ${lastYear}`;
    }
    
    return {
      value: cagrValue,
      yearRange,
    };
  }, [cohortData, aggregationMode, showCohortView]);
  
  if (!cohorts || cohorts.length === 0 || cohortsWithData.length === 0) {
    return (
      <div className="w-full">
        <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm">No cohort data available</p>
        </div>
      </div>
    );
  }
  
  // Custom label for new/returning revenue bars
  const renderNewReturningLabel = (props: { x?: string | number; y?: string | number; width?: string | number; height?: string | number; value?: string | number; payload?: { new_revenue?: number; returning_revenue?: number }; dataKey?: string }) => {
    const { x, y, width, height, value, payload, dataKey } = props;
    
    const numValue = Number(value);
    if (!payload || !value || numValue === 0) return null;
    
    const newRevenue = (payload.new_revenue as number) || 0;
    const returningRevenue = (payload.returning_revenue as number) || 0;
    const total = newRevenue + returningRevenue;
    
    if (total === 0) return null;
    
    const percentage = ((numValue / total) * 100).toFixed(1);
    const centerX = (Number(x) || 0) + (Number(width) || 0) / 2;
    
    // For stacked bars, each segment's y and height are relative to that segment only
    // returning_revenue is rendered first (bottom stack), new_revenue is rendered second (top stack)
    if (dataKey === 'returning_revenue') {
      // Bottom segment - show in middle of this segment
      const segmentCenterY = (Number(y) || 0) - (Number(height) || 0) / 2;
      return (
        <text
          x={centerX}
          y={segmentCenterY}
          fill="#374151"
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
        >
          {formatCurrency(numValue)} ({percentage}%)
        </text>
      );
    } else if (dataKey === 'new_revenue' && newRevenue > 0) {
      // Top segment - show at top of this segment (which is top of whole bar)
      return (
        <text
          x={centerX}
          y={(Number(y) || 0) - 5}
          fill="#374151"
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
        >
          {formatCurrency(numValue)} ({percentage}%)
        </text>
      );
    }
    
    return null;
  };
  
  // Custom label for total revenue above each bar
  const renderTotalLabel = (props: { x?: string | number; y?: string | number; width?: string | number; payload?: { total_revenue?: number }; value?: string | number }) => {
    const { x, y, width, payload } = props;
    
    if (!payload || !payload.total_revenue || payload.total_revenue === 0) return null;
    
    const total = payload.total_revenue as number;
    const centerX = (Number(x) || 0) + (Number(width) || 0) / 2;
    // Position above the bar - y is the top of the bar segment
    const labelY = Math.max((Number(y) || 0) - 8, 12); // At least 12px from top of chart
    
    return (
      <text
        x={centerX}
        y={labelY}
        fill="#6b7280"
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        className="text-gray-500"
      >
        {formatCurrency(total)}
      </text>
    );
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;
    
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
          {payload
            .filter(entry => entry.value > 0)
            .map((entry, index) => {
              const config = cohortConfig[entry.dataKey as keyof typeof cohortConfig];
              const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
              
              return (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700">
                      {config?.label || entry.dataKey}
                </span>
              </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(entry.value)}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({percentage}%)
                    </span>
          </div>
        </div>
      );
            })}
          <div className="border-t border-gray-200 pt-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-semibold text-gray-900">
        {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Custom label for bars beneath (for better scanning)
  const renderBottomLabel = (props: { x?: string | number; y?: string | number; width?: string | number; payload?: { total_revenue?: number }; value?: string | number }) => {
    const { x, y, width, payload } = props;
    
    if (!payload || !payload.total_revenue || payload.total_revenue === 0) return null;
    
    const total = payload.total_revenue as number;
    const centerX = (Number(x) || 0) + (Number(width) || 0) / 2;
    // Position below the bar
    const labelY = (Number(y) || 0) + 15; // Below the bar
    
    return (
      <text
        x={centerX}
        y={labelY}
        fill="#9ca3af"
        textAnchor="middle"
        fontSize={10}
        fontWeight={500}
        className="text-gray-400"
      >
        {formatCurrency(total)}
      </text>
    );
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-6 pt-6">
      {/* Title, CAGR, and Export - Now inside the box */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Revenue Cohort Trends</h3>
          <p className="text-sm text-gray-500">Distribution of revenue across cohort years</p>
        </div>
        <div className="flex items-center gap-3">
          {cagrData !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {cagrData.yearRange} CAGR
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-0 max-w-[250px]">
                    <p className="text-xs">CAGR uses complete periods only and excludes incomplete current periods.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="w-px h-4 bg-gray-300"></span>
              <span className={`text-sm font-semibold ${
                cagrData.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {cagrData.value >= 0 ? '+' : ''}{cagrData.value.toFixed(1)}%
              </span>
            </div>
          )}
          <button
            onClick={() => {
              // Export chart data to CSV
              const csvData = [];
              
              // Header row
              const header = ['Period'];
              if (showCohortView) {
                // Get all visible cohort keys
                cohortKeys.forEach(key => {
                  const config = cohortConfig[key];
                  if (config) {
                    const label = typeof config.label === 'string' ? config.label : String(key);
                    header.push(label);
                  }
                });
              } else {
                header.push('New Revenue', 'Returning Revenue');
              }
              header.push('Total');
              csvData.push(header);
              
              // Data rows
              const chartDataToExport = cohortData;
              if (chartDataToExport && chartDataToExport.length > 0) {
                chartDataToExport.forEach((row: Record<string, string | number>) => {
                  const csvRow = [(row['period'] as string | undefined) || ''];
                  if (showCohortView) {
                    cohortKeys.forEach(key => {
                      const value = row[key];
                      csvRow.push(value !== undefined && value !== null ? Number(value).toFixed(2) : '0.00');
                    });
                  } else {
                    csvRow.push(Number(row['new_revenue'] || 0).toFixed(2));
                    csvRow.push(Number(row['returning_revenue'] || 0).toFixed(2));
                  }
                  // Calculate total
                  let total = 0;
                  if (showCohortView) {
                    cohortKeys.forEach(key => {
                      total += Number(row[key] || 0);
                    });
                  } else {
                    total = Number(row['new_revenue'] || 0) + Number(row['returning_revenue'] || 0);
                  }
                  csvRow.push(total.toFixed(2));
                  csvData.push(csvRow);
                });
              }
              
              // Create CSV content
              const csvContent = csvData.map(row => row.join(',')).join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `revenue-cohort-trends-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Export chart data to CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Legend Toggle - Now inside the box */}
      <div className="py-2 mb-4 flex items-center gap-4 flex-wrap">
        <div className="inline-flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
          <button
            onClick={() => setShowCohortView(true)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              showCohortView
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Cohort
          </button>
          <button
            onClick={() => setShowCohortView(false)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              !showCohortView
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            New vs Returning
          </button>
        </div>
        
        {/* Cohort legend (only show when in cohort view) - ordered oldest → newest */}
        {showCohortView && (
          <div className="flex items-center gap-2 flex-wrap">
            {allLegendKeys.map((key) => {
              const config = allCohortsConfig[key];
              if (!config) return null;
              
              // Check if this cohort is visible
              const isVisible = showCohorts.has(key);
              
              return (
                <button
                  key={key}
                  onClick={() => toggleCohort(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border-2 cursor-pointer ${
                    isVisible
                      ? 'bg-white border-blue-500 hover:border-blue-600 hover:bg-blue-50 text-gray-900 shadow-sm'
                      : 'bg-gray-100 border-gray-300 hover:border-gray-400 hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-sm flex-shrink-0 border ${
                      isVisible ? 'border-gray-300' : 'border-gray-400'
                    }`}
                    style={{ 
                      backgroundColor: isVisible ? (config.color || '#9ca3af') : '#d1d5db',
                      opacity: isVisible ? 1 : 0.5
                    }}
                  />
                  <span className={isVisible ? 'text-gray-900 font-semibold' : 'text-gray-500'}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Chart with gradient background */}
      <div className="relative bg-gradient-to-b from-gray-50/50 to-transparent rounded-lg border border-gray-200 p-4">
        <ChartContainer config={cohortConfig} className="h-[350px] w-full">
          <ComposedChart 
            data={cohortData} 
            margin={{ top: showCohortView ? 35 : 50, right: 5, left: 20, bottom: 30 }} 
            maxBarSize={80}
          >
            {/* Gridlines */}
            <CartesianGrid 
              strokeDasharray="2 2" 
              stroke="#e5e7eb" 
              vertical={false}
              className="opacity-60"
            />
            
            <XAxis
              dataKey="period"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                // Value is already formatted based on aggregation mode
                return value;
              }}
              tick={{ fill: '#111827', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              tickLine={true}
              tickMargin={8}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[0, maxValue]}
              ticks={yAxisTicks}
              stroke="#9ca3af"
            />
            <ChartTooltip content={<CustomTooltip />} />
          
            {cohortKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="revenue"
                fill={cohortConfig[key]?.color}
              >
                {!showCohortView && key === 'returning_revenue' && (
                  <LabelList
                    dataKey={key}
                    content={renderNewReturningLabel}
                  />
                )}
                {!showCohortView && key === 'new_revenue' && (
                  <LabelList
                    dataKey={key}
                    content={renderNewReturningLabel}
                  />
                )}
                {/* Add total revenue label on the last bar in the stack */}
                {showCohortView && index === cohortKeys.length - 1 && (
                  <>
                    <LabelList
                      dataKey="total_revenue"
                      content={renderTotalLabel}
                      position="top"
                    />
                    {/* Bottom labels for easier scanning */}
                    <LabelList
                      dataKey="total_revenue"
                      content={renderBottomLabel}
                      position="bottom"
                    />
                  </>
                )}
              </Bar>
            ))}
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
