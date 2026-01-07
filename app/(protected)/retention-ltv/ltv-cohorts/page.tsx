"use client";

import * as React from "react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { ltvCurvesV1Filters, retentionCurvesSearch } from "@/lib/filters/config";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  TrendingUp,
  Download,
  Users,
  DollarSign,
  Info,
  BarChart3,
} from "lucide-react";
import { DemoBanner } from "@/components/ui/DemoBanner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterValue } from "@/lib/filters/types";
import {
  ChartTooltip,
} from "@/components/ui/chart";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChartErrorBoundary } from "@/components/charts/ChartErrorBoundary";
// Standardizing tooltip styling to match Revenue Cohorts tooltip for consistency
import { StandardTooltip, TooltipRow } from "@/components/charts/StandardTooltip";

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
    is_demo?: boolean;
  };
  error?: string;
}

interface LTVPeriodData {
  bucket: number;
  bucketLabel: string;
  ltv: number | null;
  cohortSize: number;
}

interface CohortLTVData {
  cohortLabel: string;
  cohortMonth: string;
  cohortSize: number;
  clr: number | null; // CLR = LTV at last fully observed bucket
  clrBucket: number | null; // Bucket index where CLR is measured
  clrBucketLabel: string | null; // Bucket label where CLR is measured
  maxObservedBucket: number; // Highest bucket index with real data (not inferred)
  buckets: Array<{
    bucket: number;
    bucketLabel: string;
    ltv: number | null; // null for missing data or non-monotonic
    nullReason?: 'missing' | 'non_monotonic'; // Reason for null (if applicable)
  }>;
}

// TODO: Re-add chartConfig when chart styling is customized
const isDev = process.env.NODE_ENV !== 'production';
// Gate monotonic warnings behind DEBUG flag or only log once per cohort
const DEBUG_LTV_MONOTONIC = process.env.NEXT_PUBLIC_DEBUG_LTV_MONOTONIC === 'true';

function CLRLTVCohortsContent() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  // TODO: Re-add filterState when needed for local filter state management
  const [_filterState, setFilterState] = useState<Record<string, FilterValue>>({});
  const [viewMode, setViewMode] = useState<'aggregated' | 'cohort'>('aggregated');
  const [hoveredCohort, setHoveredCohort] = useState<string | null>(null);
  const [showCohorts, setShowCohorts] = useState<Set<string>>(new Set());
  const [cohortSearchQuery, setCohortSearchQuery] = useState<string>("");
  const [tableExpanded, setTableExpanded] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lastQueryStringRef = React.useRef<string>('');
  // Track which cohorts have already been warned about monotonicity issues (reduce console noise)
  const warnedCohortsRef = React.useRef<Set<string>>(new Set());

  // Get cohort type from URL (default to annual)
  const cohortType = React.useMemo(() => {
    const type = searchParams.get('cohortType');
    if (type && ['monthly', 'quarterly', 'half-year', 'annual'].includes(type)) {
      return type as 'monthly' | 'quarterly' | 'half-year' | 'annual';
    }
    return 'annual';
  }, [searchParams]);

  // Helper: Get time bucket unit label
  const getTimeBucketUnit = React.useCallback((): string => {
    if (cohortType === 'annual') return 'year';
    if (cohortType === 'quarterly') return 'quarter';
    if (cohortType === 'half-year') return 'half-year';
    return 'month';
  }, [cohortType]);

  // Helper: Generate time bucket label (M1, Q3, Y2, Week 6, etc.)
  const getTimeBucketLabel = React.useCallback((bucketIndex: number): string => {
    const unit = getTimeBucketUnit();
    if (unit === 'year') {
      return bucketIndex === 0 ? 'Y0' : `Y${bucketIndex}`;
    } else if (unit === 'quarter') {
      return `Q${bucketIndex + 1}`;
    } else if (unit === 'half-year') {
      return bucketIndex === 0 ? 'H1' : `H${bucketIndex + 1}`;
    } else if (unit === 'month') {
      return `M${bucketIndex + 1}`;
    }
    return `B${bucketIndex}`;
  }, [getTimeBucketUnit]);

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
      // monthly format: "2024-01", "2024-02", etc.
      const month = String(cohortDate.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
  }, [cohortType]);

  // Helper: Convert period_number (months) to bucket index
  const convertPeriodToBucket = React.useCallback((periodNumberMonths: number): number => {
    if (cohortType === 'annual') {
      return Math.floor(periodNumberMonths / 12);
    } else if (cohortType === 'quarterly') {
      return Math.floor(periodNumberMonths / 3);
    } else if (cohortType === 'half-year') {
      return Math.floor(periodNumberMonths / 6);
    } else {
      return periodNumberMonths;
    }
  }, [cohortType]);

  // Fetch cohorts data
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
      setIsDemo(data.data.is_demo || false);
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

  // Clean URL params: Remove unsupported filters (geography, productCategory, customerSegment, customerType)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const supportedParams = ['cohortType', 'dateRange', 'limit', 'cohort_month'];
    let hasChanges = false;
    
    // Remove unsupported params
    for (const [key] of params.entries()) {
      if (!supportedParams.includes(key) && !key.startsWith('dateRange_')) {
        params.delete(key);
        hasChanges = true;
      }
    }
    
    // Ensure cohortType is set (default to 'annual')
    if (!params.get('cohortType')) {
      params.set('cohortType', 'annual');
      hasChanges = true;
    }
    
    if (hasChanges) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  // Generate dummy LTV data for development
  // Always produces monotonic non-decreasing cumulative LTV per cohort
  // Note: total_revenue in periods should be INCREMENTAL (per period), not cumulative
  // The normalization step will sum these incrementally to build cumulative LTV
  const generateDummyLTVData = (): CohortData[] => {
    const cohorts: CohortData[] = [];
    const baseDate = new Date('2020-01-01');
    
    for (let i = 0; i < 5; i++) {
      const cohortDate = new Date(baseDate);
      cohortDate.setFullYear(baseDate.getFullYear() + i);
      
      const cohortSize = 100 + Math.floor(Math.random() * 200);
      const periods: CohortData['periods'] = [];
      
      // Generate incremental revenue per period (always >= 0)
      // This ensures that when normalized, cumulative LTV will be monotonic
      
      // Generate periods up to 36 months
      for (let month = 0; month <= 36; month++) {
        const periodDate = new Date(cohortDate);
        periodDate.setMonth(periodDate.getMonth() + month);
        
        // Generate incremental revenue for this period (non-negative, decreasing over time)
        const baseIncrementalRevenue = cohortSize * (30 + Math.random() * 40);
        const decayFactor = Math.max(0.1, 1 - (month * 0.02)); // Slowing growth, but never negative
        const incrementalRevenue = Math.max(0, baseIncrementalRevenue * decayFactor);
        
        // Store INCREMENTAL revenue (not cumulative)
        // Normalization will sum these to create cumulative LTV
        periods.push({
          period_number: month,
          order_month: periodDate.toISOString().split('T')[0],
          active_customers: Math.floor(cohortSize * (0.8 - month * 0.02)),
          total_orders: Math.floor(cohortSize * (1 + month * 0.3)),
          total_revenue: Math.floor(incrementalRevenue), // Incremental revenue per period
          retention_rate_percent: Math.max(10, 100 - month * 2),
        });
      }
      
      cohorts.push({
        cohort_month: cohortDate.toISOString().split('T')[0],
        cohort_size: cohortSize,
        periods,
      });
    }
    
    return cohorts;
  };

  // Calculate max possible bucket based on oldest cohort
  const maxPossibleBucket = React.useMemo(() => {
    if (cohorts.length === 0) return 0;
    
    const oldestCohortDate = cohorts.reduce((oldest, cohort) => {
      const cohortDate = new Date(cohort.cohort_month);
      return cohortDate < oldest ? cohortDate : oldest;
    }, new Date(cohorts[0].cohort_month));

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
  }, [cohorts, cohortType]);

  // Normalize cohort data to LTV format (cumulative revenue per customer)
  // Group cohorts by their cohortType label (e.g., all 2019 months → one "2019" cohort)
  const normalizedCohortLTVData = React.useMemo((): CohortLTVData[] => {
    if (cohorts.length === 0) return [];
    
    // Group cohorts by their cohort label (based on cohortType)
    const cohortGroups = new Map<string, typeof cohorts>();
    
    cohorts.forEach(cohort => {
      const label = getCohortLabel(cohort.cohort_month);
      if (!cohortGroups.has(label)) {
        cohortGroups.set(label, []);
      }
      cohortGroups.get(label)!.push(cohort);
    });
    
    // Process each group into a single cohort LTV data
    return Array.from(cohortGroups.entries()).map(([cohortLabel, groupCohorts]) => {
      const buckets: CohortLTVData['buckets'] = [];
      let lastObservedLTV: number | null = null;
      
      // Aggregate all periods from all cohorts in this group
      const bucketMap = new Map<number, number>();
      let totalCohortSize = 0;
      let earliestCohortMonth = groupCohorts[0].cohort_month;
      
      groupCohorts.forEach(cohort => {
        totalCohortSize += cohort.cohort_size;
        
        // Track earliest cohort month for sorting
        if (new Date(cohort.cohort_month) < new Date(earliestCohortMonth)) {
          earliestCohortMonth = cohort.cohort_month;
        }
        
        // Calculate cumulative revenue per period for this cohort
        const sortedPeriods = [...cohort.periods].sort((a, b) => a.period_number - b.period_number);
        let cumulativeRevenue = 0;
        
        sortedPeriods.forEach(period => {
          cumulativeRevenue += period.total_revenue; // Cumulative sum
          const bucket = convertPeriodToBucket(period.period_number);
          
          // Aggregate LTV across all cohorts in group (weighted by cohort size)
          if (!bucketMap.has(bucket)) {
            bucketMap.set(bucket, 0);
          }
          const cohortLTV = cohort.cohort_size > 0 ? cumulativeRevenue / cohort.cohort_size : 0;
          bucketMap.set(bucket, bucketMap.get(bucket)! + (cohortLTV * cohort.cohort_size));
        });
      });
      
      // Normalize aggregated LTV by total cohort size
      if (totalCohortSize > 0) {
        bucketMap.forEach((weightedSum, bucket) => {
          bucketMap.set(bucket, weightedSum / totalCohortSize);
        });
      }
      
      // Build buckets array with monotonicity enforcement
      // Cumulative LTV should not decrease. If a bucket appears lower, it's typically partial/incomplete data; we break the line by setting null.
      let previousLTV: number | null = null;
      let maxObservedBucket = -1; // Track highest bucket with real data (for maturity gating)
      for (let bucket = 0; bucket <= maxPossibleBucket; bucket++) {
        const ltv = bucketMap.get(bucket);
        if (ltv !== undefined) {
          // Enforce monotonicity: if current LTV is lower than previous by more than tolerance, treat as incomplete/partial data
          const TOLERANCE = 0.001;
          if (previousLTV !== null && ltv < previousLTV - TOLERANCE) {
            // DEV-only: log warning once per cohort (reduce console noise)
            const warningKey = `${cohortLabel}-monotonic`;
            if (isDev && (DEBUG_LTV_MONOTONIC || !warnedCohortsRef.current.has(warningKey))) {
              console.warn(`⚠️ Non-monotonic LTV detected in cohort ${cohortLabel} at bucket ${bucket}:`, {
                previous: previousLTV,
                current: ltv,
                difference: previousLTV - ltv,
                action: 'Setting to null (line break)',
              });
              warnedCohortsRef.current.add(warningKey);
            }
            // Break the line - set to null for non-monotonic data
            buckets.push({
              bucket,
              bucketLabel: getTimeBucketLabel(bucket),
              ltv: null,
              nullReason: 'non_monotonic',
            });
            // maxObservedBucket already set to previous valid bucket, stop here
            break;
          } else {
            // Valid monotonic point
            buckets.push({
              bucket,
              bucketLabel: getTimeBucketLabel(bucket),
              ltv,
            });
            previousLTV = ltv;
            lastObservedLTV = ltv;
            maxObservedBucket = bucket; // Update max observed bucket
          }
        } else {
          // Missing data - add null for line break
          buckets.push({
            bucket,
            bucketLabel: getTimeBucketLabel(bucket),
            ltv: null,
            nullReason: 'missing',
          });
          // maxObservedBucket remains at last valid bucket (or -1 if no valid buckets yet)
        }
      }
      
      // Ensure maxObservedBucket is set correctly (should be >= 0 if we have any data)
      if (maxObservedBucket === -1 && lastObservedLTV !== null) {
        // If we have LTV data but maxObservedBucket wasn't set, find the last bucket with data
        for (let i = buckets.length - 1; i >= 0; i--) {
          if (buckets[i].ltv !== null) {
            maxObservedBucket = buckets[i].bucket;
            break;
          }
        }
      }
      
      // CLR = LTV at last fully observed bucket (matured cohorts only)
      // CLR is measured at maxObservedBucket (last bucket with real data that meets maturity/coverage rules)
      const clr = lastObservedLTV;
      const clrBucket = maxObservedBucket >= 0 ? maxObservedBucket : null;
      const clrBucketLabel = clrBucket !== null ? getTimeBucketLabel(clrBucket) : null;
      
      return {
        cohortLabel,
        cohortMonth: earliestCohortMonth,
        cohortSize: totalCohortSize,
        clr,
        clrBucket,
        clrBucketLabel,
        maxObservedBucket,
        buckets,
      };
    }).sort((a, b) => {
      // Sort by cohort month (earliest first)
      return new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime();
    });
  }, [cohorts, getCohortLabel, convertPeriodToBucket, getTimeBucketLabel, maxPossibleBucket]);

  // Compute aggregated LTV curve data (weighted by cohort size)
  // Maturity gating: only include cohorts with maxObservedBucket >= N for bucket N
  // Coverage threshold: stop series when <60% of cohorts have data for a bucket
  // Enforce monotonicity: if aggregated LTV decreases, set to null (line break)
  const aggregatedLTVData = React.useMemo((): LTVPeriodData[] => {
    if (normalizedCohortLTVData.length === 0) return [];
    
    const result: LTVPeriodData[] = [];
    const totalCohortSize = normalizedCohortLTVData.reduce((sum, c) => sum + c.cohortSize, 0);
    
    if (totalCohortSize === 0) return [];
    
    // Calculate coverage threshold: 60% of cohorts must have data
    const totalCohorts = normalizedCohortLTVData.length;
    const coverageThreshold = Math.ceil(totalCohorts * 0.6);
    
    let previousLTV: number | null = null;
    const TOLERANCE = 0.001;
    
    for (let bucket = 0; bucket <= maxPossibleBucket; bucket++) {
      let weightedSum = 0;
      let totalWeight = 0;
      let eligibleCohortCount = 0;
      
      // Maturity gating: only include cohorts with maxObservedBucket >= bucket
      normalizedCohortLTVData.forEach(cohort => {
        // Only include cohorts that have reached this bucket (maturity check)
        if (cohort.maxObservedBucket >= bucket) {
          eligibleCohortCount++;
          const bucketData = cohort.buckets.find(b => b.bucket === bucket);
          if (bucketData && bucketData.ltv !== null) {
            const weight = cohort.cohortSize;
            weightedSum += bucketData.ltv * weight;
            totalWeight += weight;
          }
        }
      });
      
      // Coverage threshold stop rule: stop if <60% of cohorts have data for this bucket
      if (eligibleCohortCount < coverageThreshold) {
        break; // Stop the series - not enough cohorts have data
      }
      
      if (totalWeight > 0) {
        const aggregatedLTV = weightedSum / totalWeight;
        
        // Enforce monotonicity for aggregated data
        if (previousLTV !== null && aggregatedLTV < previousLTV - TOLERANCE) {
          // DEV-only: log warning once (reduce console noise)
          const warningKey = 'aggregated-monotonic';
          if (isDev && (DEBUG_LTV_MONOTONIC || !warnedCohortsRef.current.has(warningKey))) {
            console.warn(`⚠️ Non-monotonic aggregated LTV at bucket ${bucket}:`, {
              previous: previousLTV,
              current: aggregatedLTV,
              difference: previousLTV - aggregatedLTV,
              action: 'Setting to null (line break)',
            });
            warnedCohortsRef.current.add(warningKey);
          }
          // Break the line
          result.push({
            bucket,
            bucketLabel: getTimeBucketLabel(bucket),
            ltv: null,
            cohortSize: totalCohortSize,
          });
          break; // Stop series after monotonicity violation
        } else {
          result.push({
            bucket,
            bucketLabel: getTimeBucketLabel(bucket),
            ltv: aggregatedLTV,
            cohortSize: totalCohortSize,
          });
          previousLTV = aggregatedLTV;
        }
      } else {
        // No data for this bucket (but enough cohorts are eligible)
        // This shouldn't happen if maturity gating works correctly, but handle gracefully
        result.push({
          bucket,
          bucketLabel: getTimeBucketLabel(bucket),
          ltv: null,
          cohortSize: totalCohortSize,
        });
        break; // Stop series if no data despite eligible cohorts
      }
    }
    
    return result;
  }, [normalizedCohortLTVData, maxPossibleBucket, getTimeBucketLabel]);

  // Determine LTV horizons: midpoint + last fully observed bucket
  // Uses aggregated series as single source of truth for available buckets
  const ltvHorizons = React.useMemo(() => {
    // Find available buckets (non-null, finite) from aggregated data (single source of truth)
    const availableBuckets = aggregatedLTVData
      .filter(d => d.ltv !== null && isFinite(d.ltv))
      .map(d => d.bucket)
      .sort((a, b) => a - b);
    
    if (availableBuckets.length === 0) {
      return { 
        lastBucket: null, 
        midBucket: null, 
        lastLabel: null, 
        midLabel: null 
      };
    }
    
    // Last fully observed bucket = highest bucket index with non-null LTV
    const lastBucket = availableBuckets[availableBuckets.length - 1];
    const lastIndex = availableBuckets.length - 1;
    
    // Midpoint bucket = floor(lastIndex / 2), but must be >= 1 (never Y0/H0/Q0/M0)
    // Use the index in the sorted array, not the bucket value
    const midIndex = Math.max(1, Math.floor(lastIndex / 2));
    const midBucket = availableBuckets[midIndex];
    
    // Ensure midBucket is at least bucket 1 (never bucket 0)
    const finalMidBucket = midBucket >= 1 ? midBucket : (availableBuckets.find(b => b >= 1) ?? null);
    
    return {
      lastBucket,
      midBucket: finalMidBucket,
      lastLabel: lastBucket !== null ? getTimeBucketLabel(lastBucket) : null,
      midLabel: finalMidBucket !== null ? getTimeBucketLabel(finalMidBucket) : null,
    };
  }, [aggregatedLTVData, getTimeBucketLabel]);

  // Calculate KPIs (weighted by cohort size)
  const kpiMetrics = React.useMemo(() => {
    if (normalizedCohortLTVData.length === 0) {
      return {
        avgCLR: null,
        avgLTVLast: null,
        avgLTVMid: null,
        activeCohorts: 0,
        lastLabel: null,
        midLabel: null,
      };
    }
    
    const totalCohortSize = normalizedCohortLTVData.reduce((sum, c) => sum + c.cohortSize, 0);
    if (totalCohortSize === 0) {
      return {
        avgCLR: null,
        avgLTVLast: null,
        avgLTVMid: null,
        activeCohorts: normalizedCohortLTVData.length,
        lastLabel: ltvHorizons.lastLabel,
        midLabel: ltvHorizons.midLabel,
      };
    }
    
    // Avg CLR (only from matured cohorts with CLR)
    // CLR bucket label: use the last bucket of aggregated series as representative bucket
    // (since CLR is measured at the last bucket that meets maturity/coverage rules)
    const maturedCohorts = normalizedCohortLTVData.filter(c => c.clr !== null);
    const maturedTotalSize = maturedCohorts.reduce((sum, c) => sum + c.cohortSize, 0);
    const avgCLR = maturedTotalSize > 0
      ? maturedCohorts.reduce((sum, c) => sum + (c.clr! * c.cohortSize), 0) / maturedTotalSize
      : null;
    
    // CLR bucket label: use last bucket of aggregated series (where maturity/coverage rules stop the series)
    const clrBucketLabel = ltvHorizons.lastLabel;
    
    // Avg LTV at last and midpoint buckets (from aggregated data - single source of truth)
    const ltvLast = ltvHorizons.lastBucket !== null 
      ? aggregatedLTVData.find(d => d.bucket === ltvHorizons.lastBucket) 
      : null;
    const ltvMid = ltvHorizons.midBucket !== null 
      ? aggregatedLTVData.find(d => d.bucket === ltvHorizons.midBucket) 
      : null;
    
    return {
      avgCLR,
      clrBucketLabel, // Bucket label where CLR is measured
      avgLTVLast: ltvLast?.ltv ?? null,
      avgLTVMid: ltvMid?.ltv ?? null,
      activeCohorts: normalizedCohortLTVData.length,
      lastLabel: ltvHorizons.lastLabel,
      midLabel: ltvHorizons.midLabel,
    };
  }, [normalizedCohortLTVData, aggregatedLTVData, ltvHorizons]);

  // Format currency (compact)
  const formatCurrency = React.useCallback((amount: number | null): string => {
    if (amount === null || !isFinite(amount)) return 'N/A';
    
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}m`;
    } else if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(1)}k`;
    }
    return `£${amount.toFixed(0)}`;
  }, []);

  // Format currency for tooltip/table (full precision)
  const formatCurrencyFull = React.useCallback((amount: number | null): string => {
    if (amount === null || !isFinite(amount)) return '—';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Check if using dummy data (for insight gating)
  const useDevDummy = React.useMemo(() => {
    return isDev && cohorts.length > 0 && cohorts.every(c => {
      // Check if this looks like dummy data (heuristic: very regular patterns)
      return c.cohort_month.startsWith('2020-') && c.periods.length === 37;
    });
  }, [cohorts]); // isDev omitted: constant from outer scope

  // Calculate insights - fully data-driven, no hardcoded copy
  // Gated: do not show insights when using DEV dummy data or insufficient coverage
  const insights = React.useMemo(() => {
    const insightsList: string[] = [];
    
    // Safety gate: do not show insights for dummy data
    if (useDevDummy) {
      return insightsList; // Will show fallback message in UI
    }
    
    if (normalizedCohortLTVData.length === 0 || kpiMetrics.avgCLR === null) {
      return insightsList;
    }
    
    // Only generate insights if we have meaningful data
    if (normalizedCohortLTVData.length < 2) {
      // Need at least 2 cohorts for comparisons
      return insightsList;
    }
    
    // Find cohorts with CLR data (matured cohorts only)
    const cohortsWithCLR = normalizedCohortLTVData.filter(c => c.clr !== null && c.clr > 0);
    if (cohortsWithCLR.length < 2) {
      return insightsList; // Will show fallback message in UI
    }
    
    // Sort by cohort month (earliest to latest)
    const sortedCohorts = [...cohortsWithCLR].sort((a, b) => 
      new Date(a.cohortMonth).getTime() - new Date(b.cohortMonth).getTime()
    );
    
    // Insight 1: Pace comparison - compare recent vs older cohorts at midpoint bucket
    if (ltvHorizons.midBucket !== null && sortedCohorts.length >= 2) {
      const recentCohorts = sortedCohorts.slice(-2); // Last 2 cohorts
      const olderCohorts = sortedCohorts.slice(0, Math.min(2, sortedCohorts.length - 2)); // First 2 cohorts
      
      if (recentCohorts.length > 0 && olderCohorts.length > 0) {
        const recentAvg = recentCohorts.reduce((sum, c) => {
          const bucket = c.buckets.find(b => b.bucket === ltvHorizons.midBucket);
          return sum + (bucket?.ltv ?? 0);
        }, 0) / recentCohorts.length;
        
        const olderAvg = olderCohorts.reduce((sum, c) => {
          const bucket = c.buckets.find(b => b.bucket === ltvHorizons.midBucket);
          return sum + (bucket?.ltv ?? 0);
        }, 0) / olderCohorts.length;
        
        if (olderAvg > 0 && recentAvg > 0) {
          const recentPctOfCLR = recentCohorts.reduce((sum, c) => sum + (c.clr ?? 0), 0) / recentCohorts.length;
          const olderPctOfCLR = olderCohorts.reduce((sum, c) => sum + (c.clr ?? 0), 0) / olderCohorts.length;
          
          if (recentPctOfCLR > 0) {
            const recentPct = (recentAvg / recentPctOfCLR) * 100;
            const olderPct = olderPctOfCLR > 0 ? (olderAvg / olderPctOfCLR) * 100 : 0;
            
            if (Math.abs(recentPct - olderPct) > 5) {
              const comparison = recentPct > olderPct ? 'faster' : 'slower';
              insightsList.push(
                `Recent cohorts reach ${recentPct.toFixed(0)}% of their long-run value by ${ltvHorizons.midLabel}, compared to ${olderPct.toFixed(0)}% for older cohorts (${comparison} pace)`
              );
            }
          }
        }
      }
    }
    
    // Insight 2: Relative comparison - compare highest vs lowest CLR cohorts
    // Only show when both cohorts are matured for CLR (have last matured bucket)
    if (sortedCohorts.length >= 2) {
      const highestCLR = sortedCohorts.reduce((max, c) => (c.clr ?? 0) > (max.clr ?? 0) ? c : max);
      const lowestCLR = sortedCohorts.reduce((min, c) => (c.clr ?? 0) < (min.clr ?? 0) ? c : min);
      
      // Safety gate: both cohorts must be matured (have CLR)
      if (highestCLR.clr !== null && lowestCLR.clr !== null && lowestCLR.clr > 0 && highestCLR !== lowestCLR) {
        // Use × multiplier instead of percentage for clinical wording
        const multiplier = highestCLR.clr / lowestCLR.clr;
        
        if (multiplier > 1.1) {
          // Only show if difference is meaningful (>10% or 1.1×)
          insightsList.push(
            `Cohort ${highestCLR.cohortLabel} CLR is ${multiplier.toFixed(1)}× higher than ${lowestCLR.cohortLabel} (matured cohorts only)`
          );
        }
      }
    }
    
    // If no meaningful insights, return empty (fallback message shown in UI)
    return insightsList.slice(0, 2);
  }, [normalizedCohortLTVData, kpiMetrics, ltvHorizons, useDevDummy]); // getTimeBucketLabel omitted: not used in this useMemo

  // Prepare chart data for aggregated view
  // Chart data derives from aggregatedLTVData (which already enforces monotonicity)
  const aggregatedChartData = React.useMemo(() => {
    return aggregatedLTVData.map(d => ({
      bucket: d.bucket,
      bucketLabel: d.bucketLabel,
      ltv: d.ltv, // Can be null for line breaks
    }));
  }, [aggregatedLTVData]);

  // Prepare chart data for cohort-by-cohort view
  const cohortChartData = React.useMemo(() => {
    if (normalizedCohortLTVData.length === 0) return [];
    
    const chartData: Record<number, Record<string, number | null>> = {};
    
    // Initialize all buckets
    for (let bucket = 0; bucket <= maxPossibleBucket; bucket++) {
      chartData[bucket] = {};
    }
    
    // Fill in cohort values
    normalizedCohortLTVData.forEach(cohort => {
      cohort.buckets.forEach(bucketData => {
        if (chartData[bucketData.bucket]) {
          chartData[bucketData.bucket][cohort.cohortLabel] = bucketData.ltv;
        }
      });
    });
    
    // Convert to array format
    return Object.keys(chartData)
      .map(bucket => ({
        bucket: parseInt(bucket),
        bucketLabel: getTimeBucketLabel(parseInt(bucket)),
        ...chartData[parseInt(bucket)],
      }))
      .sort((a, b) => a.bucket - b.bucket);
  }, [normalizedCohortLTVData, maxPossibleBucket, getTimeBucketLabel]);

  const chartData = viewMode === 'aggregated' ? aggregatedChartData : cohortChartData;

  // Toggle cohort visibility
  const toggleCohort = React.useCallback((label: string) => {
    setShowCohorts(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        if (next.size < 20) {
          next.add(label);
        }
      }
      return next;
    });
  }, []);

  // Quick actions for cohort selection
  const showLatest6 = React.useCallback(() => {
    const sorted = [...normalizedCohortLTVData]
      .sort((a, b) => new Date(b.cohortMonth).getTime() - new Date(a.cohortMonth).getTime())
      .slice(0, 6)
      .map(c => c.cohortLabel);
    setShowCohorts(new Set(sorted));
  }, [normalizedCohortLTVData]);

  const showAllLimited = React.useCallback(() => {
    const sorted = [...normalizedCohortLTVData]
      .sort((a, b) => new Date(b.cohortMonth).getTime() - new Date(a.cohortMonth).getTime())
      .slice(0, 20)
      .map(c => c.cohortLabel);
    setShowCohorts(new Set(sorted));
  }, [normalizedCohortLTVData]);

  const clearCohorts = React.useCallback(() => {
    setShowCohorts(new Set());
  }, []);

  // Calculate selected CLR (weighted average of selected cohorts only)
  const selectedCLR = React.useMemo(() => {
    if (viewMode !== 'cohort' || showCohorts.size === 0) return null;
    
    const selectedCohorts = normalizedCohortLTVData.filter(c => showCohorts.has(c.cohortLabel));
    const selectedWithCLR = selectedCohorts.filter(c => c.clr !== null);
    if (selectedWithCLR.length === 0) return null;
    
    const totalSize = selectedWithCLR.reduce((sum, c) => sum + c.cohortSize, 0);
    if (totalSize === 0) return null;
    
    return selectedWithCLR.reduce((sum, c) => sum + (c.clr! * c.cohortSize), 0) / totalSize;
  }, [viewMode, showCohorts, normalizedCohortLTVData]);

  // Initialize visible cohorts (latest 5) - reset when cohortType or viewMode changes
  React.useEffect(() => {
    if (viewMode === 'cohort' && normalizedCohortLTVData.length > 0) {
      // Always reset to latest 5 when switching to cohort view or when cohortType changes
      const latest = normalizedCohortLTVData.slice(-5).map(c => c.cohortLabel);
      setShowCohorts(new Set(latest));
    } else if (viewMode === 'aggregated') {
      // Clear selection in aggregated view
      setShowCohorts(new Set());
    }
  }, [viewMode, normalizedCohortLTVData, cohortType]);

  // Filter cohorts by search query
  const filteredCohortLabels = React.useMemo(() => {
    if (!cohortSearchQuery) return normalizedCohortLTVData.map(c => c.cohortLabel);
    const query = cohortSearchQuery.toLowerCase();
    return normalizedCohortLTVData
      .filter(c => c.cohortLabel.toLowerCase().includes(query))
      .map(c => c.cohortLabel);
  }, [normalizedCohortLTVData, cohortSearchQuery]);

  // DEV-only parity guard and monotonicity validation
  // This validation runs BEFORE the normalization step's monotonicity enforcement
  // to detect upstream data issues
  React.useEffect(() => {
    if (isDev && cohorts.length > 0) {
      // Validate raw data BEFORE normalization (to detect upstream issues)
      cohorts.forEach(cohort => {
        const sortedPeriods = [...cohort.periods].sort((a, b) => a.period_number - b.period_number);
        let cumulativeRevenue = 0;
        let previousLTV: number | null = null;
        const TOLERANCE = 0.001;
        
        sortedPeriods.forEach(period => {
          cumulativeRevenue += period.total_revenue;
          const ltv = cohort.cohort_size > 0 ? cumulativeRevenue / cohort.cohort_size : 0;
          
          if (previousLTV !== null && ltv < previousLTV - TOLERANCE) {
            // Log warning once per cohort (reduce console noise)
            const warningKey = `${cohort.cohort_month}-upstream`;
            if (DEBUG_LTV_MONOTONIC || !warnedCohortsRef.current.has(warningKey)) {
              console.warn(`⚠️ UPSTREAM DATA ISSUE: Non-monotonic cumulative revenue detected in cohort ${cohort.cohort_month} at period ${period.period_number}:`, {
                previousLTV,
                currentLTV: ltv,
                difference: previousLTV - ltv,
                previousRevenue: (previousLTV || 0) * cohort.cohort_size,
                currentRevenue: cumulativeRevenue,
                message: 'This will be corrected in normalization (set to null)',
              });
              warnedCohortsRef.current.add(warningKey);
            }
          }
          previousLTV = ltv;
        });
      });
      
      // Validate normalized data (after correction)
      normalizedCohortLTVData.forEach(cohort => {
        let previousLTV: number | null = null;
        cohort.buckets.forEach(bucket => {
          if (bucket.ltv !== null) {
            if (previousLTV !== null && bucket.ltv < previousLTV - 0.1) {
              console.error(`❌ CRITICAL: Non-monotonic LTV still present after normalization in cohort ${cohort.cohortLabel} at bucket ${bucket.bucket}:`, {
                previous: previousLTV,
                current: bucket.ltv,
                difference: previousLTV - bucket.ltv,
                message: 'Normalization should have prevented this',
              });
            }
            previousLTV = bucket.ltv;
          }
        });
      });
      
      // Check chart/table parity
      if (viewMode === 'aggregated' && aggregatedLTVData.length > 0) {
        // Check KPI #2 (midpoint bucket) matches chart value
        if (kpiMetrics.midLabel && kpiMetrics.avgLTVMid !== null && ltvHorizons.midBucket !== null) {
          const chartLTVMid = aggregatedChartData.find(d => d.bucket === ltvHorizons.midBucket);
          if (chartLTVMid && chartLTVMid.ltv !== null) {
            const diff = Math.abs(chartLTVMid.ltv - kpiMetrics.avgLTVMid);
            if (diff > 0.1) {
              console.error('❌ PARITY MISMATCH - KPI #2 (LTV Midpoint):', {
                horizon: kpiMetrics.midLabel,
                bucket: ltvHorizons.midBucket,
                kpiValue: kpiMetrics.avgLTVMid,
                chartValue: chartLTVMid.ltv,
                difference: diff,
              });
            }
          }
        }
        
        // Check KPI #3 (last bucket) matches chart value
        if (kpiMetrics.lastLabel && kpiMetrics.avgLTVLast !== null && ltvHorizons.lastBucket !== null) {
          const chartLTVLast = aggregatedChartData.find(d => d.bucket === ltvHorizons.lastBucket);
          if (chartLTVLast && chartLTVLast.ltv !== null) {
            const diff = Math.abs(chartLTVLast.ltv - kpiMetrics.avgLTVLast);
            if (diff > 0.1) {
              console.error('❌ PARITY MISMATCH - KPI #3 (LTV Last):', {
                horizon: kpiMetrics.lastLabel,
                bucket: ltvHorizons.lastBucket,
                kpiValue: kpiMetrics.avgLTVLast,
                chartValue: chartLTVLast.ltv,
                difference: diff,
              });
            }
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDev, viewMode, normalizedCohortLTVData, aggregatedLTVData, aggregatedChartData, kpiMetrics, ltvHorizons]); // cohorts omitted: dev-only logging effect, adding would cause unnecessary re-runs

  const hasRealData = cohorts.length > 0 && !error;

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          filters={ltvCurvesV1Filters}
          search={retentionCurvesSearch}
          onFiltersChange={setFilterState}
        />
      </div>

      {/* Demo Data Banner */}
      {isDemo && (
        <DemoBanner reason="no real cohorts found" />
      )}

      {/* AI Analysis */}
      <div className="mb-8">
        <AIAnalysis
          pageType="ltv-cohorts"
          dataAvailable={hasRealData}
          loading={loading}
          filters={filterState}
          isDemo={isDemo}
        />
      </div>

      {/* Error State */}
      {error && !isDev && (
        <div className="mb-8 rounded-xl bg-red-50 border border-red-200 p-6">
          <div className="flex items-center">
            <Info className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading LTV Data</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* KPI 1: Avg CLR */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">
                Avg CLR{kpiMetrics.clrBucketLabel ? ` (at ${kpiMetrics.clrBucketLabel})` : ''}
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[320px]">
                  <p className="text-xs mb-1 font-semibold">
                    CLR = LTV at the last bucket that meets maturity/coverage rules (matured/eligible cohorts only).
                  </p>
                  <p className="text-xs mb-1">
                    Not necessarily final LTV if later buckets are incomplete.
                  </p>
                  {kpiMetrics.clrBucketLabel && (
                    <p className="text-xs text-gray-300 mt-1">
                      Measured at: {kpiMetrics.clrBucketLabel}
                    </p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">
                    Weighted average CLR across all cohorts in the current filters. Selection does not change this benchmark.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-3">Weighted by cohort size</p>
          <div className="text-2xl font-bold text-gray-900">
            {kpiMetrics.avgCLR !== null ? formatCurrency(kpiMetrics.avgCLR) : 'N/A'}
          </div>
        </div>
        
        {/* KPI 2: Avg LTV (at midpoint bucket) */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">
                Avg LTV (at {kpiMetrics.midLabel || '—'})
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs mb-1">
                    {kpiMetrics.midLabel 
                      ? `LTV at ${kpiMetrics.midLabel} is cumulative revenue per customer at that time bucket, weighted by cohort size. Bucket labels follow your cohort type (Y/Q/H/M).`
                      : 'Not enough data at this horizon for current filters.'}
                  </p>
                  <p className="text-xs text-gray-300">
                    This KPI reflects all cohorts included in the current filters. Selecting cohorts in the chart does not affect this value.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-3">Weighted by cohort size</p>
          <div className="text-2xl font-bold text-gray-900">
            {kpiMetrics.avgLTVMid !== null ? formatCurrency(kpiMetrics.avgLTVMid) : '—'}
          </div>
        </div>
        
        {/* KPI 3: Avg LTV (at last observed bucket) */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">
                Avg LTV (at {kpiMetrics.lastLabel || '—'})
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs mb-1">
                    {kpiMetrics.lastLabel 
                      ? `LTV at ${kpiMetrics.lastLabel} is cumulative revenue per customer at that time bucket, weighted by cohort size. Bucket labels follow your cohort type (Y/Q/H/M).`
                      : 'Not enough data at this horizon for current filters.'}
                  </p>
                  <p className="text-xs text-gray-300">
                    This KPI reflects all cohorts included in the current filters. Selecting cohorts in the chart does not affect this value.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-3">Weighted by cohort size</p>
          <div className="text-2xl font-bold text-gray-900">
            {kpiMetrics.avgLTVLast !== null ? formatCurrency(kpiMetrics.avgLTVLast) : '—'}
          </div>
        </div>
        
        {/* KPI 4: Active Cohorts */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full opacity-75">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-700">Active cohorts</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs">
                    Number of cohorts contributing data to the chart/table after filters. Fewer cohorts may produce noisier curves.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-3">Cohorts contributing to this view</p>
          <div className="text-2xl font-bold text-gray-700">
            {kpiMetrics.activeCohorts}
          </div>
        </div>
      </div>

      {/* Hero Chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-cyan-600" />
              LTV Curves
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs">
                    Shows cumulative revenue per customer over time since first purchase. LTV accumulates as customers make repeat purchases.
                  </p>
                </TooltipContent>
              </Tooltip>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Shows cumulative revenue per customer over time since first purchase.
            </p>
            {/* Definition Strip */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Customers:</span>
                  <span>first purchase cohorts</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Metric:</span>
                  <span>cumulative revenue per customer (LTV)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Reference:</span>
                  <span>CLR = LTV at last bucket meeting maturity/coverage rules</span>
                  {kpiMetrics.avgCLR !== null && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-0 max-w-[320px]">
                        <p className="text-xs mb-1 font-semibold">
                          CLR = LTV at the last bucket that meets maturity/coverage rules (matured/eligible cohorts only).
                        </p>
                        <p className="text-xs mb-1">
                          Not necessarily final LTV if later buckets are incomplete.
                        </p>
                        {kpiMetrics.clrBucketLabel && (
                          <p className="text-xs text-gray-300 mt-1">
                            Measured at: {kpiMetrics.clrBucketLabel}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">
                          Comparing LTV curves to this benchmark shows how quickly cohorts approach their long-term value.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Interpretation:</span>
                  <span>curve shape shows how quickly value accumulates and where it stabilises</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Line breaks:</span>
                  <span>indicate LTV decreased at that bucket</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                      <p className="text-xs">
                        Line breaks indicate LTV decreased at that bucket. This usually means incomplete/partial data or adjustments; we omit the point to avoid misleading downward cumulative LTV.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
              </div>
            </div>
            
            {/* Explanatory note: Why aggregated curve stops early (only in aggregated view, only when data exists) */}
            {viewMode === 'aggregated' && aggregatedLTVData.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Why does the aggregated curve stop early?</span>{' '}
                  Aggregated LTV is shown only for buckets where enough cohorts have reached that age.
                  We stop the curve once fewer than 60% of cohorts have sufficient data, to avoid misleading averages driven by a small or biased subset.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
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
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => {
                    if (!hasRealData || chartData.length === 0) return;
                    
                    const csvHeaders = viewMode === 'aggregated' 
                      ? ['Bucket', 'LTV (£ per customer)']
                      : ['Bucket', ...normalizedCohortLTVData.map(c => c.cohortLabel)];
                    
                    const csvRows = viewMode === 'aggregated' 
                      ? aggregatedChartData.map(d => [d.bucketLabel, d.ltv !== null ? d.ltv.toFixed(2) : ''])
                      : cohortChartData.map(d => {
                          const row: (string | number)[] = [d.bucketLabel];
                          normalizedCohortLTVData.forEach(cohort => {
                            const value = (d as unknown as Record<string, number | null | undefined>)[cohort.cohortLabel];
                            row.push(value !== null && value !== undefined ? value.toFixed(2) : '');
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
                    a.download = `ltv-cohorts-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }}
                  disabled={!hasRealData}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    hasRealData 
                      ? 'bg-cyan-600 text-white hover:bg-cyan-700 cursor-pointer' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 max-w-[200px]">
                <p className="text-xs">
                  {hasRealData ? 'Export data to CSV' : 'No data to export for current filters.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Chart Area */}
        {loading ? (
          <div className="h-[400px] bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
            <div className="animate-pulse space-y-4 w-full px-8">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[400px] w-full">
            <ChartErrorBoundary
              onRetry={() => setError(null)}
              context={{
                chartType: 'ltv-cohorts',
                dataPoints: chartData.length,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis
                    dataKey="bucket"
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs text-gray-600"
                    label={{ value: 'Time since first purchase', position: 'insideBottom', offset: -5, className: 'text-xs text-gray-600' }}
                    tickFormatter={(value) => getTimeBucketLabel(value)}
                    domain={(() => {
                      if (viewMode === 'aggregated') {
                        // Aggregated view: use last observed bucket from aggregated series
                        const buckets: number[] = [];
                        chartData.forEach(d => {
                          const bucket = (d as { bucket: number }).bucket;
                          if (viewMode === 'aggregated') {
                            const ltvData = d as { bucket: number; bucketLabel: string; ltv: number | null };
                            if (ltvData.ltv !== null && isFinite(ltvData.ltv)) {
                              buckets.push(bucket);
                            }
                          } else {
                            // For cohort view, check if any cohort has data
                            const hasData = normalizedCohortLTVData
                              .filter(c => showCohorts.has(c.cohortLabel))
                              .some(c => {
                                const value = (d as unknown as Record<string, number | null | undefined>)[c.cohortLabel];
                                return value !== null && value !== undefined && isFinite(value);
                              });
                            if (hasData) {
                              buckets.push(bucket);
                            }
                          }
                        });
                        if (buckets.length === 0) return [0, 'dataMax'];
                        const maxBucket = Math.max(...buckets);
                        return [Math.max(0, 0.75), maxBucket + 0.25];
                      } else {
                        // Cohort-by-cohort view: compute chartMaxBucket from plotted cohorts ONLY
                        const plottedCohorts = normalizedCohortLTVData
                          .filter(c => showCohorts.has(c.cohortLabel))
                          .slice(0, 20);
                        
                        let chartMaxBucket = 0;
                        plottedCohorts.forEach(cohort => {
                          // Find last index where y is finite (not null)
                          for (let i = cohort.buckets.length - 1; i >= 0; i--) {
                            const bucket = cohort.buckets[i];
                            if (bucket.ltv !== null && isFinite(bucket.ltv)) {
                              chartMaxBucket = Math.max(chartMaxBucket, bucket.bucket);
                              break;
                            }
                          }
                        });
                        
                        if (chartMaxBucket === 0) return [0, 'dataMax'];
                        return [Math.max(0, 0.75), chartMaxBucket + 0.25];
                      }
                    })()}
                    ticks={(() => {
                      if (viewMode === 'aggregated') {
                        return undefined; // Use default ticks
                      } else {
                        // Cohort view: only generate ticks up to chartMaxBucket
                        const plottedCohorts = normalizedCohortLTVData
                          .filter(c => showCohorts.has(c.cohortLabel))
                          .slice(0, 20);
                        
                        let chartMaxBucket = 0;
                        plottedCohorts.forEach(cohort => {
                          for (let i = cohort.buckets.length - 1; i >= 0; i--) {
                            const bucket = cohort.buckets[i];
                            if (bucket.ltv !== null && isFinite(bucket.ltv)) {
                              chartMaxBucket = Math.max(chartMaxBucket, bucket.bucket);
                              break;
                            }
                          }
                        });
                        
                        if (chartMaxBucket === 0) return undefined;
                        // Generate ticks up to chartMaxBucket
                        return Array.from({ length: chartMaxBucket + 1 }, (_, i) => i);
                      }
                    })()}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs text-gray-600"
                    tickFormatter={(value) => formatCurrency(value)}
                    width={80}
                  />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        if (viewMode === 'aggregated') {
                          const data = payload[0].payload;
                          const rows: TooltipRow[] = [
                            {
                              label: 'All cohorts',
                              value: data.ltv !== null && data.ltv !== undefined ? formatCurrencyFull(data.ltv) : '—',
                            },
                          ];
                          
                          return (
                            <StandardTooltip
                              title={`LTV at ${data.bucketLabel}`}
                              rows={rows}
                            />
                          );
                        } else {
                          // Cohort-by-cohort mode
                          const data = payload[0].payload;
                          const visibleCohorts = normalizedCohortLTVData
                            .filter(c => showCohorts.has(c.cohortLabel))
                            .map(c => ({
                              label: c.cohortLabel,
                              value: (data as Record<string, number | null | undefined>)[c.cohortLabel],
                            }))
                            .filter(c => c.value !== null && c.value !== undefined)
                            .sort((a, b) => (b.value as number) - (a.value as number));
                          
                          // Get colors for cohorts (matching chart line colors)
                          const colors = [
                            "#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6",
                            "#60a5fa", "#10b981", "#34d399", "#6ee7b7", "#525252"
                          ];
                          
                          // Get plotted cohorts in order (to match chart line colors)
                          const plottedCohorts = normalizedCohortLTVData
                            .filter(c => showCohorts.has(c.cohortLabel))
                            .slice(0, 20);
                          
                          // Show top 6 + "+X more" if more than 6
                          const displayCohorts = visibleCohorts.slice(0, 6);
                          const remainingCount = visibleCohorts.length - 6;
                          
                          const rows: TooltipRow[] = displayCohorts.map((cohort) => {
                            const cohortIndex = plottedCohorts.findIndex(c => c.cohortLabel === cohort.label);
                            return {
                              label: cohort.label,
                              value: formatCurrencyFull(cohort.value as number),
                              colorDot: cohortIndex >= 0 ? colors[cohortIndex % colors.length] : undefined,
                            };
                          });
                          
                          // Add "+X more" row if needed
                          if (remainingCount > 0) {
                            rows.push({
                              label: `+${remainingCount} more`,
                              value: '',
                            });
                          }
                          
                          return (
                            <StandardTooltip
                              title={`LTV at ${data.bucketLabel}`}
                              rows={rows}
                            />
                          );
                        }
                      }
                      return null;
                    }}
                  />
                  
                  {/* Avg CLR Reference Line (always visible when computable) */}
                  {kpiMetrics.avgCLR !== null && (
                    <ReferenceLine
                      y={kpiMetrics.avgCLR}
                      stroke="#9CA3AF"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                      label={{ 
                        value: 'Avg CLR benchmark', 
                        position: 'insideTopRight', 
                        className: 'text-xs fill-gray-500',
                        fontSize: 10,
                        dy: -5
                      }}
                    />
                  )}
                  
                  {/* Aggregated line */}
                  {viewMode === 'aggregated' && (
                    <Line
                      type="linear"
                      dataKey="ltv"
                      stroke="hsl(221.2 83.2% 53.3%)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                      name="LTV"
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  )}
                  
                  {/* Cohort-by-cohort lines */}
                  {viewMode === 'cohort' && (() => {
                    const plottedCohorts = normalizedCohortLTVData
                      .filter(c => showCohorts.has(c.cohortLabel))
                      .slice(0, 20);
                    const hasManyCohorts = plottedCohorts.length > 10;
                    
                    return plottedCohorts.map((cohort, index) => {
                      const colors = [
                        "#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6",
                        "#60a5fa", "#10b981", "#34d399", "#6ee7b7", "#525252"
                      ];
                      const isHovered = hoveredCohort === cohort.cohortLabel;
                      
                      // Visual emphasis when >10 cohorts: reduce opacity of non-hovered lines
                      let strokeOpacity = 1;
                      if (hasManyCohorts) {
                        if (isHovered) {
                          strokeOpacity = 1; // Full opacity for hovered line
                        } else if (hoveredCohort) {
                          strokeOpacity = 0.25; // Dim others when one is hovered
                        } else {
                          strokeOpacity = 0.45; // Reduced opacity when no hover
                        }
                      } else {
                        // Normal behavior for <=10 cohorts
                        strokeOpacity = hoveredCohort && hoveredCohort !== cohort.cohortLabel ? 0.2 : 1;
                      }
                      
                      return (
                        <Line
                          key={cohort.cohortLabel}
                          type="linear"
                          dataKey={cohort.cohortLabel}
                          stroke={colors[index % colors.length]}
                          strokeWidth={isHovered ? 3.5 : 2}
                          strokeOpacity={strokeOpacity}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                          name={cohort.cohortLabel}
                          isAnimationActive={false}
                          connectNulls={false}
                        />
                      );
                    });
                  })()}
                </RechartsLineChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
        ) : (
          <div className="h-[400px] bg-gray-50/50 rounded-xl flex items-center justify-center border border-dashed border-gray-200 py-10">
            <div className="text-center max-w-md px-4">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No LTV data available</p>
              <p className="text-gray-500 text-sm mb-1">
                Try widening your date range or removing filters.
              </p>
              <p className="text-gray-500 text-sm">
                LTV curves require cohorts with revenue data.
              </p>
            </div>
          </div>
        )}

        {/* Cohort Selection (cohort-by-cohort mode) */}
        {viewMode === 'cohort' && normalizedCohortLTVData.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Select Cohorts (max 20)</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search cohorts..."
                  value={cohortSearchQuery}
                  onChange={(e) => setCohortSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={showLatest6}
                  className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-md hover:bg-cyan-100 transition-colors"
                >
                  Show latest 6
                </button>
                <button
                  onClick={showAllLimited}
                  className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-md hover:bg-cyan-100 transition-colors"
                >
                  Show all (Max 20)
                </button>
                <button
                  onClick={clearCohorts}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            {selectedCLR !== null && (
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                <span>Selected CLR (avg): {formatCurrencyFull(selectedCLR)}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                    <p className="text-xs mb-1 font-semibold">
                      Selected CLR (avg)
                    </p>
                    <p className="text-xs mb-1">
                      Weighted average of CLR across the selected cohorts.
                    </p>
                    <p className="text-xs mb-1">
                      Each cohort contributes proportionally to its size.
                    </p>
                    <p className="text-xs text-gray-300">
                      CLR is measured at each cohort&apos;s last bucket that meets maturity and coverage rules.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {filteredCohortLabels.map(label => {
                const isSelected = showCohorts.has(label);
                const selectedArray = Array.from(showCohorts);
                const isPlotted = isSelected && selectedArray.indexOf(label) < 20;
                return (
                  <button
                    key={label}
                    onClick={() => toggleCohort(label)}
                    onMouseEnter={() => setHoveredCohort(label)}
                    onMouseLeave={() => setHoveredCohort(null)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isSelected
                        ? isPlotted
                          ? 'bg-cyan-600 text-white'
                          : 'bg-cyan-400 text-white opacity-60'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${hoveredCohort === label ? 'ring-2 ring-cyan-400' : ''}`}
                    title={isSelected && !isPlotted ? 'Selected but not plotted (limit to 20)' : ''}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {showCohorts.size > 20 && (
              <p className="text-xs text-gray-500 mt-2">
                Plotting {Math.min(showCohorts.size, 20)} of {showCohorts.size} selected cohorts — refine selection to view more.
              </p>
            )}
            {normalizedCohortLTVData
              .filter(c => showCohorts.has(c.cohortLabel))
              .slice(0, 20).length > 10 && (
              <p className="text-xs text-gray-500 mt-2">
                Tip: hover a cohort to highlight its curve.
              </p>
            )}
          </div>
        )}

        {/* What this tells you */}
        {insights.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-2">What this tells you</p>
                <ul className="space-y-1.5">
                  {insights.map((insight, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      • {insight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supporting Table */}
      {normalizedCohortLTVData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {viewMode === 'aggregated' ? 'Aggregated LTV by time bucket' : 'LTV by cohort and time bucket'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {viewMode === 'aggregated' 
                    ? 'Weighted average LTV across all cohorts'
                    : 'LTV values for each cohort over time'}
                </p>
                {viewMode === 'aggregated' && aggregatedLTVData.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Initial cohort size: {formatCurrencyFull(aggregatedLTVData[0]?.cohortSize ?? 0)} customers
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTableExpanded(!tableExpanded)}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {tableExpanded ? 'Collapse periods' : 'Show all periods'}
                </button>
              </div>
            </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[1100px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {viewMode === 'aggregated' ? (
                  <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bucket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      LTV (£ per customer)
                </th>
                  </>
                ) : (
                    <>
                      <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-30 border-r border-gray-200 w-[110px]">
                        Cohort
                </th>
                      <th className="sticky left-[110px] bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-30 border-r border-gray-200 w-[90px]">
                        Size
                      </th>
                      <th className="sticky left-[200px] bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-30 border-r-2 border-gray-300 w-[120px]">
                        <div className="flex items-center gap-1">
                          CLR
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-0 max-w-[320px]">
                              <p className="text-xs mb-1 font-semibold">
                                CLR = LTV at the last bucket that meets maturity/coverage rules (matured/eligible cohorts only).
                              </p>
                              <p className="text-xs mb-1">
                                Not necessarily final LTV if later buckets are incomplete.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      {Array.from({ length: Math.min(maxPossibleBucket + 1, 20) }, (_, i) => {
                        const shouldShow = tableExpanded || i < 6; // Show first 6 buckets by default
                        if (!shouldShow) return null;
                        return (
                          <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px] border-r border-gray-100">
                            {getTimeBucketLabel(i)}
                </th>
                        );
                      })}
                    </>
                  )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {viewMode === 'aggregated' ? (
                  aggregatedLTVData.map((data) => {
                    const shouldShow = tableExpanded || data.bucket < 6; // Show first 6 buckets by default
                    if (!shouldShow) return null;
                    return (
                      <tr key={data.bucket} className="hover:bg-gray-50">
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {data.bucketLabel}
                  </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 tabular-nums">
                          {data.ltv !== null ? formatCurrencyFull(data.ltv) : '—'}
                  </td>
                      </tr>
                    );
                  })
                ) : (
                  normalizedCohortLTVData.map((cohort) => {
                    const isHovered = hoveredCohort === cohort.cohortLabel;
                    // Sticky columns use bg-gray-50 to match header, with hover/selection states
                    const stickyBg = isHovered ? 'bg-cyan-50' : 'bg-gray-50';
                    const stickyBgHover = isHovered ? 'bg-cyan-50' : 'group-hover:bg-gray-100';
                    return (
                      <tr 
                        key={cohort.cohortLabel} 
                        className={`group hover:bg-gray-50 ${isHovered ? 'bg-cyan-50' : ''}`}
                      >
                        <td className={`sticky left-0 ${stickyBg} ${stickyBgHover} px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 z-20 border-r border-gray-200 w-[110px]`}>
                          {cohort.cohortLabel}
                  </td>
                        <td className={`sticky left-[110px] ${stickyBg} ${stickyBgHover} px-4 py-3 whitespace-nowrap text-sm text-gray-900 tabular-nums z-20 border-r border-gray-200 w-[90px]`}>
                          {cohort.cohortSize.toLocaleString()}
                  </td>
                        <td className={`sticky left-[200px] ${stickyBg} ${stickyBgHover} px-4 py-3 whitespace-nowrap text-sm text-gray-900 tabular-nums z-20 border-r-2 border-gray-300 w-[120px]`}>
                          {cohort.clr !== null ? formatCurrencyFull(cohort.clr) : '–'}
                  </td>
                        {cohort.buckets.slice(0, 20).map((bucket) => {
                          const shouldShow = tableExpanded || bucket.bucket < 6; // Show first 6 buckets by default
                          if (!shouldShow) return null;
                          return (
                            <td key={bucket.bucket} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 tabular-nums min-w-[90px] border-r border-gray-100">
                              {bucket.ltv !== null ? formatCurrencyFull(bucket.ltv) : '–'}
                  </td>
                          );
                        })}
                </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

export default function CLRLTVCohortsPage() {
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
      <CLRLTVCohortsContent />
    </Suspense>
  );
}
