"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { retentionCurvesFilters, retentionCurvesSearch } from "@/lib/filters/config";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { LoadingButton } from "@/components/ui/loading-buttons";
import { useSearchParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  AlertTriangle,
  Download,
  Users,
  Crown,
  Info,
  LineChart,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterValue } from "@/lib/filters/types";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChartErrorBoundary } from "@/components/charts/ChartErrorBoundary";

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

interface CohortsResponse {
  success: boolean;
  data: {
    cohorts: CohortData[];
    total_cohorts: number;
    calculated_at: string;
  };
  error?: string;
}

interface RetentionPeriodData {
  period: number;
  periodLabel: string;
  cohortSize: number;
  activeCustomers: number;
  retentionRate: number;
  revenue: number;
  revenueRetention: number;
}

interface CohortCurveData {
  cohortLabel: string;
  cohortMonth: string;
  cohortSize: number;
  periods: Array<{
    period: number;
    periodLabel: string;
    customerRetention: number;
    revenueRetention: number;
    isDataGap?: boolean; // True if this period has missing/unconfirmed data
  }>;
}

const chartConfig = {
  retention: {
    label: "Retention Rate",
    color: "hsl(221.2 83.2% 53.3%)", // blue-600
  },
} satisfies ChartConfig;

export default function RetentionCurvesPage() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<Record<string, FilterValue>>({});
  const [retentionType, setRetentionType] = useState<'customer' | 'revenue'>('customer');
  const [viewMode, setViewMode] = useState<'aggregated' | 'cohort'>('aggregated');
  const [hoveredCohort, setHoveredCohort] = useState<string | null>(null);
  const [showCohorts, setShowCohorts] = useState<Set<string>>(new Set());
  const [cohortSearchQuery, setCohortSearchQuery] = useState<string>("");
  const [activeCohortKey, setActiveCohortKey] = useState<string | null>(null);
  const [chartError, setChartError] = useState<Error | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Debounce timer for hover highlight (anti-flicker)
  const hoverDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Use a ref to track the last query string to prevent infinite loops
  const lastQueryStringRef = React.useRef<string>('');

  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      const queryString = searchParams.toString();
      
      if (queryString === lastQueryStringRef.current) {
        setLoading(false);
        setError(null);
        return;
      }
      
      lastQueryStringRef.current = queryString;
      
      const response = await fetch(`/api/metrics/cohorts?${queryString}`);
      const data: CohortsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cohorts');
      }

      setCohorts(data.data.cohorts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cohorts');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  // Extract date range from URL params with validation
  const dateRange = React.useMemo(() => {
    const dateRangeParam = searchParams.get('dateRange');
    if (!dateRangeParam) return null;
    
    const parts = dateRangeParam.split(':');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const fromDate = new Date(parts[0]);
      const toDate = new Date(parts[1]);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return null;
      }
      
      return { from: fromDate, to: toDate };
    }
    return null;
  }, [searchParams]);

  // Helper: Check if a date falls within date range
  const isDateInRange = React.useCallback((date: Date, range: { from: Date; to: Date } | null): boolean => {
    if (!range) return true;
    if (isNaN(date.getTime()) || isNaN(range.from.getTime()) || isNaN(range.to.getTime())) {
      return false;
    }
    return date >= range.from && date <= range.to;
  }, []);

  // Filter cohorts by date range (same logic as Revenue Cohorts)
  const filteredCohorts = React.useMemo(() => {
    if (!dateRange) return cohorts;
    
    const filtered = cohorts.map(cohort => ({
      ...cohort,
      periods: cohort.periods.filter(period => {
        const orderDate = new Date(period.order_month);
        return isDateInRange(orderDate, dateRange);
      })
    })).filter(cohort => cohort.periods.length > 0);
    
    if (filtered.length === 0 && cohorts.length > 0) {
      let closestCohort = cohorts[0];
      let minDistance = Infinity;
      
      cohorts.forEach(cohort => {
        cohort.periods.forEach(period => {
          const orderDate = new Date(period.order_month);
          const distance = Math.min(
            Math.abs(orderDate.getTime() - dateRange.from.getTime()),
            Math.abs(orderDate.getTime() - dateRange.to.getTime())
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestCohort = cohort;
          }
        });
      });
      
      return [{
        ...closestCohort,
        periods: closestCohort.periods.filter(period => {
          const orderDate = new Date(period.order_month);
          const extendedFrom = new Date(dateRange.from.getTime() - 30 * 24 * 60 * 60 * 1000);
          const extendedTo = new Date(dateRange.to.getTime() + 30 * 24 * 60 * 60 * 1000);
          return orderDate >= extendedFrom && orderDate <= extendedTo;
        })
      }].filter(c => c.periods.length > 0);
    }
    
    return filtered;
  }, [cohorts, dateRange, isDateInRange]);

  // Get cohort type from URL (default to annual)
  const cohortType = React.useMemo(() => {
    const type = searchParams.get('cohortType');
    if (type && ['monthly', 'quarterly', 'half-year', 'annual'].includes(type)) {
      return type as 'monthly' | 'quarterly' | 'half-year' | 'annual';
    }
    return 'annual';
  }, [searchParams]);

  // Helper: Generate cohort label based on cohort type
  const getCohortLabel = React.useCallback((cohortMonth: string): string => {
    const cohortDate = new Date(cohortMonth);
    const year = cohortDate.getFullYear();
    
    if (cohortType === 'annual') {
      return year.toString();
    } else if (cohortType === 'quarterly') {
      const quarter = Math.floor(cohortDate.getMonth() / 3) + 1;
      return `${year}-Q${quarter}`;
    } else if (cohortType === 'half-year') {
      const half = cohortDate.getMonth() < 6 ? 'H1' : 'H2';
      return `${year} ${half}`;
    } else {
      // monthly
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[cohortDate.getMonth()];
      return `${month} ${year}`;
    }
  }, [cohortType]);

  // Helper: Convert period_number (months) to the appropriate period based on cohortType
  const convertPeriodNumber = React.useCallback((periodNumberMonths: number): number => {
    if (cohortType === 'annual') {
      return Math.floor(periodNumberMonths / 12); // Convert months to years
    } else if (cohortType === 'quarterly') {
      return Math.floor(periodNumberMonths / 3); // Convert months to quarters
    } else if (cohortType === 'half-year') {
      return Math.floor(periodNumberMonths / 6); // Convert months to half-years
    } else {
      return periodNumberMonths; // Monthly stays as months
    }
  }, [cohortType]);

  // Helper: Generate period label
  const getPeriodLabel = React.useCallback((periodNum: number): string => {
    if (cohortType === 'annual') {
      return periodNum === 0 ? 'Year 0' : `Year ${periodNum}`;
    } else if (cohortType === 'quarterly') {
      return `Q${periodNum}`;
    } else if (cohortType === 'half-year') {
      return periodNum === 0 ? 'H1' : `H${periodNum + 1}`;
    } else {
      return `Month ${periodNum}`;
    }
  }, [cohortType]);

  // Calculate max possible period based on oldest cohort (shared logic)
  const maxPossiblePeriod = React.useMemo(() => {
    if (filteredCohorts.length === 0) return 0;
    
    const oldestCohortDate = filteredCohorts.reduce((oldest, cohort) => {
      const cohortDate = new Date(cohort.cohort_month);
      return cohortDate < oldest ? cohortDate : oldest;
    }, new Date(filteredCohorts[0].cohort_month));

    const currentDate = new Date();
    
    if (cohortType === 'annual') {
      const yearsSinceOldest = currentDate.getFullYear() - oldestCohortDate.getFullYear();
      return Math.max(0, yearsSinceOldest);
    } else if (cohortType === 'quarterly') {
      const monthsSinceOldest = (currentDate.getFullYear() - oldestCohortDate.getFullYear()) * 12 + 
                                 (currentDate.getMonth() - oldestCohortDate.getMonth());
      return Math.max(0, Math.floor(monthsSinceOldest / 3));
    } else if (cohortType === 'half-year') {
      const monthsSinceOldest = (currentDate.getFullYear() - oldestCohortDate.getFullYear()) * 12 + 
                                 (currentDate.getMonth() - oldestCohortDate.getMonth());
      return Math.max(0, Math.floor(monthsSinceOldest / 6));
    } else {
      const monthsSinceOldest = (currentDate.getFullYear() - oldestCohortDate.getFullYear()) * 12 + 
                                 (currentDate.getMonth() - oldestCohortDate.getMonth());
      return Math.max(0, monthsSinceOldest);
    }
  }, [filteredCohorts, cohortType]);

  // Compute aggregated retention curve data
  const retentionCurveData = React.useMemo((): RetentionPeriodData[] => {
    if (filteredCohorts.length === 0) return [];

    // Calculate total cohort size at period 0 (sum of all cohort_size)
    let totalCohortSize = 0;
    filteredCohorts.forEach(cohort => {
      totalCohortSize += cohort.cohort_size;
    });

    // Aggregate data by converted period number (not raw month period_number)
    const periodMap = new Map<number, {
      activeCustomers: number;
      revenue: number;
    }>();

    filteredCohorts.forEach(cohort => {
      cohort.periods.forEach(period => {
        // Convert period_number (months) to the appropriate period based on cohortType
        const convertedPeriod = convertPeriodNumber(period.period_number);
        
        // Only include periods up to maxPossiblePeriod
        if (convertedPeriod <= maxPossiblePeriod) {
          if (!periodMap.has(convertedPeriod)) {
            periodMap.set(convertedPeriod, {
              activeCustomers: 0,
              revenue: 0,
            });
          }
          const periodData = periodMap.get(convertedPeriod)!;
          periodData.activeCustomers += period.active_customers;
          periodData.revenue += period.total_revenue;
        }
      });
    });

    // Get period 0 data for baseline calculations
    const period0Data = periodMap.get(0);
    if (!period0Data || totalCohortSize === 0) return [];

    // Period 0 baseline: active customers and revenue at period 0
    const period0Customers = period0Data.activeCustomers;
    const period0Revenue = period0Data.revenue;

    // Generate retention curve data for all periods from 0 to maxPossiblePeriod
    // Include ALL periods (0 through maxPossiblePeriod) so X-axis is consistent
    const curveData: RetentionPeriodData[] = [];

    for (let periodNum = 0; periodNum <= maxPossiblePeriod; periodNum++) {
      const periodData = periodMap.get(periodNum);
      
      // Period 0 should always be 100% (baseline)
      if (periodNum === 0) {
        curveData.push({
          period: 0,
          periodLabel: getPeriodLabel(0),
          cohortSize: totalCohortSize,
          activeCustomers: period0Customers,
          retentionRate: 100, // Always 100% at baseline
          revenue: period0Revenue,
          revenueRetention: 100, // Always 100% at baseline
        });
        continue;
      }

      // For other periods, use actual data or show 0% if no data
      if (!periodData) {
        // No data for this period - still include it with 0% to maintain X-axis consistency
        curveData.push({
          period: periodNum,
          periodLabel: getPeriodLabel(periodNum),
          cohortSize: totalCohortSize,
          activeCustomers: 0,
          retentionRate: 0,
          revenue: 0,
          revenueRetention: 0,
        });
        continue;
      }

      const retentionRate = period0Customers > 0 
        ? (periodData.activeCustomers / period0Customers) * 100 
        : 0;
      
      const revenueRetention = period0Revenue > 0 
        ? (periodData.revenue / period0Revenue) * 100 
        : 0;

      curveData.push({
        period: periodNum,
        periodLabel: getPeriodLabel(periodNum),
        cohortSize: totalCohortSize, // Total users entering (same for all periods)
        activeCustomers: periodData.activeCustomers,
        retentionRate,
        revenue: periodData.revenue,
        revenueRetention,
      });
    }

    return curveData.sort((a, b) => a.period - b.period);
  }, [filteredCohorts, cohortType, convertPeriodNumber, getPeriodLabel, maxPossiblePeriod]);

  // Get all unique cohort labels
  const allCohortLabels = React.useMemo(() => {
    const labels = new Set<string>();
    filteredCohorts.forEach(cohort => {
      const label = getCohortLabel(cohort.cohort_month);
      labels.add(label);
    });
    return Array.from(labels).sort((a, b) => {
      // Sort chronologically
      const yearA = parseInt(a.match(/\d{4}/)?.[0] || '1900');
      const yearB = parseInt(b.match(/\d{4}/)?.[0] || '1900');
      return yearA - yearB;
    });
  }, [filteredCohorts, getCohortLabel]);

  // URL State Persistence: Hydrate from URL on mount
  React.useEffect(() => {
    const typeParam = searchParams.get('type');
    const viewParam = searchParams.get('view');
    const cohortsParam = searchParams.get('cohorts');
    const selParam = searchParams.get('sel');
    const qParam = searchParams.get('q');
    
    // Restore retention type
    if (typeParam === 'customer' || typeParam === 'revenue') {
      setRetentionType(typeParam);
    }
    
    // Restore view mode
    if (viewParam === 'aggregated' || viewParam === 'cohort') {
      setViewMode(viewParam);
    }
    
    // Restore cohort search query
    if (qParam) {
      setCohortSearchQuery(qParam);
    }
    
    // Restore cohort selection
    let cohortsToRestore: Set<string> = new Set();
    
    if (selParam) {
      // Load from localStorage using hash key
      try {
        const stored = localStorage.getItem(`retention_sel_${selParam}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          cohortsToRestore = new Set(parsed);
        }
      } catch (e) {
        console.warn('Failed to restore cohort selection from localStorage', e);
      }
    }
    
    if (cohortsParam) {
      // Parse comma-separated or range format (e.g., "2019-2025" or "2019,2020,2021")
      const cohorts = cohortsParam.split(',').flatMap(c => {
        if (c.includes('-')) {
          // Range format: "2019-2025"
          const [start, end] = c.split('-').map(n => parseInt(n.trim()));
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
          }
        }
        return [c.trim()];
      }).filter(Boolean);
      
      cohortsToRestore = new Set([...cohortsToRestore, ...cohorts]);
    }
    
    if (cohortsToRestore.size > 0 && allCohortLabels.length > 0) {
      // Only restore cohorts that actually exist
      const validCohorts = new Set(
        Array.from(cohortsToRestore).filter(c => allCohortLabels.includes(c))
      );
      if (validCohorts.size > 0) {
        setShowCohorts(validCohorts);
      }
    } else if (allCohortLabels.length > 0 && showCohorts.size === 0) {
      // Default: show all if no URL state
      setShowCohorts(new Set(allCohortLabels));
    }
  }, [searchParams]); // Only run on mount/URL change, not on every state change

  // URL State Persistence: Update URL when state changes
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update type
    if (retentionType === 'customer') {
      params.delete('type');
    } else {
      params.set('type', retentionType);
    }
    
    // Update view
    if (viewMode === 'aggregated') {
      params.delete('view');
    } else {
      params.set('view', viewMode);
    }
    
    // Update search query
    if (cohortSearchQuery.trim()) {
      params.set('q', cohortSearchQuery.trim());
    } else {
      params.delete('q');
    }
    
    // Update cohort selection (with localStorage fallback for long lists)
    const cohortsArray = Array.from(showCohorts);
    
    if (cohortsArray.length > 20) {
      // Store full selection in localStorage, use hash in URL
      const hash = btoa(JSON.stringify(cohortsArray)).slice(0, 16);
      try {
        localStorage.setItem(`retention_sel_${hash}`, JSON.stringify(cohortsArray));
        params.set('sel', hash);
        params.delete('cohorts'); // Don't put all cohorts in URL
      } catch (e) {
        console.warn('Failed to store cohort selection in localStorage', e);
        // Fallback: put first 20 in URL
        params.set('cohorts', cohortsArray.slice(0, 20).join(','));
        params.delete('sel');
      }
    } else if (cohortsArray.length > 0) {
      // Try compact range format if cohorts are continuous
      const sorted = [...cohortsArray].sort((a, b) => {
        const yearA = parseInt(a.match(/\d{4}/)?.[0] || '0');
        const yearB = parseInt(b.match(/\d{4}/)?.[0] || '0');
        return yearA - yearB;
      });
      
      // Check if continuous range
      let isContinuous = true;
      for (let i = 1; i < sorted.length; i++) {
        const prevYear = parseInt(sorted[i - 1].match(/\d{4}/)?.[0] || '0');
        const currYear = parseInt(sorted[i].match(/\d{4}/)?.[0] || '0');
        if (currYear !== prevYear + 1) {
          isContinuous = false;
          break;
        }
      }
      
      if (isContinuous && sorted.length > 2) {
        const startYear = sorted[0].match(/\d{4}/)?.[0];
        const endYear = sorted[sorted.length - 1].match(/\d{4}/)?.[0];
        if (startYear && endYear) {
          params.set('cohorts', `${startYear}-${endYear}`);
        } else {
          params.set('cohorts', cohortsArray.join(','));
        }
      } else {
        params.set('cohorts', cohortsArray.join(','));
      }
      params.delete('sel');
    } else {
      params.delete('cohorts');
      params.delete('sel');
    }
    
    // Update URL without adding to history (use replace)
    // Only update if params actually changed to avoid infinite loops
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    const currentUrl = window.location.search;
    if (newUrl !== window.location.pathname + currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [retentionType, viewMode, cohortSearchQuery, showCohorts, router]);

  // Hover highlight handlers with debounce (anti-flicker)
  const handleCohortHover = React.useCallback((cohortKey: string | null) => {
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }
    hoverDebounceRef.current = setTimeout(() => {
      setActiveCohortKey(cohortKey);
    }, 120); // 120ms debounce
  }, []);
  
  const handleCohortHoverLeave = React.useCallback(() => {
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }
    hoverDebounceRef.current = setTimeout(() => {
      setActiveCohortKey(null);
    }, 120);
  }, []);

  // Toggle cohort visibility
  const toggleCohort = React.useCallback((label: string) => {
    setShowCohorts((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  // Filtered cohort labels based on search
  const filteredCohortLabels = React.useMemo(() => {
    if (!cohortSearchQuery.trim()) return allCohortLabels;
    const query = cohortSearchQuery.toLowerCase().trim();
    return allCohortLabels.filter(label => 
      label.toLowerCase().includes(query)
    );
  }, [allCohortLabels, cohortSearchQuery]);

  // Quick actions for cohort selection
  const showLatest6 = React.useCallback(() => {
    const sorted = [...allCohortLabels].sort((a, b) => {
      const yearA = parseInt(a.match(/\d{4}/)?.[0] || '1900');
      const yearB = parseInt(b.match(/\d{4}/)?.[0] || '1900');
      return yearB - yearA; // Descending (newest first)
    });
    setShowCohorts(new Set(sorted.slice(0, 6)));
  }, [allCohortLabels]);

  const showAllLimited = React.useCallback(() => {
    setShowCohorts(new Set(allCohortLabels.slice(0, 20)));
  }, [allCohortLabels]);

  const clearCohorts = React.useCallback(() => {
    setShowCohorts(new Set());
  }, []);

  // Compute cohort-by-cohort retention curve data
  // Group cohorts by their label (e.g., all 2019 months → one "2019" cohort)
  const cohortCurvesData = React.useMemo((): CohortCurveData[] => {
    if (filteredCohorts.length === 0) return [];

    // Group cohorts by their cohort label
    const cohortGroups = new Map<string, typeof filteredCohorts>();
    
    filteredCohorts.forEach(cohort => {
      const label = getCohortLabel(cohort.cohort_month);
      if (!cohortGroups.has(label)) {
        cohortGroups.set(label, []);
      }
      cohortGroups.get(label)!.push(cohort);
    });

    // Process each group into a single cohort curve, filtering by showCohorts
    return Array.from(cohortGroups.entries())
      .filter(([cohortLabel]) => showCohorts.has(cohortLabel))
      .map(([cohortLabel, groupCohorts]) => {
      // Aggregate all periods from all cohorts in this group
      const aggregatedPeriodMap = new Map<number, {
        activeCustomers: number;
        revenue: number;
      }>();

      let totalCohortSize = 0;
      let earliestCohortMonth = groupCohorts[0].cohort_month;
      let period0Customers = 0;
      let period0Revenue = 0;

      groupCohorts.forEach(cohort => {
        totalCohortSize += cohort.cohort_size;
        
        // Track earliest cohort month for sorting
        if (new Date(cohort.cohort_month) < new Date(earliestCohortMonth)) {
          earliestCohortMonth = cohort.cohort_month;
        }

        // Find period 0 data for this cohort and aggregate baseline
        const period0 = cohort.periods.find(p => p.period_number === 0);
        if (period0) {
          period0Customers += period0.active_customers;
          period0Revenue += period0.total_revenue;
        }

        // Aggregate periods by converted period number
        cohort.periods.forEach(period => {
          const convertedPeriod = convertPeriodNumber(period.period_number);
          // Only include periods up to maxPossiblePeriod
          if (convertedPeriod <= maxPossiblePeriod) {
            if (!aggregatedPeriodMap.has(convertedPeriod)) {
              aggregatedPeriodMap.set(convertedPeriod, {
                activeCustomers: 0,
                revenue: 0,
              });
            }
            const periodData = aggregatedPeriodMap.get(convertedPeriod)!;
            periodData.activeCustomers += period.active_customers;
            periodData.revenue += period.total_revenue;
          }
        });
      });

      // Check if we have valid baseline data
      if (period0Customers === 0 || totalCohortSize === 0) {
        return {
          cohortLabel,
          cohortMonth: earliestCohortMonth,
          cohortSize: totalCohortSize,
          periods: [],
        };
      }

      // Generate periods array from 0 to maxPossiblePeriod
      // Handle data gaps: if 0% is followed by non-zero data later, mark as gap
      const periods: Array<{
        period: number;
        periodLabel: string;
        customerRetention: number;
        revenueRetention: number;
        isDataGap?: boolean;
      }> = [];

      // First pass: collect all periods and identify potential gaps
      const allPeriodsData: Array<{
        period: number;
        customerRetention: number;
        revenueRetention: number;
        hasData: boolean;
      }> = [];

      for (let periodNum = 0; periodNum <= maxPossiblePeriod; periodNum++) {
        const periodData = aggregatedPeriodMap.get(periodNum);
        let customerRetention = 0;
        let revenueRetention = 0;
        const hasData = periodData !== undefined;

        if (periodData) {
          customerRetention = period0Customers > 0
            ? (periodData.activeCustomers / period0Customers) * 100
            : 0;
          
          revenueRetention = period0Revenue > 0
            ? (periodData.revenue / period0Revenue) * 100
            : 0;
        }

        allPeriodsData.push({
          period: periodNum,
          customerRetention,
          revenueRetention,
          hasData,
        });
      }

      // Second pass: identify gaps (0% or missing data followed by non-zero data)
      let lastNonZeroPeriod = -1;
      let hasFutureNonZero = false;

      // Check if there's any non-zero data after each period
      for (let i = 0; i < allPeriodsData.length; i++) {
        const current = allPeriodsData[i];
        
        // Period 0 should always be 100% (baseline)
        if (current.period === 0) {
          periods.push({
            period: 0,
            periodLabel: getPeriodLabel(0),
            customerRetention: 100,
            revenueRetention: 100,
            isDataGap: false,
          });
          lastNonZeroPeriod = 0;
          continue;
        }

        // Check if there's non-zero data in future periods
        hasFutureNonZero = false;
        for (let j = i + 1; j < allPeriodsData.length; j++) {
          const future = allPeriodsData[j];
          const futureRetention = retentionType === 'customer' 
            ? future.customerRetention 
            : future.revenueRetention;
          if (futureRetention > 0) {
            hasFutureNonZero = true;
            break;
          }
        }

        // Determine if this is a data gap
        // A gap is: 0% retention (or missing data) that's followed by non-zero data later
        const currentRetention = retentionType === 'customer' 
          ? current.customerRetention 
          : current.revenueRetention;
        const isZeroOrMissing = currentRetention === 0 || !current.hasData;
        const isDataGap = isZeroOrMissing && hasFutureNonZero && lastNonZeroPeriod >= 0;

        // If retention is 0% and no future non-zero data, stop here (trailing zeros)
        // BUT: if this is period 0, we should always include it
        if (isZeroOrMissing && !hasFutureNonZero && lastNonZeroPeriod >= 0 && current.period > 0) {
          break;
        }

        // Track if this period has non-zero retention
        if (current.customerRetention > 0 || current.revenueRetention > 0) {
          lastNonZeroPeriod = current.period;
        }

        periods.push({
          period: current.period,
          periodLabel: getPeriodLabel(current.period),
          customerRetention: current.customerRetention,
          revenueRetention: current.revenueRetention,
          isDataGap: isDataGap || false,
        });
      }

      return {
        cohortLabel,
        cohortMonth: earliestCohortMonth,
        cohortSize: totalCohortSize,
        periods,
      };
    }).sort((a, b) => {
      // Sort chronologically (oldest first)
      return new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime();
    });
  }, [filteredCohorts, getCohortLabel, getPeriodLabel, convertPeriodNumber, maxPossiblePeriod, showCohorts]);

  // Helper: Parse retention value robustly (handles revenue ratios, percentages, currency, etc.)
  const parseRetentionValue = React.useCallback((raw: unknown, retentionType: 'customer' | 'revenue'): { kind: "missing" | "zero" | "value"; value: number | null } => {
    // Missing: null/undefined/""/"—"/"-" → null with kind "missing"
    if (raw === null || raw === undefined) return { kind: "missing", value: null };
    
    if (typeof raw === "string") {
      const s = raw.trim();
      if (s === "" || s === "—" || s === "-") return { kind: "missing", value: null };
      
      // Strip formatting: %, commas, currency symbols ($, £, €)
      const cleaned = s
        .replace(/%/g, "")
        .replace(/,/g, "")
        .replace(/[$£€]/g, "")
        .trim();
      
      const n = Number(cleaned);
      if (!Number.isFinite(n)) return { kind: "missing", value: null };
      
      // Revenue-specific: handle ratios (e.g., 1.12 = 112%)
      // If revenue retention is a ratio (common), normalize to percent
      // Check if value looks like a ratio (between 0 and 5, typically 0-2 for retention)
      let finalValue = n;
      if (retentionType === 'revenue' && n > 0 && n <= 5) {
        // Likely a ratio - convert to percent
        finalValue = n * 100;
      }
      
      return { kind: finalValue === 0 ? "zero" : "value", value: finalValue };
    }
    
    const n = Number(raw);
    if (!Number.isFinite(n)) return { kind: "missing", value: null };
    
    // Revenue-specific: handle ratios
    let finalValue = n;
    if (retentionType === 'revenue' && n > 0 && n <= 5) {
      // Likely a ratio - convert to percent
      finalValue = n * 100;
    }
    
    return { kind: finalValue === 0 ? "zero" : "value", value: finalValue };
  }, []);

  // Helper: Classify values to distinguish true zeros from missing (legacy - uses parseRetentionValue)
  const classifyValue = React.useCallback((raw: unknown): { kind: "missing" | "zero" | "value"; value: number | null } => {
    // Use parseRetentionValue with customer retention type for backward compatibility
    // This will be replaced with parseRetentionValue calls that include retentionType
    return parseRetentionValue(raw, 'customer');
  }, [parseRetentionValue]);

  // Helper: Parse values to numbers, handling strings with % signs
  const toNumber = React.useCallback((v: unknown): number => {
    const classified = classifyValue(v);
    return classified.kind === "missing" ? NaN : classified.value ?? NaN;
  }, [classifyValue]);

  // Normalize and clean cohort curves data
  const normalizedCohortCurvesData = React.useMemo(() => {
    if (cohortCurvesData.length === 0) return [];

    return cohortCurvesData.map(cohort => {
      // Normalize periods: ensure numeric values, filter invalid, sort by periodNum
      const normalizedPeriods = cohort.periods
        .map(p => {
          const periodNum = toNumber(p.period);
          const retentionRaw = retentionType === 'customer' 
            ? p.customerRetention
            : p.revenueRetention;
          
          // Use parseRetentionValue with correct retentionType for proper parsing
          const retentionClassified = parseRetentionValue(retentionRaw, retentionType);
          
          // DEV-ONLY: Targeted logging for revenue retention at Period 4
          if (process.env.NODE_ENV !== 'production' && retentionType === 'revenue' && periodNum === 4) {
            console.log(`🔍 Revenue Retention Period 4 Debug:`, {
              cohortKey: cohort.cohortLabel,
              periodNum,
              rawValue: retentionRaw,
              rawType: typeof retentionRaw,
              parsedValue: retentionClassified.value,
              retentionKind: retentionClassified.kind,
            });
          }
          
          // Filter out invalid period numbers
          if (!Number.isFinite(periodNum)) {
            return null;
          }
          
          // Only include points that have valid retention (missing is excluded)
          if (retentionClassified.kind === "missing") {
            return null;
          }
          
          // CRITICAL: Ensure value is finite - if not, treat as missing
          const retentionValue = retentionClassified.value ?? 0;
          if (!Number.isFinite(retentionValue)) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`⚠️ Non-finite retention value detected:`, {
                cohortKey: cohort.cohortLabel,
                periodNum,
                rawValue: retentionRaw,
                parsedValue: retentionValue,
              });
            }
            return null;
          }
          
          return {
            periodNum,
            retention: retentionValue,
            retentionKind: retentionClassified.kind as "zero" | "value",
            periodLabel: p.periodLabel,
            isDataGap: p.isDataGap || false,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => a.periodNum - b.periodNum);

      return {
        cohortKey: cohort.cohortLabel,
        cohortMonth: cohort.cohortMonth,
        cohortSize: cohort.cohortSize,
        points: normalizedPeriods,
      };
    }).filter(cohort => cohort.points.length >= 2); // Only keep cohorts with at least 2 points
  }, [cohortCurvesData, retentionType, parseRetentionValue, toNumber]);

  // Determine which cohorts to plot (limit to 10 newest if more than 10 selected)
  const plottedCohorts = React.useMemo(() => {
    const selected = normalizedCohortCurvesData.filter(c => showCohorts.has(c.cohortKey));
    if (selected.length <= 10) return selected;
    
    // Sort by cohort year (newest first) and take top 10
    const sorted = [...selected].sort((a, b) => {
      const yearA = parseInt(a.cohortKey.match(/\d{4}/)?.[0] || '1900');
      const yearB = parseInt(b.cohortKey.match(/\d{4}/)?.[0] || '1900');
      return yearB - yearA; // Descending (newest first)
    });
    
    return sorted.slice(0, 10);
  }, [normalizedCohortCurvesData, showCohorts]);

  // Debug logs: Year 4 specific inspection (mandatory for debugging)
  React.useEffect(() => {
    if (normalizedCohortCurvesData.length > 0) {
      console.log("=== RETENTION CURVES DEBUG (Year 4 Focus) ===");
      console.log("Number of cohorts:", normalizedCohortCurvesData.length);
      console.log("Retention Type:", retentionType);
      console.log("Max Possible Period:", maxPossiblePeriod);
      
      // Year 4 specific inspection
      const year4PeriodNum = 4;
      normalizedCohortCurvesData.forEach(cohort => {
        const cohortKey = cohort.cohortKey;
        const year4Point = cohort.points.find(p => p.periodNum === year4PeriodNum);
        
        console.group(`Cohort ${cohortKey} - Year 4 (periodNum=${year4PeriodNum})`);
        if (year4Point) {
          console.log("✅ Year 4 data exists:", {
            periodNum: year4Point.periodNum,
            retention: year4Point.retention,
            retentionKind: year4Point.retentionKind,
            periodLabel: year4Point.periodLabel,
          });
        } else {
          console.log("❌ Year 4 data MISSING (will show as null/— in table)");
        }
        
        // Show all points for this cohort
        console.log("All points:", cohort.points.map(p => ({
          periodNum: p.periodNum,
          retention: p.retention,
          retentionKind: p.retentionKind,
        })));
        console.groupEnd();
      });
      
      console.log("==============================");
    }
  }, [normalizedCohortCurvesData, retentionType, maxPossiblePeriod]);

  // Track revival events (accessible to tooltip)
  const revivalEventsRef = React.useRef<Array<{
    cohortKey: string;
    fromPeriod: number;
    toPeriod: number;
    fromValue: number;
    toValue: number;
    reason: string;
  }>>([]);

  // Prepare multi-line chart data for cohort view (wide format) with revival detection
  // CRITICAL: Use same period list as table to ensure parity (0 to maxPossiblePeriod)
  const cohortChartData = React.useMemo(() => {
    if (normalizedCohortCurvesData.length === 0) return [];

    // Use ALL periods from 0 to maxPossiblePeriod (same as table) to ensure alignment
    // This is the single source of truth for period indexing
    const sortedPeriods = Array.from({ length: maxPossiblePeriod + 1 }, (_, i) => i);

    // Track revival events per cohort for debugging and tooltip
    const revivalEvents: Array<{
      cohortKey: string;
      fromPeriod: number;
      toPeriod: number;
      fromValue: number;
      toValue: number;
      reason: string;
    }> = [];

    // Build wide-format chartData: one row per periodNum
    // Also store retentionKind metadata for ZeroDot rendering
    const chartData = sortedPeriods.map(periodNum => {
      const row: Record<string, number | null> = { periodNum };
      const metadataRow: Record<string, "zero" | "value" | "missing"> = {};

      normalizedCohortCurvesData.forEach(cohort => {
        const key = String(cohort.cohortKey);
        const point = cohort.points.find(pt => pt.periodNum === periodNum);
        
        if (point) {
          // Solid line: real retention value (will break at discontinuities)
          // CRITICAL: Ensure value is finite - if not, treat as missing to prevent crashes
          const retentionValue = point.retention;
          if (Number.isFinite(retentionValue)) {
            row[key] = retentionValue;
            metadataRow[key] = point.retentionKind;
          } else {
            // Non-finite value - treat as missing to prevent crashes
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`⚠️ Non-finite retention value in chart data:`, {
                cohortKey: key,
                periodNum,
                retentionValue,
                retentionKind: point.retentionKind,
              });
            }
            row[key] = null;
            metadataRow[key] = "missing";
          }
        } else {
          row[key] = null;
          metadataRow[key] = "missing";
        }
        
        // Dash line: only for bridge points (initially null)
        row[`${key}__dash`] = null;
      });

      // Store metadata in a hidden property for ZeroDot access
      (row as Record<string, unknown>).__metadata = metadataRow;
      return row;
    });

    // Detect revival segments and populate dash bridges (strengthened detection)
    normalizedCohortCurvesData.forEach(cohort => {
      const key = String(cohort.cohortKey);
      const sortedPoints = [...cohort.points].sort((a, b) => a.periodNum - b.periodNum);
      
      let lastKnownPeriod: number | null = null;
      let lastKnownValue: number | null = null;
      
      sortedPoints.forEach((point, idx) => {
        const currentPeriod = point.periodNum;
        const currentValue = point.retention;
        
        if (lastKnownPeriod !== null && lastKnownValue !== null) {
          // Check for gap (missing periods between lastKnown and current)
          const periodGap = currentPeriod - lastKnownPeriod;
          const hasGap = periodGap > 1;
          
          // Strengthened revival detection: lastKnown was 0 AND current is > 0
          const isRevival = lastKnownValue === 0 && currentValue > 0;
          
          // Treat these as discontinuities that require a dashed bridge:
          // 1. last known is 0 AND next known > 0 (revival)
          // 2. any gap (missing period) where next known exists (gap)
          if (hasGap || isRevival) {
            // This is a discontinuity - create dashed bridge
            const reason = hasGap 
              ? `gap (periods ${lastKnownPeriod} → ${currentPeriod})`
              : `revival (0% → ${currentValue.toFixed(1)}%)`;
            
            revivalEvents.push({
              cohortKey: key,
              fromPeriod: lastKnownPeriod,
              toPeriod: currentPeriod,
              fromValue: lastKnownValue,
              toValue: currentValue,
              reason,
            });
            
            // Set dash bridge points
            const fromRowIdx = sortedPeriods.indexOf(lastKnownPeriod);
            const toRowIdx = sortedPeriods.indexOf(currentPeriod);
            
            if (fromRowIdx >= 0 && toRowIdx >= 0) {
              // CRITICAL: Only write to __dash keys - NEVER modify solid series values
              // Solid series (key) must remain unchanged from normalized data
              chartData[fromRowIdx][`${key}__dash`] = lastKnownValue;
              chartData[toRowIdx][`${key}__dash`] = currentValue;
              
              // Assert: solid series should never be modified here
              if (process.env.NODE_ENV !== 'production') {
                const originalFromValue = chartData[fromRowIdx][key];
                const originalToValue = chartData[toRowIdx][key];
                if (originalFromValue !== lastKnownValue || originalToValue !== currentValue) {
                  console.warn(`Revival bridge: solid series values should match bridge endpoints`, {
                    cohortKey: key,
                    fromPeriod: lastKnownPeriod,
                    toPeriod: currentPeriod,
                    solidFrom: originalFromValue,
                    solidTo: originalToValue,
                    bridgeFrom: lastKnownValue,
                    bridgeTo: currentValue,
                  });
                }
              }
            }
          }
        }
        
        // Update last known
        lastKnownPeriod = currentPeriod;
        lastKnownValue = currentValue;
      });
      
      // Additional check: if a cohort hits 0 at period P, then later has >0 at P+1 or later, 
      // ALWAYS generate a dashed bridge from P to nextKnown
      const zeroPeriods = sortedPoints.filter(p => p.retention === 0);
      zeroPeriods.forEach(zeroPoint => {
        const laterPoints = sortedPoints.filter(p => p.periodNum > zeroPoint.periodNum && p.retention > 0);
        if (laterPoints.length > 0) {
          const nextNonZero = laterPoints[0];
          // Check if bridge already exists
          const existingBridge = revivalEvents.find(e => 
            e.cohortKey === key && 
            e.fromPeriod === zeroPoint.periodNum && 
            e.toPeriod === nextNonZero.periodNum
          );
          
          if (!existingBridge) {
            revivalEvents.push({
              cohortKey: key,
              fromPeriod: zeroPoint.periodNum,
              toPeriod: nextNonZero.periodNum,
              fromValue: 0,
              toValue: nextNonZero.retention,
              reason: `revival (0% → ${nextNonZero.retention.toFixed(1)}%)`,
            });
            
            const fromRowIdx = sortedPeriods.indexOf(zeroPoint.periodNum);
            const toRowIdx = sortedPeriods.indexOf(nextNonZero.periodNum);
            
            if (fromRowIdx >= 0 && toRowIdx >= 0) {
              // CRITICAL: Only write bridge endpoints if BOTH are finite numbers
              const fromValueFinite = Number.isFinite(0);
              const toValueFinite = Number.isFinite(nextNonZero.retention);
              
              if (fromValueFinite && toValueFinite) {
                // CRITICAL: Only write to __dash keys - NEVER modify solid series values
                chartData[fromRowIdx][`${key}__dash`] = 0;
                chartData[toRowIdx][`${key}__dash`] = nextNonZero.retention;
              }
            }
          }
        }
      });
    });

    // Store revival events for tooltip access
    revivalEventsRef.current = revivalEvents;

    // Debug: Log revival events
    if (revivalEvents.length > 0) {
      console.log("=== REVIVAL EVENTS DETECTED ===");
      revivalEvents.forEach(event => {
        console.log(`Cohort "${event.cohortKey}": ${event.reason} (Period ${event.fromPeriod} → ${event.toPeriod}, ${event.fromValue.toFixed(1)}% → ${event.toValue.toFixed(1)}%)`);
      });
      console.log("==============================");
    }

    // DEV-ONLY: Parity guard - verify chart values match normalized values (single source of truth)
    if (process.env.NODE_ENV !== 'production') {
      const mismatches: Array<{ cohortKey: string; periodNum: number; normalizedValue: number | null; chartValue: number | null; retentionType: string }> = [];
      
      normalizedCohortCurvesData.forEach(cohort => {
        const cohortKey = String(cohort.cohortKey);
        
        sortedPeriods.forEach(periodNum => {
          // Normalized lookup (single source of truth - same as table)
          const normalizedPoint = cohort.points.find(p => p.periodNum === periodNum);
          const normalizedValue = normalizedPoint ? normalizedPoint.retention : null;
          
          // Chart lookup (from chartData)
          const chartRow = chartData.find(r => r.periodNum === periodNum);
          const chartValue = chartRow ? (chartRow[cohortKey] as number | null) : null;
          
          // Compare (allow for floating point precision)
          if (normalizedValue !== chartValue) {
            const diff = normalizedValue !== null && chartValue !== null 
              ? Math.abs(normalizedValue - chartValue)
              : (normalizedValue === null && chartValue === null ? 0 : Infinity);
            
            if (diff > 0.1) {
              mismatches.push({ 
                cohortKey, 
                periodNum, 
                normalizedValue, 
                chartValue,
                retentionType,
              });
            }
          }
        });
      });
      
      if (mismatches.length > 0) {
        console.error("❌ RETENTION PARITY MISMATCH DETECTED:", {
          retentionType,
          mismatches,
        });
        mismatches.forEach(m => {
          console.error(`  Cohort ${m.cohortKey}, Period ${m.periodNum} (${m.retentionType}): normalized=${m.normalizedValue}, chart=${m.chartValue}`);
        });
      }
    }
    
    return chartData;
  }, [normalizedCohortCurvesData, maxPossiblePeriod, retentionType]);

  // Revenue Cohorts blue color scale (oldest → newest)
  const revenueBlueScale = [
    "#1e3a8a", // blue-900 (darkest)
    "#1e40af", // blue-800
    "#1d4ed8", // blue-700
    "#2563eb", // blue-600
    "#3b82f6", // blue-500
    "#60a5fa", // blue-400 (lightest)
  ];
  
  // Extended palette for more than 6 cohorts
  const extendedPalette = [
    ...revenueBlueScale,
    "#10b981", // green-600
    "#34d399", // green-500
    "#6ee7b7", // green-400
    "#525252", // neutral-600
    "#737373", // neutral-500
    "#a3a3a3", // neutral-400
    "#d4d4d4", // neutral-300 (for very old overflow)
  ];

  // Get sorted cohort keys (oldest first)
  const sortedCohortKeys = React.useMemo(() => {
    return normalizedCohortCurvesData
      .map(c => c.cohortKey)
      .sort((a, b) => {
        // Extract year from cohort key (e.g., "2019" → 2019)
        const yearA = parseInt(a.match(/\d{4}/)?.[0] || '1900');
        const yearB = parseInt(b.match(/\d{4}/)?.[0] || '1900');
        return yearA - yearB;
      });
  }, [normalizedCohortCurvesData]);

  // Get color for cohort based on sorted order (oldest = darkest)
  const getCohortColor = React.useCallback((cohortKey: string): string => {
    const index = sortedCohortKeys.indexOf(cohortKey);
    return extendedPalette[index >= 0 ? index % extendedPalette.length : 0];
  }, [sortedCohortKeys]);

  // ZeroDot component: renders "X" marker for 0% retention points
  // ZeroDot component: renders "X" marker for 0% retention points (only true zeros, not missing)
  // Since we filter out missing values in normalization, any value === 0 that reaches here is a true zero
  const ZeroDot = React.useCallback((props: { cx?: number; cy?: number; value?: number }) => {
    const { cx, cy, value } = props;
    // Only render for true zero values (not missing/null)
    // We've already filtered out missing values in normalization, so value === 0 means true zero
    if (!Number.isFinite(value) || value !== 0 || cx === undefined || cy === undefined) return null;
    
    return (
      <g>
        <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke="#6B7280" strokeWidth={2} />
        <line x1={cx - 5} y1={cy + 5} x2={cx + 5} y2={cy - 5} stroke="#6B7280" strokeWidth={2} />
      </g>
    );
  }, []);

  // =============================================================================
  // SINGLE SOURCE OF TRUTH: Benchmark Retention Calculation
  // =============================================================================
  // This function ensures KPIs, charts, and tables all use the same calculation
  // It reads directly from retentionCurveData (aggregated chart source)
  const getBenchmarkRetention = React.useCallback((
    retentionType: 'customer' | 'revenue',
    periodNum: number
  ): number | null => {
    if (retentionCurveData.length === 0) return null;
    
    const periodData = retentionCurveData.find(d => d.period === periodNum);
    if (!periodData) return null;
    
    return retentionType === 'customer' 
      ? periodData.retentionRate 
      : periodData.revenueRetention;
  }, [retentionCurveData]);

  // Determine Year 1 period number based on cohort type
  const year1PeriodNum = React.useMemo(() => {
    if (cohortType === 'monthly') {
      return 12; // Month 12 = Year 1
    } else if (cohortType === 'quarterly') {
      return 4; // Quarter 4 = Year 1 (12 months / 3 = 4 quarters)
    } else if (cohortType === 'half-year') {
      return 2; // Half-year 2 = Year 1 (12 months / 6 = 2 half-years)
    } else {
      return 1; // Year 1
    }
  }, [cohortType]);

  // Calculate KPI metrics using single source of truth
  const kpiMetrics = React.useMemo(() => {
    if (retentionCurveData.length === 0) {
      return {
        year1Retention: null,
        year1RevenueRetention: null,
        dataCoverage: {
          cohortCount: 0,
          yearsObserved: 0,
          dateRange: '',
          periodsAvailable: '',
        },
        maxDrop: {
          fromPeriod: '',
          toPeriod: '',
          dropPct: null,
        },
      };
    }

    // Use single source of truth - read directly from aggregated chart data
    const year1Retention = getBenchmarkRetention('customer', year1PeriodNum);
    const year1RevenueRetention = getBenchmarkRetention('revenue', year1PeriodNum);

    // Calculate data coverage from filtered cohorts (same source as aggregated chart)
    const cohortDates = filteredCohorts.map(c => {
      // cohort_month is in YYYY-MM format, parse it correctly
      const [year, month] = c.cohort_month.split('-').map(Number);
      return new Date(year, (month || 1) - 1, 1); // Month is 0-indexed in Date
    });
    const earliestDate = new Date(Math.min(...cohortDates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...cohortDates.map(d => d.getTime())));
    const yearsObserved = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    
    // Find max periods available from aggregated chart data
    const maxPeriods = Math.max(...retentionCurveData.map(d => d.period), 0);
    
    // Generate period label helper (reuse getPeriodLabel logic)
    const getPeriodLabelForCoverage = (periodNum: number): string => {
      if (cohortType === 'annual') {
        return periodNum === 0 ? 'Y0' : `Y${periodNum}`;
      } else if (cohortType === 'quarterly') {
        return `Q${periodNum}`;
      } else if (cohortType === 'half-year') {
        return periodNum === 0 ? 'H1' : `H${periodNum + 1}`;
      } else {
        return `M${periodNum}`;
      }
    };
    const periodsAvailable = `Y0–${getPeriodLabelForCoverage(maxPeriods)}`;

    // Format date range
    const formatDateRange = (date: Date) => {
      if (cohortType === 'annual') {
        return date.getFullYear().toString();
      } else if (cohortType === 'quarterly') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()} Q${quarter}`;
      } else if (cohortType === 'half-year') {
        const half = date.getMonth() < 6 ? 1 : 2;
        return `${date.getFullYear()} H${half}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    };

    const dateRange = `${formatDateRange(earliestDate)}–${formatDateRange(latestDate)}`;

    // Calculate max drop period (Year 1 → Year 2) using aggregated chart data
    let maxDrop = { fromPeriod: '', toPeriod: '', dropPct: null as number | null };
    const year2PeriodNum = year1PeriodNum + 1; // Next period after Year 1
    
    const year1Data = retentionCurveData.find(d => d.period === year1PeriodNum);
    const year2Data = retentionCurveData.find(d => d.period === year2PeriodNum);
    
    if (year1Data && year2Data) {
      const year1Value = retentionType === 'customer' 
        ? year1Data.retentionRate 
        : year1Data.revenueRetention;
      const year2Value = retentionType === 'customer'
        ? year2Data.retentionRate
        : year2Data.revenueRetention;
      
      // Only calculate drop if both values are valid
      if (year1Value > 0 && year2Value >= 0) {
        const drop = year1Value - year2Value;
        maxDrop = {
          fromPeriod: year1Data.periodLabel,
          toPeriod: year2Data.periodLabel,
          dropPct: drop,
        };
      }
    }

    return {
      year1Retention,
      year1RevenueRetention,
      dataCoverage: {
        cohortCount: filteredCohorts.length,
        yearsObserved,
        dateRange,
        periodsAvailable,
      },
      maxDrop,
    };
  }, [retentionCurveData, getBenchmarkRetention, year1PeriodNum, cohortType, retentionType, filteredCohorts]);

  // =============================================================================
  // DEV-ONLY PARITY GUARD: Ensure KPI values match aggregated chart values
  // =============================================================================
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && retentionCurveData.length > 0) {
      const year1ChartValue = retentionType === 'customer'
        ? retentionCurveData.find(d => d.period === year1PeriodNum)?.retentionRate
        : retentionCurveData.find(d => d.period === year1PeriodNum)?.revenueRetention;
      
      const year1KPIValue = retentionType === 'customer'
        ? kpiMetrics.year1Retention
        : kpiMetrics.year1RevenueRetention;
      
      if (year1ChartValue !== null && year1ChartValue !== undefined && 
          year1KPIValue !== null && year1KPIValue !== undefined) {
        const diff = Math.abs(year1ChartValue - year1KPIValue);
        if (diff > 0.1) {
          console.error('❌ PARITY MISMATCH DETECTED:', {
            retentionType,
            periodNum: year1PeriodNum,
            kpiValue: year1KPIValue,
            chartValue: year1ChartValue,
            difference: diff,
            message: 'KPI value does not match aggregated chart value at benchmark period',
          });
        } else {
          console.log('✅ Parity check passed:', {
            retentionType,
            periodNum: year1PeriodNum,
            value: year1KPIValue,
          });
        }
      }
    }
  }, [retentionCurveData, kpiMetrics.year1Retention, kpiMetrics.year1RevenueRetention, retentionType, year1PeriodNum]);

  // DEBUG STEP 2: DOM inspection - count recharts-curve elements
  React.useEffect(() => {
    if (viewMode === 'cohort') {
      // Use setTimeout to ensure DOM is rendered
      const timeoutId = setTimeout(() => {
        const curves = document.querySelectorAll(".recharts-curve");
        console.log("DEBUG recharts curves count:", curves.length);
        if (curves[0]) {
          console.log("DEBUG first curve:", curves[0]);
          console.log("DEBUG first curve computed styles:", window.getComputedStyle(curves[0]));
        } else {
          console.warn("⚠️ WARNING: No .recharts-curve elements found in DOM!");
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [viewMode, cohortChartData.length]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}m`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  // Prepare chart data
  const chartData = React.useMemo(() => {
    return retentionCurveData.map(d => ({
      period: d.periodLabel,
      value: retentionType === 'customer' ? d.retentionRate : d.revenueRetention,
      cohortSize: d.cohortSize,
    }));
  }, [retentionCurveData, retentionType]);

  // Calculate max value in chart data to determine Y-axis domain
  const maxChartValue = React.useMemo(() => {
    if (chartData.length === 0) return 100;
    const maxValue = Math.max(...chartData.map(d => d.value || 0));
    // Only allow >100% if actual data exceeds 100%, otherwise cap at 100%
    return maxValue > 100 ? Math.ceil((maxValue + 5) / 10) * 10 : 100;
  }, [chartData]);

  // Calculate max value in cohort chart data to determine Y-axis domain
  const maxCohortChartValue = React.useMemo(() => {
    if (cohortChartData.length === 0) return 100;
    let maxValue = 0;
    cohortChartData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== 'periodNum') {
          const value = row[key];
          if (typeof value === 'number' && Number.isFinite(value) && value > maxValue) {
            maxValue = value;
          }
        }
      });
    });
    // Only allow >100% if actual data exceeds 100%, otherwise cap at 100%
    return maxValue > 100 ? Math.ceil((maxValue + 5) / 10) * 10 : 100;
  }, [cohortChartData]);

  if (loading) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-5 border border-gray-200 h-36">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-3"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Retention Curves</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <LoadingButton
            isLoading={loading}
            onClick={fetchCohorts}
            loadingText="Retrying..."
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
      {/* Filter Bar */}
      <div className="mb-8">
        <FilterBar
          filters={retentionCurvesFilters}
          search={retentionCurvesSearch}
          onFiltersChange={(filters) => {
            setFilterState(filters);
          }}
          onSearchChange={() => {
            // URL sync handled by FilterBar
          }}
        />
      </div>

      {/* AI Analysis Section */}
      <div className="mb-8">
        <AIAnalysis 
          filters={filterState}
          cohorts={filteredCohorts}
          onRegenerate={fetchCohorts}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Year 1 Retention */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">Year 1 Retention</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                  <p className="text-xs mb-1">
                    Year 1 retention = % of customers from each cohort active at the end of their first year.
                  </p>
                  <p className="text-xs text-gray-300 mb-1">
                    Weighted to reflect the customer experience across cohorts (larger cohorts contribute more).
                  </p>
                  <p className="text-xs text-gray-300">
                    This value matches the aggregated chart at Year 1 for the current filters.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {kpiMetrics.year1Retention !== null && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                kpiMetrics.year1Retention >= 70 
                  ? 'bg-green-100 text-green-700' 
                  : kpiMetrics.year1Retention >= 40
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-50 text-red-500'
              }`}>
                {kpiMetrics.year1Retention >= 70 ? 'Excellent' : kpiMetrics.year1Retention >= 40 ? 'Good' : 'Needs Improvement'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">Year 1 retention (all cohorts)</p>
          <div className="text-2xl font-bold text-gray-900">
            {kpiMetrics.year1Retention !== null ? `${kpiMetrics.year1Retention.toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        {/* Revenue Retention at Year 1 */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">NRR at Year 1</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                  <p className="text-xs mb-1">
                    Net Revenue Retention (NRR) at Year 1. Includes expansion and contraction within the cohort during Year 1.
                  </p>
                  <p className="text-xs text-gray-300 mb-1">
                    Weighted by cohort size so larger cohorts contribute proportionally.
                  </p>
                  <p className="text-xs text-gray-300 mb-1">
                    NRR varies by business model. Transactional / e-commerce cohorts often show lower NRR than subscription businesses.
                  </p>
                  <p className="text-xs text-gray-300">
                    This value matches the aggregated chart at Year 1 for the current filters.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">NRR at Year 1 (all cohorts)</p>
          <div className="text-2xl font-bold text-gray-900">
            {kpiMetrics.year1RevenueRetention !== null ? `${kpiMetrics.year1RevenueRetention.toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        {/* Data Coverage */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">Data Coverage</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[250px]">
                  <p className="text-xs">
                    Number of cohorts analyzed, time period covered, and available retention periods.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-1">
            {kpiMetrics.dataCoverage.dateRange} • {kpiMetrics.dataCoverage.cohortCount} cohorts • {kpiMetrics.dataCoverage.yearsObserved} years observed
          </p>
          <div className="text-sm font-semibold text-gray-900">
            Periods available: {kpiMetrics.dataCoverage.periodsAvailable}
          </div>
        </div>

        {/* Max Drop Period */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">Max Drop</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                  <p className="text-xs mb-1">
                    Largest retention drop between Year 1 and Year 2 across all cohorts, showing the retention cliff.
                  </p>
                  <p className="text-xs text-gray-300">
                    This is the single largest drop observed (not the average decline).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />
          </div>
          <p className="text-xs text-gray-500 mb-3">Biggest drop: {kpiMetrics.maxDrop.fromPeriod} → {kpiMetrics.maxDrop.toPeriod}</p>
          <div className="text-2xl font-bold text-red-600">
            {kpiMetrics.maxDrop.dropPct !== null ? `-${kpiMetrics.maxDrop.dropPct.toFixed(1)} pp` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Retention Curve Chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <LineChart className="w-6 h-6 mr-2 text-cyan-600" />
              Retention Curve Visualization
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {viewMode === 'aggregated' 
                ? `${retentionType === 'customer' ? 'Customer retention rate' : 'Revenue retention'} over time`
                : `${retentionType === 'customer' ? 'Customer retention' : 'Revenue retention'} by cohort`
              }
            </p>
            {/* Definition Strip */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Cohorts:</span>
                  <span>
                    {cohortType === 'annual' 
                      ? 'first purchase year'
                      : cohortType === 'quarterly'
                      ? 'first purchase quarter'
                      : cohortType === 'half-year'
                      ? 'first purchase half-year'
                      : 'first purchase month'}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Active:</span>
                  <span>≥1 order in period</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Period length:</span>
                  <span>
                    {cohortType === 'annual' 
                      ? '1 year'
                      : cohortType === 'quarterly'
                      ? '1 quarter'
                      : cohortType === 'half-year'
                      ? '6 months'
                      : '1 month'}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Metric:</span>
                  <span>
                    {retentionType === 'customer' 
                      ? 'Customer retention (% of cohort active)'
                      : 'Revenue retention (gross revenue)'}
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Cohort Selection Controls - Only show in Cohort-by-Cohort view */}
          {viewMode === 'cohort' && allCohortLabels.length > 0 && (
            <div className="mb-4 space-y-3">
              {/* Search and Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search cohorts…"
                  value={cohortSearchQuery}
                  onChange={(e) => setCohortSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={showLatest6}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Show latest 6
                </button>
                <button
                  onClick={showAllLimited}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Show all (limit to 20)
                </button>
                <button
                  onClick={clearCohorts}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              </div>
              
              {/* Cohort Toggle Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {filteredCohortLabels.map((label) => {
                const isVisible = showCohorts.has(label);
                  const isPlotted = plottedCohorts.some(c => c.cohortKey === label);
                  // Use same color mapping as chart lines
                  const color = getCohortColor(label);
                
                const isActive = activeCohortKey === label;
                
                return (
                  <button
                    key={label}
                    onClick={() => toggleCohort(label)}
                    onMouseEnter={() => handleCohortHover(label)}
                    onMouseLeave={handleCohortHoverLeave}
                    onFocus={() => handleCohortHover(label)}
                    onBlur={handleCohortHoverLeave}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border-2 cursor-pointer ${
                      isVisible
                        ? 'bg-white border-blue-500 hover:border-blue-600 hover:bg-blue-50 text-gray-900 shadow-sm'
                        : 'bg-gray-100 border-gray-300 hover:border-gray-400 hover:bg-gray-200 text-gray-500'
                      } ${isPlotted ? '' : isVisible ? 'opacity-60' : ''}`}
                      title={isVisible && !isPlotted ? 'Selected but not plotted (limit to 10)' : ''}
                      style={{
                        opacity: isActive ? 1 : (activeCohortKey ? 0.2 : (isVisible ? (isPlotted ? 1 : 0.6) : 0.5)),
                        transition: 'opacity 200ms'
                      }}
                  >
                    <div
                      className={`w-3 h-3 rounded-sm flex-shrink-0 border ${
                        isVisible ? 'border-gray-300' : 'border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: isVisible ? color : '#d1d5db',
                          opacity: isVisible ? (isPlotted ? 1 : 0.5) : 0.5
                      }}
                    />
                    <span className={isVisible ? 'text-gray-900 font-semibold' : 'text-gray-500'}>
                      {label}
                    </span>
                  </button>
                );
              })}
              </div>
              
              {/* Plotting limit notice */}
              {showCohorts.size > 10 && (
                <p className="text-xs text-gray-500">
                  Plotting {plottedCohorts.length} of {showCohorts.size} selected cohorts — refine selection to view more.
                </p>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {/* Metric Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setRetentionType('customer')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  retentionType === 'customer'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Customer Retention
              </button>
              <button
                onClick={() => setRetentionType('revenue')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  retentionType === 'revenue'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Revenue Retention
              </button>
            </div>
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('aggregated')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'aggregated'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Aggregated
              </button>
              <button
                onClick={() => setViewMode('cohort')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cohort'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cohort-by-Cohort
              </button>
            </div>
            <button 
              onClick={() => {
                // Export CSV - different format based on view mode
                if (viewMode === 'aggregated') {
                  const csvHeaders = ['Period', 'Cohort Size', 'Retention Rate (%)', 'Revenue Retention (%)'];
                  const csvRows = retentionCurveData.map(d => [
                    d.periodLabel,
                    d.cohortSize.toString(),
                    d.retentionRate.toFixed(1),
                    d.revenueRetention.toFixed(1),
                  ]);
                  const csvContent = [
                    csvHeaders.join(','),
                    ...csvRows.map(row => row.join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `retention-curves-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } else {
                  // Cohort-by-cohort export
                  const allPeriods = new Set<number>();
                  cohortCurvesData.forEach(cohort => {
                    cohort.periods.forEach(p => allPeriods.add(p.period));
                  });
                  const sortedPeriods = Array.from(allPeriods).sort((a, b) => a - b);
                  
                  const csvHeaders = ['Cohort', ...sortedPeriods.map(p => getPeriodLabel(p))];
                  const csvRows = cohortCurvesData.map(cohort => {
                    const row = [cohort.cohortLabel];
                    sortedPeriods.forEach(periodNum => {
                      const periodData = cohort.periods.find(p => p.period === periodNum);
                      const value = retentionType === 'customer'
                        ? periodData?.customerRetention ?? null
                        : periodData?.revenueRetention ?? null;
                      row.push(value !== null ? value.toFixed(1) : '');
                    });
                    return row;
                  });
                  
                  const csvContent = [
                    csvHeaders.join(','),
                    ...csvRows.map(row => row.join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `retention-curves-cohorts-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }
              }}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        
        {/* Aggregated View Chart */}
        {viewMode === 'aggregated' && (
          chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-80 w-full">
              <RechartsLineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs text-gray-600"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs text-gray-600"
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, maxChartValue]}
                />
                <ReferenceLine
                  x={getPeriodLabel(cohortType === 'annual' ? 1 : (cohortType === 'quarterly' ? 4 : (cohortType === 'half-year' ? 2 : 12)))}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                  label={{
                    value: "Primary benchmark period",
                    position: "top",
                    fill: "#6b7280",
                    fontSize: 10,
                    offset: 5,
                  }}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="text-sm font-semibold text-gray-900">{data.period}</p>
                          <p className="text-sm text-gray-600">
                            {retentionType === 'customer' ? 'Retention Rate' : 'Revenue Retention'}: <span className="font-semibold">{data.value.toFixed(1)}%</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Cohort Size: {formatNumber(data.cohortSize)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(221.2 83.2% 53.3%)"
                  strokeWidth={2}
                  dot={false}
                  name={retentionType === 'customer' ? 'Retention Rate' : 'Revenue Retention'}
                />
              </RechartsLineChart>
            </ChartContainer>
          ) : (
            <div className="h-80 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
              <div className="text-center">
                <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Adjust filters to see retention curves</p>
                <p className="text-gray-500 text-sm mt-1">No data available for the selected filters</p>
              </div>
            </div>
          )
        )}

        {/* Cohort-by-Cohort View Chart */}
        {viewMode === 'cohort' && (
          cohortChartData.length > 0 && normalizedCohortCurvesData.length > 0 ? (
            <>
            <ChartErrorBoundary
              onRetry={() => setChartError(null)}
              context={{
                retentionType,
                viewMode,
                selectedCohorts: Array.from(showCohorts),
                cohortCount: normalizedCohortCurvesData.length,
              }}
            >
            <ChartContainer config={chartConfig} className="h-80 w-full">
              {(() => {
                // DEBUG: Sanity logs
                console.log("=== COHORT CHART DATA SANITY CHECK ===");
                console.log("chartData.length:", cohortChartData.length);
                if (cohortChartData.length > 0) {
                  console.log("Object.keys(chartData[0]):", Object.keys(cohortChartData[0]));
                  console.log("First row:", cohortChartData[0]);
                  
                  // Check first row values for each cohort key
                  const firstRow = cohortChartData[0];
                  Object.keys(firstRow).forEach(key => {
                    if (key !== 'periodNum') {
                      const value = firstRow[key as keyof typeof firstRow];
                      console.log(`Cohort "${key}": value=${value}, type=${typeof value}, isFinite=${Number.isFinite(value as number)}`);
                      if (typeof value === 'string' && (value as string).includes('%')) {
                        console.error(`❌ ERROR: Cohort "${key}" has string value with %: "${value}" - parsing failed!`);
                      }
                    }
                  });
                }
                console.log("Visible cohorts:", Array.from(showCohorts));
                console.log("=============================");

                return (
              <RechartsLineChart 
                data={cohortChartData} 
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                syncId="retention-curves-cohort"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis
                      dataKey="periodNum"
                      type="number"
                      scale="linear"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs text-gray-600"
                      tickFormatter={(value) => {
                        return getPeriodLabel(value);
                      }}
                      domain={[0, 'dataMax']}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs text-gray-600"
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, maxCohortChartValue]}
                />
                <ReferenceLine
                  x={cohortType === 'annual' ? 1 : (cohortType === 'quarterly' ? 4 : (cohortType === 'half-year' ? 2 : 12))}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                  label={{
                    value: "Primary benchmark period",
                    position: "top",
                    fill: "#6b7280",
                    fontSize: 10,
                    offset: 5,
                  }}
                />
                <ChartTooltip 
                  shared={true}
                  filterNull={true}
                  trigger="hover"
                  allowEscapeViewBox={{ x: false, y: true }}
                  content={({ active, payload, label }) => {
                    // CRITICAL: Try/catch around tooltip to prevent crashes from bad values
                    try {
                      if (!active || !payload || payload.length === 0) {
                        return null;
                      }
                      
                      const periodNum = label as number;
                        
                        // Filter out dash lines and build list of all visible cohorts at this period
                        const cohortData = payload
                          .filter(p => {
                            if (!p || !p.dataKey) return false;
                            const dataKeyStr = typeof p.dataKey === 'string' ? p.dataKey : String(p.dataKey);
                            // Exclude dash lines
                            if (dataKeyStr.endsWith('__dash')) return false;
                            return true;
                          })
                          .map(p => {
                            if (!p || !p.dataKey) return null;
                            
                            const dataKeyStr = typeof p.dataKey === 'string' ? p.dataKey : String(p.dataKey);
                            // Extract cohortKey from dataKey (exclude __dash, __solid suffixes)
                            const cohortKey = dataKeyStr.replace(/__(dash|solid)$/, '').trim();
                            
                            // Skip if cohortKey is empty or invalid
                            if (!cohortKey || cohortKey === 'periodNum' || cohortKey === '__metadata') {
                              return null;
                            }
                            
                            // Extract numeric value - ensure it's a number, not a string
                            let value: number | null = null;
                            if (typeof p.value === 'number' && Number.isFinite(p.value)) {
                              value = p.value;
                            } else if (typeof p.value === 'string') {
                              // If it's a string, try to parse it (remove any % signs, etc.)
                              const cleaned = p.value.replace(/[%,]/g, '').trim();
                              const parsed = parseFloat(cleaned);
                              if (Number.isFinite(parsed)) {
                                value = parsed;
                              }
                            }
                            
                            // Skip if value is invalid or cohortKey doesn't match a valid cohort
                            if (value === null || !showCohorts.has(cohortKey)) {
                              return null;
                            }
                            
                            const color = p.color || getCohortColor(cohortKey);
                            
                            return {
                              cohortKey,
                              value,
                              color,
                            };
                          })
                          .filter((item): item is NonNullable<typeof item> => item !== null)
                          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)); // Sort descending by value
                        
                        if (cohortData.length === 0) {
                      return null;
                    }
                        
                        // Limit to top 10, show "+N more" if needed
                        const displayData = cohortData.slice(0, 10);
                        const remainingCount = cohortData.length - 10;
                    
                    return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
                            <p className="text-sm font-semibold text-gray-900 mb-2">
                              Period: <span className="font-semibold">{getPeriodLabel(periodNum)}</span>
                            </p>
                            <div className="space-y-1.5">
                              {displayData.map((item, idx) => {
                                const isHovered = hoveredCohort === item.cohortKey;
                                const isRevivalPeriod = revivalEventsRef.current.some(e => 
                                  e.cohortKey === item.cohortKey && e.toPeriod === periodNum
                                );
                                
                                // Ensure cohortKey is a clean string and value is a valid number
                                const cleanCohortKey = String(item.cohortKey || '').trim();
                                const numericValue = item.value !== null && Number.isFinite(item.value) ? item.value : null;
                                
                                return (
                                  <div 
                                    key={cleanCohortKey}
                                    className={`flex items-center justify-between text-xs ${isHovered ? 'font-semibold' : ''}`}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div
                                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                        style={{ backgroundColor: item.color }}
                                      />
                                      <span className="text-gray-900 truncate">{cleanCohortKey}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {numericValue !== null ? (
                                        <span className="text-gray-700 font-medium">
                                          {numericValue.toFixed(1)}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-500 text-xs">—</span>
                                      )}
                                      {isRevivalPeriod && (
                                        <span className="text-[10px] text-gray-500" title="Recovery after 0% / discontinuity">
                                          ⚠️
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {remainingCount > 0 && (
                                <p className="text-xs text-gray-500 pt-1 border-t border-gray-200 mt-1.5">
                                  +{remainingCount} more
                                </p>
                              )}
                            </div>
                      </div>
                    );
                    } catch (error) {
                      // Log error details for debugging
                      if (process.env.NODE_ENV !== 'production') {
                        console.error('❌ Tooltip render error:', {
                          error,
                          periodNum: label,
                          payload: payload?.map(p => ({
                            dataKey: p.dataKey,
                            value: p.value,
                            valueType: typeof p.value,
                          })),
                          retentionType,
                        });
                      }
                      // Return null to prevent crash
                      return null;
                    }
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                  content={({ payload }) => {
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-4 flex-wrap justify-center">
                          {payload?.map((entry, index) => {
                                // Filter out dash lines and gap lines from legend
                            if (!entry.value || entry.value === 'undefined') return null;
                                const dataKeyStr = typeof entry.dataKey === 'string' ? entry.dataKey : (entry.dataKey ? String(entry.dataKey) : '');
                                if (dataKeyStr && (dataKeyStr.endsWith('__dash') || dataKeyStr.endsWith('_gap'))) return null;
                            const cohortKey = entry.value as string;
                            const isActive = activeCohortKey === cohortKey;
                            
                            return (
                              <div 
                                key={entry.value} 
                                className="flex items-center gap-1.5 cursor-pointer"
                                onMouseEnter={() => handleCohortHover(cohortKey)}
                                onMouseLeave={handleCohortHoverLeave}
                                onFocus={() => handleCohortHover(cohortKey)}
                                onBlur={handleCohortHoverLeave}
                                tabIndex={0}
                                style={{ 
                                  opacity: isActive ? 1 : (activeCohortKey ? 0.2 : 1),
                                  transition: 'opacity 200ms'
                                }}
                              >
                                <div
                                  className="w-3 h-3 rounded-sm"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs text-gray-600">{entry.value}</span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Legend key for discontinuities */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          <svg width="40" height="2" className="flex-shrink-0">
                            <line 
                              x1="0" 
                              y1="1" 
                              x2="40" 
                              y2="1" 
                              stroke="#9CA3AF" 
                              strokeWidth="2" 
                              strokeDasharray="6 4"
                              strokeOpacity="0.6"
                            />
                          </svg>
                          <span className="text-xs text-gray-500">Dashed segment = discontinuity / recovery</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                                aria-label="Learn more about discontinuities"
                              >
                                <Info className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-0 max-w-xs">
                              <p className="text-xs">
                                Dashed segments indicate discontinuities (missing periods or 0% followed by later recovery), e.g., reactivation or incomplete tracking.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  }}
                />
                    {/* Render one Line per plotted cohort: solid colored line */}
                    {plottedCohorts.map((cohort) => {
                        const cohortKey = String(cohort.cohortKey);
                        const color = getCohortColor(cohortKey);
                        const isActive = activeCohortKey === cohortKey;
                        
                        return (
                          <Line
                            key={`${cohortKey}__solid`}
                            type="linear"
                            dataKey={cohortKey}
                            stroke={color}
                            strokeWidth={isActive ? 3 : 2}
                            strokeOpacity={isActive ? 1 : (activeCohortKey ? 0.2 : 1)}
                            dot={<ZeroDot />}
                            activeDot={{ r: 4 }}
                            connectNulls={false}
                            isAnimationActive={false}
                            name={cohortKey}
                            onMouseEnter={() => handleCohortHover(cohortKey)}
                            onMouseLeave={handleCohortHoverLeave}
                            style={{ transition: 'opacity 200ms, stroke-width 200ms' }}
                          />
                        );
                      })}
                    {/* Render dashed bridges for revival segments (AFTER solid lines so they render on top, tinted by cohort color) */}
                    {plottedCohorts.map((cohort) => {
                        const cohortKey = String(cohort.cohortKey);
                        const color = getCohortColor(cohortKey);
                        const isActive = activeCohortKey === cohortKey;
                        
                        return (
                          <Line
                            key={`${cohortKey}__dash`}
                            type="linear"
                            dataKey={`${cohortKey}__dash`}
                            stroke={color}
                            strokeWidth={3}
                            strokeDasharray="10 6"
                            strokeOpacity={isActive ? 0.35 : (activeCohortKey ? 0.1 : 0.35)}
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                            name={undefined}
                            style={{ transition: 'opacity 200ms' }}
                          />
                        );
                      })}
              </RechartsLineChart>
                );
              })()}
            </ChartContainer>
            </ChartErrorBoundary>
            </>
          ) : (
            <div className="h-80 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
              <div className="text-center">
                <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No cohort curve data available</p>
                <p className="text-gray-500 text-sm mt-1">
                  {normalizedCohortCurvesData.length === 0 
                    ? "No cohorts have sufficient data (need at least 2 data points per cohort). Adjust filters to see results."
                    : "Adjust filters to see retention curves"
                  }
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Retention Curve Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {viewMode === 'aggregated' ? 'Aggregated retention by period' : 'Retention by cohort and period'}
          </h2>
          {viewMode === 'aggregated' ? (
            <p className="text-sm text-gray-500 mt-1">
              Each row represents a period aggregated across all cohorts.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Cohort-by-cohort retention breakdown
            </p>
          )}
        </div>
        
        {/* Aggregated View Table */}
        {viewMode === 'aggregated' && (
          <>
            {retentionCurveData.length > 0 && retentionCurveData[0]?.cohortSize && (
              <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-600">
                  Initial cohort size: <span className="font-medium">{formatNumber(retentionCurveData[0].cohortSize)}</span> customers
                </p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retention Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue Retention
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {retentionCurveData.length > 0 ? (
                    retentionCurveData.map((data) => (
                      <tr key={data.period} className="hover:bg-gray-50">
                        <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 z-10">
                          {data.periodLabel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.retentionRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.revenueRetention.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                        No retention data available. Adjust filters to see results.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Cohort-by-Cohort View Table */}
        {viewMode === 'cohort' && (() => {
          // Generate all periods from 0 to maxPossiblePeriod
          const allPeriods = Array.from({ length: maxPossiblePeriod + 1 }, (_, i) => i);

          return (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                      Cohort
                    </th>
                    {allPeriods.map((periodNum) => (
                      <th key={periodNum} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {getPeriodLabel(periodNum)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {normalizedCohortCurvesData.length > 0 ? (
                    normalizedCohortCurvesData.map((cohort) => {
                      const isActive = activeCohortKey === cohort.cohortKey;
                      return (
                      <tr 
                        key={cohort.cohortKey} 
                        className="hover:bg-gray-50"
                        style={{
                          backgroundColor: isActive ? 'rgba(59, 130, 246, 0.05)' : undefined,
                          transition: 'background-color 200ms'
                        }}
                      >
                        <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 z-10">
                          {cohort.cohortKey}
                        </td>
                        {allPeriods.map((periodNum) => {
                          // CRITICAL: Use same lookup logic as chart (single source of truth)
                          const periodData = cohort.points.find(p => p.periodNum === periodNum);
                          const value = periodData ? periodData.retention : null;
                          
                          // DEV-ONLY: Verify parity with chart
                          if (process.env.NODE_ENV !== 'production' && periodNum === 4) {
                            const chartRow = cohortChartData.find(r => r.periodNum === periodNum);
                            const chartValue = chartRow ? (chartRow[cohort.cohortKey] as number | null) : null;
                            if (value !== chartValue) {
                              const diff = value !== null && chartValue !== null 
                                ? Math.abs(value - chartValue)
                                : (value === null && chartValue === null ? 0 : Infinity);
                              if (diff > 0.1) {
                                console.error(`❌ Year 4 Parity Mismatch - Cohort ${cohort.cohortKey}: table=${value}, chart=${chartValue}`);
                              }
                            }
                          }
                          
                          return (
                            <td key={periodNum} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {value !== null ? `${value.toFixed(1)}%` : '–'}
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={allPeriods.length + 1} className="px-6 py-8 text-center text-sm text-gray-500">
                        No cohort curve data available. No cohorts have sufficient data (need at least 2 data points per cohort).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
