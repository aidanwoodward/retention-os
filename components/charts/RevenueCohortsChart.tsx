"use client";

import { useState, useMemo, useEffect } from "react";
import { Bar, BarChart, XAxis, YAxis, LabelList, Line, LineChart, ComposedChart, CartesianGrid } from "recharts";
import { Download } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
  viewMode?: 'monthly' | 'quarterly' | 'half-year' | 'annual';
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

// Get half-year label (e.g., "2023 H1", "2023 H2")
const getHalfYearLabel = (cohortMonth: string): string => {
  const cohortDate = new Date(cohortMonth);
  const year = cohortDate.getFullYear();
  const half = cohortDate.getMonth() < 6 ? 'H1' : 'H2';
  return `${year} ${half}`;
};

// Get cohort label based on aggregation mode
const getCohortLabel = (
  cohortMonth: string, 
  viewMode: 'monthly' | 'quarterly' | 'half-year' | 'annual',
  aggregationMode: 'half-year' | 'annual'
): string => {
  const cohortDate = new Date(cohortMonth);
  
  if (aggregationMode === 'annual') {
    return cohortDate.getFullYear().toString();
  } else {
    // half-year aggregation
    return getHalfYearLabel(cohortMonth);
  }
};

// Parse cohort label to get sortable date
const parseCohortLabelDate = (label: string, aggregationMode: 'half-year' | 'annual'): Date => {
  if (label.startsWith('Older cohorts') || label.startsWith('≤')) {
    // Return a very old date to ensure it sorts first
    return new Date('1900-01-01');
  }
  
  if (aggregationMode === 'annual') {
    return new Date(parseInt(label), 0, 1);
  } else {
    // half-year format: "2023 H1" or "2023 H2"
    const [year, half] = label.split(' ');
    const month = half === 'H1' ? 0 : 6;
    return new Date(parseInt(year), month, 1);
  }
};

// Transform data for cohort view with half-year aggregation
const transformCohortData = (
  cohorts: CohortData[], 
  viewMode: 'monthly' | 'quarterly' | 'half-year' | 'annual',
  showCohorts: Set<string>
) => {
  const chartData: Record<string, Record<string, number | string>> = {};
  
  // Determine aggregation mode based on viewMode
  // Always use half-year buckets for the chart (unless annual or half-year is explicitly selected)
  // Monthly and Quarterly views both aggregate to half-year for cleaner visualization
  const aggregationMode: 'half-year' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'half-year';
  
  // Find the earliest cohort date dynamically
  const earliestCohortDate = cohorts.length > 0 
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
    // For half-year view, use color scale length limit
    const maxIndividualCohorts = COHORT_COLOR_SCALE.length;
    individualCohorts = sortedLabels.slice(-maxIndividualCohorts); // Newest ones
    olderCohorts = sortedLabels.slice(0, -maxIndividualCohorts); // Oldest ones
    
    if (olderCohorts.length > 0 && individualCohorts.length > 0) {
      const firstIndividualLabel = individualCohorts[0];
      const firstDate = parseCohortLabelDate(firstIndividualLabel, aggregationMode);
      const firstYear = firstDate.getFullYear();
      
      // For half-year aggregation - determine the label
      const firstHalf = firstIndividualLabel.split(' ')[1]; // "H1" or "H2"
      let potentialLabel: string;
      if (firstHalf === 'H1') {
        potentialLabel = `≤ ${firstYear - 1}`;
      } else {
        const h1OfSameYear = `${firstYear} H1`;
        if (olderCohorts.includes(h1OfSameYear)) {
          potentialLabel = `≤ ${firstYear - 1}`;
        } else {
          potentialLabel = `≤ ${firstYear} H1`;
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
        // half-year aggregation
        const year = orderDate.getFullYear();
        const half = orderDate.getMonth() < 6 ? 'H1' : 'H2';
        periodKey = `${year} ${half}`;
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
      // half-year format: "2023 H1" or "2023 H2"
      const [yearA, halfA] = periodA.split(' ');
      const [yearB, halfB] = periodB.split(' ');
      const yearANum = parseInt(yearA);
      const yearBNum = parseInt(yearB);
      if (yearANum !== yearBNum) return yearANum - yearBNum;
      return halfA === 'H1' && halfB === 'H2' ? -1 : halfA === 'H2' && halfB === 'H1' ? 1 : 0;
    }
  });
};

// Transform data for new vs returning revenue view
const transformNewReturningData = (
  cohorts: CohortData[],
  viewMode: 'monthly' | 'quarterly' | 'half-year' | 'annual'
) => {
  const chartData: Record<string, { period: string; new_revenue: number; returning_revenue: number }> = {};
  
  // Determine aggregation mode (same as cohort view - always half-year unless annual)
  const aggregationMode: 'half-year' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'half-year';
  
  cohorts.forEach((cohort) => {
    cohort.periods.forEach((period) => {
      let periodKey: string;
      
      const orderDate = new Date(period.order_month);
      if (aggregationMode === 'annual') {
        periodKey = orderDate.getFullYear().toString();
      } else {
        // half-year aggregation
        const year = orderDate.getFullYear();
        const half = orderDate.getMonth() < 6 ? 'H1' : 'H2';
        periodKey = `${year} ${half}`;
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
      // half-year format: "2023 H1" or "2023 H2"
      const [yearA, halfA] = periodA.split(' ');
      const [yearB, halfB] = periodB.split(' ');
      const yearANum = parseInt(yearA);
      const yearBNum = parseInt(yearB);
      if (yearANum !== yearBNum) return yearANum - yearBNum;
      return halfA === 'H1' && halfB === 'H2' ? -1 : halfA === 'H2' && halfB === 'H1' ? 1 : 0;
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
const getCohortColor = (label: string, aggregationMode: 'half-year' | 'annual'): string => {
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
    // Half-year view: each half-year period gets a specific color
    // Format: "2020 H1" or "2020 H2"
    const halfYearMatch = label.match(/(\d{4})\s+(H[12])/);
    if (!halfYearMatch) {
      // Fallback: try to extract just the year
      const yearMatch = label.match(/(\d{4})/);
      if (!yearMatch) return COHORT_COLOR_SCALE[0];
      
      const year = parseInt(yearMatch[1]);
      if (year < 2020) return OLDER_COHORTS_COLOR;
      
      // If no half specified, use H1 color
      const colorIndex = (year - 2020) * 2;
      return COHORT_COLOR_SCALE[Math.min(colorIndex, COHORT_COLOR_SCALE.length - 1)];
    }
    
    const year = parseInt(halfYearMatch[1]);
    const half = halfYearMatch[2]; // "H1" or "H2"
    
    // Pre-2020: gray
    if (year < 2020) {
      return OLDER_COHORTS_COLOR;
    }
    
    // Map half-years to colors:
    // 2020 H1 -> blue-900 (index 0)
    // 2020 H2 -> blue-800 (index 1)
    // 2021 H1 -> blue-700 (index 2)
    // 2021 H2 -> blue-600 (index 3)
    // 2022 H1 -> blue-500 (index 4)
    // 2022 H2 -> blue-400 (index 5)
    // 2023 H1 -> green-600 (index 6)
    // etc.
    const yearsSince2020 = year - 2020;
    const halfOffset = half === 'H1' ? 0 : 1;
    const colorIndex = (yearsSince2020 * 2) + halfOffset;
    
    return COHORT_COLOR_SCALE[Math.min(colorIndex, COHORT_COLOR_SCALE.length - 1)];
  }
};

// Generate chart config for cohorts with dynamic color mapping
const generateCohortConfig = (
  cohorts: CohortData[],
  viewMode: 'monthly' | 'quarterly' | 'half-year' | 'annual',
  showCohorts: Set<string>
): ChartConfig => {
  const config: ChartConfig = {};
  
  // Determine aggregation mode (always half-year unless annual)
  const aggregationMode: 'half-year' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'half-year';
  
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
    // For half-year view, use color scale length limit
    const maxIndividualCohorts = COHORT_COLOR_SCALE.length;
    individualCohorts = sortedLabels.slice(-maxIndividualCohorts); // Newest ones
    olderCohorts = sortedLabels.slice(0, -maxIndividualCohorts); // Oldest ones
    
    if (olderCohorts.length > 0 && individualCohorts.length > 0) {
      const firstIndividualLabel = individualCohorts[0];
      const firstDate = parseCohortLabelDate(firstIndividualLabel, aggregationMode);
      const firstYear = firstDate.getFullYear();
      
      // For half-year aggregation - determine the label
      const firstHalf = firstIndividualLabel.split(' ')[1]; // "H1" or "H2"
      let potentialLabel: string;
      if (firstHalf === 'H1') {
        potentialLabel = `≤ ${firstYear - 1}`;
      } else {
        const h1OfSameYear = `${firstYear} H1`;
        if (olderCohorts.includes(h1OfSameYear)) {
          potentialLabel = `≤ ${firstYear - 1}`;
        } else {
          potentialLabel = `≤ ${firstYear} H1`;
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
  // Always use half-year aggregation for the chart (unless annual is selected)
  // This keeps the visualization clean and readable
  const aggregationMode: 'half-year' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'half-year';
  
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
    return data.map((period: any) => {
      let total = 0;
      Object.keys(period).forEach((key) => {
        if (key !== 'period' && typeof period[key] === 'number') {
          total += period[key];
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
    
    const max = Math.max(...cohortData.map((d: any) => d.total_revenue || 0));
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
  }, [allCohortsConfig, showCohortView, aggregationMode, allCohortLabels]);
  
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
  const renderNewReturningLabel = (props: any) => {
    const { x, y, width, height, value, payload, dataKey } = props;
    
    if (!payload || !value || value === 0) return null;
    
    const newRevenue = (payload.new_revenue as number) || 0;
    const returningRevenue = (payload.returning_revenue as number) || 0;
    const total = newRevenue + returningRevenue;
    
    if (total === 0) return null;
    
    const percentage = ((value / total) * 100).toFixed(1);
    const centerX = (x || 0) + (width || 0) / 2;
    
    // For stacked bars, each segment's y and height are relative to that segment only
    // returning_revenue is rendered first (bottom stack), new_revenue is rendered second (top stack)
    if (dataKey === 'returning_revenue') {
      // Bottom segment - show in middle of this segment
      const segmentCenterY = (y || 0) - (height || 0) / 2;
      return (
        <text
          x={centerX}
          y={segmentCenterY}
          fill="#374151"
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
        >
          {formatCurrency(value)} ({percentage}%)
        </text>
      );
    } else if (dataKey === 'new_revenue' && newRevenue > 0) {
      // Top segment - show at top of this segment (which is top of whole bar)
      return (
        <text
          x={centerX}
          y={(y || 0) - 5}
          fill="#374151"
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
        >
          {formatCurrency(value)} ({percentage}%)
        </text>
      );
    }
    
    return null;
  };
  
  // Custom label for total revenue above each bar
  const renderTotalLabel = (props: any) => {
    const { x, y, width, payload, value } = props;
    
    if (!payload || !payload.total_revenue || payload.total_revenue === 0) return null;
    
    const total = payload.total_revenue as number;
    const centerX = (x || 0) + (width || 0) / 2;
    // Position above the bar - y is the top of the bar segment
    const labelY = Math.max((y || 0) - 8, 12); // At least 12px from top of chart
    
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
  const renderBottomLabel = (props: any) => {
    const { x, y, width, payload, value } = props;
    
    if (!payload || !payload.total_revenue || payload.total_revenue === 0) return null;
    
    const total = payload.total_revenue as number;
    const centerX = (x || 0) + (width || 0) / 2;
    // Position below the bar
    const labelY = (y || 0) + 15; // Below the bar
    
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

  // Calculate CAGR (Compound Annual Growth Rate) from cohort revenue data
  // Only uses complete cohorts (excludes pre-2020 and current incomplete year)
  const cagrData = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length < 2) return null;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Get cohort labels based on aggregation mode
    const cohortLabels = new Set<string>();
    cohortsWithData.forEach((cohort) => {
      const label = getCohortLabel(cohort.cohort_month, viewMode, aggregationMode);
      cohortLabels.add(label);
    });
    
    // Filter to only complete cohorts:
    // - Exclude pre-2020 (≤ 2019) and 2019
    // - Exclude current year if incomplete (for annual view)
    // - Exclude current half-year if incomplete (for half-year view)
    const completeCohorts = Array.from(cohortLabels)
      .filter(label => {
        // Exclude pre-2020 and 2019
        if (label.startsWith('≤') || label.includes('Pre-2020')) return false;
        
        if (aggregationMode === 'annual') {
          const year = parseInt(label);
          // Exclude 2019 and earlier, and exclude current year if incomplete
          return year >= 2020 && year < currentYear;
        } else {
          // Half-year view
          const [yearStr, half] = label.split(' ');
          const year = parseInt(yearStr);
          // Exclude 2019 and earlier
          if (year < 2020) return false;
          // Exclude current half-year if incomplete
          if (year === currentYear) {
            const isH1 = half === 'H1';
            const isH2 = half === 'H2';
            // If we're in H1 and this is H1, exclude it (incomplete)
            // If we're in H2 and this is H2, exclude it (incomplete)
            if (currentMonth < 6 && isH1) return false;
            if (currentMonth >= 6 && isH2) return false;
          }
          return year < currentYear || (year === currentYear && ((currentMonth >= 6 && half === 'H1') || (currentMonth < 6)));
        }
      })
      .sort((a, b) => {
        const dateA = parseCohortLabelDate(a, aggregationMode);
        const dateB = parseCohortLabelDate(b, aggregationMode);
        return dateA.getTime() - dateB.getTime();
      });
    
    if (completeCohorts.length < 2) return null;
    
    // Calculate total revenue for first and last complete cohorts
    const firstLabel = completeCohorts[0];
    const lastLabel = completeCohorts[completeCohorts.length - 1];
    
    let firstRevenue = 0;
    let lastRevenue = 0;
    
    cohortsWithData.forEach((cohort) => {
      const label = getCohortLabel(cohort.cohort_month, viewMode, aggregationMode);
      const totalRevenue = cohort.periods.reduce((sum, p) => sum + p.total_revenue, 0);
      
      if (label === firstLabel) {
        firstRevenue += totalRevenue;
      }
      if (label === lastLabel) {
        lastRevenue += totalRevenue;
      }
    });
    
    if (firstRevenue <= 0) return null;
    
    // Calculate years between first and last cohort
    const firstDate = parseCohortLabelDate(firstLabel, aggregationMode);
    const lastDate = parseCohortLabelDate(lastLabel, aggregationMode);
    const yearsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (yearsDiff <= 0) return null;
    
    // CAGR formula: ((Ending Value / Beginning Value) ^ (1 / Number of Years)) - 1
    const cagrValue = (Math.pow(lastRevenue / firstRevenue, 1 / yearsDiff) - 1) * 100;
    
    // Format year range
    let yearRange: string;
    if (aggregationMode === 'annual') {
      const firstYear = parseInt(firstLabel);
      const lastYear = parseInt(lastLabel);
      if (lastYear - firstYear < 10) {
        yearRange = `${firstYear}-${lastYear.toString().slice(-2)}`;
      } else {
        yearRange = `${firstYear}-${lastYear}`;
      }
    } else {
      // Half-year format: "H1 2020-H1 2025"
      const [firstYearStr, firstHalf] = firstLabel.split(' ');
      const [lastYearStr, lastHalf] = lastLabel.split(' ');
      const firstYear = parseInt(firstYearStr);
      const lastYear = parseInt(lastYearStr);
      
      if (firstYear === lastYear && firstHalf === lastHalf) {
        yearRange = `${firstHalf} ${firstYear}`;
      } else {
        yearRange = `${firstHalf} ${firstYear}-${lastHalf} ${lastYear}`;
      }
    }
    
    return {
      value: cagrValue,
      yearRange,
      firstYear: aggregationMode === 'annual' ? parseInt(firstLabel) : parseInt(firstLabel.split(' ')[0]),
      lastYear: aggregationMode === 'annual' ? parseInt(lastLabel) : parseInt(lastLabel.split(' ')[0]),
    };
  }, [cohortsWithData, viewMode, aggregationMode]);

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
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {cagrData.yearRange} CAGR
              </span>
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
                    header.push(config.label || key);
                  }
                });
              } else {
                header.push('New Revenue', 'Returning Revenue');
              }
              header.push('Total');
              csvData.push(header);
              
              // Data rows
              const chartDataToExport = showCohortView ? data : newReturningData;
              if (chartDataToExport && chartDataToExport.length > 0) {
                chartDataToExport.forEach((row: any) => {
                  const csvRow = [row.period || ''];
                  if (showCohortView) {
                    cohortKeys.forEach(key => {
                      const value = row[key];
                      csvRow.push(value !== undefined && value !== null ? Number(value).toFixed(2) : '0.00');
                    });
                  } else {
                    csvRow.push((row.new_revenue || 0).toFixed(2));
                    csvRow.push((row.returning_revenue || 0).toFixed(2));
                  }
                  // Calculate total
                  let total = 0;
                  if (showCohortView) {
                    cohortKeys.forEach(key => {
                      total += Number(row[key] || 0);
                    });
                  } else {
                    total = (row.new_revenue || 0) + (row.returning_revenue || 0);
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
