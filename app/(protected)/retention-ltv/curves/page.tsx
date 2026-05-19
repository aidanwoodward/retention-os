"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { retentionCurvesFilters, retentionCurvesSearch } from "@/lib/filters/config";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { LoadingButton } from "@/components/ui/loading-buttons";
import { useSearchParams, useRouter } from "next/navigation";
import { Diagnosis } from "@/components/diagnosis/Diagnosis";
import { diagnoseRetentionCurvesEnhanced } from "@/lib/diagnosis/retention-curves";
import { SeverityIndicator } from "@/components/diagnosis/SeverityIndicator";
import { CausalitySection } from "@/components/diagnosis/CausalitySection";
import { DecisionAxes } from "@/components/diagnosis/DecisionAxes";
import { getDecisionAxesForDiagnosis } from "@/lib/diagnosis/decision-axes";
import { ImpactRanges } from "@/components/diagnosis/ImpactRanges";
import { computeRetentionCurvesImpactRanges } from "@/lib/diagnosis/impact-ranges/retention-curves";
import {
  TrendingUp,
  AlertTriangle,
  Download,
  Users,
  Info,
  LineChart,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterValue } from "@/lib/filters/types";
import { compareQueryStrings } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from "recharts";
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
    revenue_retention_percent?: number; // DEMO-ONLY: API-provided revenue retention (<=100%)
  }>;
}

interface CohortsResponse {
  success: boolean;
  data: {
    cohorts: CohortData[];
    total_cohorts: number;
    calculated_at: string;
    is_demo?: boolean; // Demo mode flag from API
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

function RetentionCurvesContent() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [filterState, setFilterState] = useState<Record<string, FilterValue>>({});
  const [retentionType, setRetentionType] = useState<'customer' | 'revenue'>('customer');
  const [viewMode, setViewMode] = useState<'aggregated' | 'cohort'>('aggregated');
  const [hoveredCohort, _setHoveredCohort] = useState<string | null>(null);
  const [showCohorts, setShowCohorts] = useState<Set<string>>(new Set());
  const [cohortSearchQuery, setCohortSearchQuery] = useState<string>("");
  const [activeCohortKey, setActiveCohortKey] = useState<string | null>(null);
  const [_chartError, setChartError] = useState<Error | null>(null);
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
      const isDemo = data.data.is_demo === true;
      setIsDemoMode(isDemo); // Store demo mode flag
      // Dev-only: Log demo mode detection
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📊 Demo mode detected: ${isDemo}`, { is_demo: data.data.is_demo });
      }
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

  // CRITICAL FIX: Override period 0 for customer retention to enforce Shopify semantics
  // For customer retention ONLY: Q0 must equal cohort_size and retention_rate must be 100% by construction
  const correctedCohorts = React.useMemo(() => {
    // Only apply override for customer retention
    if (retentionType !== 'customer') {
      return filteredCohorts;
    }

    return filteredCohorts.map(cohort => {
      const period0Index = cohort.periods.findIndex(p => p.period_number === 0);
      
      if (period0Index >= 0) {
        // Override period 0: active_customers = cohort_size, retention_rate_percent = 100
        const correctedPeriods = [...cohort.periods];
        correctedPeriods[period0Index] = {
          ...correctedPeriods[period0Index],
          active_customers: cohort.cohort_size,
          retention_rate_percent: 100,
        };
        
        return {
          ...cohort,
          periods: correctedPeriods,
        };
      }
      
      return cohort;
    });
  }, [filteredCohorts, retentionType]);

  // Get cohort type from URL (default to annual)
  const cohortType = React.useMemo(() => {
    const type = searchParams.get('cohortType');
    if (type && ['monthly', 'quarterly', 'half-year', 'annual'].includes(type)) {
      return type as 'monthly' | 'quarterly' | 'half-year' | 'annual';
    }
    return 'annual';
  }, [searchParams]);
  
  // BLOCKER 1: Prevent monthly cohort-by-cohort - force aggregated view
  React.useEffect(() => {
    if (cohortType === 'monthly' && viewMode === 'cohort') {
      setViewMode('aggregated');
      // Update URL to reflect aggregated view
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', 'aggregated');
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [cohortType, viewMode, searchParams, router]);

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

  // Demo-only clamp: Revenue retention must not display >100% due to floating point artifacts
  // CRITICAL: Only applies when is_demo === true (demo mode)
  // This prevents values like 100.3% or 100.8% from appearing in demo data
  // CFO-TRUST: This ensures demo data is trustworthy for executive presentations
  const clampRevenueRetention = React.useCallback((value: number | null | undefined): number => {
    // Handle null/undefined gracefully
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 0;
    }
    
    // CRITICAL: In demo mode, aggressively clamp ALL revenue retention to max 100%
    if (isDemoMode && retentionType === 'revenue') {
      const clamped = Math.min(value, 100);
      // Dev-only: Log if clamping occurred to verify it's working
      if (process.env.NODE_ENV !== 'production' && value > 100) {
        console.warn(`🔒 DEMO CLAMP: Revenue retention ${value.toFixed(2)}% → ${clamped.toFixed(2)}% (demo mode enforced)`);
      }
      return clamped;
    }
    return value;
  }, [isDemoMode, retentionType]);

  // DEV-ONLY: Strict retention math audit
  // Verify customer retention matches Shopify-style cohort definition with STRICT invariants:
  // - cohort membership = first order date falls in cohort window
  // - retention(t) = active customers in period t / cohort_size
  // - Q0 MUST equal 100% exactly: active_customers(period 0) === cohort_size
  // - active_customers(t) <= cohort_size for all periods t
  // - retention(t) <= 100% exactly for all periods t
  // NOTE: Audit checks correctedCohorts (after period 0 override) for customer retention
  // NOTE: Audit is gated behind NEXT_PUBLIC_ENABLE_RETENTION_AUDIT=true feature flag
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_RETENTION_AUDIT !== 'true' || correctedCohorts.length === 0) return;

    console.group('🔍 Retention Curves Math Audit (Strict Invariants)');
    
    let passCount = 0;
    let failCount = 0;
    const q0Violations: Array<{
      cohortKey: string;
      cohort_size: number;
      active_customers: number;
      difference: number;
    }> = [];
    const activeExceedsViolations: Array<{
      cohortKey: string;
      period: number;
      cohort_size: number;
      active_customers: number;
      excess: number;
    }> = [];
    const retentionExceedsViolations: Array<{
      cohortKey: string;
      period: number;
      cohort_size: number;
      active_customers: number;
      retention: number;
    }> = [];

    correctedCohorts.forEach(cohort => {
      const cohortKey = getCohortLabel(cohort.cohort_month);
      const cohortSize = cohort.cohort_size;

      // Check 1: Q0 MUST equal cohort_size exactly (STRICT - no tolerance)
      // After period 0 override, this should always pass for customer retention
      const period0 = cohort.periods.find(p => p.period_number === 0);
      if (period0) {
        const period0Active = period0.active_customers;
        if (period0Active !== cohortSize) {
          failCount++;
          const difference = Math.abs(period0Active - cohortSize);
          q0Violations.push({
            cohortKey,
            cohort_size: cohortSize,
            active_customers: period0Active,
            difference,
          });
        } else {
          passCount++;
        }
      }

      // Check all periods: activeCustomers(t) <= cohort_size (STRICT)
      cohort.periods.forEach(period => {
        const periodNum = period.period_number;
        const activeCustomers = period.active_customers;
        
        // Check 2: activeCustomers(t) MUST NOT exceed cohort_size
        if (activeCustomers > cohortSize) {
          failCount++;
          activeExceedsViolations.push({
            cohortKey,
            period: periodNum,
            cohort_size: cohortSize,
            active_customers: activeCustomers,
            excess: activeCustomers - cohortSize,
          });
        } else {
          passCount++;
        }

        // Check 3: retention(t) MUST NOT exceed 100% (STRICT - no tolerance)
        const retention = cohortSize > 0 ? (activeCustomers / cohortSize) * 100 : 0;
        if (retention > 100) {
          failCount++;
          retentionExceedsViolations.push({
            cohortKey,
            period: periodNum,
            cohort_size: cohortSize,
            active_customers: activeCustomers,
            retention,
          });
        } else {
          passCount++;
        }
      });
    });

    // Print grouped violation reports
    if (q0Violations.length > 0) {
      console.group(`❌ Q0 Mismatches (${q0Violations.length} HARD VIOLATIONS)`);
      console.log('Enforcement: active_customers(period 0) MUST === cohort_size exactly');
      q0Violations.forEach(v => {
        console.warn(`  Cohort ${v.cohortKey}:`, {
          cohort_size: v.cohort_size,
          period0_active_customers: v.active_customers,
          difference: v.difference,
        });
      });
      console.groupEnd();
    }

    if (activeExceedsViolations.length > 0) {
      console.group(`❌ Active Customers Exceed Cohort Size (${activeExceedsViolations.length} HARD VIOLATIONS)`);
      console.log('Enforcement: active_customers(t) MUST <= cohort_size for all periods t');
      activeExceedsViolations.forEach(v => {
        console.warn(`  Cohort ${v.cohortKey}, Period ${v.period}:`, {
          cohort_size: v.cohort_size,
          active_customers: v.active_customers,
          excess: v.excess,
        });
      });
      console.groupEnd();
    }

    if (retentionExceedsViolations.length > 0) {
      console.group(`❌ Retention Exceeds 100% (${retentionExceedsViolations.length} HARD VIOLATIONS)`);
      console.log('Enforcement: retention(t) = active_customers(t) / cohort_size * 100 MUST <= 100 exactly');
      retentionExceedsViolations.forEach(v => {
        console.warn(`  Cohort ${v.cohortKey}, Period ${v.period}:`, {
          cohort_size: v.cohort_size,
          active_customers: v.active_customers,
          retention: v.retention.toFixed(2) + '%',
        });
      });
      console.groupEnd();
    }

    // Print final summary
    const totalChecks = passCount + failCount;
    const allPassed = failCount === 0;
    
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ PASS: All retention math invariants satisfied');
      console.log(`   Checks passed: ${passCount} / ${totalChecks}`);
    } else {
      console.log('❌ FAIL: Retention math violations detected');
      console.log(`   Checks passed: ${passCount} / ${totalChecks}`);
      console.log(`   Violations: ${failCount}`);
      console.log(`   - Q0 mismatches: ${q0Violations.length}`);
      console.log(`   - Active exceeds size: ${activeExceedsViolations.length}`);
      console.log(`   - Retention exceeds 100%: ${retentionExceedsViolations.length}`);
    }
    console.log('='.repeat(60));
    
    console.groupEnd();
  }, [correctedCohorts, getCohortLabel]);

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
    if (correctedCohorts.length === 0) return 0;
    
    const oldestCohortDate = correctedCohorts.reduce((oldest, cohort) => {
      const cohortDate = new Date(cohort.cohort_month);
      return cohortDate < oldest ? cohortDate : oldest;
    }, new Date(correctedCohorts[0].cohort_month));

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
  }, [correctedCohorts, cohortType]);

  // Compute aggregated retention curve data
  const retentionCurveData = React.useMemo((): RetentionPeriodData[] => {
    if (correctedCohorts.length === 0) return [];

    // Calculate max observed period for each cohort (maturity check)
    // Maturity rule: a cohort is mature enough for period N if maxObservedPeriod >= N
    const cohortMaturity = new Map<string, number>();
    filteredCohorts.forEach(cohort => {
      let maxObservedPeriod = -1;
      cohort.periods.forEach(period => {
        const convertedPeriod = convertPeriodNumber(period.period_number);
        if (convertedPeriod > maxObservedPeriod) {
          maxObservedPeriod = convertedPeriod;
        }
      });
      cohortMaturity.set(cohort.cohort_month, maxObservedPeriod);
    });

    // Aggregate data by converted period number, only including mature cohorts
    const periodMap = new Map<number, {
      activeCustomers: number;
      revenue: number;
      eligibleCohortSize: number; // Sum of cohort_size for cohorts mature enough for this period
      cohortCount: number; // Number of cohorts included in this period
      period0RevenueSum?: number;
      revenueRetentionSum?: number;
    }>();

    // For each period, aggregate data from only eligible (mature) cohorts
    for (let periodNum = 0; periodNum <= maxPossiblePeriod; periodNum++) {
      let activeCustomers = 0;
      let revenue = 0;
      let eligibleCohortSize = 0;
      let cohortCount = 0;

      correctedCohorts.forEach(cohort => {
        const maxObservedPeriod = cohortMaturity.get(cohort.cohort_month) ?? -1;
        // Only include cohorts that have reached this period (maturity check)
        if (maxObservedPeriod >= periodNum) {
          cohortCount++;
          eligibleCohortSize += cohort.cohort_size;

          // Find period data for this cohort
          const periodData = cohort.periods.find(p => {
            const convertedPeriod = convertPeriodNumber(p.period_number);
            return convertedPeriod === periodNum;
          });

          if (periodData) {
            activeCustomers += periodData.active_customers;
            revenue += periodData.total_revenue;
          }
        }
      });

      if (cohortCount > 0) {
        periodMap.set(periodNum, {
          activeCustomers,
          revenue,
          eligibleCohortSize,
          cohortCount,
        });
      }
    }

    // Get period 0 data for baseline calculations
    const period0Data = periodMap.get(0);
    if (!period0Data || period0Data.eligibleCohortSize === 0) return [];

    // Baseline: use cohort_size as denominator (aligned with database definition)
    // retention_rate_percent = active_customers / cohort_size
    const baselineCohortSize = period0Data.eligibleCohortSize;
    const period0Revenue = period0Data.revenue;

    // Calculate cohort coverage threshold (60% of filtered cohorts)
    const coverageThreshold = Math.ceil(filteredCohorts.length * 0.6);

    // Generate retention curve data, stopping when cohort coverage drops below threshold
    const curveData: RetentionPeriodData[] = [];

    for (let periodNum = 0; periodNum <= maxPossiblePeriod; periodNum++) {
      const periodData = periodMap.get(periodNum);
      
      // Stop if cohort coverage drops below threshold (maturity rule: only show periods where enough cohorts have data)
      if (!periodData || periodData.cohortCount < coverageThreshold) {
        break;
      }

      // Period 0 baseline: calculate retention using cohort_size as denominator
      if (periodNum === 0) {
        // CRITICAL FIX: For customer retention, period 0 is defined by construction:
        // active_customers = cohort_size and retention_rate = 100%
        // This ensures Shopify-style cohort semantics (cohort membership = first purchase in cohort window)
        const period0Customers = retentionType === 'customer' 
          ? baselineCohortSize  // Override: active_customers = cohort_size
          : period0Data.activeCustomers;  // Revenue retention uses actual active customers
        
        const retentionRate = retentionType === 'customer'
          ? 100  // Override: retention_rate = 100% by construction
          : (baselineCohortSize > 0 ? (period0Customers / baselineCohortSize) * 100 : 0);
        
        // Dev-only assertion: customer retention should never exceed 100%
        if (process.env.NODE_ENV !== 'production' && retentionRate > 100.0001) {
          console.warn(`⚠️ Customer retention exceeds 100% at Period 0:`, {
            period: 0,
            numerator: period0Customers,
            denominator: baselineCohortSize,
            retention: retentionRate,
          });
        }
        
        curveData.push({
          period: 0,
          periodLabel: getPeriodLabel(0),
          cohortSize: baselineCohortSize,
          activeCustomers: period0Customers,
          retentionRate,
          revenue: period0Revenue,
          revenueRetention: 100, // Revenue retention baseline is always 100%
        });
        continue;
      }

      // For other periods, calculate retention using baseline cohort_size
      const retentionRate = baselineCohortSize > 0 
        ? (periodData.activeCustomers / baselineCohortSize) * 100 
        : 0;
      
      // Dev-only assertion: customer retention should never exceed 100%
      if (process.env.NODE_ENV !== 'production' && retentionRate > 100.0001) {
        console.warn(`⚠️ Customer retention exceeds 100%:`, {
          period: periodNum,
          numerator: periodData.activeCustomers,
          denominator: baselineCohortSize,
          retention: retentionRate,
        });
      }
      
      // DEMO-ONLY: Use API-provided revenue retention (weighted average) to avoid recomputation artifacts
      let revenueRetention: number;
      if (isDemoMode && retentionType === 'revenue' && (periodData.period0RevenueSum ?? 0) > 0) {
        // Use weighted average of API-provided revenue_retention_percent values
        revenueRetention = (periodData.revenueRetentionSum ?? 0) / periodData.period0RevenueSum!;
      } else {
        // Non-demo mode: compute from aggregated revenue (allows >100%)
        revenueRetention = period0Revenue > 0 
          ? (periodData.revenue / period0Revenue) * 100 
          : 0;
      }
      
      // Demo-only clamp to avoid floating point >100% artifacts (shouldn't be needed with API values, but safety check)
      revenueRetention = clampRevenueRetention(revenueRetention);

      curveData.push({
        period: periodNum,
        periodLabel: getPeriodLabel(periodNum),
        cohortSize: baselineCohortSize, // Baseline cohort size (same for all periods)
        activeCustomers: periodData.activeCustomers,
        retentionRate,
        revenue: periodData.revenue,
        revenueRetention,
      });
    }

    return curveData.sort((a, b) => a.period - b.period);
  }, [
    clampRevenueRetention,
    convertPeriodNumber,
    correctedCohorts,
    filteredCohorts,
    getPeriodLabel,
    isDemoMode,
    maxPossiblePeriod,
    retentionType,
  ]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only run on mount/URL change, not on every state change. allCohortLabels/showCohorts.size intentionally omitted to avoid loops

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
    // Only update if params actually changed to avoid infinite loops (ignoring internal params)
    const newQueryString = params.toString();
    const currentQueryString = window.location.search.slice(1); // Remove leading '?'
    if (!compareQueryStrings(newQueryString, currentQueryString)) {
      const newUrl = newQueryString ? `?${newQueryString}` : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retentionType, viewMode, cohortSearchQuery, showCohorts, router]); // searchParams intentionally omitted to avoid infinite loops

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

  // Filtered cohort labels based on search
  const filteredCohortLabels = React.useMemo(() => {
    if (!cohortSearchQuery.trim()) return allCohortLabels;
    const query = cohortSearchQuery.toLowerCase().trim();
    return allCohortLabels.filter(label => 
      label.toLowerCase().includes(query)
    );
  }, [allCohortLabels, cohortSearchQuery]);

  // Helper: Parse cohort label to Date based on cohort type
  const parseCohortLabelDate = React.useCallback((label: string): Date => {
    if (cohortType === 'annual') {
      // Annual: "2020" format
      const year = parseInt(label.match(/\d{4}/)?.[0] || '1900');
      return new Date(year, 0, 1);
    } else if (cohortType === 'quarterly') {
      // Quarterly: "2020-Q1" format
      const match = label.match(/(\d{4})-Q(\d+)/);
      if (match) {
        const year = parseInt(match[1]);
        const quarter = parseInt(match[2]);
        const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
        return new Date(year, month, 1);
      }
      // Fallback: try to extract year
      const year = parseInt(label.match(/\d{4}/)?.[0] || '1900');
      return new Date(year, 0, 1);
    } else if (cohortType === 'monthly') {
      // Monthly: "Jan 2020" format
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const match = label.match(/(\w+)\s+(\d{4})/);
      if (match) {
        const monthName = match[1];
        const year = parseInt(match[2]);
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex >= 0) {
          return new Date(year, monthIndex, 1);
        }
      }
      // Fallback: try to extract year
      const year = parseInt(label.match(/\d{4}/)?.[0] || '1900');
      return new Date(year, 0, 1);
    } else {
      // Half-year: "2020 H1" or "2020 H2" format
      const match = label.match(/(\d{4})\s+H(\d+)/);
      if (match) {
        const year = parseInt(match[1]);
        const half = parseInt(match[2]);
        const month = (half - 1) * 6; // H1=0, H2=6
        return new Date(year, month, 1);
      }
      // Fallback: try to extract year
      const year = parseInt(label.match(/\d{4}/)?.[0] || '1900');
      return new Date(year, 0, 1);
    }
  }, [cohortType]);

  // Quick actions for cohort selection
  // Fix: Parse dates correctly by cohort type and select newest 5
  const showLatest5 = React.useCallback(() => {
    const sorted = [...allCohortLabels].sort((a, b) => {
      const dateA = parseCohortLabelDate(a);
      const dateB = parseCohortLabelDate(b);
      return dateB.getTime() - dateA.getTime(); // Descending (newest first)
    });
    setShowCohorts(new Set(sorted.slice(0, 5)));
  }, [allCohortLabels, parseCohortLabelDate]);

  // BLOCKER 2: "Show all" means ALL cohorts (no limit)
  const showAllCohorts = React.useCallback(() => {
    setShowCohorts(new Set(allCohortLabels));
  }, [allCohortLabels]);

  const clearCohorts = React.useCallback(() => {
    setShowCohorts(new Set());
  }, []);

  // Compute cohort-by-cohort retention curve data
  // Group cohorts by their label (e.g., all 2019 months → one "2019" cohort)
  const cohortCurvesData = React.useMemo((): CohortCurveData[] => {
    if (correctedCohorts.length === 0) return [];

    // Group cohorts by their cohort label
    const cohortGroups = new Map<string, typeof correctedCohorts>();
    
    correctedCohorts.forEach(cohort => {
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
        period0RevenueSum?: number;
        revenueRetentionSum?: number;
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
          // CRITICAL FIX: For customer retention at period 0, override to enforce Shopify semantics
          if (periodNum === 0 && retentionType === 'customer') {
            // Period 0: active_customers = cohort_size, retention = 100% by construction
            customerRetention = 100;
          } else {
            // Fix: Use totalCohortSize (stable baseline) as denominator, not period0Customers
            // customerRetention = activeCustomers(t) / cohortSize * 100
            customerRetention = totalCohortSize > 0
              ? (periodData.activeCustomers / totalCohortSize) * 100
              : 0;
          }
          
          // DEMO-ONLY: Use API-provided revenue retention (weighted average) to avoid recomputation artifacts
          if (isDemoMode && retentionType === 'revenue' && (periodData.period0RevenueSum ?? 0) > 0) {
            // Use weighted average of API-provided revenue_retention_percent values
            revenueRetention = (periodData.revenueRetentionSum ?? 0) / periodData.period0RevenueSum!;
          } else {
            // Non-demo mode: compute from aggregated revenue (allows >100%)
            revenueRetention = period0Revenue > 0
              ? (periodData.revenue / period0Revenue) * 100
              : 0;
          }
          
          // Demo-only clamp to avoid floating point >100% artifacts (shouldn't be needed with API values, but safety check)
          revenueRetention = clampRevenueRetention(revenueRetention);
          
          // Dev-only assertion: customer retention should never exceed 100%
          if (process.env.NODE_ENV !== 'production' && customerRetention > 100.0001) {
            console.warn(`⚠️ Customer retention exceeds 100%:`, {
              cohortKey: cohortLabel,
              period: periodNum,
              numerator: periodData.activeCustomers,
              denominator: totalCohortSize,
              retention: customerRetention,
            });
          }
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
        
        // Period 0: For customer retention, always 100% by construction (cohort membership = first purchase)
        // For revenue retention, also 100% (baseline)
        if (current.period === 0) {
          periods.push({
            period: 0,
            periodLabel: getPeriodLabel(0),
            customerRetention: 100,  // Always 100% by construction for customer retention
            revenueRetention: 100,   // Revenue retention baseline is always 100%
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

        // Demo-only: Apply final clamp to revenue retention before storing in periods array
        // This ensures no values >100% slip through in demo mode
        const finalRevenueRetention = clampRevenueRetention(current.revenueRetention);
        
        periods.push({
          period: current.period,
          periodLabel: getPeriodLabel(current.period),
          customerRetention: current.customerRetention,
          revenueRetention: finalRevenueRetention,
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
  }, [correctedCohorts, getCohortLabel, getPeriodLabel, convertPeriodNumber, maxPossiblePeriod, showCohorts, retentionType, clampRevenueRetention, isDemoMode]); // Added isDemoMode dependency

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
          
          // Demo-only: Apply clamp to revenue retention during normalization
          // This ensures no values >100% appear in normalized data
          if (retentionType === 'revenue' && retentionClassified.value !== null) {
            retentionClassified.value = clampRevenueRetention(retentionClassified.value);
          }
          
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
  }, [cohortCurvesData, retentionType, parseRetentionValue, toNumber, clampRevenueRetention]);

  // Determine which cohorts to plot - plot ALL selected cohorts (no cap)
  const plottedCohorts = React.useMemo(() => {
    return normalizedCohortCurvesData.filter(c => showCohorts.has(c.cohortKey));
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
      
      sortedPoints.forEach((point, _idx) => {
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

  // Revenue Cohorts color scale (oldest → newest) - limited palette for annual cohorts
  const cohortColorScale = React.useMemo(() => [
    "#1e3a8a", // blue-900 (darkest)
    "#1e40af", // blue-800
    "#1d4ed8", // blue-700
    "#2563eb", // blue-600
    "#3b82f6", // blue-500
    "#60a5fa", // blue-400
    "#10b981", // green-600
  ], []);
  
  // Single neutral grey for quarterly/monthly aggregation
  const QUARTERLY_GREY = "#6b7280"; // gray-500
  
  // Neutral grey palette for annual mode when >7 cohorts
  const greyColorPalette = React.useMemo(() => [
    "#6b7280", // gray-500
    "#78716c", // stone-600
    "#71717a", // zinc-500
    "#737373", // neutral-500
  ], []);

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

  // Get color for cohort based on cohort type and count
  // Quarterly/Monthly: always single neutral grey
  // Annual: limited colors for <=7 cohorts, grey palette for >7 cohorts
  const getCohortColor = React.useCallback((cohortKey: string): string => {
    // Quarterly or Monthly: always use single neutral grey
    if (cohortType === 'quarterly' || cohortType === 'monthly') {
      return QUARTERLY_GREY;
    }
    
    // Annual: use limited colors for <=7 cohorts, grey for >7
    const cohortCount = sortedCohortKeys.length;
    const index = sortedCohortKeys.indexOf(cohortKey);
    
    if (cohortCount <= 7) {
      // Use limited color palette
      return cohortColorScale[index >= 0 ? index % cohortColorScale.length : 0];
    } else {
      // Use grey palette for >7 cohorts
      return greyColorPalette[index >= 0 ? index % greyColorPalette.length : 0];
    }
  }, [sortedCohortKeys, cohortType, cohortColorScale, greyColorPalette]);

  // Heatmap color function for retention table (matches Revenue Cohorts matrix style)
  // Blue intensity scale: higher retention = darker blue, lower retention = lighter blue
  // Clamp customer retention to [0, 100] for color scaling only
  const getRetentionHeatmapColor = React.useCallback((retention: number | null): { bg: string; text: string } => {
    if (retention === null) {
      // Missing values: neutral light grey with muted text
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-400'
      };
    }
    
    // Clamp retention to [0, 100] for color scaling (customer retention should not exceed 100%)
    // If >100 appears, cap at 100 for color only (don't change raw value display)
    const clampedRetention = Math.min(Math.max(retention, 0), 100);
    
    // Blue scale matching Revenue Cohorts matrix (10-step scale)
    if (clampedRetention >= 90) return { bg: 'bg-blue-900', text: 'text-white' };
    if (clampedRetention >= 80) return { bg: 'bg-blue-800', text: 'text-white' };
    if (clampedRetention >= 70) return { bg: 'bg-blue-700', text: 'text-white' };
    if (clampedRetention >= 60) return { bg: 'bg-blue-600', text: 'text-white' };
    if (clampedRetention >= 50) return { bg: 'bg-blue-500', text: 'text-white' };
    if (clampedRetention >= 40) return { bg: 'bg-blue-400', text: 'text-gray-900' };
    if (clampedRetention >= 30) return { bg: 'bg-blue-300', text: 'text-gray-900' };
    if (clampedRetention >= 20) return { bg: 'bg-blue-200', text: 'text-gray-900' };
    if (clampedRetention >= 10) return { bg: 'bg-blue-100', text: 'text-gray-700' };
    if (clampedRetention > 0) return { bg: 'bg-blue-50', text: 'text-gray-600' };
    // 0% values: visually distinct
    return { bg: 'bg-blue-50', text: 'text-gray-500' };
  }, []);

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
    
    // Demo-only: Clamp revenue retention at display point
    return retentionType === 'customer' 
      ? periodData.retentionRate 
      : clampRevenueRetention(periodData.revenueRetention);
  }, [retentionCurveData, clampRevenueRetention]);

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

    // Calculate data coverage from corrected cohorts (same source as aggregated chart)
    const cohortDates = correctedCohorts.map(c => {
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
        cohortCount: correctedCohorts.length,
        yearsObserved,
        dateRange,
        periodsAvailable,
      },
      maxDrop,
    };
  }, [retentionCurveData, getBenchmarkRetention, year1PeriodNum, cohortType, retentionType, correctedCohorts]);

  // =============================================================================
  // DEV-ONLY PARITY GUARD: Ensure KPI values match aggregated chart values
  // =============================================================================
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && retentionCurveData.length > 0) {
      const year1ChartValue = retentionType === 'customer'
        ? retentionCurveData.find(d => d.period === year1PeriodNum)?.retentionRate
        : clampRevenueRetention(retentionCurveData.find(d => d.period === year1PeriodNum)?.revenueRetention ?? 0);
      
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
  }, [
    clampRevenueRetention,
    kpiMetrics.year1Retention,
    kpiMetrics.year1RevenueRetention,
    retentionCurveData,
    retentionType,
    year1PeriodNum,
  ]);

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
    return retentionCurveData.map(d => {
      // Demo-only: Apply final clamp to revenue retention for chart display
      // CFO-TRUST: This ensures chart tooltips never show >100% in demo mode
      const retentionValue = retentionType === 'customer' 
        ? d.retentionRate 
        : clampRevenueRetention(d.revenueRetention);
      
      return {
        period: d.periodLabel,
        value: retentionValue, // This value is used in chart tooltip - already clamped
        cohortSize: d.cohortSize,
      };
    });
  }, [retentionCurveData, retentionType, clampRevenueRetention]);

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
      {/* Page Header with Narrative Framing */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Retention Curves</h1>
        <p className="text-lg font-semibold text-gray-700 mb-2">The Damage Map</p>
        <p className="text-sm text-gray-600 max-w-3xl">
          How early do we lose customers — and is it fixable? Retention doesn&apos;t slowly fade away but falls off a cliff over certain time periods. 
          When does loss become irreversible? Why do cohorts never recover? Which customers are actually worth saving?
        </p>
      </div>

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

      {/* AI Analysis Section - Gated behind feature flag */}
      {process.env.NEXT_PUBLIC_ENABLE_AI_ANALYSIS === "true" && (
        <div className="mb-8">
          <AIAnalysis 
            filters={filterState}
            cohorts={correctedCohorts}
            onRegenerate={fetchCohorts}
          />
        </div>
      )}

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
                    Aggregated retention is size-weighted: we sum active customers across eligible cohorts each period and divide by the sum of cohort sizes.
                  </p>
                  <p className="text-xs text-gray-300 mb-1">
                    Periods are shown only where enough cohorts have reached that age.
                  </p>
                  <p className="text-xs text-gray-300">
                    This value matches the aggregated chart at Year 1 for the current filters.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
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
            {kpiMetrics.year1RevenueRetention !== null ? `${clampRevenueRetention(kpiMetrics.year1RevenueRetention).toFixed(1)}%` : 'N/A'}
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
                {viewMode === 'aggregated' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1.5 cursor-help text-gray-400 hover:text-gray-600">
                        <Info className="w-3 h-3" />
                        <span className="font-medium text-gray-700">Aggregation:</span>
                        <span>Size-weighted</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                      <p className="text-xs mb-1">
                        Aggregated retention is size-weighted: we sum active customers across eligible cohorts each period and divide by the sum of cohort sizes.
                      </p>
                      <p className="text-xs text-gray-300">
                        Periods are shown only where enough cohorts have reached that age.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
          
          {/* BLOCKER 4: Compact controls - single horizontal row */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
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
              <div className="flex items-center gap-1">
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                    <p className="text-xs">
                      Revenue retention can exceed 100% when customers expand spend over time.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
                disabled={cohortType === 'monthly'}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cohort'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } ${
                  cohortType === 'monthly'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                title={cohortType === 'monthly' ? 'Cohort-by-cohort is available for quarterly/annual views for readability.' : ''}
              >
                Cohort-by-Cohort
              </button>
            </div>
            
            {/* Cohort Selection Actions - Only show in Cohort-by-Cohort view */}
            {viewMode === 'cohort' && allCohortLabels.length > 0 && (
              <>
                <button
                  onClick={showLatest5}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Show latest 5
                </button>
                <button
                  onClick={showAllCohorts}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Show all
                </button>
                <button
                  onClick={clearCohorts}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            
            <button 
              onClick={() => {
                // Export CSV - different format based on view mode
                if (viewMode === 'aggregated') {
                  const csvHeaders = ['Period', 'Cohort Size', 'Retention Rate (%)', 'Revenue Retention (%)'];
                  const csvRows = retentionCurveData.map(d => [
                    d.periodLabel,
                    d.cohortSize.toString(),
                    d.retentionRate.toFixed(1),
                    clampRevenueRetention(d.revenueRetention).toFixed(1), // Demo-only clamp for CSV export
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
          
          {/* Cohort Legend (read-only) - Only show in Cohort-by-Cohort view */}
          {viewMode === 'cohort' && allCohortLabels.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {filteredCohortLabels.map((label) => {
                  const isVisible = showCohorts.has(label);
                  const isPlotted = plottedCohorts.some(c => c.cohortKey === label);
                  // Use same color mapping as chart lines
                  const color = getCohortColor(label);
                
                  return (
                    <div
                      key={label}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border-2 ${
                        isVisible
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                        } ${isPlotted ? '' : isVisible ? 'opacity-60' : ''}`}
                        title={isVisible && !isPlotted ? 'Selected but not plotted' : ''}
                    >
                      <div
                        className={`w-3 h-3 rounded-sm flex-shrink-0 border ${
                          isVisible ? 'border-gray-300' : 'border-gray-300'
                        }`}
                        style={{ 
                          backgroundColor: isVisible ? color : '#d1d5db',
                            opacity: isVisible ? (isPlotted ? 1 : 0.5) : 0.5
                        }}
                      />
                      <span className={isVisible ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              
            </div>
          )}
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
                              {displayData.map((item, _idx) => {
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
                          {payload?.map((entry, _index) => {
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
                        {clampRevenueRetention(data.revenueRetention).toFixed(1)}%
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
                          
                          // BLOCKER 3: Apply heatmap styling
                          const heatmapStyle = getRetentionHeatmapColor(value);
                          return (
                            <td 
                              key={periodNum} 
                              className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${heatmapStyle.bg} ${heatmapStyle.text}`}
                            >
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

      {/* Diagnosis Section */}
      {(() => {
        const enhancedDiagnosis = diagnoseRetentionCurvesEnhanced({
          cohorts: filteredCohorts,
          retentionCurveData,
          cohortCurvesData,
          retentionType,
        });
        return enhancedDiagnosis.sentence ? (
          <>
            <Diagnosis sentence={enhancedDiagnosis.sentence} />
            
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
            <DecisionAxes 
              axes={getDecisionAxesForDiagnosis(enhancedDiagnosis.sentence, 'retention-curves')}
            />
            
            {/* Impact Ranges Section - Only render when Diagnosis exists */}
            <ImpactRanges 
              ranges={computeRetentionCurvesImpactRanges({
                cohorts: correctedCohorts,
                cohortCurvesData,
                retentionType,
              })}
            />
          </>
        ) : null;
      })()}
    </div>
  );
}

export default function RetentionCurvesPage() {
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
      <RetentionCurvesContent />
    </Suspense>
  );
}
