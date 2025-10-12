export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import StatusBadge from "@/app/components/StatusBadge";
import Link from "next/link";

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

  const shopifyConnected = false;
  const klaviyoConnected = false;

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
                Push “At-Risk” segment and measure holdout lift.
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
