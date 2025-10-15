import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface CohortsData {
  cohort_month: string;
  cohort_size: number;
  order_month: string;
  period_number: number;
  active_customers: number;
  total_orders: number;
  total_revenue: number;
  retention_rate_percent: number;
  calculated_at: string;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const cohortMonth = searchParams.get('cohort_month');
    
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

    // Build query
    let query = supabase
      .from('mv_cohorts')
      .select('*')
      .eq('account_id', accountId)
      .order('cohort_month', { ascending: false })
      .order('period_number', { ascending: true })
      .limit(limit);

    // Filter by specific cohort month if provided
    if (cohortMonth) {
      query = query.eq('cohort_month', cohortMonth);
    }

    // Fetch cohorts from materialized view
    console.log("Fetching cohorts from materialized view...");
    const { data: cohortsData, error } = await supabase
      .from('mv_cohorts')
      .select('*')
      .eq('account_id', accountId)
      .order('cohort_month', { ascending: false })
      .order('period_number', { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error fetching cohorts:", error);
      return NextResponse.json({ error: "Failed to fetch cohorts" }, { status: 500 });
    }

    // Transform data for frontend
    const cohorts: CohortsData[] = (cohortsData || []).map(record => ({
      cohort_month: record.cohort_month,
      cohort_size: record.cohort_size || 0,
      order_month: record.order_month,
      period_number: record.period_number || 0,
      active_customers: record.active_customers || 0,
      total_orders: record.total_orders || 0,
      total_revenue: parseFloat(record.total_revenue) || 0,
      retention_rate_percent: parseFloat(record.retention_rate_percent) || 0,
      calculated_at: record.calculated_at
    }));

    // Group by cohort for easier frontend consumption
    const cohortsByMonth = cohorts.reduce((acc, cohort) => {
      if (!acc[cohort.cohort_month]) {
        acc[cohort.cohort_month] = {
          cohort_month: cohort.cohort_month,
          cohort_size: cohort.cohort_size,
          periods: []
        };
      }
      acc[cohort.cohort_month].periods.push({
        period_number: cohort.period_number,
        order_month: cohort.order_month,
        active_customers: cohort.active_customers,
        total_orders: cohort.total_orders,
        total_revenue: cohort.total_revenue,
        retention_rate_percent: cohort.retention_rate_percent
      });
      return acc;
    }, {} as Record<string, any>);

    console.log(`Cohorts fetched successfully: ${cohorts.length} records`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        cohorts: Object.values(cohortsByMonth),
        total_records: cohorts.length,
        latest_calculated_at: cohorts[0]?.calculated_at
      }
    });

    // Cache for 10 minutes (cohorts change less frequently)
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    
    // ETag for conditional requests
    const etag = `"cohorts-${accountId}-${cohorts[0]?.calculated_at || 'none'}"`;
    response.headers.set('ETag', etag);

    return response;

  } catch (error) {
    console.error("Cohorts API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch cohorts",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
