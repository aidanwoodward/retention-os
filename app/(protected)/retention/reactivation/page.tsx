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
  Download,
  User,
  LineChart,
  Bell,
  Zap as ZapIcon,
  Gift,
  Mail,
  Phone,
} from "lucide-react";

interface ReactivationData {
  customer_id: string;
  customer_name: string;
  reactivation_score: number;
  days_since_last_order: number;
  previous_order_frequency: number;
  potential_value: number;
  reactivation_probability: number;
  recommended_campaigns: string[];
  last_engagement_date: string;
  preferred_communication: string;
  reactivation_priority: 'high' | 'medium' | 'low';
  success_factors: string[];
  customer_segment: string;
  lifetime_value: number;
}

interface ReactivationResponse {
  success: boolean;
  data: {
    reactivations: ReactivationData[];
    total_dormant_customers: number;
    high_priority_reactivations: number;
    medium_priority_reactivations: number;
    low_priority_reactivations: number;
    calculated_at: string;
  };
  error?: string;
}

export default function ReactivationPage() {
  const [reactivations, setReactivations] = useState<ReactivationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [selectedReactivation, setSelectedReactivation] = useState<string | null>(null);

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
      id: 'reactivationScore',
      label: 'Reactivation Score',
      type: 'select',
      placeholder: 'Select reactivation score',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Scores', value: 'all' },
        { id: 'high', label: 'High Score (>70%)', value: 'high' },
        { id: 'medium', label: 'Medium Score (40-70%)', value: 'medium' },
        { id: 'low', label: 'Low Score (<40%)', value: 'low' },
      ],
    },
    {
      id: 'priority',
      label: 'Reactivation Priority',
      type: 'select',
      placeholder: 'Select priority',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Priorities', value: 'all' },
        { id: 'high', label: 'High Priority', value: 'high' },
        { id: 'medium', label: 'Medium Priority', value: 'medium' },
        { id: 'low', label: 'Low Priority', value: 'low' },
      ],
    },
  ];

  const fetchReactivations = useCallback(async () => {
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
      
      const response = await fetch(`/api/retention/reactivation?${queryParams.toString()}`);
      const data: ReactivationResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reactivations');
      }

      setReactivations(data.data.reactivations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reactivations');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchReactivations();
  }, [fetchReactivations]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getReactivationLevel = (reactivation: ReactivationData) => {
    if (reactivation.reactivation_score > 70) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (reactivation.reactivation_score > 40) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
    return { level: 'poor', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getReactivationPriority = (priority: string) => {
    const priorities: Record<string, { color: string; bg: string; icon: any }> = {
      'high': { color: 'text-red-600', bg: 'bg-red-50', icon: ZapIcon },
      'medium': { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
      'low': { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
    };
    return priorities[priority] || priorities['low'];
  };

  const getCommunicationIcon = (communication: string) => {
    const icons: Record<string, any> = {
      'email': Mail,
      'phone': Phone,
      'sms': Bell,
      'push': Bell,
    };
    return icons[communication] || Mail;
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Reactivations</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchReactivations}
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
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <RefreshCw className="w-10 h-10 mr-3" />
                Customer Reactivation
              </h1>
              <p className="text-emerald-100 text-lg">Re-engage dormant customers with targeted reactivation campaigns</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{reactivations.length}</div>
              <div className="text-emerald-100">Dormant Customers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-emerald-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Reactivation Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchReactivations}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-sm font-medium">Total Dormant</p>
              <p className="text-3xl font-bold text-emerald-900">{reactivations.length}</p>
            </div>
            <Users className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">High Priority</p>
              <p className="text-3xl font-bold text-red-900">
                {reactivations.filter(r => r.reactivation_priority === 'high').length}
              </p>
            </div>
            <ZapIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Medium Priority</p>
              <p className="text-3xl font-bold text-yellow-900">
                {reactivations.filter(r => r.reactivation_priority === 'medium').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Avg Reactivation Score</p>
              <p className="text-3xl font-bold text-blue-900">
                {reactivations.length > 0 ? (reactivations.reduce((sum, r) => sum + r.reactivation_score, 0) / reactivations.length).toFixed(1) : 0}%
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Premium Reactivation Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-emerald-600" />
              Reactivation Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Reactivation Chart Placeholder */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reactivation Score Distribution</h3>
            <div className="h-80 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl flex items-center justify-center border-2 border-dashed border-emerald-200">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-emerald-600 font-medium">Reactivation Analysis Chart</p>
                <p className="text-emerald-500 text-sm">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Reactivation Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reactivation Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Dormant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Potential Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Communication
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reactivations.slice(0, 20).map((reactivation) => {
                  const reactivationLevel = getReactivationLevel(reactivation);
                  const priority = getReactivationPriority(reactivation.reactivation_priority);
                  const PriorityIcon = priority.icon;
                  const CommunicationIcon = getCommunicationIcon(reactivation.preferred_communication);
                  return (
                    <tr key={reactivation.customer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{reactivation.customer_name}</div>
                            <div className="text-sm text-gray-500">ID: {reactivation.customer_id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reactivation.reactivation_score.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reactivation.days_since_last_order} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(reactivation.potential_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reactivation.reactivation_probability.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          <CommunicationIcon className="w-3 h-3 mr-1" />
                          {reactivation.preferred_communication}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${priority.bg} ${priority.color}`}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {reactivation.reactivation_priority}
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
