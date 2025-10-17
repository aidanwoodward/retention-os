"use client";

import { useState, useEffect } from "react";
import { FilterDemo } from "@/components/ui/filter-demo";
import {
  Target,
  TrendingUp,
  Package,
  BarChart3,
  RefreshCw,
  Download,
  ShoppingCart,
} from "lucide-react";

export default function CategoryCohortsPage() {
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Category Cohorts</h1>
        <p className="text-gray-600">Analyze customer behavior and retention patterns by product category and cohort</p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Category Cohorts</h3>
            <span className="text-sm text-gray-500">Filter by category, cohort, and time period</span>
          </div>
          <FilterDemo />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Top Category</p>
              <p className="text-2xl font-semibold text-gray-900">Electronics</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Retention</p>
              <p className="text-2xl font-semibold text-gray-900">68%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cross-Category</p>
              <p className="text-2xl font-semibold text-gray-900">42%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Retention */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Category Retention Rates</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Retention by Category</h4>
              <p className="text-gray-600">
                Customer retention rates across different product categories and cohorts.
              </p>
            </div>
          </div>
        </div>

        {/* Cross-Category Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Cross-Category Behavior</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Cross-Category Purchases</h4>
              <p className="text-gray-600">
                Analysis of customers who purchase across multiple categories and their retention patterns.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Cohort Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Category Cohort Analysis</h3>
            <div className="flex space-x-2">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Category Cohort Analysis</h3>
            <p className="text-gray-600 mb-4">
              Detailed category cohort analysis will be displayed here, showing customer behavior patterns by product category and acquisition cohort.
            </p>
            <p className="text-sm text-gray-500">
              This will include retention rates, cross-category purchases, and category-specific customer lifetime value analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
