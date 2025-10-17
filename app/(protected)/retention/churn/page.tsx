"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  AlertTriangle,
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
  Clock,
  ShoppingCart,
  UserCheck,
  Heart,
  Shield,
  DollarSign,
  Users,
  Package,
  Calendar,
  RefreshCw,
  Download,
  User,
  LineChart,
  Bell,
  Zap as ZapIcon,
} from "lucide-react";

interface ChurnRiskData {
  customer_id: string;
  customer_name: string;
  churn_risk_score: number;
  risk_factors: string[];
  days_since_last_order: number;
  order_frequency_decline: number;
  spending_decline: number;
  engagement_score: number;
  last_interaction_date: string;
  predicted_churn_date: string;
  intervention_priority: 'high' | 'medium' | 'low';
  recommended_actions: string[];
  customer_value: number;
  segment: string;
}

interface ChurnRiskResponse {
  success: boolean;
  data: {
    churn_risks: ChurnRiskData[];
    total_at_risk: number;
    high_risk_customers: number;
    medium_risk_customers: number;
    low_risk_customers: number;
    calculated_at: string;
  };
  error?: string;
}

export default function ChurnRiskPage() {
  const [churnRisks, setChurnRisks] = useState<ChurnRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);

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
      id: 'riskLevel',
      label: 'Risk Level',
      type: 'multiselect',
      placeholder: 'Select risk levels',
      autoRefresh: false,
      options: [
        { id: 'high', label: 'High Risk (>80%)', value: 'high' },
        { id: 'medium', label: 'Medium Risk (40-80%)', value: 'medium' },
        { id: 'low', label: 'Low Risk (<40%)', value: 'low' },
      ],
    },
    {
      id: 'interventionPriority',
      label: 'Intervention Priority',
      type: 'select',
      placeholder: 'Select intervention priority',
      autoRefresh: false,
      options: [
        { id: 'all', label: 'All Priorities', value: 'all' },
        { id: 'high', label: 'High Priority', value: 'high' },
        { id: 'medium', label: 'Medium Priority', value: 'medium' },
        { id: 'low', label: 'Low Priority', value: 'low' },
      ],
    },
  ];

  const fetchChurnRisks = useCallback(async () => {
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
      
      const response = await fetch(`/api/retention/churn?${queryParams.toString()}`);
      const data: ChurnRiskResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch churn risks');
      }

      setChurnRisks(data.data.churn_risks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch churn risks');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchChurnRisks();
  }, [fetchChurnRisks]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getChurnRiskLevel = (churnRisk: ChurnRiskData) => {
    if (churnRisk.churn_risk_score > 80) return { level: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (churnRisk.churn_risk_score > 60) return { level: 'high', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (churnRisk.churn_risk_score > 40) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'low', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const getInterventionPriority = (priority: string) => {
    const priorities: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
      'high': { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
      'medium': { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
      'low': { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
    };
    return priorities[priority] || priorities['low'];
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Churn Risks</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchChurnRisks}
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
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <AlertTriangle className="w-10 h-10 mr-3" />
                Churn Risk Analysis
              </h1>
              <p className="text-red-100 text-lg">Identify at-risk customers and prevent churn with predictive analytics</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{churnRisks.length}</div>
              <div className="text-red-100">At-Risk Customers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-red-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Churn Risk Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchChurnRisks}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">Total At Risk</p>
              <p className="text-3xl font-bold text-red-900">{churnRisks.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">High Risk</p>
              <p className="text-3xl font-bold text-orange-900">
                {churnRisks.filter(c => c.churn_risk_score > 80).length}
              </p>
            </div>
            <ZapIcon className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Medium Risk</p>
              <p className="text-3xl font-bold text-yellow-900">
                {churnRisks.filter(c => c.churn_risk_score > 40 && c.churn_risk_score <= 80).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Low Risk</p>
              <p className="text-3xl font-bold text-green-900">
                {churnRisks.filter(c => c.churn_risk_score <= 40).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Premium Churn Risk Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-red-600" />
              Churn Risk Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Churn Risk Chart Placeholder */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Churn Risk Distribution</h3>
            <div className="h-80 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl flex items-center justify-center border-2 border-dashed border-red-200">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-medium">Churn Risk Chart</p>
                <p className="text-red-500 text-sm">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Churn Risk Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Churn Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Since Last Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {churnRisks.slice(0, 20).map((churnRisk) => {
                  const riskLevel = getChurnRiskLevel(churnRisk);
                  const priority = getInterventionPriority(churnRisk.intervention_priority);
                  const PriorityIcon = priority.icon;
                  return (
                    <tr key={churnRisk.customer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{churnRisk.customer_name}</div>
                            <div className="text-sm text-gray-500">ID: {churnRisk.customer_id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {churnRisk.churn_risk_score.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {churnRisk.days_since_last_order} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {churnRisk.engagement_score.toFixed(1)}/10
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(churnRisk.customer_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${priority.bg} ${priority.color}`}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {churnRisk.intervention_priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${riskLevel.bg} ${riskLevel.color}`}>
                          {riskLevel.level.charAt(0).toUpperCase() + riskLevel.level.slice(1)}
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
