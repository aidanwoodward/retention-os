"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Target, 
  BarChart3,
  Download,
  Copy,
  Info,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  FileText,
  Package,
  UserCheck,
  Activity,
  RefreshCw,
  ExternalLink
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface KPIData {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  delta: number;
  deltaPercentage: number;
  currency?: string;
  definition: string;
  formula: string;
  source: string;
}

interface BusinessHealthScore {
  score: number;
  drivers: {
    retention: number;
    cohortGrowth: number;
    repeatRate: number;
  };
  hasData: boolean;
}

interface AIInsight {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  summary: string;
  deepLink: string;
  csvAvailable: boolean;
}

interface SectionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  thumbnail: string;
  metrics: {
    primary: string;
    secondary: string;
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function REDHomePage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [healthScore, setHealthScore] = useState<BusinessHealthScore | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});

  // Define comprehensive filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'date',
      placeholder: 'Select date range',
      autoRefresh: true,
    },
    {
      id: 'cohortGranularity',
      label: 'Cohort Granularity',
      type: 'select',
      placeholder: 'Select granularity',
      autoRefresh: true,
      options: [
        { id: 'monthly', value: 'monthly', label: 'Monthly' },
        { id: 'quarterly', value: 'quarterly', label: 'Quarterly' },
        { id: 'annual', value: 'annual', label: 'Annual' },
      ],
    },
    {
      id: 'customerType',
      label: 'Customer Type',
      type: 'select',
      placeholder: 'Select customer type',
      autoRefresh: true,
      options: [
        { id: 'all', value: 'all', label: 'All Customers' },
        { id: 'new', value: 'new', label: 'New Customers' },
        { id: 'returning', value: 'returning', label: 'Returning Customers' },
      ],
    },
    {
      id: 'geography',
      label: 'Geography',
      type: 'multiselect',
      placeholder: 'Select regions',
      autoRefresh: false,
      options: [
        { id: 'us', value: 'us', label: 'United States' },
        { id: 'uk', value: 'uk', label: 'United Kingdom' },
        { id: 'ca', value: 'ca', label: 'Canada' },
        { id: 'au', value: 'au', label: 'Australia' },
        { id: 'de', value: 'de', label: 'Germany' },
      ],
    },
    {
      id: 'productCategory',
      label: 'Product Category',
      type: 'multiselect',
      placeholder: 'Select categories',
      autoRefresh: false,
      options: [
        { id: 'electronics', value: 'electronics', label: 'Electronics' },
        { id: 'apparel', value: 'apparel', label: 'Apparel' },
        { id: 'home', value: 'home', label: 'Home Goods' },
        { id: 'beauty', value: 'beauty', label: 'Beauty' },
        { id: 'sports', value: 'sports', label: 'Sports' },
      ],
    },
    {
      id: 'currency',
      label: 'Currency',
      type: 'select',
      placeholder: 'Select currency',
      autoRefresh: true,
      options: [
        { id: 'gbp', value: 'gbp', label: 'GBP (£)' },
        { id: 'usd', value: 'usd', label: 'USD ($)' },
        { id: 'eur', value: 'eur', label: 'EUR (€)' },
        { id: 'cad', value: 'cad', label: 'CAD (C$)' },
      ],
    },
  ];

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
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

      // Fetch KPI data
      const kpiResponse = await fetch(`/api/dashboard/metrics?${queryParams.toString()}`);
      const kpiData = await kpiResponse.json();

      if (kpiResponse.ok && kpiData.success) {
        setKpis(kpiData.data.kpis || []);
        setHealthScore(kpiData.data.healthScore || null);
        setInsights(kpiData.data.insights || []);
      } else {
        throw new Error(kpiData.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Mock data for development
  const mockKPIs: KPIData[] = [
    {
      id: 'net_sales',
      title: 'Net Sales',
      value: 125000,
      previousValue: 110000,
      delta: 15000,
      deltaPercentage: 13.6,
      currency: 'GBP',
      definition: 'This is your total revenue after subtracting refunds, discounts, and taxes, representing the actual sales value retained by your business.',
      formula: 'net sales = revenue - refunds - taxes - duties',
      source: 'Shopify'
    },
    {
      id: 'orders',
      title: 'Orders',
      value: 1250,
      previousValue: 1100,
      delta: 150,
      deltaPercentage: 13.6,
      definition: 'Total number of orders placed in the selected period.',
      formula: 'orders = count(order_id)',
      source: 'Shopify'
    },
    {
      id: 'aov',
      title: 'Average Order Value',
      value: 100,
      previousValue: 95,
      delta: 5,
      deltaPercentage: 5.3,
      currency: 'GBP',
      definition: 'The average value of each order, calculated by dividing total revenue by number of orders.',
      formula: 'aov = total_revenue / total_orders',
      source: 'Shopify'
    },
    {
      id: 'ltv',
      title: 'Customer Lifetime Value',
      value: 450,
      previousValue: 420,
      delta: 30,
      deltaPercentage: 7.1,
      currency: 'GBP',
      definition: 'The total revenue expected from a customer over their entire relationship with your business.',
      formula: 'ltv = avg_order_value × purchase_frequency × customer_lifespan',
      source: 'Analytics'
    },
    {
      id: 'cac',
      title: 'Blended CAC',
      value: 0,
      previousValue: 0,
      delta: 0,
      deltaPercentage: 0,
      currency: 'GBP',
      definition: 'Customer Acquisition Cost - the total cost of acquiring a new customer across all marketing channels.',
      formula: 'cac = total_marketing_spend / new_customers',
      source: 'Marketing'
    },
    {
      id: 'revenue_split',
      title: 'New vs Returning Revenue',
      value: 125000,
      previousValue: 110000,
      delta: 15000,
      deltaPercentage: 13.6,
      currency: 'GBP',
      definition: 'Breakdown of revenue from new customers versus returning customers.',
      formula: 'revenue_split = new_revenue + returning_revenue',
      source: 'Analytics'
    },
    {
      id: 'customer_split',
      title: 'New vs Retained Customers',
      value: 1250,
      previousValue: 1100,
      delta: 150,
      deltaPercentage: 13.6,
      definition: 'Breakdown of new customers versus retained customers in the selected period.',
      formula: 'customer_split = new_customers + retained_customers',
      source: 'Analytics'
    }
  ];

  const mockHealthScore: BusinessHealthScore = {
    score: 78,
    drivers: {
      retention: 35,
      cohortGrowth: 28,
      repeatRate: 15
    },
    hasData: true
  };

  const mockInsights: AIInsight[] = [
    {
      id: 'insight_1',
      severity: 'high',
      title: 'Customer retention dropped 5% this month',
      summary: 'Your retention rate decreased from 75% to 70%, primarily driven by new customer cohorts. Consider implementing onboarding improvements.',
      deepLink: '/retention/curve',
      csvAvailable: true
    },
    {
      id: 'insight_2',
      severity: 'medium',
      title: 'High-value customers showing increased activity',
      summary: 'Your VIP segment (top 20% by LTV) increased their order frequency by 15% this month.',
      deepLink: '/customers/segments',
      csvAvailable: true
    },
    {
      id: 'insight_3',
      severity: 'low',
      title: 'Product category performance shift detected',
      summary: 'Electronics category showing 20% growth while Apparel declined 8%. Consider inventory adjustments.',
      deepLink: '/products/performance',
      csvAvailable: true
    }
  ];

  const sectionCards: SectionCard[] = [
    {
      id: 'cohorts',
      title: 'Cohorts',
      description: 'Revenue cohorts, customer composition, category cohorts',
      icon: BarChart3,
      link: '/cohorts',
      thumbnail: 'cohort-chart',
      metrics: {
        primary: '12 cohorts',
        secondary: '78% avg retention'
      }
    },
    {
      id: 'customers',
      title: 'Customers',
      description: 'Customer list, segments, individual profiles',
      icon: Users,
      link: '/customers/list',
      thumbnail: 'customer-chart',
      metrics: {
        primary: '2,500 customers',
        secondary: '45% returning'
      }
    },
    {
      id: 'products',
      title: 'Products',
      description: 'Product performance, cross-sell analysis, replenishment',
      icon: Package,
      link: '/products/performance',
      thumbnail: 'product-chart',
      metrics: {
        primary: '150 products',
        secondary: '£85 avg AOV'
      }
    },
    {
      id: 'retention',
      title: 'Retention',
      description: 'Retention curves, churn risk, reactivation',
      icon: Activity,
      link: '/retention/curve',
      thumbnail: 'retention-chart',
      metrics: {
        primary: '70% retention',
        secondary: '15% churn risk'
      }
    }
  ];

  // Use mock data if no real data
  const displayKPIs = kpis.length > 0 ? kpis : mockKPIs;
  const displayHealthScore = healthScore || mockHealthScore;
  const displayInsights = insights.length > 0 ? insights : mockInsights;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          
          {/* Filters skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>

          {/* KPI tiles skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 h-32">
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
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
      {/* Premium Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Target className="w-10 h-10 mr-3" />
                Executive Overview
              </h1>
              <p className="text-blue-100 text-lg">Comprehensive business health and performance insights</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{displayHealthScore.score}</div>
              <div className="text-blue-100">Business Health Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <RefreshCw className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Global Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchDashboardData}
            loading={loading}
          />
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {displayKPIs.map((kpi) => (
          <KPITile key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Business Health Score */}
      <div className="mb-8">
        <BusinessHealthScoreCard healthScore={displayHealthScore} />
      </div>

      {/* AI Insights */}
      <div className="mb-8">
        <AIInsightsCard insights={displayInsights} />
      </div>

      {/* Section Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {sectionCards.map((card) => (
          <SectionCard key={card.id} card={card} />
        ))}
      </div>

      {/* Reports CTA */}
      <div className="mb-8">
        <ReportsCTACard />
      </div>
    </div>
  );
}

// =============================================================================
// KPI TILE COMPONENT
// =============================================================================

function KPITile({ kpi }: { kpi: KPIData }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatValue = (value: number, currency?: string) => {
    if (currency) {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency === 'GBP' ? 'GBP' : 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  const formatDelta = (delta: number, percentage: number) => {
    const isPositive = delta >= 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive ? TrendingUp : TrendingDown;
    const Icon = icon;
    
    return (
      <div className={`flex items-center ${color}`}>
        <Icon className="w-4 h-4 mr-1" />
        <span className="text-sm font-medium">
          {isPositive ? '+' : ''}{percentage.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-900">{kpi.title}</h3>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="ml-2 text-purple-600 hover:text-purple-800"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="py-1">
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </button>
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Value
                </button>
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Info className="w-4 h-4 mr-2" />
                  View Definition
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-3xl font-bold text-gray-900 mb-2">
        {formatValue(kpi.value, kpi.currency)}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          From {formatValue(kpi.previousValue, kpi.currency)}
        </div>
        {formatDelta(kpi.delta, kpi.deltaPercentage)}
      </div>

      <div className="mt-4 text-xs text-gray-500 flex items-center">
        <span>Source: {kpi.source}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="font-semibold text-gray-900 mb-2">{kpi.title}</div>
          <div className="text-sm text-gray-700 mb-3">{kpi.definition}</div>
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-sm font-medium text-green-800 mb-1">Formula:</div>
            <div className="text-sm text-green-700 font-mono">{kpi.formula}</div>
          </div>
          <div className="absolute -top-2 left-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BUSINESS HEALTH SCORE COMPONENT
// =============================================================================

function BusinessHealthScoreCard({ healthScore }: { healthScore: BusinessHealthScore }) {
  if (!healthScore.hasData) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Not Enough Data Yet</h3>
        <p className="text-gray-600 mb-4">We need more data to calculate your business health score.</p>
        <Link href="/integrations" className="text-blue-600 hover:text-blue-800 font-medium">
          Connect your data sources →
        </Link>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Health Score</h2>
          <p className="text-gray-600">Composite score weighted by retention, cohort revenue growth, and repeat rate</p>
        </div>
        <div className={`text-6xl font-bold ${getScoreColor(healthScore.score)}`}>
          {healthScore.score}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-800">Retention</div>
          <div className="text-2xl font-bold text-blue-900">{healthScore.drivers.retention}%</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-800">Cohort Growth</div>
          <div className="text-2xl font-bold text-green-900">{healthScore.drivers.cohortGrowth}%</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-800">Repeat Rate</div>
          <div className="text-2xl font-bold text-purple-900">{healthScore.drivers.repeatRate}%</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// AI INSIGHTS COMPONENT
// =============================================================================

function AIInsightsCard({ insights }: { insights: AIInsight[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertTriangle;
      case 'medium': return Target;
      case 'low': return CheckCircle;
      default: return Info;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
          <p className="text-gray-600">Key insights and recommendations powered by AI</p>
        </div>
        <button className="flex items-center text-blue-600 hover:text-blue-800">
          <Download className="w-4 h-4 mr-2" />
          Export All
        </button>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => {
          const Icon = getSeverityIcon(insight.severity);
          return (
            <div key={insight.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{insight.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(insight.severity)}`}>
                        {insight.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.summary}</p>
                    <div className="flex items-center space-x-4">
                      <Link 
                        href={insight.deepLink}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                      {insight.csvAvailable && (
                        <button className="text-gray-600 hover:text-gray-800 text-sm flex items-center">
                          <Download className="w-4 h-4 mr-1" />
                          CSV
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// SECTION CARD COMPONENT
// =============================================================================

function SectionCard({ card }: { card: SectionCard }) {
  const Icon = card.icon;
  
  return (
    <Link href={card.link} className="group">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Icon className="w-8 h-8 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </div>
        
        <p className="text-gray-600 mb-4">{card.description}</p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-500 mb-1">Current Metrics</div>
          <div className="text-lg font-semibold text-gray-900">{card.metrics.primary}</div>
          <div className="text-sm text-gray-600">{card.metrics.secondary}</div>
        </div>
        
        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
          Open {card.title}
        </button>
      </div>
    </Link>
  );
}

// =============================================================================
// REPORTS CTA COMPONENT
// =============================================================================

function ReportsCTACard() {
  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Create executive reports faster</h2>
          <p className="text-indigo-100 text-lg mb-6">
            Generate a tailored summary with charts and export as PDF or PowerPoint
          </p>
          <div className="flex items-center space-x-4">
            <Link 
              href="/reports"
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center"
            >
              <FileText className="w-5 h-5 mr-2" />
              Executive Report
            </Link>
            <Link 
              href="/reports"
              className="text-indigo-100 hover:text-white transition-colors flex items-center"
            >
              Reports Overview
              <ExternalLink className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <FileText className="w-16 h-16 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
