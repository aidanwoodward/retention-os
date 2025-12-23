"use client";

import { useState, useEffect, useCallback } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { revenueCohortsFilters, revenueCohortsSearch } from "@/lib/filters/config";
import { RevenueCohortsChart } from "@/components/charts/RevenueCohortsChart";
import { CohortMatrix } from "@/components/charts/CohortMatrix";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { LoadingButton } from "@/components/ui/loading-buttons";
import { useSearchParams } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  Users,
  Download,
  BarChart3,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { FilterValue } from "@/lib/filters/types";

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

export default function RevenueCohortsPage() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<Record<string, FilterValue>>({});
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const searchParams = useSearchParams();
  // const [cagr, setCagr] = useState<number>(0);
  // const [selectedCohort, setSelectedCohort] = useState<string | null>(null);

  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      // Use URL params directly since FilterBar syncs to URL
      const queryString = searchParams.toString();
      
      const response = await fetch(`/api/metrics/cohorts?${queryString}`);
      const data: RevenueCohortsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cohorts');
      }

      setCohorts(data.data.cohorts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cohorts');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  // Calculate CAGR when cohorts change
  // useEffect(() => {
  //   if (cohorts.length > 0) {
  //     const avgCagr = Math.random() * 15 + 10; // Mock CAGR between 10-25%
  //     setCagr(avgCagr);
  //   }
  // }, [cohorts]);

  // Handle view mode changes - check URL params
  useEffect(() => {
    const cohortType = searchParams.get('cohortType');
    if (cohortType && ['monthly', 'quarterly', 'annual'].includes(cohortType)) {
      setViewMode(cohortType as 'monthly' | 'quarterly' | 'annual');
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


  if (loading) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
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
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Universal left anchor - consistent 32px (lg:px-8) */}
      
      {/* Premium Header with Gradient */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <DollarSign className="w-10 h-10 mr-3" />
                Revenue Cohorts
              </h1>
              <p className="text-green-100 text-lg">Analyze customer revenue patterns and lifetime value by acquisition cohort</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{cohorts.length}</div>
              <div className="text-green-100">Active Cohorts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
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
      <div className="mb-6">
        <AIAnalysis 
          filters={filterState}
          cohorts={cohorts}
          onRegenerate={fetchCohorts}
        />
      </div>

      {/* Premium Summary Cards - KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Primary KPI - Total Revenue with accent border */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-l-4 border-green-600 border border-green-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-green-600 text-sm font-medium mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-green-900 leading-tight">
                {formatCurrency(cohorts.reduce((sum, c) => sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0))}
              </p>
              <p className="text-sm text-green-700 mt-2">+18.7% YoY</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
          </div>
        </div>
        
        {/* Secondary KPI - Average LTV */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-blue-600 text-sm font-medium mb-1">Average LTV (2024)</p>
              <p className="text-3xl font-bold text-blue-900 leading-tight">
                {formatCurrency(cohorts.reduce((sum, c) => {
                  const totalRevenue = c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0);
                  return sum + (totalRevenue / c.cohort_size);
                }, 0) / cohorts.length || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-2">+12.3% YoY</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
          </div>
        </div>
        
        {/* Secondary KPI - Total Customers */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-purple-600 text-sm font-medium mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-purple-900 leading-tight">
                {formatNumber(cohorts.reduce((sum, c) => sum + c.cohort_size, 0))}
              </p>
              <p className="text-sm text-purple-700 mt-2">+15.2% YoY</p>
            </div>
            <Users className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
          </div>
        </div>
        
        {/* Secondary KPI - Best Cohort */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-orange-600 text-sm font-medium mb-1">Best Cohort</p>
              <p className="text-3xl font-bold text-orange-900 leading-tight">
                {cohorts.length > 0 ? cohorts.reduce((best, c) => {
                  const cLtv = c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0) / c.cohort_size;
                  const bestLtv = best.periods.reduce((pSum, p) => pSum + p.total_revenue, 0) / best.cohort_size;
                  return cLtv > bestLtv ? c : best;
                }).cohort_month : 'N/A'}
              </p>
            </div>
            <Crown className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200 my-6"></div>

      {/* Premium Cohort Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-green-600" />
              Revenue Cohort Analysis
            </h2>
            <div className="flex items-center space-x-4">
              <LoadingButton
                isLoading={false}
                onClick={() => console.log('Export data')}
                loadingText="Exporting..."
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </LoadingButton>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Section Header: Cohort Trends */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Cohort Trends</h3>
            <p className="text-sm text-gray-600">Revenue contribution by cohort over time</p>
          </div>

          {/* Revenue Cohort Chart with Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div className="lg:col-span-3">
              <RevenueCohortsChart cohorts={cohorts} viewMode={viewMode} />
            </div>
            
            {/* Composition Column - Only show for quarterly and annual */}
            {(viewMode === 'quarterly' || viewMode === 'annual') && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Period Composition</h3>
                  
                  {/* Repeat Revenue by Cohort */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Repeat Revenue by Cohort</h4>
                    <div className="space-y-2">
                      {cohorts.slice(0, 5).map((cohort) => {
                        const repeatRate = Math.random() * 40 + 30; // 30-70% mock data
                        return (
                          <div key={cohort.cohort_month} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{cohort.cohort_month}</span>
                            <span className="text-sm font-medium">{repeatRate.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* New Revenue for Latest Cohort */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">New Revenue (Latest Cohort)</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.floor(Math.random() * 30 + 20)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">First-time orders</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Divider before Matrix */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Section Header: Revenue Matrix */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Revenue Matrix</h3>
            <p className="text-sm text-gray-600">Detailed cohort performance breakdown</p>
          </div>

          {/* Cohort Matrix */}
          <CohortMatrix 
            cohorts={cohorts}
            viewMode={viewMode}
            onCellClick={(cohort, period, data) => {
              console.log('Cell clicked:', { cohort, period, data });
            }}
          />
        </div>
      </div>
    </div>
  );
}