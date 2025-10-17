"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  Download,
  BarChart3,
  Crown,
  AlertTriangle,
  Filter,
} from "lucide-react";

interface CohortData {
  cohort_month: string;
  customers: number;
  total_revenue: number;
  avg_ltv: number;
  retention_rate: number;
  repeat_customers: number;
  avg_orders_per_customer: number;
}

interface RevenueCohortsResponse {
  success: boolean;
  data: {
    cohorts: CohortData[];
    total_revenue: number;
    avg_ltv: number;
    best_cohort: string;
    worst_cohort: string;
    calculated_at: string;
  };
  error?: string;
}

export default function RevenueCohortsPage() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  // const [selectedCohort, setSelectedCohort] = useState<string | null>(null);

  // Define filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'date',
      placeholder: 'Select date range',
      autoRefresh: true,
    },
    {
      id: 'timePeriod',
      label: 'Time Period',
      type: 'select',
      placeholder: 'Select time period',
      autoRefresh: true,
      options: [
        { id: '7d', label: 'Last 7 days', value: '7d' },
        { id: '30d', label: 'Last 30 days', value: '30d' },
        { id: '90d', label: 'Last 90 days', value: '90d' },
        { id: '1y', label: 'Last year', value: '1y' },
        { id: 'all', label: 'All time', value: 'all' },
      ],
    },
    {
      id: 'cohortType',
      label: 'Cohort Type',
      type: 'select',
      placeholder: 'Select cohort type',
      autoRefresh: false,
      options: [
        { id: 'revenue', label: 'Revenue Cohorts', value: 'revenue' },
        { id: 'customer', label: 'Customer Cohorts', value: 'customer' },
        { id: 'product', label: 'Product Cohorts', value: 'product' },
      ],
    },
    {
      id: 'ltvRange',
      label: 'LTV Range',
      type: 'select',
      placeholder: 'Select LTV range',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All LTV Ranges', value: 'all' },
        { id: 'high', label: 'High LTV (>$500)', value: 'high' },
        { id: 'medium', label: 'Medium LTV ($100-$500)', value: 'medium' },
        { id: 'low', label: 'Low LTV (<$100)', value: 'low' },
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCohortPerformance = (cohort: CohortData) => {
    if (cohort.avg_ltv > 500) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (cohort.avg_ltv > 200) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (cohort.avg_ltv > 100) return { level: 'average', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'poor', color: 'text-red-600', bg: 'bg-red-50' };
  };

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Cohorts</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchCohorts}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Premium Header with Gradient */}
      <div className="mb-8">
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

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-green-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Revenue Cohort Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchCohorts}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-green-900">
                {formatCurrency(cohorts.reduce((sum, c) => sum + c.total_revenue, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Average LTV</p>
              <p className="text-3xl font-bold text-blue-900">
                {formatCurrency(cohorts.reduce((sum, c) => sum + c.avg_ltv, 0) / cohorts.length || 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-purple-900">
                {cohorts.reduce((sum, c) => sum + c.customers, 0).toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Best Cohort</p>
              <p className="text-3xl font-bold text-orange-900">
                {cohorts.length > 0 ? cohorts.reduce((best, c) => c.avg_ltv > best.avg_ltv ? c : best).cohort_month : 'N/A'}
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
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Cohort Performance Chart Placeholder */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Cohort Trends</h3>
            <div className="h-80 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl flex items-center justify-center border-2 border-dashed border-green-200">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-green-600 font-medium">Revenue Cohort Chart</p>
                <p className="text-green-500 text-sm">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Cohort Performance Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cohort Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg LTV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retention Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cohorts.map((cohort) => {
                  const performance = getCohortPerformance(cohort);
                  return (
                    <tr key={cohort.cohort_month} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cohort.cohort_month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cohort.customers.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cohort.total_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cohort.avg_ltv)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cohort.retention_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${performance.bg} ${performance.color}`}>
                          {performance.level.charAt(0).toUpperCase() + performance.level.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}