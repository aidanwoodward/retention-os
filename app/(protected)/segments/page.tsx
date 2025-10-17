"use client";

import { useState, useEffect, useCallback } from "react";
// import Link from "next/link";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  Activity,
  AlertTriangle,
  Crown,
  Brain,
} from "lucide-react";

interface CustomerSegment {
  customer_id: string;
  first_order_at: string;
  last_order_at: string;
  actual_total_spent: number;
  actual_orders_count: number;
  avg_order_value: number;
  days_since_last_order: number;
  customer_lifespan_days: number;
  revenue_per_day: number;
  value_segment: 'VIP' | 'High Value' | 'Medium Value' | 'Low Value' | 'Very Low Value';
  activity_segment: 'Active' | 'At Risk' | 'Dormant' | 'Lost';
  frequency_segment: 'One-time Buyer' | 'Occasional Buyer' | 'Regular Buyer' | 'Frequent Buyer';
  aov_segment: 'High AOV' | 'Medium AOV' | 'Low AOV';
  calculated_at: string;
}

interface SegmentSummary {
  segment: string;
  count: number;
  total_revenue: number;
  avg_revenue_per_customer: number;
}

interface SegmentsResponse {
  success: boolean;
  data: {
    segments: CustomerSegment[];
    summaries: {
      value: SegmentSummary[];
      activity: SegmentSummary[];
      frequency: SegmentSummary[];
      aov: SegmentSummary[];
    };
    total_customers: number;
    latest_calculated_at: string;
  };
  error?: string;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [summaries, setSummaries] = useState<SegmentsResponse['data']['summaries'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'value' | 'activity' | 'frequency' | 'aov'>('value');
  const [filterState, setFilterState] = useState<FilterState>({});

  // Define filter configuration for segments
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
      id: 'segmentType',
      label: 'Segment Type',
      type: 'multiselect',
      placeholder: 'Select segment types',
      autoRefresh: false,
      options: [
        { id: 'value', label: 'Value Segments', value: 'value' },
        { id: 'activity', label: 'Activity Segments', value: 'activity' },
        { id: 'frequency', label: 'Frequency Segments', value: 'frequency' },
        { id: 'aov', label: 'AOV Segments', value: 'aov' },
      ],
    },
    {
      id: 'customerType',
      label: 'Customer Type',
      type: 'select',
      placeholder: 'Select customer type',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Customers', value: 'all' },
        { id: 'new', label: 'New Customers', value: 'new' },
        { id: 'returning', label: 'Returning Customers', value: 'returning' },
        { id: 'vip', label: 'VIP Customers', value: 'vip' },
        { id: 'at-risk', label: 'At-Risk Customers', value: 'at-risk' },
      ],
    },
  ];
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
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
      
      const response = await fetch(`/api/metrics/segments?${queryParams.toString()}`);
      const data: SegmentsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch segments');
      }

      setSegments(data.data.segments);
      setSummaries(data.data.summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch segments');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSegmentColor = (segment: string, type: string) => {
    const colors: Record<string, Record<string, string>> = {
      value: {
        'VIP': 'bg-purple-100 text-purple-800',
        'High Value': 'bg-blue-100 text-blue-800',
        'Medium Value': 'bg-green-100 text-green-800',
        'Low Value': 'bg-yellow-100 text-yellow-800',
        'Very Low Value': 'bg-gray-100 text-gray-800'
      },
      activity: {
        'Active': 'bg-green-100 text-green-800',
        'At Risk': 'bg-yellow-100 text-yellow-800',
        'Dormant': 'bg-orange-100 text-orange-800',
        'Lost': 'bg-red-100 text-red-800'
      },
      frequency: {
        'Frequent Buyer': 'bg-purple-100 text-purple-800',
        'Regular Buyer': 'bg-blue-100 text-blue-800',
        'Occasional Buyer': 'bg-green-100 text-green-800',
        'One-time Buyer': 'bg-gray-100 text-gray-800'
      },
      aov: {
        'High AOV': 'bg-purple-100 text-purple-800',
        'Medium AOV': 'bg-blue-100 text-blue-800',
        'Low AOV': 'bg-gray-100 text-gray-800'
      }
    };
    return colors[type]?.[segment] || 'bg-gray-100 text-gray-800';
  };

  const filteredSegments = selectedSegment 
    ? segments.filter(segment => segment[`${activeTab}_segment` as keyof CustomerSegment] === selectedSegment)
    : segments;

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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Segments</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchSegments}
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
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Brain className="w-10 h-10 mr-3" />
                Customer Intelligence
              </h1>
              <p className="text-blue-100 text-lg">Advanced segmentation and behavioral analytics</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{segments.length.toLocaleString()}</div>
              <div className="text-blue-100">Total Segments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Advanced Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchSegments}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-blue-900">{segments.length.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">VIP Customers</p>
              <p className="text-3xl font-bold text-green-900">
                {segments.filter(s => s.value_segment === 'VIP').length}
              </p>
            </div>
            <Crown className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Active Customers</p>
              <p className="text-3xl font-bold text-purple-900">
                {segments.filter(s => s.activity_segment === 'Active').length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">At Risk</p>
              <p className="text-3xl font-bold text-orange-900">
                {segments.filter(s => s.activity_segment === 'At Risk').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Premium Segment Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Target className="w-6 h-6 mr-2 text-blue-600" />
              Segment Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'value', label: 'Value Segments', icon: DollarSign, color: 'text-green-600' },
              { key: 'activity', label: 'Activity Segments', icon: Activity, color: 'text-blue-600' },
              { key: 'frequency', label: 'Frequency Segments', icon: BarChart3, color: 'text-purple-600' },
              { key: 'aov', label: 'AOV Segments', icon: TrendingUp, color: 'text-orange-600' }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'value' | 'activity' | 'frequency' | 'aov')}
                  className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-2 ${activeTab === tab.key ? tab.color : ''}`} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Segment Summary Cards */}
          {summaries && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {summaries[activeTab].map((summary) => (
                <button
                  key={summary.segment}
                  onClick={() => setSelectedSegment(selectedSegment === summary.segment ? null : summary.segment)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedSegment === summary.segment
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-3 ${getSegmentColor(summary.segment, activeTab)}`}>
                        {summary.segment}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{summary.count}</div>
                      <div className="text-sm text-gray-600">customers</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <div>Revenue: {formatCurrency(summary.total_revenue)}</div>
                    <div>Avg: {formatCurrency(summary.avg_revenue_per_customer)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Customer List */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedSegment ? `${selectedSegment} Customers` : 'All Customers'}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AOV
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Segments
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSegments.slice(0, 10).map((segment) => (
                    <tr key={segment.customer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Customer {segment.customer_id.slice(-6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(segment.actual_total_spent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {segment.actual_orders_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(segment.avg_order_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {segment.days_since_last_order} days ago
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(segment.value_segment, 'value')}`}>
                            {segment.value_segment}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(segment.activity_segment, 'activity')}`}>
                            {segment.activity_segment}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}