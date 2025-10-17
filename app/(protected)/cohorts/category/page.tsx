"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  Target,
  TrendingUp,
  Package,
  BarChart3,
  RefreshCw,
  Download,
  ShoppingCart,
  Crown,
  Activity,
  AlertTriangle,
  DollarSign,
  Filter,
  Heart,
  Star,
} from "lucide-react";

interface CategoryCohortData {
  category: string;
  customers: number;
  total_revenue: number;
  avg_order_value: number;
  retention_rate: number;
  repeat_customers: number;
  avg_orders_per_customer: number;
  cross_sell_rate: number;
}

interface CategoryCohortsResponse {
  success: boolean;
  data: {
    cohorts: CategoryCohortData[];
    total_categories: number;
    best_category: string;
    worst_category: string;
    calculated_at: string;
  };
  error?: string;
}

export default function CategoryCohortsPage() {
  const [cohorts, setCohorts] = useState<CategoryCohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  // const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
      id: 'categoryType',
      label: 'Category Type',
      type: 'multiselect',
      placeholder: 'Select categories',
      autoRefresh: false,
      options: [
        { id: 'electronics', label: 'Electronics', value: 'electronics' },
        { id: 'apparel', label: 'Apparel', value: 'apparel' },
        { id: 'home', label: 'Home Goods', value: 'home' },
        { id: 'beauty', label: 'Beauty', value: 'beauty' },
        { id: 'sports', label: 'Sports', value: 'sports' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance Level',
      type: 'select',
      placeholder: 'Select performance level',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Performance Levels', value: 'all' },
        { id: 'high', label: 'High Performance (>50% retention)', value: 'high' },
        { id: 'medium', label: 'Medium Performance (25-50% retention)', value: 'medium' },
        { id: 'low', label: 'Low Performance (<25% retention)', value: 'low' },
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
      
      const response = await fetch(`/api/metrics/category-cohorts?${queryParams.toString()}`);
      const data: CategoryCohortsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch category cohorts');
      }

      setCohorts(data.data.cohorts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch category cohorts');
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

  const getCategoryPerformance = (cohort: CategoryCohortData) => {
    if (cohort.retention_rate > 50) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (cohort.retention_rate > 25) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
    return { level: 'poor', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      'Electronics': Package,
      'Apparel': ShoppingCart,
      'Home Goods': Heart,
      'Beauty': Star,
      'Sports': Activity,
    };
    return icons[category] || Package;
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Category Cohorts</h3>
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
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Target className="w-10 h-10 mr-3" />
                Category Cohorts
              </h1>
              <p className="text-orange-100 text-lg">Analyze customer behavior and retention based on product categories purchased</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{cohorts.length}</div>
              <div className="text-orange-100">Active Categories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-orange-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Category Cohort Filters</h3>
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
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Total Categories</p>
              <p className="text-3xl font-bold text-orange-900">{cohorts.length}</p>
            </div>
            <Target className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Best Category</p>
              <p className="text-3xl font-bold text-blue-900">
                {cohorts.length > 0 ? cohorts.reduce((best, c) => c.retention_rate > best.retention_rate ? c : best).category : 'N/A'}
              </p>
            </div>
            <Crown className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Avg Retention</p>
              <p className="text-3xl font-bold text-green-900">
                {cohorts.length > 0 ? (cohorts.reduce((sum, c) => sum + c.retention_rate, 0) / cohorts.length).toFixed(1) : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-purple-900">
                {formatCurrency(cohorts.reduce((sum, c) => sum + c.total_revenue, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Premium Category Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-orange-600" />
              Category Cohort Performance
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Category Performance Chart Placeholder */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance Trends</h3>
            <div className="h-80 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl flex items-center justify-center border-2 border-dashed border-orange-200">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <p className="text-orange-600 font-medium">Category Cohort Chart</p>
                <p className="text-orange-500 text-sm">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Category Performance Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retention Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cross-sell Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cohorts.map((cohort) => {
                  const performance = getCategoryPerformance(cohort);
                  const Icon = getCategoryIcon(cohort.category);
                  return (
                    <tr key={cohort.category} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{cohort.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cohort.customers.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cohort.total_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cohort.avg_order_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cohort.retention_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cohort.cross_sell_rate.toFixed(1)}%
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