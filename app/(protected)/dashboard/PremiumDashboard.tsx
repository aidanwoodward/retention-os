"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";

interface DashboardMetrics {
  totalCustomers: number;
  totalOrders: number;
  retentionRate: number;
  customerLifetimeValue: number;
  atRiskCustomers: number;
  dormantCustomers: number;
  oneTimeBuyers: number;
  totalRevenue: number;
  averageOrderValue: number;
  repeatCustomers: number;
  shopDomain: string;
  lastSync: string;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
  value?: string;
}

export default function PremiumDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});

  // Define filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'date',
      placeholder: 'Select date range',
      autoRefresh: true, // Auto-refresh for date changes
    },
    {
      id: 'timePeriod',
      label: 'Time Period',
      type: 'select',
      placeholder: 'Select time period',
      autoRefresh: true, // Auto-refresh for time period changes
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
      autoRefresh: false, // Manual refresh for complex filters
      options: [
        { id: 'new', label: 'New Customers', value: 'new' },
        { id: 'returning', label: 'Returning Customers', value: 'returning' },
        { id: 'at-risk', label: 'At-Risk Customers', value: 'at-risk' },
        { id: 'high-value', label: 'High-Value Customers', value: 'high-value' },
      ],
    },
    {
      id: 'segment',
      label: 'Customer Segment',
      type: 'select',
      placeholder: 'Select segment',
      autoRefresh: false, // Manual refresh for complex filters
      options: [
        { id: 'all', label: 'All Segments', value: 'all' },
        { id: 'champions', label: 'Champions', value: 'champions' },
        { id: 'loyal', label: 'Loyal Customers', value: 'loyal' },
        { id: 'potential', label: 'Potential Loyalists', value: 'potential' },
        { id: 'new', label: 'New Customers', value: 'new' },
        { id: 'at-risk', label: 'At-Risk', value: 'at-risk' },
      ],
    },
  ];

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      // Build query string from filter state
      const queryParams = new URLSearchParams();
      Object.entries(filterState).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else if (typeof value === 'object' && value.from && value.to) {
            queryParams.append(`${key}_from`, value.from);
            queryParams.append(`${key}_to`, value.to);
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
      
      const response = await fetch(`/api/metrics/kpis?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMetrics({
          totalCustomers: data.data.total_customers,
          totalOrders: data.data.total_orders,
          retentionRate: data.data.retention_rate_percent,
          customerLifetimeValue: data.data.customer_lifetime_value,
          atRiskCustomers: data.data.at_risk_customers,
          dormantCustomers: data.data.dormant_customers,
          oneTimeBuyers: data.data.one_time_buyers,
          totalRevenue: data.data.total_revenue,
          averageOrderValue: data.data.average_order_value,
          repeatCustomers: data.data.repeat_customers,
          shopDomain: "retention-os-test.myshopify.com",
          lastSync: data.data.calculated_at
        });
      } else {
        setError(data.error || "Failed to fetch metrics");
      }
    } catch (err) {
      setError("Failed to fetch dashboard metrics");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Fetch metrics when filters change
  useEffect(() => {
    if (Object.keys(filterState).length > 0) {
      fetchMetrics();
    }
  }, [fetchMetrics]);

  // Generate AI-powered insights based on metrics
  const generateInsights = (metrics: DashboardMetrics): Insight[] => {
    const insights: Insight[] = [];
    
    // Retention insight
    if (metrics.retentionRate < 20) {
      insights.push({
        id: 'retention-low',
        type: 'warning',
        title: 'Retention Rate Needs Attention',
        description: `Your retention rate is ${metrics.retentionRate.toFixed(1)}%. Consider implementing customer engagement strategies.`,
        action: 'View Cohorts',
        value: `${metrics.retentionRate.toFixed(1)}%`
      });
    } else if (metrics.retentionRate > 40) {
      insights.push({
        id: 'retention-high',
        type: 'success',
        title: 'Excellent Retention Rate',
        description: `Your ${metrics.retentionRate.toFixed(1)}% retention rate is above industry average.`,
        action: 'View Cohorts',
        value: `${metrics.retentionRate.toFixed(1)}%`
      });
    }

    // At-risk customers insight
    if (metrics.atRiskCustomers > 50) {
      insights.push({
        id: 'at-risk',
        type: 'warning',
        title: 'High At-Risk Customer Count',
        description: `${metrics.atRiskCustomers} customers are at risk of churning. Consider re-engagement campaigns.`,
        action: 'View Segments',
        value: metrics.atRiskCustomers.toString()
      });
    }

    // Revenue insight
    if (metrics.totalRevenue > 100000) {
      insights.push({
        id: 'revenue-high',
        type: 'success',
        title: 'Strong Revenue Performance',
        description: `Total revenue of $${metrics.totalRevenue.toLocaleString()} shows healthy business growth.`,
        action: 'View Analytics',
        value: `$${metrics.totalRevenue.toLocaleString()}`
      });
    }

    return insights;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-white rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 bg-white rounded-lg animate-pulse w-1/3"></div>
          </div>
          
          {/* Metrics Grid Skeleton */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Metrics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const insights = generateInsights(metrics);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Retention Command Center</h1>
          <p className="text-gray-600">Monitor your customer retention health and discover growth opportunities</p>
        </div>

        {/* Enhanced Filters */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <EnhancedFilters
              filters={filterConfig}
              onFiltersChange={setFilterState}
              onApplyFilters={fetchMetrics}
              loading={loading}
            />
          </div>
        </div>

        {/* Health Score */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Business Health Score</h2>
              <p className="text-sm text-gray-600">Based on retention, revenue, and customer engagement</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-green-600 mb-1">
                {metrics.retentionRate > 30 ? 'A' : metrics.retentionRate > 20 ? 'B' : 'C'}
              </div>
              <div className="text-sm text-gray-600">
                {metrics.retentionRate > 30 ? 'Excellent' : metrics.retentionRate > 20 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Customers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{metrics.totalCustomers.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Customers</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Active customer base</div>
          </div>

          {/* Customer LTV */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">${metrics.customerLifetimeValue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Customer LTV</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Average lifetime value</div>
          </div>

          {/* Retention Rate */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">📈</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{metrics.retentionRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Retention Rate</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Customer retention</div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">💎</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">${metrics.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">All-time revenue</div>
          </div>
        </div>

        {/* Insights Feed */}
        {insights.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-8 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className={`p-4 rounded-xl border-l-4 ${
                  insight.type === 'success' ? 'bg-green-50 border-green-400' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{insight.value}</div>
                      {insight.action && (
                        <Link 
                          href={insight.action === 'View Cohorts' ? '/cohorts' : insight.action === 'View Segments' ? '/segments' : '/dashboard'}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {insight.action} →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/cohorts"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <span className="text-xl">📊</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Cohort Analysis</h3>
                <p className="text-sm text-gray-600">View retention by acquisition month</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">Analyze customer retention patterns and identify growth opportunities</div>
          </Link>

          <Link
            href="/segments"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-purple-200"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <span className="text-xl">🎯</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Customer Segments</h3>
                <p className="text-sm text-gray-600">Analyze customer segments and behavior</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">Understand your customer base and optimize targeting</div>
          </Link>

          <Link
            href="/sync"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-green-200"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <span className="text-xl">🔄</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Data Sync</h3>
                <p className="text-sm text-gray-600">Sync data and manage connections</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">Keep your data fresh and up-to-date</div>
          </Link>
        </div>
    </div>
  );
}
