export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
// import StatusBadge from "@/app/components/StatusBadge";
import Link from "next/link";
import REDHomePage from "./REDHomePage";

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
  
  // Skip auth check in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment && !session) redirect("/login");

  // Check for Shopify connection (skip in dev mode)
  let shopifyConnected = false;
  let shopifyConnections: Array<{ shop_domain: string }> | null = null;
  if (!isDevelopment && session) {
    const { data: connections } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .limit(1);
    shopifyConnections = connections;
    shopifyConnected = Boolean(connections && connections.length > 0);
  }
  // const klaviyoConnected = false; // TODO: Implement Klaviyo connection check

  // Show the retention dashboard (with dummy data if no connection)
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retention Dashboard</h1>
            <p className="text-gray-600">
              {shopifyConnected && shopifyConnections && shopifyConnections.length > 0
                ? `Connected to ${shopifyConnections[0].shop_domain}`
                : "Demo Mode - Showing sample data"
              }
            </p>
          </div>
          <div className="flex space-x-3">
            {shopifyConnected ? (
              <>
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
              </>
            ) : (
              <Link
                href="/connect/shopify"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Connect Shopify
              </Link>
            )}
          </div>
        </div>

        {/* RED Home Page */}
        <REDHomePage />
      </div>
    </div>
  );
}
