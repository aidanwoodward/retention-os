import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface ReportSummaryData {
  period: string;
  total_revenue: number;
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  avg_order_value: number;
  retention_rate: number;
  churn_rate: number;
  top_products: string[];
  key_insights: string[];
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    
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

    // For now, return mock data since we don't have reports table yet
    const mockReportData: ReportSummaryData = {
      period: period,
      total_revenue: 125000,
      total_customers: 2500,
      new_customers: 150,
      returning_customers: 800,
      avg_order_value: 180,
      retention_rate: 0.75,
      churn_rate: 0.25,
      top_products: ["Premium Headphones", "Wireless Mouse", "Smart Watch"],
      key_insights: [
        "Customer retention improved by 5% this month",
        "New customer acquisition is up 12%",
        "Average order value increased by $15"
      ]
    };

    console.log(`Report summary data fetched successfully for period: ${period}`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: mockReportData
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in reports summary API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}