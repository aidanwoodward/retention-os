import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface CustomerSegment {
  customer_id: string;
  first_order_at: string;
  last_order_at: string;
  actual_total_spent: number;
  actual_orders_count: number;
  avg_order_value: number;
  days_since_last_order: number;
  customer_lifespan_days: number;
  revenue_per_day: number;
  value_segment: 'VIP' | 'High Value' | 'Medium Value' | 'Low Value' | 'Very Low Value';
  activity_segment: 'Active' | 'At Risk' | 'Dormant' | 'Lost';
  frequency_segment: 'One-time Buyer' | 'Occasional Buyer' | 'Regular Buyer' | 'Frequent Buyer';
  aov_segment: 'High AOV' | 'Medium AOV' | 'Low AOV';
  calculated_at: string;
}

interface SegmentSummary {
  segment: string;
  count: number;
  total_revenue: number;
  avg_revenue_per_customer: number;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentType = searchParams.get('segment_type'); // value, activity, frequency, aov
    const segmentValue = searchParams.get('segment_value'); // VIP, Active, etc.
    const limit = parseInt(searchParams.get('limit') || '100');
    
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

    // Build query based on parameters
    let query = supabase
      .from('mv_customer_segments')
      .select('*')
      .eq('account_id', accountId)
      .order('actual_total_spent', { ascending: false })
      .limit(limit);

    // Apply filters
    if (segmentType && segmentValue) {
      const columnName = `${segmentType}_segment`;
      query = query.eq(columnName, segmentValue);
    }

    // Fetch segments from materialized view
    console.log("Fetching customer segments from materialized view...");
    const { data: segmentsData, error } = await query;

    if (error) {
      console.error("Error fetching segments:", error);
      return NextResponse.json({ error: "Failed to fetch segments" }, { status: 500 });
    }

    // Transform data for frontend
    const segments: CustomerSegment[] = (segmentsData || []).map(record => ({
      customer_id: record.customer_id,
      first_order_at: record.first_order_at,
      last_order_at: record.last_order_at,
      actual_total_spent: parseFloat(record.actual_total_spent) || 0,
      actual_orders_count: record.actual_orders_count || 0,
      avg_order_value: parseFloat(record.avg_order_value) || 0,
      days_since_last_order: record.days_since_last_order || 0,
      customer_lifespan_days: record.customer_lifespan_days || 0,
      revenue_per_day: parseFloat(record.revenue_per_day) || 0,
      value_segment: record.value_segment,
      activity_segment: record.activity_segment,
      frequency_segment: record.frequency_segment,
      aov_segment: record.aov_segment,
      calculated_at: record.calculated_at
    }));

    // Generate segment summaries
    const segmentSummaries = generateSegmentSummaries(segments);

    console.log(`Segments fetched successfully: ${segments.length} customers`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        segments,
        summaries: segmentSummaries,
        total_customers: segments.length,
        latest_calculated_at: segments[0]?.calculated_at
      }
    });

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    // ETag for conditional requests
    const etag = `"segments-${accountId}-${segments[0]?.calculated_at || 'none'}"`;
    response.headers.set('ETag', etag);

    return response;

  } catch (error) {
    console.error("Segments API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch segments",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateSegmentSummaries(segments: CustomerSegment[]): Record<string, SegmentSummary[]> {
  const summaries: Record<string, SegmentSummary[]> = {
    value: [],
    activity: [],
    frequency: [],
    aov: []
  };

  // Value segment summary
  const valueGroups = segments.reduce((acc, segment) => {
    if (!acc[segment.value_segment]) {
      acc[segment.value_segment] = [];
    }
    acc[segment.value_segment].push(segment);
    return acc;
  }, {} as Record<string, CustomerSegment[]>);

  summaries.value = Object.entries(valueGroups).map(([segment, customers]) => ({
    segment,
    count: customers.length,
    total_revenue: customers.reduce((sum, c) => sum + c.actual_total_spent, 0),
    avg_revenue_per_customer: customers.reduce((sum, c) => sum + c.actual_total_spent, 0) / customers.length
  }));

  // Activity segment summary
  const activityGroups = segments.reduce((acc, segment) => {
    if (!acc[segment.activity_segment]) {
      acc[segment.activity_segment] = [];
    }
    acc[segment.activity_segment].push(segment);
    return acc;
  }, {} as Record<string, CustomerSegment[]>);

  summaries.activity = Object.entries(activityGroups).map(([segment, customers]) => ({
    segment,
    count: customers.length,
    total_revenue: customers.reduce((sum, c) => sum + c.actual_total_spent, 0),
    avg_revenue_per_customer: customers.reduce((sum, c) => sum + c.actual_total_spent, 0) / customers.length
  }));

  // Frequency segment summary
  const frequencyGroups = segments.reduce((acc, segment) => {
    if (!acc[segment.frequency_segment]) {
      acc[segment.frequency_segment] = [];
    }
    acc[segment.frequency_segment].push(segment);
    return acc;
  }, {} as Record<string, CustomerSegment[]>);

  summaries.frequency = Object.entries(frequencyGroups).map(([segment, customers]) => ({
    segment,
    count: customers.length,
    total_revenue: customers.reduce((sum, c) => sum + c.actual_total_spent, 0),
    avg_revenue_per_customer: customers.reduce((sum, c) => sum + c.actual_total_spent, 0) / customers.length
  }));

  // AOV segment summary
  const aovGroups = segments.reduce((acc, segment) => {
    if (!acc[segment.aov_segment]) {
      acc[segment.aov_segment] = [];
    }
    acc[segment.aov_segment].push(segment);
    return acc;
  }, {} as Record<string, CustomerSegment[]>);

  summaries.aov = Object.entries(aovGroups).map(([segment, customers]) => ({
    segment,
    count: customers.length,
    total_revenue: customers.reduce((sum, c) => sum + c.actual_total_spent, 0),
    avg_revenue_per_customer: customers.reduce((sum, c) => sum + c.actual_total_spent, 0) / customers.length
  }));

  return summaries;
}
