"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { revenueCohortsFilters, revenueCohortsSearch } from "@/lib/filters/config";
import { RevenueCohortsChart } from "@/components/charts/RevenueCohortsChart";
import { CohortMatrix } from "@/components/charts/CohortMatrix";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { LoadingButton } from "@/components/ui/loading-buttons";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterValue } from "@/lib/filters/types";
// TODO: Re-add SimpleTrendChart when needed
import { EnhancedTrendChart } from "@/components/charts/EnhancedTrendChart";

// TODO: Re-add custom icons (StoreIcon, WalletIcon, UsersIcon, FireIcon) when needed

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

interface RevenueCohortsResponse {
  success: boolean;
  data: {
    cohorts: CohortData[];
    total_cohorts: number;
    calculated_at: string;
  };
  error?: string;
}

function RevenueCohortsContent() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<Record<string, FilterValue>>({});
  const searchParams = useSearchParams();
  // Initialize with default value to avoid hydration mismatch
  // Actual value will be set in useEffect on client side
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'half-year' | 'annual'>('annual');
  // const [cagr, setCagr] = useState<number>(0);
  // const [selectedCohort, setSelectedCohort] = useState<string | null>(null);

  // Use a ref to track the last query string to prevent infinite loops
  const lastQueryStringRef = React.useRef<string>('');
  // Track if we've initialized the URL with cohortType
  const urlInitializedRef = React.useRef(false);

  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      // Use URL params directly since FilterBar syncs to URL
      const queryString = searchParams.toString();
      
      // Only fetch if the query string actually changed
      if (queryString === lastQueryStringRef.current) {
        setLoading(false);
        // Clear any stale error state when skipping fetch
        setError(null);
        return;
      }
      
      lastQueryStringRef.current = queryString;
      
      const response = await fetch(`/api/metrics/cohorts?${queryString}`);
      const data: RevenueCohortsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cohorts');
      }

      setCohorts(data.data.cohorts);
      setError(null); // Clear error on success
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
      
      // Validate dates - check if they are valid Date objects
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        // Invalid dates - return null to fall back to no date range
        return null;
      }
      
      return {
        from: fromDate,
        to: toDate
      };
    }
    return null;
  }, [searchParams]);

  // Helper: Check if a date falls within date range
  const isDateInRange = React.useCallback((date: Date, range: { from: Date; to: Date } | null): boolean => {
    if (!range) return true;
    // Validate that dates are valid before comparison
    if (isNaN(date.getTime()) || isNaN(range.from.getTime()) || isNaN(range.to.getTime())) {
      return false;
    }
    return date >= range.from && date <= range.to;
  }, []);

  // Helper: Calculate previous period of equal length to date range
  const getPreviousPeriodRange = React.useCallback((range: { from: Date; to: Date }): { from: Date; to: Date } => {
    // Validate dates before using getTime()
    if (isNaN(range.from.getTime()) || isNaN(range.to.getTime())) {
      // Return a safe default range if dates are invalid
      const now = new Date();
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
    }
    const lengthMs = range.to.getTime() - range.from.getTime();
    const previousTo = new Date(range.from.getTime() - 1); // Day before range starts
    const previousFrom = new Date(previousTo.getTime() - lengthMs);
    return { from: previousFrom, to: previousTo };
  }, []);

  // Filter cohorts by date range - keep cohort if ANY period falls in range (Rule #1)
  // Edge case handling: ensure at least one cohort is shown even for very small windows
  const filteredCohorts = React.useMemo(() => {
    if (!dateRange) return cohorts;
    
    const filtered = cohorts.map(cohort => ({
      ...cohort,
      periods: cohort.periods.filter(period => {
        const orderDate = new Date(period.order_month);
        // Include period if order_month falls within the date range
        return isDateInRange(orderDate, dateRange);
      })
    })).filter(cohort => cohort.periods.length > 0); // Only keep cohorts with at least one period in range
    
    // Edge case: if no cohorts match, return at least one cohort with closest period
    if (filtered.length === 0 && cohorts.length > 0) {
      // Find the cohort with the period closest to the date range
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
      
      // Return the closest cohort with periods filtered to those closest to the range
      return [{
        ...closestCohort,
        periods: closestCohort.periods.filter(period => {
          const orderDate = new Date(period.order_month);
          // Include period if it's within a reasonable range (extend by 30 days on each side)
          const extendedFrom = new Date(dateRange.from.getTime() - 30 * 24 * 60 * 60 * 1000);
          const extendedTo = new Date(dateRange.to.getTime() + 30 * 24 * 60 * 60 * 1000);
          return orderDate >= extendedFrom && orderDate <= extendedTo;
        })
      }].filter(c => c.periods.length > 0);
    }
    
    return filtered;
  }, [cohorts, dateRange, isDateInRange]);

  // Calculate CAGR when cohorts change
  // useEffect(() => {
  //   if (cohorts.length > 0) {
  //     const avgCagr = Math.random() * 15 + 10; // Mock CAGR between 10-25%
  //     setCagr(avgCagr);
  //   }
  // }, [cohorts]);

  // Handle view mode changes - derive from URL params (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const cohortType = searchParams.get('cohortType');
    if (cohortType && ['monthly', 'quarterly', 'half-year', 'annual'].includes(cohortType)) {
      setViewMode(cohortType as 'monthly' | 'quarterly' | 'half-year' | 'annual');
    } else {
      // If no cohortType in URL, default to 'annual'
      // Only initialize URL once on mount to avoid repeated history mutations
      if (!urlInitializedRef.current) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('cohortType', 'annual');
        // Update URL without triggering navigation
        window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
        urlInitializedRef.current = true;
      }
      setViewMode('annual');
    }
  }, [searchParams]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}m`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}m`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  // Helper function to calculate previous period key
  const getPreviousPeriodKey = React.useCallback((periodKey: string, mode: typeof viewMode): string => {
    if (mode === 'annual') {
      const year = parseInt(periodKey);
      return (year - 1).toString();
    } else if (mode === 'half-year') {
      const [year, half] = periodKey.split(' ');
      const yearNum = parseInt(year);
      if (half === 'H1') {
        return `${yearNum - 1} H2`;
      } else {
        return `${yearNum} H1`;
      }
    } else if (mode === 'quarterly') {
      const [year, quarter] = periodKey.split('-Q');
      const yearNum = parseInt(year);
      const quarterNum = parseInt(quarter);
      if (quarterNum === 1) {
        return `${yearNum - 1}-Q4`;
      } else {
        return `${yearNum}-Q${quarterNum - 1}`;
      }
    } else {
      // Monthly - subtract one month
      const date = new Date(periodKey);
      date.setMonth(date.getMonth() - 1);
      return date.toISOString().substring(0, 7);
    }
  }, []);

  // Helper function to aggregate cohorts by cohort type
  const getAggregatedCohorts = React.useMemo(() => {
    if (filteredCohorts.length === 0) return [];
    
    // Group cohorts by their aggregated label based on viewMode
    const aggregatedMap = new Map<string, {
      label: string;
      revenue: number;
      customers: number;
      periods: Array<{ period_number: number; order_month: string; total_revenue: number; active_customers: number }>;
    }>();
    
    // Track which months belong to each aggregated cohort (for half-year completeness check)
    const cohortMonthsMap = new Map<string, Set<string>>();
    
    filteredCohorts.forEach((cohort) => {
      let aggregatedLabel: string;
      const cohortDate = new Date(cohort.cohort_month);
      
      if (viewMode === 'annual') {
        aggregatedLabel = cohortDate.getFullYear().toString();
      } else if (viewMode === 'half-year') {
        const year = cohortDate.getFullYear();
        const half = cohortDate.getMonth() < 6 ? 'H1' : 'H2';
        aggregatedLabel = `${year} ${half}`;
        
        // Track months for completeness check
        if (!cohortMonthsMap.has(aggregatedLabel)) {
          cohortMonthsMap.set(aggregatedLabel, new Set());
        }
        cohortMonthsMap.get(aggregatedLabel)!.add(cohort.cohort_month);
      } else if (viewMode === 'quarterly') {
        const year = cohortDate.getFullYear();
        const quarter = Math.floor(cohortDate.getMonth() / 3) + 1;
        aggregatedLabel = `${year}-Q${quarter}`;
      } else {
        // monthly - use original format
        aggregatedLabel = cohort.cohort_month;
      }
      
      if (!aggregatedMap.has(aggregatedLabel)) {
        aggregatedMap.set(aggregatedLabel, {
          label: aggregatedLabel,
          revenue: 0,
          customers: 0,
          periods: []
        });
      }
      
      const aggregated = aggregatedMap.get(aggregatedLabel)!;
      aggregated.revenue += cohort.periods.reduce((sum, p) => sum + p.total_revenue, 0);
      aggregated.customers += cohort.cohort_size;
      
      // Aggregate periods by their order_month (grouping by the same aggregation)
      cohort.periods.forEach((period) => {
        const orderDate = new Date(period.order_month);
        let periodKey: string;
        
        if (viewMode === 'annual') {
          periodKey = orderDate.getFullYear().toString();
        } else if (viewMode === 'half-year') {
          const year = orderDate.getFullYear();
          const half = orderDate.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${year} ${half}`;
        } else if (viewMode === 'quarterly') {
          const year = orderDate.getFullYear();
          const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
          periodKey = `${year}-Q${quarter}`;
        } else {
          periodKey = period.order_month;
        }
        
        const existingPeriod = aggregated.periods.find(p => p.order_month === periodKey);
        if (existingPeriod) {
          existingPeriod.total_revenue += period.total_revenue;
          existingPeriod.active_customers += period.active_customers;
        } else {
          aggregated.periods.push({
            period_number: period.period_number,
            order_month: periodKey,
            total_revenue: period.total_revenue,
            active_customers: period.active_customers
          });
        }
      });
    });
    
    let aggregatedCohorts = Array.from(aggregatedMap.values());
    
    // For half-year view, group 2019 H1 and H2 as "Pre-2020"
    if (viewMode === 'half-year') {
      const pre2020Cohorts = aggregatedCohorts.filter(c => {
        const [year] = c.label.split(' ');
        return parseInt(year) < 2020;
      });
      
      if (pre2020Cohorts.length > 0) {
        // Combine all pre-2020 cohorts into one "Pre-2020" cohort
        const pre2020Combined = pre2020Cohorts.reduce((acc, cohort) => {
          acc.revenue += cohort.revenue;
          acc.customers += cohort.customers;
          // Merge periods
          cohort.periods.forEach(period => {
            const existing = acc.periods.find(p => p.order_month === period.order_month);
            if (existing) {
              existing.total_revenue += period.total_revenue;
              existing.active_customers += period.active_customers;
            } else {
              acc.periods.push({ ...period });
            }
          });
          return acc;
        }, {
          label: 'Pre-2020',
          revenue: 0,
          customers: 0,
          periods: [] as Array<{ period_number: number; order_month: string; total_revenue: number; active_customers: number }>
        });
        
        // Remove pre-2020 cohorts and add combined one
        aggregatedCohorts = aggregatedCohorts.filter(c => {
          const [year] = c.label.split(' ');
          return parseInt(year) >= 2020;
        });
        aggregatedCohorts.unshift(pre2020Combined);
      }
    }
    
    return aggregatedCohorts.sort((a, b) => {
      // Sort by label (chronologically)
      if (viewMode === 'annual') {
        // Handle "Pre-2020" or "≤ 2019" labels
        if (a.label.startsWith('Pre-') || a.label.startsWith('≤')) return -1;
        if (b.label.startsWith('Pre-') || b.label.startsWith('≤')) return 1;
        return parseInt(a.label) - parseInt(b.label);
      } else if (viewMode === 'half-year') {
        // Handle "Pre-2020" label - it should sort first
        if (a.label === 'Pre-2020') return -1;
        if (b.label === 'Pre-2020') return 1;
        const [yearA, halfA] = a.label.split(' ');
        const [yearB, halfB] = b.label.split(' ');
        const yearANum = parseInt(yearA);
        const yearBNum = parseInt(yearB);
        if (yearANum !== yearBNum) return yearANum - yearBNum;
        return halfA === 'H1' && halfB === 'H2' ? -1 : halfA === 'H2' && halfB === 'H1' ? 1 : 0;
      } else if (viewMode === 'quarterly') {
        const [yearA, quarterA] = a.label.split('-Q');
        const [yearB, quarterB] = b.label.split('-Q');
        const yearANum = parseInt(yearA);
        const yearBNum = parseInt(yearB);
        if (yearANum !== yearBNum) return yearANum - yearBNum;
        return parseInt(quarterA) - parseInt(quarterB);
      } else {
        return a.label.localeCompare(b.label);
      }
    });
  }, [filteredCohorts, viewMode]);

  // Generate trend data from actual cohort data
  // Based on user requirement: "one point per cohort" BUT also "KPI values correspond to LAST data point"
  // Interpretation: Show one point per time period (matching the time range), where each point shows
  // total revenue/customers in that period from all cohorts. This way:
  // - Number of points = number of unique time periods (matches the date range)
  // - Last point = most recent time period (matches KPI requirement)
  // - Each point shows: current = revenue in this period, previous = revenue in equivalent period from previous year
  const generateTrendDataFromCohorts = React.useMemo(() => {
    return (type: 'revenue' | 'customers', currentPeriodKey: string) => {
      if (filteredCohorts.length === 0 || !currentPeriodKey) {
        return { currentData: [], previousData: [], labels: [] };
      }

      // Collect all unique time periods from all cohorts' periods
      const periodMap = new Map<string, number>();
      
      // Aggregate revenue/customers by time period across all cohorts
      filteredCohorts.forEach((cohort) => {
        cohort.periods.forEach((period) => {
          const orderDate = new Date(period.order_month);
          let periodKey: string;
          
          // Determine period key based on viewMode (when the revenue occurred)
          if (viewMode === 'annual') {
            periodKey = orderDate.getFullYear().toString();
          } else if (viewMode === 'half-year') {
            const year = orderDate.getFullYear();
            const half = orderDate.getMonth() < 6 ? 'H1' : 'H2';
            periodKey = `${year} ${half}`;
          } else if (viewMode === 'quarterly') {
            const year = orderDate.getFullYear();
            const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
            periodKey = `${year}-Q${quarter}`;
          } else {
            periodKey = period.order_month;
          }

          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, 0);
          }

          const value = type === 'revenue' ? period.total_revenue : period.active_customers;
          periodMap.set(periodKey, (periodMap.get(periodKey) || 0) + value);
        });
      });

      // Sort periods chronologically
      const sortedPeriods = Array.from(periodMap.entries()).sort((a, b) => {
        const [keyA, keyB] = [a[0], b[0]];
        
        if (viewMode === 'annual') {
          return parseInt(keyA) - parseInt(keyB);
        } else if (viewMode === 'half-year') {
          if (keyA.startsWith('Pre-') || keyA.startsWith('≤')) return -1;
          if (keyB.startsWith('Pre-') || keyB.startsWith('≤')) return 1;
          const [yearA, halfA] = keyA.split(' ');
          const [yearB, halfB] = keyB.split(' ');
          const yearANum = parseInt(yearA);
          const yearBNum = parseInt(yearB);
          if (yearANum !== yearBNum) return yearANum - yearBNum;
          return halfA === 'H1' && halfB === 'H2' ? -1 : halfA === 'H2' && halfB === 'H1' ? 1 : 0;
        } else if (viewMode === 'quarterly') {
          const [yearA, quarterA] = keyA.split('-Q');
          const [yearB, quarterB] = keyB.split('-Q');
          const yearANum = parseInt(yearA);
          const yearBNum = parseInt(yearB);
          if (yearANum !== yearBNum) return yearANum - yearBNum;
          return parseInt(quarterA) - parseInt(quarterB);
        } else {
          return keyA.localeCompare(keyB);
        }
      });

      // Filter out "Pre-2020" periods for chart
      const periodsForChart = sortedPeriods.filter(([key]) => 
        !key.startsWith('Pre-') && !key.startsWith('≤')
      );

      // Build arrays: for each time period, calculate current and previous values
      const currentData: number[] = [];
      const previousData: number[] = [];
      const labels: string[] = [];

      periodsForChart.forEach(([periodKey, revenueInPeriod]) => {
        // Current: revenue in this time period
        currentData.push(revenueInPeriod);
        
        // Previous: revenue in the equivalent period from previous year
        // For period "2025", previous should be revenue in "2024" (same period, previous year)
        const prevPeriodKey = getPreviousPeriodKey(periodKey, viewMode);
        const prevPeriodRevenue = periodMap.get(prevPeriodKey) || 0;
        previousData.push(prevPeriodRevenue);
        
        // Format label for display
        if (viewMode === 'annual') {
          labels.push(periodKey);
        } else if (viewMode === 'quarterly') {
          const [year, quarter] = periodKey.split('-Q');
          labels.push(`Q${quarter} ${year.substring(2)}`);
        } else if (viewMode === 'half-year') {
          labels.push(periodKey); // e.g., "2019 H1", "2019 H2", "2020 H1", etc.
        } else {
          const [year, month] = periodKey.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          labels.push(`${monthNames[parseInt(month) - 1]} ${year.substring(2)}`);
        }
      });

      return { currentData, previousData, labels };
    };
  }, [filteredCohorts, viewMode, getPreviousPeriodKey]);

  // Get the current period key (e.g., "2025" for annual, "2025 H2" for half-year)
  const currentPeriodKey = React.useMemo(() => {
    if (filteredCohorts.length === 0) return '';
    
    const periodRevenueMap = new Map<string, { revenue: number; customers: number }>();
    
    filteredCohorts.forEach((cohort) => {
      cohort.periods.forEach((period) => {
        const orderDate = new Date(period.order_month);
        let periodKey: string;
        
        if (viewMode === 'annual') {
          periodKey = orderDate.getFullYear().toString();
        } else if (viewMode === 'half-year') {
          const year = orderDate.getFullYear();
          const half = orderDate.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${year} ${half}`;
        } else if (viewMode === 'quarterly') {
          const year = orderDate.getFullYear();
          const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
          periodKey = `${year}-Q${quarter}`;
        } else {
          periodKey = period.order_month;
        }
        
        if (!periodRevenueMap.has(periodKey)) {
          periodRevenueMap.set(periodKey, { revenue: 0, customers: 0 });
        }
      });
    });
    
    const sortedPeriods = Array.from(periodRevenueMap.keys()).sort((a, b) => {
      if (viewMode === 'annual') {
        return parseInt(a) - parseInt(b);
      } else if (viewMode === 'half-year') {
        if (a.startsWith('Pre-') || a.startsWith('≤')) return -1;
        if (b.startsWith('Pre-') || b.startsWith('≤')) return 1;
        const [yearA, halfA] = a.split(' ');
        const [yearB, halfB] = b.split(' ');
        const yearANum = parseInt(yearA);
        const yearBNum = parseInt(yearB);
        if (yearANum !== yearBNum) return yearANum - yearBNum;
        return halfA === 'H1' && halfB === 'H2' ? -1 : halfA === 'H2' && halfB === 'H1' ? 1 : 0;
      } else if (viewMode === 'quarterly') {
        const [yearA, quarterA] = a.split('-Q');
        const [yearB, quarterB] = b.split('-Q');
        const yearANum = parseInt(yearA);
        const yearBNum = parseInt(yearB);
        if (yearANum !== yearBNum) return yearANum - yearBNum;
        return parseInt(quarterA) - parseInt(quarterB);
      } else {
        return a.localeCompare(b);
      }
    });
    
    const periodsForComparison = sortedPeriods.filter(key => 
      !key.startsWith('Pre-') && !key.startsWith('≤')
    );
    
    return periodsForComparison[periodsForComparison.length - 1] || '';
  }, [filteredCohorts, viewMode]);

  // Calculate top cohorts by revenue in the selected period (not lifetime revenue)
  const getTopCohorts = React.useMemo(() => {
    if (cohorts.length === 0 || !currentPeriodKey) {
      // Return dummy top cohorts
      const dummyCohorts = [
        { month: '2024-10', revenue: 245000 },
        { month: '2024-09', revenue: 230000 },
        { month: '2024-08', revenue: 215000 },
        { month: '2024-07', revenue: 200000 },
        { month: '2024-06', revenue: 185000 },
      ];
      const dummyTotal = dummyCohorts.reduce((sum, c) => sum + c.revenue, 0) + 500000; // Add others
      return dummyCohorts.map(c => ({
        ...c,
        share: (c.revenue / dummyTotal) * 100
      }));
    }
    
    // Calculate revenue per cohort for the current period only
    const cohortRevenuesInPeriod: Array<{ month: string; revenue: number }> = [];
    
    filteredCohorts.forEach((cohort) => {
      // Determine cohort label based on viewMode
      let cohortLabel: string;
      const cohortDate = new Date(cohort.cohort_month);
      
      if (viewMode === 'annual') {
        cohortLabel = cohortDate.getFullYear().toString();
      } else if (viewMode === 'half-year') {
        const year = cohortDate.getFullYear();
        const half = cohortDate.getMonth() < 6 ? 'H1' : 'H2';
        // Group 2019 as Pre-2020
        if (year < 2020) {
          cohortLabel = 'Pre-2020';
        } else {
          cohortLabel = `${year} ${half}`;
        }
      } else if (viewMode === 'quarterly') {
        const year = cohortDate.getFullYear();
        const quarter = Math.floor(cohortDate.getMonth() / 3) + 1;
        cohortLabel = `${year}-Q${quarter}`;
      } else {
        cohortLabel = cohort.cohort_month;
      }
      
      // Sum revenue from periods that match the current period key
      let revenueInPeriod = 0;
      cohort.periods.forEach((period) => {
        const orderDate = new Date(period.order_month);
        let periodKey: string;
        
        if (viewMode === 'annual') {
          periodKey = orderDate.getFullYear().toString();
        } else if (viewMode === 'half-year') {
          const year = orderDate.getFullYear();
          const half = orderDate.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${year} ${half}`;
        } else if (viewMode === 'quarterly') {
          const year = orderDate.getFullYear();
          const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
          periodKey = `${year}-Q${quarter}`;
        } else {
          periodKey = period.order_month;
        }
        
        if (periodKey === currentPeriodKey) {
          revenueInPeriod += period.total_revenue;
        }
      });
      
      if (revenueInPeriod > 0) {
        // Check if cohort already exists (for aggregated cohorts like Pre-2020)
        const existing = cohortRevenuesInPeriod.find(c => c.month === cohortLabel);
        if (existing) {
          existing.revenue += revenueInPeriod;
        } else {
          cohortRevenuesInPeriod.push({
            month: cohortLabel,
            revenue: revenueInPeriod
          });
        }
      }
    });
    
    const totalRevenueInPeriod = cohortRevenuesInPeriod.reduce((sum, c) => sum + c.revenue, 0);
    
    // Sort and get top 5
    const top5Cohorts = [...cohortRevenuesInPeriod]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({
        ...c,
        share: totalRevenueInPeriod > 0 ? (c.revenue / totalRevenueInPeriod) * 100 : 0
      }));
    
      return top5Cohorts;
  }, [filteredCohorts, viewMode, currentPeriodKey, cohorts.length]); // cohorts.length used in early return

  // Count cohorts that have revenue in the current period (for "Top X of Y" display)
  const cohortsInCurrentPeriodCount = React.useMemo(() => {
    if (cohorts.length === 0 || !currentPeriodKey) {
      return 0;
    }
    
    // Calculate revenue per cohort for the current period only (same logic as getTopCohorts)
    const cohortRevenuesInPeriod: Array<{ month: string; revenue: number }> = [];
    
    filteredCohorts.forEach((cohort) => {
      // Determine cohort label based on viewMode
      let cohortLabel: string;
      const cohortDate = new Date(cohort.cohort_month);
      
      if (viewMode === 'annual') {
        cohortLabel = cohortDate.getFullYear().toString();
      } else if (viewMode === 'half-year') {
        const year = cohortDate.getFullYear();
        const half = cohortDate.getMonth() < 6 ? 'H1' : 'H2';
        if (year < 2020) {
          cohortLabel = 'Pre-2020';
        } else {
          cohortLabel = `${year} ${half}`;
        }
      } else if (viewMode === 'quarterly') {
        const year = cohortDate.getFullYear();
        const quarter = Math.floor(cohortDate.getMonth() / 3) + 1;
        cohortLabel = `${year}-Q${quarter}`;
      } else {
        cohortLabel = cohort.cohort_month;
      }
      
      // Sum revenue from periods that match the current period key
      let revenueInPeriod = 0;
      cohort.periods.forEach((period) => {
        const orderDate = new Date(period.order_month);
        let periodKey: string;
        
        if (viewMode === 'annual') {
          periodKey = orderDate.getFullYear().toString();
        } else if (viewMode === 'half-year') {
          const year = orderDate.getFullYear();
          const half = orderDate.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${year} ${half}`;
        } else if (viewMode === 'quarterly') {
          const year = orderDate.getFullYear();
          const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
          periodKey = `${year}-Q${quarter}`;
        } else {
          periodKey = period.order_month;
        }
        
        if (periodKey === currentPeriodKey) {
          revenueInPeriod += period.total_revenue;
        }
      });
      
      if (revenueInPeriod > 0) {
        // Check if cohort already exists (for aggregated cohorts like Pre-2020)
        const existing = cohortRevenuesInPeriod.find(c => c.month === cohortLabel);
        if (existing) {
          existing.revenue += revenueInPeriod;
        } else {
          cohortRevenuesInPeriod.push({
            month: cohortLabel,
            revenue: revenueInPeriod
          });
        }
      }
    });
    
    return cohortRevenuesInPeriod.length;
  }, [filteredCohorts, viewMode, currentPeriodKey, cohorts.length]); // cohorts.length used in early return

  // Generate trend data first - this will be our single source of truth
  // Uses filteredCohorts to ensure only periods in date range are included
  const revenueTrendData = React.useMemo(() => {
    if (filteredCohorts.length === 0 || !currentPeriodKey) {
      return { currentData: [], previousData: [], labels: [] };
    }
    return generateTrendDataFromCohorts('revenue', currentPeriodKey);
  }, [filteredCohorts, currentPeriodKey, generateTrendDataFromCohorts]);

  const customersTrendData = React.useMemo(() => {
    if (filteredCohorts.length === 0 || !currentPeriodKey) {
      return { currentData: [], previousData: [], labels: [] };
    }
    return generateTrendDataFromCohorts('customers', currentPeriodKey);
  }, [filteredCohorts, currentPeriodKey, generateTrendDataFromCohorts]);

  // Calculate KPI values based on date range comparison (Rule #2)
  // If dateRange is set: compare selected range vs previous period of equal length
  // If no dateRange: use last data point from trend series (same period, previous year)
  const { totalRevenue, previousRevenue, totalCustomers, previousCustomers } = React.useMemo(() => {
    if (filteredCohorts.length === 0) {
      return {
        totalRevenue: 30500000,
        previousRevenue: 25620000,
        totalCustomers: 14200,
        previousCustomers: 12354
      };
    }

    // If date range is set, compare selected range vs previous period of equal length
    if (dateRange) {
      const previousRange = getPreviousPeriodRange(dateRange);
      
      // Sum all revenue/customers in selected date range
      let currentRevenue = 0;
      let currentCustomers = 0;
      let previousRevenue = 0;
      let previousCustomers = 0;
      
      // Use all cohorts (not filtered) to calculate previous period
      // Previous period may include cohorts that don't have periods in current range
      cohorts.forEach((cohort) => {
        cohort.periods.forEach((period) => {
          const orderDate = new Date(period.order_month);
          
          // Current period (selected date range)
          if (isDateInRange(orderDate, dateRange)) {
            currentRevenue += period.total_revenue;
            currentCustomers += period.active_customers;
          }
          
          // Previous period (equal length period before)
          if (isDateInRange(orderDate, previousRange)) {
            previousRevenue += period.total_revenue;
            previousCustomers += period.active_customers;
          }
        });
      });
      
      // Edge case: if no data in current range, use filtered cohorts to ensure we have data
      if (currentRevenue === 0 && currentCustomers === 0 && filteredCohorts.length > 0) {
        filteredCohorts.forEach((cohort) => {
          cohort.periods.forEach((period) => {
            currentRevenue += period.total_revenue;
            currentCustomers += period.active_customers;
          });
        });
      }
      
      return {
        totalRevenue: currentRevenue || 0,
        previousRevenue: previousRevenue || 0,
        totalCustomers: currentCustomers || 0,
        previousCustomers: previousCustomers || 0
      };
    }

    // No date range: use last data point from trend series (same period, previous year)
    if (revenueTrendData.currentData.length === 0) {
      return {
        totalRevenue: 30500000,
        previousRevenue: 25620000,
        totalCustomers: 14200,
        previousCustomers: 12354
      };
    }

    const lastIndex = revenueTrendData.currentData.length - 1;
    
    return {
      totalRevenue: revenueTrendData.currentData[lastIndex] || 0,
      previousRevenue: revenueTrendData.previousData[lastIndex] || 0,
      totalCustomers: customersTrendData.currentData[lastIndex] || 0,
      previousCustomers: customersTrendData.previousData[lastIndex] || 0
    };
  }, [filteredCohorts, dateRange, revenueTrendData, customersTrendData, cohorts, isDateInRange, getPreviousPeriodRange]);
  
  // Calculate Cohort Coverage from aggregated cohorts
  const cohortCoverage = React.useMemo(() => {
    if (getAggregatedCohorts.length === 0) {
      const dummyTotal = 30500000;
      return {
        activeCount: 18,
        topCohortShare: 18.5,
        topCohortRevenue: 5642500,
        topCohort: [],
        top3Share: 15.2, // cohorts 2-3
        top3Revenue: 4636000,
        top3Cohorts: [],
        top10Share: 28.3, // cohorts 4-10
        top10Revenue: 8631500,
        top10Cohorts: [],
        othersShare: 38.0,
        othersRevenue: 11590000,
        othersCohorts: [],
        totalRevenue: dummyTotal
      };
    }
    
    // Get revenue per aggregated cohort
    const cohortRevenues = getAggregatedCohorts.map(c => ({
      month: c.label,
      revenue: c.revenue
    }));
    
    // Count active cohorts (with >0 revenue) - this is now the count at the selected aggregation level
    const activeCount = cohortRevenues.filter(c => c.revenue > 0).length;
    
    // Sort by revenue descending
    cohortRevenues.sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = cohortRevenues.reduce((sum, c) => sum + c.revenue, 0);
    
    if (totalRevenue === 0) {
      return {
        activeCount,
        topCohortShare: 0,
        topCohortRevenue: 0,
        topCohort: [],
        top3Share: 0,
        top3Revenue: 0,
        top3Cohorts: [],
        top10Share: 0,
        top10Revenue: 0,
        top10Cohorts: [],
        othersShare: 0,
        othersRevenue: 0,
        othersCohorts: [],
        totalRevenue: 0
      };
    }
    
    // Calculate segments and store cohort lists
    const topCohort = cohortRevenues[0];
    const topCohortRevenue = topCohort?.revenue || 0;
    const top3Cohorts = cohortRevenues.slice(0, 3); // cohorts ranked 1, 2, 3 (includes top cohort)
    const top3Revenue = top3Cohorts.reduce((sum, c) => sum + c.revenue, 0);
    const top10Cohorts = cohortRevenues.slice(0, 10); // cohorts ranked 1-10 (includes all top cohorts)
    const top10Revenue = top10Cohorts.reduce((sum, c) => sum + c.revenue, 0);
    const othersCohorts = cohortRevenues.slice(10); // cohorts ranked 11+
    const othersRevenue = othersCohorts.reduce((sum, c) => sum + c.revenue, 0);
    
    return {
      activeCount,
      topCohortShare: (topCohortRevenue / totalRevenue) * 100,
      topCohortRevenue,
      topCohort: topCohort ? [{ label: topCohort.month, revenue: topCohort.revenue }] : [],
      top3Share: (top3Revenue / totalRevenue) * 100,
      top3Revenue,
      top3Cohorts: top3Cohorts.map(c => ({ label: c.month, revenue: c.revenue })),
      top10Share: (top10Revenue / totalRevenue) * 100,
      top10Revenue,
      top10Cohorts: top10Cohorts.map(c => ({ label: c.month, revenue: c.revenue })),
      othersShare: (othersRevenue / totalRevenue) * 100,
      othersRevenue,
      othersCohorts: othersCohorts.map(c => ({ label: c.month, revenue: c.revenue })),
      totalRevenue
    };
  }, [getAggregatedCohorts]);

  // Get period name for subtitles (year/quarter/month)
  const getPeriodName = React.useMemo(() => {
    const periodMap: Record<'monthly' | 'quarterly' | 'half-year' | 'annual', string> = {
      'monthly': 'month',
      'quarterly': 'quarter',
      'half-year': 'half-year',
      'annual': 'year'
    };
    return periodMap[viewMode] || 'period';
  }, [viewMode]);

  // Determine period labels based on cohort data and filters
  const getPeriodLabels = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // Check URL params for date/year filters
    const yearParam = searchParams.get('year');
    // FilterBar stores date range as 'dateRange' with format 'from:to'
    const dateRangeParam = searchParams.get('dateRange');
    
    // If year filter is set, use that
    if (yearParam) {
      const year = parseInt(yearParam);
      return {
        current: `${year} YTD`,
        previous: `${year - 1} YTD`
      };
    }
    
    // If date range is set, determine from that
    if (dateRangeParam) {
      const parts = dateRangeParam.split(':');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const fromDate = new Date(parts[0]);
        const toDate = new Date(parts[1]);
        
        // Validate dates before using them
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          const fromYear = fromDate.getFullYear();
          const toYear = toDate.getFullYear();
          
          // If same year, show YTD
          if (fromYear === toYear) {
            return {
              current: `${toYear} YTD`,
              previous: `${toYear - 1} YTD`
            };
          }
        }
      }
    }
    
    // Check if we have cohort data to determine the period
    if (filteredCohorts.length > 0) {
      // Get the most recent cohort year (cohorts are sorted by date descending)
      const latestCohort = filteredCohorts[0];
      const cohortYear = parseInt(latestCohort.cohort_month.substring(0, 4));
      const cohortMonth = parseInt(latestCohort.cohort_month.substring(5, 7));
      
      // Check if we're viewing current year
      if (cohortYear === currentYear) {
        // If current month is past the cohort month, show YTD
        if (currentMonth > cohortMonth) {
          return {
            current: `${currentYear} YTD`,
            previous: `${currentYear - 1} YTD`
          };
        } else {
          // Same month, show the month
          return {
            current: `${currentYear}-${String(cohortMonth).padStart(2, '0')}`,
            previous: cohortMonth > 1 
              ? `${currentYear}-${String(cohortMonth - 1).padStart(2, '0')}`
              : `${currentYear - 1}-12`
          };
        }
      } else {
        // Viewing a past year - show YTD for that year
        return {
          current: `${cohortYear} YTD`,
          previous: `${cohortYear - 1} YTD`
        };
      }
    }
    
    // Default: current year YTD
    return {
      current: `${currentYear} YTD`,
      previous: `${currentYear - 1} YTD`
    };
  }, [filteredCohorts, searchParams]);

  // Calculate x-axis labels based on aggregated cohorts (matches chart data points)
  const getXAxisLabels = React.useMemo(() => {
    const aggregatedCohorts = getAggregatedCohorts;
    
    if (aggregatedCohorts.length === 0) {
      const cohortType = searchParams.get('cohortType') || 'monthly';
      // Default labels for dummy data
      if (cohortType === 'annual') {
        return { start: '2023', end: '2024' };
      } else if (cohortType === 'quarterly') {
        return { start: 'Q1 24', end: 'Q4 24' };
      } else {
        return { start: 'Jan 24', end: 'Dec 24' };
      }
    }
    
    // Use first and last aggregated cohort labels (matches the data points)
    const firstCohort = aggregatedCohorts[0];
    const lastCohort = aggregatedCohorts[aggregatedCohorts.length - 1];
    
    // Format labels based on viewMode
    if (viewMode === 'annual') {
      return { start: firstCohort.label, end: lastCohort.label };
    } else if (viewMode === 'quarterly') {
      // Format: "2024-Q1" -> "Q1 24"
      const formatQuarterLabel = (label: string) => {
        const [year, quarter] = label.split('-Q');
        return `Q${quarter} ${year.substring(2)}`;
      };
      return { start: formatQuarterLabel(firstCohort.label), end: formatQuarterLabel(lastCohort.label) };
    } else if (viewMode === 'half-year') {
      // Format: "2024 H1" -> "2024 H1" (keep as is)
      return { start: firstCohort.label, end: lastCohort.label };
    } else {
      // Monthly - format: "2024-01" -> "Jan 24"
      const formatMonthLabel = (label: string) => {
        const [year, month] = label.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year.substring(2)}`;
      };
      return { start: formatMonthLabel(firstCohort.label), end: formatMonthLabel(lastCohort.label) };
    }
  }, [getAggregatedCohorts, viewMode, searchParams]);

  // Use the trend data we already calculated (single source of truth)
  const revenueTrend = revenueTrendData;
  const customersTrend = customersTrendData;
  const topCohorts = getTopCohorts;


  if (loading) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-32">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Cohorts</h3>
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
          filters={revenueCohortsFilters}
          search={revenueCohortsSearch}
          onFiltersChange={(filters) => {
            setFilterState(filters);
            // URL sync handled by FilterBar, fetchCohorts will trigger via useEffect when searchParams changes
          }}
          onSearchChange={() => {
            // URL sync handled by FilterBar, fetchCohorts will trigger via useEffect when searchParams changes
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
          {/* Revenue */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-semibold text-gray-900">Revenue</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-0 max-w-[200px]">
                    <p className="text-xs">Cohort revenue for the selected period compared to the same period last year.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                totalRevenue >= previousRevenue 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-50 text-red-500'
              }`}>
                {(() => {
                  const delta = totalRevenue - previousRevenue;
                  const percentage = previousRevenue !== 0 
                    ? ((delta / previousRevenue) * 100).toFixed(1)
                    : '0.0';
                  const deltaFormatted = formatCurrency(Math.abs(delta));
                  const sign = delta >= 0 ? '+' : '';
                  return `${sign}${percentage}% (Δ ${sign}${deltaFormatted})`;
                })()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Current {getPeriodName} vs same {getPeriodName} last year</p>
            
            {/* Summary Values */}
            <div className="flex items-center gap-4 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-600 flex-shrink-0"></div>
                  <span>This year</span>
                </div>
                <div className="text-base font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 flex-shrink-0"></div>
                  <span>Last year</span>
                </div>
                <div className="text-base font-bold text-gray-900">{formatCurrency(previousRevenue)}</div>
          </div>
        </div>
        
            {/* Chart */}
            <div className="mt-1">
              <EnhancedTrendChart
                currentData={revenueTrend.currentData}
                previousData={revenueTrend.previousData}
                currentColor="#3b82f6"
                previousColor="#9ca3af"
                height={120}
                xAxisLabels={getXAxisLabels}
                formatValue={formatCurrency}
                currentPeriodLabel={getPeriodLabels.current}
                previousPeriodLabel={getPeriodLabels.previous}
                cohortType={viewMode}
                periodLabels={revenueTrendData.labels}
              />
            </div>
          </div>
          
          {/* Customers */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-semibold text-gray-900">Customers</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-0 max-w-[200px]">
                    <p className="text-xs">Customers who generated cohort revenue in the selected period.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                totalCustomers >= previousCustomers 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-50 text-red-500'
              }`}>
                {(() => {
                  const delta = totalCustomers - previousCustomers;
                  const percentage = previousCustomers !== 0 
                    ? ((delta / previousCustomers) * 100).toFixed(1)
                    : '0.0';
                  const deltaFormatted = formatNumber(Math.abs(delta));
                  const sign = delta >= 0 ? '+' : '';
                  return `${sign}${percentage}% (Δ ${sign}${deltaFormatted})`;
                })()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Current {getPeriodName} vs same {getPeriodName} last year</p>
            
            {/* Summary Values */}
            <div className="flex items-center gap-4 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-600 flex-shrink-0"></div>
                  <span>This year</span>
                </div>
                <div className="text-base font-bold text-gray-900">{formatNumber(totalCustomers)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 flex-shrink-0"></div>
                  <span>Last year</span>
                </div>
                <div className="text-base font-bold text-gray-900">{formatNumber(previousCustomers)}</div>
          </div>
        </div>
        
            {/* Chart */}
            <div className="mt-1">
              <EnhancedTrendChart
                currentData={customersTrend.currentData}
                previousData={customersTrend.previousData}
                currentColor="#3b82f6"
                previousColor="#9ca3af"
                height={120}
                xAxisLabels={getXAxisLabels}
                formatValue={(v) => formatNumber(v)}
                currentPeriodLabel={getPeriodLabels.current}
                previousPeriodLabel={getPeriodLabels.previous}
                cohortType={viewMode}
                periodLabels={customersTrendData.labels}
              />
            </div>
          </div>
          
          {/* Cohort Coverage */}
          <div className="bg-white rounded-lg p-5 pt-6 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
            {/* Header */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-2">
                <h3 className="text-base font-semibold text-gray-900">Cohort Coverage</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-0 max-w-[200px]">
                    <p className="text-xs">Active cohorts with revenue and their share of total revenue.</p>
                  </TooltipContent>
                </Tooltip>
        </div>
              <p className="text-xs text-gray-500">
                Active {viewMode === 'monthly' ? 'monthly' : viewMode === 'quarterly' ? 'quarterly' : 'annual'} cohorts & revenue concentration
              </p>
            </div>
            
            {/* Main Value */}
            <div className="mb-4">
              <div className="text-2xl font-bold text-gray-900">{cohortCoverage.activeCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Active cohorts</div>
            </div>
            
            {/* Segmented Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex mb-3">
              {cohortCoverage.topCohortShare > 0 && (
                <div 
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${cohortCoverage.topCohortShare}%` }}
                />
              )}
              {cohortCoverage.top3Share > 0 && (
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${cohortCoverage.top3Share}%` }}
                />
              )}
              {cohortCoverage.top10Share > 0 && (
                <div 
                  className="h-full bg-blue-400 transition-all"
                  style={{ width: `${cohortCoverage.top10Share}%` }}
                />
              )}
              {cohortCoverage.othersShare > 0 && (
                <div 
                  className="h-full bg-gray-400 transition-all"
                  style={{ width: `${cohortCoverage.othersShare}%` }}
                />
              )}
            </div>
            
            {/* Legend */}
            <div className="space-y-1.5 text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-help">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-600 flex-shrink-0"></div>
                      <span className="text-gray-900 font-semibold">Top cohort</span>
                    </div>
                    <div className="flex items-center gap-2 text-right flex-shrink-0 ml-auto">
                      <span className="text-gray-900 font-semibold">{cohortCoverage.topCohortShare.toFixed(1)}%</span>
                      <span className="text-gray-400 mx-1.5">|</span>
                      <span className="text-gray-500">{formatCurrency(cohortCoverage.topCohortRevenue)}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold mb-1.5">Top cohort:</p>
                    {cohortCoverage.topCohort.length > 0 ? (
                      cohortCoverage.topCohort.map((cohort, idx) => (
                        <p key={idx} className="text-xs">
                          {cohort.label} - {formatCurrency(cohort.revenue)}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No data</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-help">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-500 flex-shrink-0"></div>
                      <span className="text-gray-900 font-semibold">Top 3 cohorts</span>
                    </div>
                    <div className="flex items-center gap-2 text-right flex-shrink-0 ml-auto">
                      <span className="text-gray-900 font-semibold">{cohortCoverage.top3Share.toFixed(1)}%</span>
                      <span className="text-gray-400 mx-1.5">|</span>
                      <span className="text-gray-500">{formatCurrency(cohortCoverage.top3Revenue)}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold mb-1.5">Top 3 cohorts:</p>
                    {cohortCoverage.top3Cohorts.length > 0 ? (
                      cohortCoverage.top3Cohorts.map((cohort, idx) => (
                        <p key={idx} className="text-xs">
                          {cohort.label} - {formatCurrency(cohort.revenue)}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No data</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-help">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-400 flex-shrink-0"></div>
                      <span className="text-gray-700 font-medium">Top 10 cohorts</span>
                    </div>
                    <div className="flex items-center gap-2 text-right flex-shrink-0 ml-auto">
                      <span className="text-gray-900 font-semibold">{cohortCoverage.top10Share.toFixed(1)}%</span>
                      <span className="text-gray-400 mx-1.5">|</span>
                      <span className="text-gray-500">{formatCurrency(cohortCoverage.top10Revenue)}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold mb-1.5">Top 10 cohorts:</p>
                    {cohortCoverage.top10Cohorts.length > 0 ? (
                      cohortCoverage.top10Cohorts.map((cohort, idx) => (
                        <p key={idx} className="text-xs">
                          {cohort.label} - {formatCurrency(cohort.revenue)}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No data</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-help">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 flex-shrink-0"></div>
                      <span className="text-gray-700 font-medium">Others</span>
                    </div>
                    <div className="flex items-center gap-2 text-right flex-shrink-0 ml-auto">
                      <span className="text-gray-900 font-semibold">{cohortCoverage.othersShare.toFixed(1)}%</span>
                      <span className="text-gray-400 mx-1.5">|</span>
                      <span className="text-gray-500">{formatCurrency(cohortCoverage.othersRevenue)}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px] max-h-[300px] overflow-y-auto">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold mb-1.5">Other cohorts:</p>
                    {cohortCoverage.othersCohorts.length > 0 ? (
                      cohortCoverage.othersCohorts.map((cohort, idx) => (
                        <p key={idx} className="text-xs">
                          {cohort.label} - {formatCurrency(cohort.revenue)}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No data</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Top Cohorts Leaderboard */}
          <div className="bg-white rounded-lg p-5 pt-6 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
            <div className="mb-2">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-semibold text-gray-900">Top Cohorts</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white border-0 max-w-[200px]">
                      <p className="text-xs">Top {topCohorts.length} cohort{topCohorts.length !== 1 ? 's' : ''} by revenue this period with their share of total revenue.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs text-gray-400 mt-1">Top {topCohorts.length} of {cohortsInCurrentPeriodCount} cohort{cohortsInCurrentPeriodCount !== 1 ? 's' : ''}</span>
        </div>
              <p className="text-xs text-gray-500">
                Highest-revenue cohorts within this {getPeriodName} period ({currentPeriodKey || 'current period'})
              </p>
            </div>
            <div className="space-y-2 mt-4">
              {topCohorts.length > 0 ? (
                topCohorts.map((cohort, index) => {
                  const maxRevenue = Math.max(...topCohorts.map(c => c.revenue));
                  const barWidth = maxRevenue > 0 ? (cohort.revenue / maxRevenue) * 100 : 0;
                  
                        return (
                    <div key={cohort.month} className="flex items-center gap-3">
                      {/* Rank Badge - Neutral grey pill */}
                      <div className="flex-shrink-0">
                        <span className="px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">#{index + 1}</span>
                      </div>
                      
                      {/* Cohort Label - Regular weight, left-aligned */}
                      <div className="flex-shrink-0 w-20">
                        <span className="text-sm font-medium text-gray-900">{cohort.month}</span>
                          </div>
                      
                      {/* Mini Bar - Left-aligned and proportional */}
                      <div className="flex-1 min-w-0">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                    </div>
                  </div>
                  
                      {/* Revenue + Percentage - Right-aligned, bold top 3, % muted */}
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-sm ${index < 3 ? 'font-bold' : 'font-semibold'} text-gray-900`}>
                          {formatCurrency(cohort.revenue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({cohort.share.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
                  </div>
                </div>
              </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200 mt-6 mb-8"></div>

      {/* Revenue Cohort Trends Chart */}
      <div className="mb-8">
        <RevenueCohortsChart cohorts={filteredCohorts} viewMode={viewMode} />
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200 mt-6 mb-8"></div>

      {/* Cohort Matrix */}
      <div className="mb-8">
        <CohortMatrix 
          cohorts={filteredCohorts}
          viewMode={viewMode}
          onCellClick={(cohort, period, data) => {
            console.log('Cell clicked:', { cohort, period, data });
          }}
        />
      </div>
    </div>
  );
}

export default function RevenueCohortsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-32">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <RevenueCohortsContent />
    </Suspense>
  );
}