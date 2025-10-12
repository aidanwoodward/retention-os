export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import StatusBadge from "@/app/components/StatusBadge";
import Link from "next/link";
import DashboardClient from "./DashboardClient";

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

  const shopifyConnected = shopifyConnections && shopifyConnections.length > 0;
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
                href="/connect/shopify"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage Connections
              </Link>
            </div>
          </div>

          {/* Dashboard with Real Data */}
          <DashboardClient />
        </div>
      </div>
    );
  }

  // If no connections, show setup screen
  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          <p className="text-lg font-medium">
            Hello Retention OS – connect your store to get started.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Connect Shopify and Klaviyo so we can sync customers, score churn risk,
            and push winback segments.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Shopify card */}
            <div className="rounded-xl border p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Shopify</h2>
                <StatusBadge ok={shopifyConnected} />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Sync orders, customers, and refunds daily.
              </p>
              <Link
                href="/connect/shopify"
                className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
              >
                {shopifyConnected ? "Manage" : "Connect Shopify"}
              </Link>
            </div>

            {/* Klaviyo card */}
            <div className="rounded-xl border p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Klaviyo</h2>
                <StatusBadge ok={klaviyoConnected} />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Push &quot;At-Risk&quot; segment and measure holdout lift.
              </p>
              <Link
                href="/connect/klaviyo"
                className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
              >
                {klaviyoConnected ? "Manage" : "Connect Klaviyo"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
