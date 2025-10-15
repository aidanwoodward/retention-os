"use client";

import { useState, useEffect } from "react";

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

export default function DashboardClient() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // Use the new materialized view KPIs API for better performance
      const response = await fetch("/api/metrics/kpis");
      const data = await response.json();

      if (data.success) {
        // Transform the KPIs API response to match the expected format
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
          shopDomain: "retention-os-test.myshopify.com", // TODO: Get from API
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
  };

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-6 shadow animate-pulse">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
              <div className="ml-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading metrics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <>
      {/* Key Metrics Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalCustomers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Customer LTV</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.customerLifetimeValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-yellow-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">⚠️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">At-Risk Customers</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.atRiskCustomers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Retention Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.retentionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/cohorts"
          className="rounded-xl bg-white p-6 shadow hover:shadow-lg transition-shadow border border-gray-200 hover:border-blue-300"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Cohort Analysis</p>
              <p className="text-sm text-gray-500">View retention by acquisition month</p>
            </div>
          </div>
        </a>

        <a
          href="/segments"
          className="rounded-xl bg-white p-6 shadow hover:shadow-lg transition-shadow border border-gray-200 hover:border-purple-300"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">🎯</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Customer Segments</p>
              <p className="text-sm text-gray-500">Analyze customer segments and behavior</p>
            </div>
          </div>
        </a>

        <a
          href="/sync"
          className="rounded-xl bg-white p-6 shadow hover:shadow-lg transition-shadow border border-gray-200 hover:border-green-300"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">🔄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Data Sync</p>
              <p className="text-sm text-gray-500">Sync data and manage connections</p>
            </div>
          </div>
        </a>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">🛒</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">💵</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">🔄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Repeat Customers</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.repeatCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Win-back Opportunities */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Win-back Opportunities</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900">Dormant Customers</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.dormantCustomers}</p>
            <p className="text-sm text-gray-500">No purchase in 90+ days</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900">One-time Buyers</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.oneTimeBuyers}</p>
            <p className="text-sm text-gray-500">Never made repeat purchase</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900">Average Order Value</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">${metrics.averageOrderValue.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Per transaction</p>
          </div>
        </div>
      </div>

      {/* Last Sync Info */}
      <div className="rounded-xl bg-gray-50 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Last synced from Shopify: {new Date(metrics.lastSync).toLocaleString()}</span>
          <button
            onClick={fetchMetrics}
            className="text-blue-600 hover:text-blue-500 underline"
          >
            Refresh data
          </button>
        </div>
      </div>
    </>
  );
}
