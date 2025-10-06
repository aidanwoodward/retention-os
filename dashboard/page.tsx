import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export default async function DashboardPage() {
  // Server-side session check (no flicker)
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Retention OS</h1>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
            Connected: 0 stores
          </span>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow">
          <p className="text-lg font-medium">
            Hello Retention OS – connect your store to get started.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            This is your protected dashboard. Next we’ll add Shopify & Klaviyo,
            daily scoring, and an ROI card.
          </p>
        </section>
      </div>
    </main>
  );
}
