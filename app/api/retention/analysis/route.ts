import { NextResponse } from "next/server";

export async function GET() {
  try {
    // const supabase = createServiceDatabaseClient();
    
    // For now, return mock data since we don't have the retention analysis materialized views yet
    // This will be replaced with real data once we create the mv_retention_periods, mv_churn_rolling, mv_reactivation views
    
    const mockData = {
      retention_curve: [
        {
          period_days: 30,
          retention_rate: 85.2,
          customer_count: 4250,
          revenue: 125000
        },
        {
          period_days: 60,
          retention_rate: 72.8,
          customer_count: 3640,
          revenue: 108000
        },
        {
          period_days: 90,
          retention_rate: 65.4,
          customer_count: 3270,
          revenue: 95000
        },
        {
          period_days: 180,
          retention_rate: 58.9,
          customer_count: 2945,
          revenue: 87000
        },
        {
          period_days: 365,
          retention_rate: 52.3,
          customer_count: 2615,
          revenue: 78000
        }
      ],
      churn_risk: [
        {
          segment: "High Value - At Risk",
          customer_count: 1250,
          churn_rate: 35.2,
          risk_score: 78,
          revenue_at_risk: 45000
        },
        {
          segment: "Medium Value - Declining",
          customer_count: 2100,
          churn_rate: 28.7,
          risk_score: 65,
          revenue_at_risk: 32000
        },
        {
          segment: "Low Value - Inactive",
          customer_count: 3400,
          churn_rate: 45.8,
          risk_score: 82,
          revenue_at_risk: 18000
        },
        {
          segment: "New Customers - Early Risk",
          customer_count: 850,
          churn_rate: 22.4,
          risk_score: 58,
          revenue_at_risk: 12000
        }
      ],
      reactivation: [
        {
          period: "Last 30 days",
          reactivated_customers: 245,
          reactivation_rate: 12.8,
          revenue_generated: 18500,
          average_days_inactive: 45
        },
        {
          period: "Last 90 days",
          reactivated_customers: 680,
          reactivation_rate: 15.2,
          revenue_generated: 42000,
          average_days_inactive: 78
        },
        {
          period: "Last 6 months",
          reactivated_customers: 1250,
          reactivation_rate: 18.5,
          revenue_generated: 75000,
          average_days_inactive: 120
        },
        {
          period: "Last year",
          reactivated_customers: 2100,
          reactivation_rate: 22.1,
          revenue_generated: 125000,
          average_days_inactive: 180
        }
      ],
      total_customers: 8500,
      overall_retention_rate: 68.4,
      at_risk_customers: 7600,
      latest_calculated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: mockData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'ETag': `"retention-${Date.now()}"`
      }
    });

  } catch (error) {
    console.error('Retention analysis API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch retention analysis data' 
      },
      { status: 500 }
    );
  }
}
