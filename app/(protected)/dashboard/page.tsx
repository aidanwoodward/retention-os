export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import StatusBadge from "@/app/components/StatusBadge";
import Link from "next/link";
import PremiumDashboard from "./PremiumDashboard";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Server Components can't mutate headers; provide a no-op setter.
        setAll() {},
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Check for Shopify connection
  const { data: shopifyConnections } = await supabase
    .from("shopify_connections")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .limit(1);

  const shopifyConnected = Boolean(shopifyConnections && shopifyConnections.length > 0);
  const klaviyoConnected = false; // TODO: Implement Klaviyo connection check

  // If Shopify is connected, show the retention dashboard
  if (shopifyConnected && shopifyConnections) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Retention Dashboard</h1>
              <p className="text-gray-600">
                Connected to {shopifyConnections[0].shop_domain}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/sync"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sync Data
              </Link>
              <Link
                href="/connect/shopify"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage Connections
              </Link>
            </div>
          </div>

          {/* Premium Dashboard */}
          <PremiumDashboard />
        </div>
      </div>
    );
  }

  // If no connections, show premium setup screen
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to RetentionOS</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect your store to unlock powerful retention analytics and customer insights
          </p>
        </div>

        {/* Setup Cards */}
        <div className="grid gap-8 sm:grid-cols-2 max-w-4xl mx-auto">
          {/* Shopify Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">🏪</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Shopify Store</h2>
              </div>
              <StatusBadge ok={shopifyConnected} />
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sync orders, customers, and refunds to analyze retention patterns and identify growth opportunities.
            </p>
            <Link
              href="/connect/shopify"
              className="w-full bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md text-center block"
            >
              {shopifyConnected ? "Manage Connection" : "Connect Shopify"}
            </Link>
          </div>

          {/* Klaviyo Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">📧</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Klaviyo</h2>
              </div>
              <StatusBadge ok={klaviyoConnected} />
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Push &quot;At-Risk&quot; segments and measure campaign effectiveness with advanced retention analytics.
            </p>
            <Link
              href="/connect/klaviyo"
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md text-center block"
            >
              {klaviyoConnected ? "Manage Connection" : "Connect Klaviyo"}
            </Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8">What you&apos;ll get</h3>
          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Cohort Analysis</h4>
              <p className="text-sm text-gray-600">Track retention by acquisition month</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Customer Segments</h4>
              <p className="text-sm text-gray-600">Identify high-value customer groups</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💡</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">AI Insights</h4>
              <p className="text-sm text-gray-600">Get actionable recommendations</p>
            </div>
          </div>
        </div>
    </div>
  );
}
