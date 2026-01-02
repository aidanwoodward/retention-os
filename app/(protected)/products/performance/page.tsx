"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { productsPerformanceFilters, productsPerformanceSearch } from "@/lib/filters/config";
import { useSearchParams } from "next/navigation";
import {
  Package,
  BarChart3,
  Target,
  Crown,
  Activity,
  Star,
  AlertTriangle,
  ShoppingCart,
  Heart,
  DollarSign,
  Download,
} from "lucide-react";
import { ProductPerformanceChart } from "@/components/charts/ProductPerformanceChart";

interface ProductPerformanceData {
  product_id: string;
  product_name: string;
  category: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  units_sold: number;
  conversion_rate: number;
  return_rate: number;
  customer_satisfaction: number;
  inventory_turnover: number;
  profit_margin: number;
}

interface ProductPerformanceResponse {
  success: boolean;
  data: {
    products: ProductPerformanceData[];
    total_products: number;
    best_performing: string;
    worst_performing: string;
    calculated_at: string;
  };
  error?: string;
}

function ProductPerformanceContent() {
  const [products, setProducts] = useState<ProductPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // TODO: Re-add filterState when needed for local filter state management
  const searchParams = useSearchParams();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      // Use URL params directly since FilterBar syncs to URL
      const queryString = searchParams.toString();
      
      const response = await fetch(`/api/products/performance?${queryString}`);
      const data: ProductPerformanceResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product performance');
      }

      setProducts(data.data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product performance');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProductPerformance = (product: ProductPerformanceData) => {
    if (product.total_revenue > 10000) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (product.total_revenue > 1000) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Product Performance</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchProducts}
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
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Package className="w-10 h-10 mr-3" />
                Product Performance
              </h1>
              <p className="text-indigo-100 text-lg">Analyze product sales, revenue, and performance metrics</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{products.length}</div>
              <div className="text-indigo-100">Active Products</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-8">
        <FilterBar
          filters={productsPerformanceFilters}
          search={productsPerformanceSearch}
          onFiltersChange={() => {
            // FilterBar syncs to URL, no local state needed
          }}
          onSearchChange={() => {
            // URL sync handled by FilterBar
          }}
        />
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-600 text-sm font-medium">Total Products</p>
              <p className="text-3xl font-bold text-indigo-900">{products.length}</p>
            </div>
            <Package className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-green-900">
                {formatCurrency(products.reduce((sum, p) => sum + p.total_revenue, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Best Product</p>
              <p className="text-3xl font-bold text-blue-900">
                {products.length > 0 ? products.reduce((best, p) => p.total_revenue > best.total_revenue ? p : best).product_name.slice(0, 10) + '...' : 'N/A'}
              </p>
            </div>
            <Crown className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Avg Conversion</p>
              <p className="text-3xl font-bold text-purple-900">
                {products.length > 0 ? (products.reduce((sum, p) => sum + p.conversion_rate, 0) / products.length).toFixed(1) : 0}%
              </p>
            </div>
            <Target className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Premium Product Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-indigo-600" />
              Product Performance Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Product Performance Chart */}
          {products.length > 0 && (
            <div className="mb-8">
              <ProductPerformanceChart data={products} />
            </div>
          )}

          {/* Product Performance Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const performance = getProductPerformance(product);
                  const Icon = getCategoryIcon(product.category);
                  return (
                    <tr key={product.product_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{product.product_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.total_orders.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(product.total_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(product.avg_order_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.conversion_rate.toFixed(1)}%
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

export default function ProductPerformancePage() {
  return (
    <Suspense fallback={
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
    }>
      <ProductPerformanceContent />
    </Suspense>
  );
}
