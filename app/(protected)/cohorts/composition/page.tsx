"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  Users,
  TrendingUp,
  PieChart,
  RefreshCw,
  Download,
  Crown,
  AlertTriangle,
  Filter,
} from "lucide-react";

interface CompositionData {
  segment: string;
  count: number;
  percentage: number;
  avg_order_value: number;
  total_revenue: number;
  repeat_rate: number;
  avg_orders_per_customer: number;
}

interface CompositionResponse {
  success: boolean;
  data: {
    compositions: CompositionData[];
    total_customers: number;
    new_customers_30d: number;
    returning_customers: number;
    calculated_at: string;
  };
  error?: string;
}

export default function CustomerCompositionPage() {
  const [compositions, setCompositions] = useState<CompositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  // const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

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
      id: 'customerType',
      label: 'Customer Type',
      type: 'multiselect',
      placeholder: 'Select customer types',
      autoRefresh: false,
      options: [
        { id: 'new', label: 'New Customers', value: 'new' },
        { id: 'returning', label: 'Returning Customers', value: 'returning' },
        { id: 'vip', label: 'VIP Customers', value: 'vip' },
        { id: 'at-risk', label: 'At-Risk Customers', value: 'at-risk' },
      ],
    },
    {
      id: 'segmentType',
      label: 'Segment Type',
      type: 'select',
      placeholder: 'Select segment type',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Segments', value: 'all' },
        { id: 'value', label: 'Value Segments', value: 'value' },
        { id: 'activity', label: 'Activity Segments', value: 'activity' },
        { id: 'frequency', label: 'Frequency Segments', value: 'frequency' },
      ],
    },
  ];

  const fetchCompositions = useCallback(async () => {
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
      
      const response = await fetch(`/api/metrics/composition?${queryParams.toString()}`);
      const data: CompositionResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch compositions');
      }

      setCompositions(data.data.compositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compositions');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchCompositions();
  }, [fetchCompositions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSegmentColor = (segment: string) => {
    const colors: Record<string, string> = {
      'New Customers': 'bg-blue-100 text-blue-800',
      'Returning Customers': 'bg-green-100 text-green-800',
      'VIP Customers': 'bg-purple-100 text-purple-800',
      'At-Risk Customers': 'bg-yellow-100 text-yellow-800',
      'Dormant Customers': 'bg-orange-100 text-orange-800',
      'Lost Customers': 'bg-red-100 text-red-800',
    };
    return colors[segment] || 'bg-gray-100 text-gray-800';
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Compositions</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchCompositions}
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
        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Users className="w-10 h-10 mr-3" />
                Customer Composition
              </h1>
              <p className="text-purple-100 text-lg">Understand the demographic and behavioral makeup of your customer base</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{compositions.reduce((sum, c) => sum + c.count, 0).toLocaleString()}</div>
              <div className="text-purple-100">Total Customers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-purple-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Composition Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchCompositions}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-purple-900">
                {compositions.reduce((sum, c) => sum + c.count, 0).toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">New Customers</p>
              <p className="text-3xl font-bold text-blue-900">
                {compositions.find(c => c.segment === 'New Customers')?.count || 0}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Returning Customers</p>
              <p className="text-3xl font-bold text-green-900">
                {compositions.find(c => c.segment === 'Returning Customers')?.count || 0}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">VIP Customers</p>
              <p className="text-3xl font-bold text-orange-900">
                {compositions.find(c => c.segment === 'VIP Customers')?.count || 0}
              </p>
            </div>
            <Crown className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Premium Composition Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <PieChart className="w-6 h-6 mr-2 text-purple-600" />
              Customer Composition Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Composition Chart Placeholder */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Type Distribution</h3>
            <div className="h-80 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-200">
              <div className="text-center">
                <PieChart className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-purple-600 font-medium">Customer Composition Chart</p>
                <p className="text-purple-500 text-sm">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Composition Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Segment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Repeat Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {compositions.map((composition) => (
                  <tr key={composition.segment} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getSegmentColor(composition.segment)}`}>
                        {composition.segment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {composition.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {composition.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(composition.avg_order_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(composition.total_revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {composition.repeat_rate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}