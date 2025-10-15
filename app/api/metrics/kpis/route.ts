import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface KPIsData {
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  customer_lifetime_value: number;
  repeat_customers: number;
  retention_rate_percent: number;
  at_risk_customers: number;
  dormant_customers: number;
  one_time_buyers: number;
  new_customers_30d: number;
  revenue_30d: number;
  revenue_90d: number;
  avg_orders_per_customer: number;
  calculated_at: string;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Get the current user's session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get account ID for the user
    const accountId = await getAccountId(session.user.id);

    // Fetch KPIs from materialized view
    console.log("Fetching KPIs from materialized view...");
    const { data: kpisData, error } = await supabase
      .from('mv_kpis')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) {
      console.error("Error fetching KPIs:", error);
      return NextResponse.json({ error: "Failed to fetch KPIs" }, { status: 500 });
    }

    if (!kpisData) {
      return NextResponse.json({ error: "No KPIs data found" }, { status: 404 });
    }

    // Transform data for frontend
    const kpis: KPIsData = {
      total_customers: kpisData.total_customers || 0,
      total_orders: kpisData.total_orders || 0,
      total_revenue: parseFloat(kpisData.total_revenue) || 0,
      average_order_value: parseFloat(kpisData.average_order_value) || 0,
      customer_lifetime_value: parseFloat(kpisData.customer_lifetime_value) || 0,
      repeat_customers: kpisData.repeat_customers || 0,
      retention_rate_percent: parseFloat(kpisData.retention_rate_percent) || 0,
      at_risk_customers: kpisData.at_risk_customers || 0,
      dormant_customers: kpisData.dormant_customers || 0,
      one_time_buyers: kpisData.one_time_buyers || 0,
      new_customers_30d: kpisData.new_customers_30d || 0,
      revenue_30d: parseFloat(kpisData.revenue_30d) || 0,
      revenue_90d: parseFloat(kpisData.revenue_90d) || 0,
      avg_orders_per_customer: parseFloat(kpisData.avg_orders_per_customer) || 0,
      calculated_at: kpisData.calculated_at
    };

    console.log("KPIs fetched successfully:", {
      customers: kpis.total_customers,
      orders: kpis.total_orders,
      revenue: kpis.total_revenue,
      retention: kpis.retention_rate_percent
    });

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: kpis
    });

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    // ETag for conditional requests
    const etag = `"kpis-${accountId}-${kpis.calculated_at}"`;
    response.headers.set('ETag', etag);

    return response;

  } catch (error) {
    console.error("KPIs API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch KPIs",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manually refresh the materialized view
    console.log("Manually refreshing KPIs materialized view...");
    const { error } = await supabase.rpc('refresh_metric_views');

    if (error) {
      console.error("Error refreshing views:", error);
      return NextResponse.json({ error: "Failed to refresh KPIs" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "KPIs refreshed successfully"
    });

  } catch (error) {
    console.error("KPIs refresh error:", error);
    return NextResponse.json({ 
      error: "Failed to refresh KPIs",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
