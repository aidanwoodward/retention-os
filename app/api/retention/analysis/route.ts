import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface RetentionAnalysisData {
  period: string;
  cohort_size: number;
  retention_rate: number;
  revenue_retention: number;
  churn_rate: number;
  reactivation_rate: number;
  avg_order_value: number;
  customer_satisfaction: number;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    // const { searchParams } = new URL(request.url);
    // const limit = parseInt(searchParams.get('limit') || '50');
    // const period = searchParams.get('period');
    
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

    // For now, return mock data since we don't have retention analysis table yet
    const mockRetentionData: RetentionAnalysisData[] = [
      {
        period: "2024-01",
        cohort_size: 1000,
        retention_rate: 0.75,
        revenue_retention: 0.82,
        churn_rate: 0.25,
        reactivation_rate: 0.15,
        avg_order_value: 150,
        customer_satisfaction: 4.5
      },
      {
        period: "2024-02",
        cohort_size: 1200,
        retention_rate: 0.78,
        revenue_retention: 0.85,
        churn_rate: 0.22,
        reactivation_rate: 0.18,
        avg_order_value: 165,
        customer_satisfaction: 4.6
      }
    ];

    console.log(`Retention analysis data fetched successfully: ${mockRetentionData.length} records`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        retention_data: mockRetentionData,
        total_periods: mockRetentionData.length,
        best_retention_period: "2024-02",
        worst_retention_period: "2024-01",
        calculated_at: new Date().toISOString()
      }
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in retention analysis API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}