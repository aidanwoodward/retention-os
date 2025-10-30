"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  TrendingUp,
  Filter,
  AlertTriangle,
  RefreshCw,
  Download,
  Users,
  DollarSign,
  LineChart,
  Crown,
} from "lucide-react";

interface RetentionCurveData {
  period: string;
  cohort_size: number;
  retention_rate: number;
  revenue_retention: number;
  churn_rate: number;
  reactivation_rate: number;
  avg_order_value: number;
  customer_satisfaction: number;
}

interface RetentionCurveResponse {
  success: boolean;
  data: {
    curves: RetentionCurveData[];
    total_cohorts: number;
    best_retention_period: string;
    worst_retention_period: string;
    calculated_at: string;
  };
  error?: string;
}

export default function RetentionCurvePage() {
  const [curves, setCurves] = useState<RetentionCurveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  // const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

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
        { id: 'acquisition', label: 'Acquisition Cohorts', value: 'acquisition' },
        { id: 'revenue', label: 'Revenue Cohorts', value: 'revenue' },
        { id: 'product', label: 'Product Cohorts', value: 'product' },
        { id: 'behavioral', label: 'Behavioral Cohorts', value: 'behavioral' },
      ],
    },
    {
      id: 'retentionLevel',
      label: 'Retention Level',
      type: 'select',
      placeholder: 'Select retention level',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Retention Levels', value: 'all' },
        { id: 'high', label: 'High Retention (>70%)', value: 'high' },
        { id: 'medium', label: 'Medium Retention (40-70%)', value: 'medium' },
        { id: 'low', label: 'Low Retention (<40%)', value: 'low' },
      ],
    },
  ];

  const fetchCurves = useCallback(async () => {
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
      
      const response = await fetch(`/api/retention/curve?${queryParams.toString()}`);
      const data: RetentionCurveResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch retention curves');
      }

      setCurves(data.data.curves);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch retention curves');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchCurves();
  }, [fetchCurves]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRetentionPerformance = (curve: RetentionCurveData) => {
    if (curve.retention_rate > 70) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (curve.retention_rate > 40) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Retention Curves</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchCurves}
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
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <TrendingUp className="w-10 h-10 mr-3" />
                Retention Curve
              </h1>
              <p className="text-cyan-100 text-lg">Analyze customer retention patterns and identify optimization opportunities</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{curves.length}</div>
              <div className="text-cyan-100">Retention Periods</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-cyan-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Retention Curve Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchCurves}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-6 border border-cyan-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-600 text-sm font-medium">Total Cohorts</p>
              <p className="text-3xl font-bold text-cyan-900">{curves.length}</p>
            </div>
            <Users className="w-8 h-8 text-cyan-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Avg Retention</p>
              <p className="text-3xl font-bold text-green-900">
                {curves.length > 0 ? (curves.reduce((sum, c) => sum + c.retention_rate, 0) / curves.length).toFixed(1) : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Best Period</p>
              <p className="text-3xl font-bold text-blue-900">
                {curves.length > 0 ? curves.reduce((best, c) => c.retention_rate > best.retention_rate ? c : best).period : 'N/A'}
              </p>
            </div>
            <Crown className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Revenue Retention</p>
              <p className="text-3xl font-bold text-purple-900">
                {curves.length > 0 ? (curves.reduce((sum, c) => sum + c.revenue_retention, 0) / curves.length).toFixed(1) : 0}%
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Premium Retention Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <LineChart className="w-6 h-6 mr-2 text-cyan-600" />
              Retention Curve Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Retention Curve Chart Placeholder */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Curve Visualization</h3>
            <div className="h-80 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl flex items-center justify-center border-2 border-dashed border-cyan-200">
              <div className="text-center">
                <LineChart className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <p className="text-cyan-600 font-medium">Retention Curve Chart</p>
                <p className="text-cyan-500 text-sm">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Retention Curve Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cohort Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retention Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue Retention
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Churn Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {curves.map((curve) => {
                  const performance = getRetentionPerformance(curve);
                  return (
                    <tr key={curve.period} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {curve.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {curve.cohort_size.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {curve.retention_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {curve.revenue_retention.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {curve.churn_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(curve.avg_order_value)}
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
