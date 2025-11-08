"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import { RevenueCohortsChart } from "@/components/charts/RevenueCohortsChart";
import { CohortMatrix } from "@/components/charts/CohortMatrix";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { LoadingButton } from "@/components/ui/loading-buttons";
import {
  DollarSign,
  TrendingUp,
  Users,
  Download,
  BarChart3,
  Crown,
  AlertTriangle,
} from "lucide-react";

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
  const [filterState, setFilterState] = useState<FilterState>({});
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  // const [cagr, setCagr] = useState<number>(0);
  // const [selectedCohort, setSelectedCohort] = useState<string | null>(null);

  // Define enhanced filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'date',
      placeholder: 'Select date range',
      autoRefresh: true,
    },
    {
      id: 'cohortType',
      label: 'Cohort Type',
      type: 'select',
      placeholder: 'Select granularity',
      autoRefresh: true,
      options: [
        { id: 'monthly', label: 'Monthly', value: 'monthly' },
        { id: 'quarterly', label: 'Quarterly', value: 'quarterly' },
        { id: 'annual', label: 'Annual', value: 'annual' },
      ],
    },
    {
      id: 'geography',
      label: 'Geography',
      type: 'multiselect',
      placeholder: 'Select countries',
      autoRefresh: false,
      options: [
        { id: 'uk', label: 'United Kingdom', value: 'uk' },
        { id: 'de', label: 'Germany', value: 'de' },
        { id: 'fr', label: 'France', value: 'fr' },
        { id: 'es', label: 'Spain', value: 'es' },
        { id: 'us', label: 'United States', value: 'us' },
      ],
    },
    {
      id: 'customerSegment',
      label: 'Customer Segment',
      type: 'select',
      placeholder: 'Select segment',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Customers', value: 'all' },
        { id: 'high-value', label: 'High Value (Top 30%)', value: 'high-value' },
        { id: 'repeat', label: 'Repeat Buyers Only', value: 'repeat' },
        { id: 'one-time', label: 'One Time Buyers', value: 'one-time' },
        { id: 'at-risk', label: 'At Risk', value: 'at-risk' },
        { id: 'lapsed', label: 'Lapsed', value: 'lapsed' },
      ],
    },
    {
      id: 'productCategory',
      label: 'Product Category',
      type: 'multiselect',
      placeholder: 'Select categories',
      autoRefresh: false,
      options: [
        { id: 'skincare', label: 'Skincare', value: 'skincare' },
        { id: 'apparel', label: 'Apparel', value: 'apparel' },
        { id: 'accessories', label: 'Accessories', value: 'accessories' },
        { id: 'home', label: 'Home & Living', value: 'home' },
      ],
    },
    {
      id: 'customerType',
      label: 'Customer Type',
      type: 'select',
      placeholder: 'Select type',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All', value: 'all' },
        { id: 'new', label: 'New Customers', value: 'new' },
        { id: 'returning', label: 'Returning Customers', value: 'returning' },
      ],
    },
  ];

  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      // Build query string from filter state
      const queryParams = new URLSearchParams();
      Object.entries(filterState).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else if (typeof value === 'object' && 'from' in value && 'to' in value) {
            queryParams.append(`${key}_from`, value.from);
            queryParams.append(`${key}_to`, value.to);
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
      
      const response = await fetch(`/api/metrics/cohorts?${queryParams.toString()}`);
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
  }, [filterState]);

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

  // Handle view mode changes
  useEffect(() => {
    if (filterState.cohortType) {
      setViewMode(filterState.cohortType as 'monthly' | 'quarterly' | 'annual');
    }
  }, [filterState.cohortType]);

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
      {/* Enhanced Filters */}
            <div className="mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <EnhancedFilters
                  filters={filterConfig}
                  onFiltersChange={setFilterState}
                  onApplyFilters={fetchCohorts}
                  loading={loading}
                />
              </div>
            </div>

      {/* AI Analysis Section */}
      <AIAnalysis 
        filters={filterState}
        cohorts={cohorts}
        onRegenerate={fetchCohorts}
      />

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-green-900">
                {formatCurrency(cohorts.reduce((sum, c) => sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0))}
              </p>
              <p className="text-sm text-green-700 mt-1">+18.7% YoY</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Average LTV (2024)</p>
              <p className="text-3xl font-bold text-blue-900">
                {formatCurrency(cohorts.reduce((sum, c) => {
                  const totalRevenue = c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0);
                  return sum + (totalRevenue / c.cohort_size);
                }, 0) / cohorts.length || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-1">+12.3% YoY</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-purple-900">
                {formatNumber(cohorts.reduce((sum, c) => sum + c.cohort_size, 0))}
              </p>
              <p className="text-sm text-purple-700 mt-1">+15.2% YoY</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Best Cohort</p>
              <p className="text-3xl font-bold text-orange-900">
                {cohorts.length > 0 ? cohorts.reduce((best, c) => {
                  const cLtv = c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0) / c.cohort_size;
                  const bestLtv = best.periods.reduce((pSum, p) => pSum + p.total_revenue, 0) / best.cohort_size;
                  return cLtv > bestLtv ? c : best;
                }).cohort_month : 'N/A'}
              </p>
            </div>
            <Crown className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Premium Cohort Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
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
          {/* Revenue Cohort Chart with Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
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