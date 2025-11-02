import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

interface RetentionCurveData {
  period: string;
  cohort_size: number;
  retention_rate: number;
  revenue_retention: number;
  churn_rate: number;
  reactivation_rate: number;
  avg_order_value: number;
  customer_satisfaction: number;
}

export async function GET() {
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

    const accountId = await getAccountId(session.user.id);
    if (!accountId) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Return mock data for MVP
    const mockRetentionData: RetentionCurveData[] = [
      {
        period: "2024-01",
        cohort_size: 1000,
        retention_rate: 75,
        revenue_retention: 82,
        churn_rate: 25,
        reactivation_rate: 15,
        avg_order_value: 150,
        customer_satisfaction: 4.5
      },
      {
        period: "2024-02",
        cohort_size: 1200,
        retention_rate: 78,
        revenue_retention: 85,
        churn_rate: 22,
        reactivation_rate: 18,
        avg_order_value: 165,
        customer_satisfaction: 4.6
      },
      {
        period: "2024-03",
        cohort_size: 1400,
        retention_rate: 72,
        revenue_retention: 80,
        churn_rate: 28,
        reactivation_rate: 12,
        avg_order_value: 160,
        customer_satisfaction: 4.4
      },
      {
        period: "2024-04",
        cohort_size: 1350,
        retention_rate: 80,
        revenue_retention: 88,
        churn_rate: 20,
        reactivation_rate: 20,
        avg_order_value: 170,
        customer_satisfaction: 4.7
      },
      {
        period: "2024-05",
        cohort_size: 1450,
        retention_rate: 76,
        revenue_retention: 84,
        churn_rate: 24,
        reactivation_rate: 16,
        avg_order_value: 155,
        customer_satisfaction: 4.5
      }
    ];

    const response = NextResponse.json({
      success: true,
      data: {
        curves: mockRetentionData,
        total_cohorts: mockRetentionData.length,
        best_retention_period: "2024-04",
        worst_retention_period: "2024-03",
        calculated_at: new Date().toISOString()
      }
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in retention curve API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

