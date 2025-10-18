import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface CustomerData {
  customer_id: string;
  email_hash: string;
  first_name: string;
  last_name: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  last_order_date: string;
  days_since_last_order: number;
  customer_lifespan_days: number;
  value_segment: string;
  activity_segment: string;
  frequency_segment: string;
  aov_segment: string;
  lifetime_value: number;
  repeat_rate: number;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const segment = searchParams.get('segment');
    const valueSegment = searchParams.get('value_segment');
    
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

    const accountId = await getAccountId(session.user.id);
    if (!accountId) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Build query with filters
    let query = supabase
      .from('customers')
      .select(`
        customer_id,
        email_hash,
        first_name,
        last_name,
        total_orders,
        total_spent,
        avg_order_value,
        last_order_date,
        days_since_last_order,
        customer_lifespan_days,
        value_segment,
        activity_segment,
        frequency_segment,
        aov_segment,
        lifetime_value,
        repeat_rate
      `)
      .eq('account_id', accountId)
      .limit(limit);

    if (segment) {
      query = query.eq('activity_segment', segment);
    }
    if (valueSegment) {
      query = query.eq('value_segment', valueSegment);
    }

    const { data: customers, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('customers')
      .select('customer_id, created_at, last_order_date')
      .eq('account_id', accountId);

    const totalCustomers = stats?.length || 0;
    const newCustomers30d = stats?.filter(c => {
      const createdDate = new Date(c.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length || 0;
    const returningCustomers = stats?.filter(c => c.last_order_date).length || 0;

    console.log(`Customers fetched successfully: ${customers?.length || 0} records`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        customers: customers || [],
        total_customers: totalCustomers,
        new_customers_30d: newCustomers30d,
        returning_customers: returningCustomers,
        calculated_at: new Date().toISOString()
      }
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in customers list API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
