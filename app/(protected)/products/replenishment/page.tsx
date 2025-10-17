"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  RefreshCw,
  TrendingUp,
  BarChart3,
  Target,
  Crown,
  Zap,
  TrendingDown,
  Activity,
  Star,
  Award,
  Gem,
  Sparkles,
  Brain,
  Filter,
  Eye,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShoppingCart,
  UserCheck,
  Heart,
  Shield,
  DollarSign,
  Users,
  Package,
  Calendar,
  Truck,
  Box,
  Download,
} from "lucide-react";

interface ReplenishmentData {
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  lead_time_days: number;
  stock_turnover: number;
  stockout_risk: number;
  overstock_risk: number;
  last_reorder_date: string;
  next_reorder_date: string;
  supplier_performance: number;
}

interface ReplenishmentResponse {
  success: boolean;
  data: {
    replenishments: ReplenishmentData[];
    total_products: number;
    at_risk_products: number;
    overstocked_products: number;
    calculated_at: string;
  };
  error?: string;
}

export default function ReplenishmentMetricsPage() {
  const [replenishments, setReplenishments] = useState<ReplenishmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

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
      id: 'category',
      label: 'Product Category',
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
      id: 'riskLevel',
      label: 'Risk Level',
      type: 'select',
      placeholder: 'Select risk level',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Risk Levels', value: 'all' },
        { id: 'high', label: 'High Risk (>80%)', value: 'high' },
        { id: 'medium', label: 'Medium Risk (40-80%)', value: 'medium' },
        { id: 'low', label: 'Low Risk (<40%)', value: 'low' },
      ],
    },
  ];

  const fetchReplenishments = useCallback(async () => {
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
      
      const response = await fetch(`/api/products/replenishment?${queryParams.toString()}`);
      const data: ReplenishmentResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch replenishment data');
      }

      setReplenishments(data.data.replenishments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch replenishment data');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchReplenishments();
  }, [fetchReplenishments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getReplenishmentRisk = (replenishment: ReplenishmentData) => {
    if (replenishment.stockout_risk > 80) return { level: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (replenishment.stockout_risk > 40) return { level: 'high', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (replenishment.overstock_risk > 60) return { level: 'overstock', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'optimal', color: 'text-green-600', bg: 'bg-green-50' };
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Replenishment Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchReplenishments}
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
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <RefreshCw className="w-10 h-10 mr-3" />
                Replenishment Metrics
              </h1>
              <p className="text-teal-100 text-lg">Optimize inventory levels and prevent stockouts with smart replenishment insights</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{replenishments.length}</div>
              <div className="text-teal-100">Products Tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-teal-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Replenishment Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchReplenishments}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 border border-teal-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-600 text-sm font-medium">Total Products</p>
              <p className="text-3xl font-bold text-teal-900">{replenishments.length}</p>
            </div>
            <Package className="w-8 h-8 text-teal-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">At Risk Products</p>
              <p className="text-3xl font-bold text-red-900">
                {replenishments.filter(r => r.stockout_risk > 40).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Overstocked</p>
              <p className="text-3xl font-bold text-yellow-900">
                {replenishments.filter(r => r.overstock_risk > 60).length}
              </p>
            </div>
            <Box className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Optimal Stock</p>
              <p className="text-3xl font-bold text-green-900">
                {replenishments.filter(r => r.stockout_risk <= 40 && r.overstock_risk <= 60).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Premium Replenishment Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-teal-600" />
              Replenishment Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Replenishment Chart Placeholder */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Risk Analysis</h3>
            <div className="h-80 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl flex items-center justify-center border-2 border-dashed border-teal-200">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-teal-400 mx-auto mb-4" />
                <p className="text-teal-600 font-medium">Replenishment Metrics Chart</p>
                <p className="text-teal-500 text-sm">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Replenishment Table */}
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
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stockout Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Reorder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {replenishments.map((replenishment) => {
                  const risk = getReplenishmentRisk(replenishment);
                  const Icon = getCategoryIcon(replenishment.category);
                  return (
                    <tr key={replenishment.product_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{replenishment.product_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {replenishment.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {replenishment.current_stock.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {replenishment.reorder_point.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {replenishment.stockout_risk.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(replenishment.next_reorder_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${risk.bg} ${risk.color}`}>
                          {risk.level.charAt(0).toUpperCase() + risk.level.slice(1)}
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
