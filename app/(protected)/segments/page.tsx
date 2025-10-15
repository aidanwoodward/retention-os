"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [summaries, setSummaries] = useState<SegmentsResponse['data']['summaries'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'value' | 'activity' | 'frequency' | 'aov'>('value');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/metrics/segments');
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
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-gray-200 rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-red-50 border border-red-200 p-6">
            <div className="flex items-center">
              <span className="text-red-400 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Segments</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchSegments}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Segments</h1>
            <p className="text-gray-600">
              Customer segmentation by value, activity, frequency, and AOV
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={fetchSegments}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-semibold text-gray-900">{segments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(segments.reduce((sum, s) => sum + s.actual_total_spent, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">VIP Customers</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {segments.filter(s => s.value_segment === 'VIP').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {segments.filter(s => s.activity_segment === 'Active').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Segment Tabs */}
        <div className="bg-white rounded-xl shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'value', label: 'Value Segments', icon: '💰' },
                { key: 'activity', label: 'Activity Segments', icon: '⚡' },
                { key: 'frequency', label: 'Frequency Segments', icon: '🔄' },
                { key: 'aov', label: 'AOV Segments', icon: '📊' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as 'value' | 'activity' | 'frequency' | 'aov');
                    setSelectedSegment(null);
                  }}
                  className={`${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
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
                        <p className="text-lg font-semibold text-gray-900">{summary.count}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(summary.total_revenue)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Customer List */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedSegment ? `${selectedSegment} Customers` : `All Customers (${filteredSegments.length})`}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
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
                    {filteredSegments.slice(0, 50).map((segment, index) => (
                      <tr key={segment.customer_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {segment.customer_id.slice(0, 8)}...
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
                          {formatDate(segment.last_order_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
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
              
              {filteredSegments.length > 50 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing first 50 customers. Total: {filteredSegments.length}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
