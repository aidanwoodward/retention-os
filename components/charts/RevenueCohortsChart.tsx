"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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

// Helper function to check if a cohort label represents a pre-2020 cohort (year <= 2019)
// Used consistently for bucketing logic to ensure no overlap
const isPre2020Cohort = (label: string, aggregationMode: 'quarterly' | 'annual'): boolean => {
  if (label.startsWith('≤') || label.includes('Pre-2020') || label.includes('Older')) {
    return true;
  }
  
  try {
    const date = parseCohortLabelDate(label, aggregationMode);
    return date.getFullYear() <= 2019;
  } catch {
    return false;
  }
};

// Transform data for cohort view with quarterly aggregation
const transformCohortData = (
  cohorts: CohortData[], 
  viewMode: 'monthly' | 'quarterly' | 'annual',
  showCohorts: Set<string>,
  historyMode: 'summarised' | 'expanded' = 'summarised'
) => {
  const chartData: Record<string, Record<string, number | string>> = {};
  
  // Determine aggregation mode based on viewMode
  // Always use quarterly buckets for the chart (unless annual is explicitly selected)
  // Monthly view aggregates to quarterly for cleaner visualization
  const aggregationMode: 'quarterly' | 'annual' = 
    viewMode === 'annual' ? 'annual' : 'quarterly';
  
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
  
  // Determine which cohorts to group into "≤ 2019" bucket
  // BUCKETING RULE: Use historyMode to determine grouping behavior
  // - summarised: group ALL cohorts with year <= 2019 into "≤ 2019" bucket, exclude individual <=2019 labels
  // - expanded: show all cohorts individually (including 2019-Qx), NEVER show bucket
  const cutoffYear = 2020;
  let olderCohorts: string[] = [];
  let individualCohorts: string[] = [];
  let olderCohortsLabel: string | null = null;
  
  if (historyMode === 'expanded') {
    // Expanded mode: show all cohorts individually (including 2019-Qx), NEVER show bucket
    individualCohorts = sortedLabels;
    olderCohorts = [];
    olderCohortsLabel = null;
  } else {
    // Summarised mode: group ALL cohorts with year <= 2019 into "≤ 2019" bucket
    // Ensure no overlap: cohorts <= 2019 go ONLY to bucket, cohorts >= 2020 go to individual list
    olderCohorts = sortedLabels.filter(label => isPre2020Cohort(label, aggregationMode));
    individualCohorts = sortedLabels.filter(label => !isPre2020Cohort(label, aggregationMode));
    
    // Only create "≤ 2019" label if there are pre-2020 cohorts AND it's selected in showCohorts
    if (olderCohorts.length > 0 && showCohorts.has(`≤ ${cutoffYear - 1}`)) {
      olderCohortsLabel = `≤ ${cutoffYear - 1}`;
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

// Single neutral grey for quarterly aggregation (simplification)
const QUARTERLY_GREY = "#6b7280"; // gray-500

// Neutral grey palette for board-readable display when >12 cohorts (annual mode only)
// Subtle variations to maintain visual distinction
const GREY_COLOR_PALETTE = [
  "#6b7280", // gray-500
  "#78716c", // stone-600
  "#71717a", // zinc-500
  "#737373", // neutral-500
  "#6b7280", // gray-500 (repeat for cycling)
];

// Get consistent color for a cohort label based on the year/period itself
// This ensures each year always gets the same color, matching filter buttons
const getCohortColor = (label: string, aggregationMode: 'quarterly' | 'annual', minYear?: number): string => {
  // Handle "Older cohorts" or "≤ 2019" labels - always gray
  if (label.startsWith('≤') || label.includes('Pre-2020') || label.includes('Older')) {
    return OLDER_COHORTS_COLOR;
  }
  
  if (aggregationMode === 'annual') {
    // Annual view: each year gets a specific color
    const yearMatch = label.match(/(\d{4})/);
    if (!yearMatch) return COHORT_COLOR_SCALE[0]; // fallback
    
    const year = parseInt(yearMatch[1]);
    
    // Map colors relative to the earliest displayed individual year
    // If minYear is provided, use it; otherwise fall back to 2020 for backward compatibility
    const baseYear = minYear !== undefined ? minYear : 2020;
    const colorIndex = year - baseYear;
    return COHORT_COLOR_SCALE[Math.min(Math.max(colorIndex, 0), COHORT_COLOR_SCALE.length - 1)];
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
  showCohorts: Set<string>,
  historyMode: 'summarised' | 'expanded' = 'summarised',
  displayedPeriodCount: number = 0
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
  
  // Determine which cohorts to group into "≤ 2019" bucket
  // BUCKETING RULE: Use historyMode to determine grouping behavior
  // - summarised: group ALL cohorts with year <= 2019 into "≤ 2019" bucket, exclude individual <=2019 labels
  // - expanded: show all cohorts individually (including 2019-Qx), NEVER show bucket
  const cutoffYear = 2020;
  let olderCohorts: string[] = [];
  let individualCohorts: string[] = [];
  let olderCohortsLabel: string | null = null;
  
  if (historyMode === 'expanded') {
    // Expanded mode: show all cohorts individually (including 2019-Qx), NEVER show bucket
    individualCohorts = sortedLabels;
    olderCohorts = [];
    olderCohortsLabel = null;
  } else {
    // Summarised mode: group ALL cohorts with year <= 2019 into "≤ 2019" bucket
    // Ensure no overlap: cohorts <= 2019 go ONLY to bucket, cohorts >= 2020 go to individual list
    olderCohorts = sortedLabels.filter(label => isPre2020Cohort(label, aggregationMode));
    individualCohorts = sortedLabels.filter(label => !isPre2020Cohort(label, aggregationMode));
    
    // Only create "≤ 2019" label if there are pre-2020 cohorts AND it's selected in showCohorts
    if (olderCohorts.length > 0 && showCohorts.has(`≤ ${cutoffYear - 1}`)) {
      olderCohortsLabel = `≤ ${cutoffYear - 1}`;
    }
  }
  
  // Determine if we should use grey colors
  // V1.1 SIMPLIFICATION: Quarterly aggregation always uses single neutral grey (reduces complexity)
  // Annual aggregation uses period-based logic: <=12 periods = colored, >12 periods = grey
  const useGreyColors = aggregationMode === 'quarterly' 
    ? true  // Quarterly/monthly always grey
    : displayedPeriodCount > 12;  // Annual: period-based logic
  
  // Helper function to get grey color with subtle variation (annual mode only)
  const getGreyColor = (index: number): string => {
    return GREY_COLOR_PALETTE[index % GREY_COLOR_PALETTE.length];
  };
  
  // Add "Older cohorts" config if needed
  if (olderCohortsLabel && olderCohorts.length > 0) {
    if (aggregationMode === 'quarterly') {
      // Quarterly: bucket uses lighter grey
      config[olderCohortsLabel] = {
        label: olderCohortsLabel,
        color: OLDER_COHORTS_COLOR, // #d4d4d4
      };
    } else {
      // Annual: use period-based logic
      config[olderCohortsLabel] = {
        label: olderCohortsLabel,
        color: useGreyColors ? getGreyColor(0) : OLDER_COHORTS_COLOR,
      };
    }
  }
  
  // Calculate minYear from individual cohorts for annual color mapping (ignore bucket labels)
  // This ensures colors are mapped relative to the earliest displayed individual year
  let minYear: number | undefined = undefined;
  if (aggregationMode === 'annual' && individualCohorts.length > 0) {
    const years = individualCohorts
      .map(label => {
        const yearMatch = label.match(/(\d{4})/);
        return yearMatch ? parseInt(yearMatch[1]) : null;
      })
      .filter((year): year is number => year !== null);
    
    if (years.length > 0) {
      minYear = Math.min(...years);
    }
  }
  
  // Assign colors to individual cohorts
  // Quarterly: all cohorts use single neutral grey (#6b7280)
  // Annual: use period-based logic (colored if <=12 periods, grey if >12 periods)
  individualCohorts.forEach((label, index) => {
    let color: string;
    if (aggregationMode === 'quarterly') {
      // Quarterly: single neutral grey for all cohorts
      color = QUARTERLY_GREY; // #6b7280
    } else {
      // Annual: period-based logic
      color = useGreyColors 
        ? getGreyColor(index + (olderCohortsLabel ? 1 : 0))
        : getCohortColor(label, aggregationMode, minYear);
    }
    
    config[label] = {
      label: label,
      color: color,
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
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  // State for limiting x-axis periods (null = show all periods)
  const [periodWindow, setPeriodWindow] = useState<number | null>(null);
  // State for history mode: summarised (bucket pre-2020) or expanded (show all individually)
  const [historyMode, setHistoryMode] = useState<'summarised' | 'expanded'>('summarised');
  
  // Helper: Get default cohort selection based on viewMode
  const getDefaultCohortSelection = useCallback((labels: string[], mode: typeof viewMode): Set<string> => {
    const sortedLabels = [...labels].sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    let defaultSet: Set<string>;
    
    if (mode === 'annual') {
      // Annual: latest 5 cohorts
      defaultSet = new Set(sortedLabels.slice(0, 5));
    } else if (mode === 'quarterly') {
      // Quarterly: latest 12 cohorts
      defaultSet = new Set(sortedLabels.slice(0, 12));
    } else {
      // Monthly: ALL cohorts (no cap)
      defaultSet = new Set(sortedLabels);
    }
    
    // Check if there are pre-2020 cohorts and add ≤ 2019 label if needed
    const cutoffYear = 2020;
    const hasPre2020Cohorts = labels.some(label => {
      try {
        const date = parseCohortLabelDate(label, aggregationMode);
        return date.getFullYear() < cutoffYear;
      } catch {
        return false;
      }
    });
    
    if (hasPre2020Cohorts) {
      const pre2020Label = `≤ ${cutoffYear - 1}`;
      defaultSet.add(pre2020Label);
    }
    
    return defaultSet;
  }, [aggregationMode]);
  
  // Update showCohorts when allCohortLabels or viewMode changes
  // Initialize with cohortType-specific defaults, but ensure ≤ 2019 is included if it exists
  useEffect(() => {
    if (allCohortLabels.length > 0 && !hasUserInteracted) {
      const defaultSelection = getDefaultCohortSelection(allCohortLabels, viewMode);
      setShowCohorts(defaultSelection);
    }
  }, [allCohortLabels, viewMode, hasUserInteracted, getDefaultCohortSelection]);
  
  // Reset hasUserInteracted and periodWindow when viewMode changes to apply new defaults
  useEffect(() => {
    setHasUserInteracted(false);
    setPeriodWindow(null);
  }, [viewMode]);
  

  // Mini cohort selector functions
  const showLatest5 = () => {
    setHasUserInteracted(true);
    const sortedLabels = [...allLegendKeys].sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    // Select exactly 5 cohorts
    const latest5 = new Set(sortedLabels.slice(0, 5));
    
    setShowCohorts(latest5);
    
    // For annual view, set periodWindow to 5 to limit x-axis to last 5 periods
    if (viewMode === 'annual') {
      setPeriodWindow(5);
    } else {
      // For quarterly/monthly, keep existing cohort selection logic (no periodWindow)
      setPeriodWindow(null);
    }
  };

  const showLatest12 = () => {
    setHasUserInteracted(true);
    const sortedLabels = [...allLegendKeys].sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    // Select exactly 12 cohorts
    const latest12 = new Set(sortedLabels.slice(0, 12));
    
    setShowCohorts(latest12);
    
    // For quarterly OR monthly (aggregated to quarterly), set periodWindow to 12 to limit x-axis to last 12 quarter periods
    if (viewMode === 'quarterly' || viewMode === 'monthly') {
      setPeriodWindow(12);
    } else {
      setPeriodWindow(null);
    }
  };

  const showAllLimited = () => {
    setHasUserInteracted(true);
    // Select ALL available cohorts (no cap)
    const allCohorts = new Set(allLegendKeys);
    setShowCohorts(allCohorts);
    // Clear periodWindow to show full history
    setPeriodWindow(null);
  };

  const clearCohorts = () => {
    // Reset to default for current cohortType
    const defaultSelection = getDefaultCohortSelection(allLegendKeys, viewMode);
    setShowCohorts(defaultSelection);
    // Mark as user-interacted to prevent auto-reinitialization after clear
    setHasUserInteracted(true);
    // Clear periodWindow to default behavior
    setPeriodWindow(null);
  };
  
  // Enforce non-overlap: remove 2019-Qx labels when "≤ 2019" bucket is selected in summarised mode
  // In summarised mode, if "≤ 2019" is present, remove all individual 2019-Qx labels
  // In expanded mode, remove "≤ 2019" bucket if present (expanded shows all individually, no bucket)
  const filteredShowCohorts = useMemo(() => {
    if (!showCohortView || showCohorts.size === 0) return showCohorts;
    
    const pre2019Label = '≤ 2019';
    const hasPre2019Bucket = showCohorts.has(pre2019Label);
    const filtered = new Set(showCohorts);
    
    if (historyMode === 'summarised') {
      // Summarised mode: if bucket is present, remove all individual <=2019 labels
      if (hasPre2019Bucket) {
        // Remove all individual 2019-Qx labels to prevent overlap
        filtered.delete('2019-Q1');
        filtered.delete('2019-Q2');
        filtered.delete('2019-Q3');
        filtered.delete('2019-Q4');
        // Also remove any other pre-2020 individual labels
        allCohortLabels.forEach(label => {
          if (isPre2020Cohort(label, aggregationMode) && label !== pre2019Label) {
            filtered.delete(label);
          }
        });
      }
    } else {
      // Expanded mode: remove bucket if present (expanded shows all individually, no bucket)
      if (hasPre2019Bucket) {
        filtered.delete(pre2019Label);
      }
    }
    
    return filtered;
  }, [showCohorts, showCohortView, historyMode, allCohortLabels, aggregationMode]);
  
  // Transform data based on view mode
  const cohortDataRaw = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length === 0) return [];
    let data;
    if (showCohortView && filteredShowCohorts.size > 0) {
      data = transformCohortData(cohortsWithData, viewMode, filteredShowCohorts, historyMode);
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
  }, [cohortsWithData, viewMode, filteredShowCohorts, showCohortView, historyMode]);
  
  // Filter cohortData by periodWindow if set (limit x-axis to last N periods)
  const cohortData = useMemo(() => {
    if (!cohortDataRaw || cohortDataRaw.length === 0) return [];
    if (periodWindow === null) {
      // No period window: show all periods
      return cohortDataRaw;
    }
    
    // Apply period window: show only the last N periods (chronologically)
    // Data is already sorted chronologically (oldest first), so take last N entries
    return cohortDataRaw.slice(-periodWindow);
  }, [cohortDataRaw, periodWindow]);
  
  // Compute displayedPeriodCount from filtered chartData (number of periods/bars on x-axis)
  // This reflects the current viewMode/dateRange selection, aggregation, AND periodWindow filter
  // PERIOD-BASED: Color switching is based on number of displayed periods, not cohort count
  const displayedPeriodCount = useMemo(() => {
    if (!cohortData || cohortData.length === 0) return 0;
    // The length of cohortData is the number of periods (bars) displayed on the x-axis
    return cohortData.length;
  }, [cohortData]);
  
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
  
  // Generate config for visible cohorts only (for chart rendering)
  const cohortConfig = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length === 0) return {};
    if (showCohortView) {
      // generateCohortConfig uses displayedPeriodCount to determine color mode (period-based)
      return generateCohortConfig(cohortsWithData, viewMode, filteredShowCohorts, historyMode, displayedPeriodCount);
    } else {
      return generateNewReturningConfig();
    }
  }, [cohortsWithData, viewMode, filteredShowCohorts, showCohortView, historyMode, displayedPeriodCount]);
  
  // Generate config for ALL cohorts (for legend display)
  const allCohortsConfig = useMemo(() => {
    if (!cohortsWithData || cohortsWithData.length === 0) return {};
    if (showCohortView) {
      // Generate config for legend based on historyMode
      // Summarised: show "≤ 2019" bucket only, no individual 2019-Qx labels
      // Expanded: show all cohorts individually (including 2019-Qx), no bucket
      let legendCohortsSet = new Set(allCohortLabels);
      
      if (historyMode === 'summarised') {
        // Summarised mode: remove individual <=2019 labels, ensure bucket is present if pre-2020 cohorts exist
        const cutoffYear = 2020;
        const hasPre2020Cohorts = allCohortLabels.some(label => {
          try {
            return isPre2020Cohort(label, aggregationMode) && !label.startsWith('≤');
          } catch {
            return false;
          }
        });
        
        // Remove all individual <=2019 labels
        allCohortLabels.forEach(label => {
          if (isPre2020Cohort(label, aggregationMode) && !label.startsWith('≤')) {
            legendCohortsSet.delete(label);
          }
        });
        
        // Add bucket if pre-2020 cohorts exist
        if (hasPre2020Cohorts) {
          legendCohortsSet.add(`≤ ${cutoffYear - 1}`);
        }
      } else {
        // Expanded mode: remove bucket if present, show all individual labels
        legendCohortsSet.delete('≤ 2019');
      }
      
      const config = generateCohortConfig(cohortsWithData, viewMode, legendCohortsSet, historyMode, displayedPeriodCount);
      
      // Legend colors are already set correctly by generateCohortConfig:
      // - Quarterly: always grey (V1.1 simplification)
      // - Annual: grey if >12 periods, colored if <=12 periods
      
      return config;
    } else {
      return generateNewReturningConfig();
    }
  }, [cohortsWithData, viewMode, allCohortLabels, showCohortView, aggregationMode, displayedPeriodCount, historyMode]);
  
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
      // Include all keys that are either in filteredShowCohorts or are the "Older cohorts" label
      if (key.startsWith('≤')) return true;
      return filteredShowCohorts.has(key);
    });
    
    // Sort by cohort date (oldest first)
    const sortedKeys = configKeys.sort((a, b) => {
      const dateA = parseCohortLabelDate(a, aggregationMode);
      const dateB = parseCohortLabelDate(b, aggregationMode);
      return dateA.getTime() - dateB.getTime();
    });
    
    return sortedKeys;
  }, [cohortConfig, showCohortView, filteredShowCohorts, aggregationMode]);
  
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
    <div className="w-full min-w-0 max-w-full bg-white rounded-lg border border-gray-200 shadow-sm p-6 pt-6">
      {/* Title, CAGR, and Export - Now inside the box */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">Revenue Cohort Trends</h3>
            {viewMode === 'monthly' && aggregationMode === 'quarterly' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                  <p className="text-xs">Monthly cohorts are aggregated to quarterly for readability.</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {viewMode === 'monthly' && aggregationMode === 'quarterly' 
              ? 'Distribution of revenue across cohort years (aggregated to quarterly for readability)'
              : 'Distribution of revenue across cohort years'}
          </p>
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
                cagrData.value >= 0 ? 'text-green-600' : 'text-gray-700'
              }`}>
                {cagrData.value >= 0 ? '+' : ''}{cagrData.value.toFixed(1)}%
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
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
                  <span>Export CSV (filtered view)</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                <p className="text-xs">Exports the currently filtered cohort data shown on this page. Calculations and exclusions match on-screen values.</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
        
        {/* Mini cohort selector (only show when in cohort view) */}
        {showCohortView && (
          <div className="flex items-center gap-2">
            <button
              onClick={showLatest5}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Show latest 5
            </button>
            {(viewMode === 'quarterly' || viewMode === 'monthly') && (
              <button
                onClick={showLatest12}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Show latest 12 quarters
              </button>
            )}
            {viewMode !== 'monthly' && (
              <button
                onClick={showAllLimited}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Show all
              </button>
            )}
            <button
              onClick={clearCohorts}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
        
        {/* History mode toggle (only show when in cohort view) */}
        {showCohortView && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
            <span className="text-xs font-medium text-gray-600">History:</span>
            <button
              onClick={() => setHistoryMode('summarised')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                historyMode === 'summarised'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Summarised
            </button>
            <button
              onClick={() => setHistoryMode('expanded')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                historyMode === 'expanded'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Expanded
            </button>
          </div>
        )}
        
        {/* Cohort legend (only show when in cohort view) - ordered oldest → newest */}
        {showCohortView && (
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="flex items-center gap-2 flex-nowrap min-w-fit">
              {allLegendKeys.map((key) => {
                const config = allCohortsConfig[key];
                if (!config) return null;
                
                return (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-50 border border-gray-200 text-gray-700 flex-shrink-0"
                  >
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0 border border-gray-300"
                      style={{ 
                        backgroundColor: config.color || '#9ca3af'
                      }}
                    />
                    <span className="text-gray-700 whitespace-nowrap">
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Chart with gradient background */}
      <div className="relative bg-gradient-to-b from-gray-50/50 to-transparent rounded-lg border border-gray-200 p-4 overflow-x-auto min-w-0">
        <div className="min-w-fit">
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
    </div>
  );
}
