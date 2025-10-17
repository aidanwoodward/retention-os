"use client";

import { useState, useEffect, useCallback } from "react";
import EnhancedFilters, { FilterConfig, FilterState } from "@/components/ui/enhanced-filters";
import {
  User,
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
  RefreshCw,
  Download,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Gift,
  Award as AwardIcon,
} from "lucide-react";

interface CustomerProfileData {
  customer_id: string;
  email_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  days_since_last_order: number;
  customer_lifespan_days: number;
  value_segment: string;
  activity_segment: string;
  frequency_segment: string;
  aov_segment: string;
  lifetime_value: number;
  repeat_rate: number;
  favorite_categories: string[];
  top_products: string[];
  payment_methods: string[];
  loyalty_points: number;
  referral_count: number;
  support_tickets: number;
  satisfaction_score: number;
}

interface CustomerProfileResponse {
  success: boolean;
  data: {
    profile: CustomerProfileData;
    order_history: Array<{
      order_id: string;
      order_date: string;
      total_amount: number;
      status: string;
    }>;
    product_recommendations: string[];
    calculated_at: string;
  };
  error?: string;
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Define filter configuration
  const filterConfig: FilterConfig[] = [
    {
      id: 'customerId',
      label: 'Customer ID',
      type: 'text',
      placeholder: 'Enter customer ID',
      autoRefresh: true,
    },
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
      id: 'includeHistory',
      label: 'Include Order History',
      type: 'select',
      placeholder: 'Include order history',
      autoRefresh: false,
      options: [
        { id: 'yes', label: 'Yes', value: 'yes' },
        { id: 'no', label: 'No', value: 'no' },
      ],
    },
  ];

  const fetchProfile = useCallback(async () => {
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
      
      const response = await fetch(`/api/customers/profile?${queryParams.toString()}`);
      const data: CustomerProfileResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer profile');
      }

      setProfile(data.data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer profile');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCustomerTier = (profile: CustomerProfileData) => {
    if (profile.value_segment === 'VIP') return { tier: 'VIP', color: 'text-purple-600', bg: 'bg-purple-50', icon: Crown };
    if (profile.value_segment === 'High Value') return { tier: 'Premium', color: 'text-blue-600', bg: 'bg-blue-50', icon: Star };
    if (profile.value_segment === 'Medium Value') return { tier: 'Standard', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
    return { tier: 'Basic', color: 'text-gray-600', bg: 'bg-gray-50', icon: User };
  };

  const getActivityStatus = (profile: CustomerProfileData) => {
    if (profile.activity_segment === 'Active') return { status: 'active', color: 'text-green-600', bg: 'bg-green-50' };
    if (profile.activity_segment === 'At Risk') return { status: 'at-risk', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (profile.activity_segment === 'Dormant') return { status: 'dormant', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { status: 'lost', color: 'text-red-600', bg: 'bg-red-50' };
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Customer Profile</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchProfile}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <User className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-800 mb-2">No Customer Selected</h3>
          <p className="text-blue-600 mb-4">Please enter a customer ID to view their profile</p>
        </div>
      </div>
    );
  }

  const tier = getCustomerTier(profile);
  const activity = getActivityStatus(profile);
  const TierIcon = tier.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Premium Header with Gradient */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <User className="w-10 h-10 mr-3" />
                Customer Profile
              </h1>
              <p className="text-amber-100 text-lg">Detailed customer insights and personalized analytics</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{profile.first_name} {profile.last_name}</div>
              <div className="text-amber-100">Customer Profile</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-6 h-6 text-amber-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Customer Profile Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Real-time updates</span>
            </div>
          </div>
          <EnhancedFilters
            filters={filterConfig}
            onFiltersChange={setFilterState}
            onApplyFilters={fetchProfile}
            loading={loading}
          />
        </div>
      </div>

      {/* Premium Customer Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Customer Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.first_name} {profile.last_name}</h2>
              <p className="text-gray-600">Customer ID: {profile.customer_id}</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-600">{profile.email_hash}</span>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-600">{profile.phone}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-600">{profile.city}, {profile.state}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Customer Tier</span>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${tier.bg} ${tier.color}`}>
                  <TierIcon className="w-3 h-3 mr-1" />
                  {tier.tier}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Activity Status</span>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${activity.bg} ${activity.color}`}>
                  {profile.activity_segment}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Loyalty Points</span>
                <span className="text-sm text-gray-900">{profile.loyalty_points.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Metrics */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Total Spent</p>
                  <p className="text-3xl font-bold text-green-900">{formatCurrency(profile.total_spent)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Orders</p>
                  <p className="text-3xl font-bold text-blue-900">{profile.total_orders}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Avg Order Value</p>
                  <p className="text-3xl font-bold text-purple-900">{formatCurrency(profile.avg_order_value)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Lifetime Value</p>
                  <p className="text-3xl font-bold text-orange-900">{formatCurrency(profile.lifetime_value)}</p>
                </div>
                <AwardIcon className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Analytics */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-amber-600" />
              Customer Analytics
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export Profile
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase Behavior</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">First Order:</span>
                  <span className="text-sm text-gray-900">{new Date(profile.first_order_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Order:</span>
                  <span className="text-sm text-gray-900">{profile.days_since_last_order} days ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Customer Since:</span>
                  <span className="text-sm text-gray-900">{profile.customer_lifespan_days} days</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Segmentation</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Value:</span>
                  <span className="text-sm text-gray-900">{profile.value_segment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activity:</span>
                  <span className="text-sm text-gray-900">{profile.activity_segment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Frequency:</span>
                  <span className="text-sm text-gray-900">{profile.frequency_segment}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Engagement</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Repeat Rate:</span>
                  <span className="text-sm text-gray-900">{profile.repeat_rate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Satisfaction:</span>
                  <span className="text-sm text-gray-900">{profile.satisfaction_score}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Referrals:</span>
                  <span className="text-sm text-gray-900">{profile.referral_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
