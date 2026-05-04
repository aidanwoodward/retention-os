"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { revenueCohortsFilters, revenueCohortsSearch } from "@/lib/filters/config";
import { RevenueCohortsChart } from "@/components/charts/RevenueCohortsChart";
import { CohortMatrix } from "@/components/charts/CohortMatrix";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { LoadingButton } from "@/components/ui/loading-buttons";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import { Diagnosis } from "@/components/diagnosis/Diagnosis";
import { diagnoseRevenueCohorts, diagnoseRevenueCohortsEnhanced } from "@/lib/diagnosis/revenue-cohorts";
import { DecisionAxes } from "@/components/diagnosis/DecisionAxes";
import { getDecisionAxesForDiagnosis } from "@/lib/diagnosis/decision-axes";
import { ImpactRanges } from "@/components/diagnosis/ImpactRanges";
import { computeRevenueCohortsImpactRanges } from "@/lib/diagnosis/impact-ranges/revenue-cohorts";
import { SeverityIndicator } from "@/components/diagnosis/SeverityIndicator";
import { CausalitySection } from "@/components/diagnosis/CausalitySection";

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
  const router = useRouter();
  const pathname = usePathname();
  // Initialize with default value to avoid hydration mismatch
  // Actual value will be set in useEffect on client side
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
  // const [cagr, setCagr] = useState<number>(0);
  // const [selectedCohort, setSelectedCohort] = useState<string | null>(null);

  // Use a ref to track the last query string to prevent infinite loops
  const lastQueryStringRef = React.useRef<string>('');
  // Track if we've initialized the URL with cohortType
  const _urlInitializedRef = React.useRef(false);

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

  /**
   * CANONICAL DEFINITION: Previous Period Range Calculation
   * 
   * Calculates the previous period range of equal length to the given date range.
   * Used when dateRange is present to compare selected range vs previous period.
   * 
   * Logic:
   * - Previous range ends the day before the current range starts
   * - Previous range length = current range length
   * - Example: If current range is 2025-01-01 to 2025-03-31 (90 days),
   *   previous range is 2024-10-03 to 2024-12-31 (90 days)
   */
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
    if (cohortType && ['monthly', 'quarterly', 'annual'].includes(cohortType)) {
      setViewMode(cohortType as 'monthly' | 'quarterly' | 'annual');
    } else {
      // If no cohortType in URL, default to 'annual'
      // Only initialize URL once on mount to avoid repeated history mutations
      if (!_urlInitializedRef.current) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('cohortType', 'annual');
        const newQueryString = newParams.toString();
        const currentQueryString = searchParams.toString();
        // Only update URL if the query string actually changed
        if (newQueryString !== currentQueryString) {
          router.replace(`${pathname}?${newQueryString}`, { scroll: false });
        }
        _urlInitializedRef.current = true;
      }
      setViewMode('annual');
    }
  }, [searchParams, pathname, router]);

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

  /**
   * CANONICAL DEFINITION: Previous Period Key Calculation
   * 
   * Determines the previous period key for a given period key based on viewMode.
   * Used for comparing current period to equivalent period from previous year.
   * 
   * Rules:
   * - Annual: Subtract 1 year (e.g., "2025" → "2024")
   * - Quarterly: Previous quarter (e.g., "2025-Q1" → "2024-Q4", "2025-Q2" → "2025-Q1")
   * - Monthly: Previous month (e.g., "2025-01" → "2024-12", "2025-02" → "2025-01")
   */
  const getPreviousPeriodKey = React.useCallback((periodKey: string, mode: typeof viewMode): string => {
    if (mode === 'annual') {
      const year = parseInt(periodKey);
      return (year - 1).toString();
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

  /**
   * Get the same period from the previous year (lifecycle-aligned comparison)
   * - Monthly: compare month t to month t-12 (same month, previous year)
   * - Quarterly: compare quarter t to quarter t-4 (same quarter, previous year)
   * - Annual: compare year t to year t-1 (previous year)
   */
  const getSamePeriodLastYear = React.useCallback((periodKey: string, mode: typeof viewMode): string => {
    if (mode === 'annual') {
      const year = parseInt(periodKey);
      return (year - 1).toString();
    } else if (mode === 'quarterly') {
      const [year, quarter] = periodKey.split('-Q');
      const yearNum = parseInt(year);
      const quarterNum = parseInt(quarter);
      // Same quarter, previous year
      return `${yearNum - 1}-Q${quarterNum}`;
    } else {
      // Monthly - subtract 12 months (same month, previous year)
      const date = new Date(periodKey);
      date.setFullYear(date.getFullYear() - 1);
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
    
    filteredCohorts.forEach((cohort) => {
      let aggregatedLabel: string;
      const cohortDate = new Date(cohort.cohort_month);
      
      if (viewMode === 'annual') {
        aggregatedLabel = cohortDate.getFullYear().toString();
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
    
    const aggregatedCohorts = Array.from(aggregatedMap.values());
    
    return aggregatedCohorts.sort((a, b) => {
      // Sort by label (chronologically)
      if (viewMode === 'annual') {
        // Handle "Pre-2020" or "≤ 2019" labels
        if (a.label.startsWith('Pre-') || a.label.startsWith('≤')) return -1;
        if (b.label.startsWith('Pre-') || b.label.startsWith('≤')) return 1;
        return parseInt(a.label) - parseInt(b.label);
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

  /**
   * CANONICAL DEFINITION: Trend Data Generation
   * 
   * Generates time series data for trend charts showing Current vs Previous period comparisons.
   * 
   * Data Structure:
   * - One data point per time period (year/quarter/month based on viewMode)
   * - Each point aggregates revenue/customers across ALL cohorts for that time period
   * - Number of points = number of unique time periods in filteredCohorts
   * 
   * Current vs Previous Logic:
   * - Current: Revenue/customers in this time period (aggregated across all cohorts)
   * - Previous: Revenue/customers in equivalent period from previous year
   *   - Uses getPreviousPeriodKey to determine previous period:
   *     - Annual: year - 1
   *     - Quarterly: Previous quarter (Q1 → previous year Q4, etc.)
   *     - Monthly: Previous month
   * 
   * Period Key Format:
   * - Annual: "2025" (year only)
   * - Quarterly: "2025-Q1"
   * - Monthly: "2025-01" (YYYY-MM)
   * 
   * Filtering:
   * - Excludes "Pre-2020" periods from chart display
   * - Uses filteredCohorts (already filtered by dateRange if present)
   */
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
        } else if (viewMode === 'quarterly') {
          if (keyA.startsWith('Pre-') || keyA.startsWith('≤')) return -1;
          if (keyB.startsWith('Pre-') || keyB.startsWith('≤')) return 1;
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
      const previousData: (number | null)[] = [];
      const labels: string[] = [];

      periodsForChart.forEach(([periodKey, revenueInPeriod]) => {
        // Current: revenue in this time period
        currentData.push(revenueInPeriod);
        
        // Previous: revenue in the equivalent period from previous year (lifecycle-aligned)
        // Monthly: compare month t to month t-12 (same month, previous year)
        // Quarterly: compare quarter t to quarter t-4 (same quarter, previous year)
        // Annual: compare year t to year t-1 (previous year)
        const prevPeriodKey = getSamePeriodLastYear(periodKey, viewMode);
        const prevPeriodRevenue = periodMap.get(prevPeriodKey);
        // Use null instead of 0 to indicate missing data (will show as gap)
        previousData.push(prevPeriodRevenue !== null && prevPeriodRevenue !== undefined ? prevPeriodRevenue : null);
        
        // Format label for display
        if (viewMode === 'annual') {
          labels.push(periodKey);
        } else if (viewMode === 'quarterly') {
          const [year, quarter] = periodKey.split('-Q');
          labels.push(`Q${quarter} ${year.substring(2)}`);
        } else {
          const [year, month] = periodKey.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          labels.push(`${monthNames[parseInt(month) - 1]} ${year.substring(2)}`);
        }
      });

      return { currentData, previousData, labels };
    };
  }, [filteredCohorts, viewMode, getSamePeriodLastYear]);

  /**
   * CANONICAL DEFINITION: Current Period Key (Last Complete Period)
   * 
   * Determines the most recent fully completed calendar period for use as "Current Period"
   * when dateRange is absent.
   * 
   * "Complete Period" Semantics:
   * - Monthly: Last fully completed month (excludes current month-to-date)
   * - Quarterly: Last fully completed quarter (excludes current quarter-to-date)
   * - Annual: Last fully completed year (excludes current year-to-date)
   * 
   * Logic:
   * 1. Derive current period key from today's date
   * 2. Filter out periods >= current period (incomplete periods)
   * 3. Exclude Pre-2020 and ≤ buckets
   * 4. Return the latest complete period available
   * 5. Fallback to latest available period if no complete period exists
   */
  const currentPeriodKey = React.useMemo(() => {
    if (filteredCohorts.length === 0) return '';
    
    const periodRevenueMap = new Map<string, { revenue: number; customers: number }>();
    
    filteredCohorts.forEach((cohort) => {
      cohort.periods.forEach((period) => {
        const orderDate = new Date(period.order_month);
        let periodKey: string;
        
        if (viewMode === 'annual') {
          periodKey = orderDate.getFullYear().toString();
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
    
    // Derive current period key from today's date (incomplete period to exclude)
    const now = new Date();
    let currentPeriodKeyToExclude: string;
    
    if (viewMode === 'annual') {
      currentPeriodKeyToExclude = now.getFullYear().toString();
    } else if (viewMode === 'quarterly') {
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      currentPeriodKeyToExclude = `${currentYear}-Q${currentQuarter}`;
    } else {
      // Monthly: YYYY-MM format
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      currentPeriodKeyToExclude = `${year}-${month}`;
    }
    
    const sortedPeriods = Array.from(periodRevenueMap.keys()).sort((a, b) => {
      if (viewMode === 'annual') {
        return parseInt(a) - parseInt(b);
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
    
    // Filter out Pre-2020 and ≤ buckets, and exclude current incomplete period
    const periodsForComparison = sortedPeriods.filter(key => {
      // Exclude Pre-2020 and ≤ buckets
      if (key.startsWith('Pre-') || key.startsWith('≤')) return false;
      
      // Exclude current incomplete period (period >= currentPeriodKeyToExclude)
      if (viewMode === 'annual') {
        const keyYear = parseInt(key);
        const currentYear = parseInt(currentPeriodKeyToExclude);
        return keyYear < currentYear;
      } else if (viewMode === 'quarterly') {
        const [keyYear, keyQuarter] = key.split('-Q');
        const [currentYear, currentQuarter] = currentPeriodKeyToExclude.split('-Q');
        const keyYearNum = parseInt(keyYear);
        const currentYearNum = parseInt(currentYear);
        if (keyYearNum < currentYearNum) return true;
        if (keyYearNum > currentYearNum) return false;
        return parseInt(keyQuarter) < parseInt(currentQuarter);
      } else {
        // Monthly: string comparison works for YYYY-MM format
        return key < currentPeriodKeyToExclude;
      }
    });
    
    // Return the latest complete period, or fallback to latest available if none exists
    if (periodsForComparison.length > 0) {
      return periodsForComparison[periodsForComparison.length - 1];
    }
    
    // Fallback: if no complete period exists (edge case - e.g., only current period in data),
    // return the latest available period excluding Pre-2020
    const allPeriodsExcludingPre2020 = sortedPeriods.filter(key => 
      !key.startsWith('Pre-') && !key.startsWith('≤')
    );
    
    return allPeriodsExcludingPre2020[allPeriodsExcludingPre2020.length - 1] || '';
  }, [filteredCohorts, viewMode]);

  /**
   * CANONICAL DEFINITION: Get Cohort Revenues for Current Period
   * 
   * Calculates revenue per cohort for the Current Period only, ensuring alignment with
   * the canonical Current Period definition used by totalRevenue.
   * 
   * Time Window Logic (matches totalRevenue calculation):
   * - When dateRange is present: Filters revenue where order_month falls within dateRange
   *   (same as totalRevenue when dateRange exists)
   * - When dateRange is absent: Filters revenue where periodKey matches currentPeriodKey
   *   (last complete period from trend chart, excluding Pre-2020)
   *   (same as totalRevenue when dateRange is absent - uses last trend data point)
   * 
   * This ensures all "Top cohort" metrics and share calculations use the same time window
   * as totalRevenue, providing consistent metrics across the page.
   * 
   * Returns: Array of { label: string, revenue: number } sorted by revenue descending
   */
  const getCohortRevenuesForCurrentPeriod = React.useMemo(() => {
    if (filteredCohorts.length === 0) {
      return [];
    }

    const cohortRevenues: Array<{ label: string; revenue: number }> = [];

    filteredCohorts.forEach((cohort) => {
      // Determine cohort label based on viewMode
      let cohortLabel: string;
      const cohortDate = new Date(cohort.cohort_month);
      
      if (viewMode === 'annual') {
        cohortLabel = cohortDate.getFullYear().toString();
      } else if (viewMode === 'quarterly') {
        const year = cohortDate.getFullYear();
        const quarter = Math.floor(cohortDate.getMonth() / 3) + 1;
        cohortLabel = `${year}-Q${quarter}`;
      } else {
        cohortLabel = cohort.cohort_month;
      }
      
      // Sum revenue from periods that match the Current Period
      let revenueInPeriod = 0;
      
      if (dateRange) {
        // When dateRange is present: filter by dateRange (same logic as totalRevenue)
        cohort.periods.forEach((period) => {
          const orderDate = new Date(period.order_month);
          if (isDateInRange(orderDate, dateRange)) {
            revenueInPeriod += period.total_revenue;
          }
        });
      } else {
        // When dateRange is absent: filter by currentPeriodKey (last complete period)
        // currentPeriodKey is calculated separately and represents the last period
        // from the trend chart (excluding Pre-2020)
        if (!currentPeriodKey) {
          return; // Skip if no current period key available
        }
        
        cohort.periods.forEach((period) => {
          const orderDate = new Date(period.order_month);
          let periodKey: string;
          
          if (viewMode === 'annual') {
            periodKey = orderDate.getFullYear().toString();
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
      }
      
      if (revenueInPeriod > 0) {
        // Check if cohort already exists (for aggregated cohorts like Pre-2020)
        const existing = cohortRevenues.find(c => c.label === cohortLabel);
        if (existing) {
          existing.revenue += revenueInPeriod;
        } else {
          cohortRevenues.push({
            label: cohortLabel,
            revenue: revenueInPeriod
          });
        }
      }
    });
    
    // Sort by revenue descending
    return cohortRevenues.sort((a, b) => b.revenue - a.revenue);
  }, [filteredCohorts, viewMode, dateRange, currentPeriodKey, isDateInRange]);

  /**
   * CANONICAL DEFINITION: Top Cohorts Leaderboard
   * 
   * Returns top 5 cohorts by revenue in Current Period only.
   * 
   * Time Window: Uses getCohortRevenuesForCurrentPeriod() which aligns with totalRevenue:
   * - When dateRange is present: Revenue within dateRange
   * - When dateRange is absent: Revenue in last complete period (currentPeriodKey)
   * 
   * Share calculations use the same totalRevenue as Current Period definition.
   */
  const getTopCohorts = React.useMemo(() => {
    const cohortRevenues = getCohortRevenuesForCurrentPeriod;
    
    if (cohortRevenues.length === 0) {
      // Return dummy top cohorts
      const dummyCohorts = [
        { label: '2024-10', revenue: 245000 },
        { label: '2024-09', revenue: 230000 },
        { label: '2024-08', revenue: 215000 },
        { label: '2024-07', revenue: 200000 },
        { label: '2024-06', revenue: 185000 },
      ];
      const dummyTotal = dummyCohorts.reduce((sum, c) => sum + c.revenue, 0) + 500000; // Add others
      return dummyCohorts.map(c => ({
        month: c.label,
        revenue: c.revenue,
        share: (c.revenue / dummyTotal) * 100
      }));
    }
    
    const totalRevenueInPeriod = cohortRevenues.reduce((sum, c) => sum + c.revenue, 0);
    
    // Get top 5 (cohortRevenues is already sorted by revenue descending)
    const top5Cohorts = cohortRevenues
      .slice(0, 5)
      .map(c => ({
        month: c.label,
        revenue: c.revenue,
        share: totalRevenueInPeriod > 0 ? (c.revenue / totalRevenueInPeriod) * 100 : 0
      }));
    
    return top5Cohorts;
  }, [getCohortRevenuesForCurrentPeriod]);

  /**
   * CANONICAL DEFINITION: Active Cohorts Count
   * 
   * Counts cohorts with revenue in Current Period (for "Top X of Y" display).
   * 
   * Time Window: Uses getCohortRevenuesForCurrentPeriod() which aligns with totalRevenue.
   * Returns the count of cohorts with >0 revenue in Current Period.
   */
  const cohortsInCurrentPeriodCount = React.useMemo(() => {
    const cohortRevenues = getCohortRevenuesForCurrentPeriod;
    return cohortRevenues.filter(c => c.revenue > 0).length;
  }, [getCohortRevenuesForCurrentPeriod]);

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

  /**
   * CANONICAL DEFINITION: Current Period vs Previous Period Comparison
   * 
   * Rule Set:
   * 
   * 1. When dateRange is present:
   *    - Current Period: All revenue/customers where order_month falls within dateRange
   *    - Previous Period: All revenue/customers where order_month falls within getPreviousPeriodRange(dateRange)
   *    - Previous Range Calculation: Equal-length period immediately before the selected range
   *    - Incomplete Periods: Include all data available in the range (no filtering for completeness)
   *    - Uses ALL cohorts (not filtered) to calculate previous period to ensure complete comparison
   * 
   * 2. When dateRange is absent:
   *    - Current Period: Last data point in trendData.currentData array
   *    - Previous Period: Last data point in trendData.previousData array
   *    - Trend Data: Aggregated by time period (year/quarter/month) across all cohorts
   *    - Previous Period Logic: Same period, previous year (or equivalent based on viewMode)
   * 
   * 3. For cohortType=annual:
   *    - Periods are whole years
   *    - Previous period is always previous year
   *    - Incomplete years: Current year excluded from comparisons if incomplete
   * 
   * 4. For cohortType=monthly/quarterly:
   *    - Periods match the cohort type
   *    - Previous period uses getPreviousPeriodKey logic (previous month/quarter)
   *    - Incomplete periods: Current period included if it has data
   * 
   * 5. Incomplete Cohorts Handling:
   *    - Always include cohorts with at least one period of data
   *    - Do not exclude incomplete cohorts from calculations
   *    - For CAGR: Exclude incomplete periods (current year/quarter) from CAGR calculation
   */
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
  
  /**
   * CANONICAL DEFINITION: Cohort Coverage Metrics
   * 
   * Calculates Top cohort metrics and revenue shares using Current Period revenue only.
   * 
   * Time Window: Uses getCohortRevenuesForCurrentPeriod() which aligns with totalRevenue:
   * - When dateRange is present: Revenue within dateRange
   * - When dateRange is absent: Revenue in last complete period (currentPeriodKey)
   * 
   * All share calculations use the same totalRevenue as Current Period definition,
   * ensuring consistency across all metrics on the page.
   */
  const cohortCoverage = React.useMemo(() => {
    const cohortRevenues = getCohortRevenuesForCurrentPeriod;
    
    if (cohortRevenues.length === 0) {
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
    
    // Count active cohorts (with >0 revenue in Current Period)
    const activeCount = cohortRevenues.filter(c => c.revenue > 0).length;
    
    // Total revenue is sum of all cohorts' revenue in Current Period
    // This matches the totalRevenue calculation when dateRange is absent
    // (when dateRange is present, totalRevenue uses dateRange directly)
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
    // cohortRevenues is already sorted by revenue descending
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
      topCohort: topCohort ? [{ label: topCohort.label, revenue: topCohort.revenue }] : [],
      top3Share: (top3Revenue / totalRevenue) * 100,
      top3Revenue,
      top3Cohorts: top3Cohorts.map(c => ({ label: c.label, revenue: c.revenue })),
      top10Share: (top10Revenue / totalRevenue) * 100,
      top10Revenue,
      top10Cohorts: top10Cohorts.map(c => ({ label: c.label, revenue: c.revenue })),
      othersShare: (othersRevenue / totalRevenue) * 100,
      othersRevenue,
      othersCohorts: othersCohorts.map(c => ({ label: c.label, revenue: c.revenue })),
      totalRevenue
    };
  }, [getCohortRevenuesForCurrentPeriod]);

  // Get period name for subtitles (year/quarter/month)
  const getPeriodName = React.useMemo(() => {
    const periodMap: Record<'monthly' | 'quarterly' | 'annual', string> = {
      'monthly': 'month',
      'quarterly': 'quarter',
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
    <div className="w-full min-w-0 max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header with Narrative Framing */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Revenue Cohorts</h1>
        <p className="text-lg font-semibold text-gray-700 mb-2">The Lie Detector</p>
        <p className="text-sm text-gray-600 max-w-3xl">
          Is revenue compounding or are we constantly filling a leaky bucket? 
          Even though we're growing and it's real growth, the growth itself may be fragile. 
          Are newer cohorts decaying faster than older ones? Are we destroying LTV because customers who buy now are not as loyal or have lower AOV?
        </p>
      </div>

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

      {/* AI Analysis Section - Gated behind feature flag */}
      {process.env.NEXT_PUBLIC_ENABLE_AI_ANALYSIS === "true" && (
        <div className="mb-8">
          <AIAnalysis 
            filters={filterState}
            cohorts={filteredCohorts}
            onRegenerate={fetchCohorts}
          />
        </div>
      )}

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
                  : 'bg-gray-100 text-gray-700'
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
                  <span>Current {getPeriodName}</span>
                </div>
                <div className="text-base font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 flex-shrink-0"></div>
                  <span>Same {getPeriodName} last year</span>
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
                  : 'bg-gray-100 text-gray-700'
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
                  <span>Current {getPeriodName}</span>
                </div>
                <div className="text-base font-bold text-gray-900">{formatNumber(totalCustomers)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 flex-shrink-0"></div>
                  <span>Same {getPeriodName} last year</span>
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
      <div className="mb-8 min-w-0">
        <CohortMatrix 
          cohorts={filteredCohorts}
          viewMode={viewMode}
          onCellClick={(cohort, period, data) => {
            console.log('Cell clicked:', { cohort, period, data });
          }}
        />
      </div>

      {/* Diagnosis Section */}
      {(() => {
        const enhancedDiagnosis = diagnoseRevenueCohortsEnhanced({
          cohorts: filteredCohorts,
          totalRevenue,
          previousRevenue,
          totalCustomers,
          previousCustomers,
          cohortCoverage,
        });
        
        // Always show Diagnosis (with empty state if suppressed)
        // Only show Decision Axes and Impact Ranges when diagnosis exists
        return (
          <>
            <Diagnosis sentence={enhancedDiagnosis.sentence} showEmptyState={true} />
            
            {/* Severity Indicator - Only render when severity exists */}
            {enhancedDiagnosis.severity && (
              <SeverityIndicator severity={enhancedDiagnosis.severity} />
            )}
            
            {/* Causality Section - Only render when causality factors exist */}
            {enhancedDiagnosis.causality.length > 0 && (
              <CausalitySection 
                factors={enhancedDiagnosis.causality}
                framingCopy="Based on the patterns observed, these are the likely structural drivers:"
              />
            )}
            
            {/* Decision Axes Section - Only render when Diagnosis exists */}
            {enhancedDiagnosis.sentence && (
              <DecisionAxes 
                axes={getDecisionAxesForDiagnosis(enhancedDiagnosis.sentence, 'revenue-cohorts')}
              />
            )}
            
            {/* Impact Ranges Section - Only render when Diagnosis exists */}
            {enhancedDiagnosis.sentence && (
              <ImpactRanges 
                ranges={computeRevenueCohortsImpactRanges({
                  cohorts: filteredCohorts,
                  totalRevenue,
                  totalCustomers,
                })}
              />
            )}
          </>
        );
      })()}
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