import { NextResponse } from "next/server";

export async function GET() {
  try {
    // const supabase = createServiceDatabaseClient();
    
    // For now, return mock data since we don't have the reports system implemented yet
    // This will be replaced with real data once we implement the AI summary service
    
    const mockData = {
      weekly_summary: {
        period: "Week of January 15-21, 2024",
        key_metrics: {
          revenue: 125000,
          revenue_change: 12.5,
          retention_rate: 68.4,
          retention_change: 3.2,
          new_customers: 450,
          new_customers_change: 8.7,
          repeat_rate: 72.1,
          repeat_rate_change: 5.8
        },
        insights: [
          "Revenue increased by 12.5% this week, driven primarily by repeat customer purchases",
          "Retention rate improved to 68.4%, indicating successful customer engagement strategies",
          "New customer acquisition grew by 8.7%, with strong performance in the 25-34 age demographic",
          "Cross-sell opportunities identified in the Electronics and Home & Kitchen categories",
          "Customer lifetime value increased by 15% compared to the previous week"
        ],
        recommendations: [
          "Implement targeted email campaigns for customers who haven't purchased in 60+ days",
          "Create bundle offers combining top-performing product pairs to increase AOV",
          "Develop loyalty program for high-value customers to improve retention",
          "Optimize checkout flow based on cart abandonment patterns in the 18-24 age group",
          "Launch reactivation campaign for dormant customers with personalized discounts"
        ],
        generated_at: new Date().toISOString()
      },
      executive_reports: [
        {
          id: "exec_001",
          title: "Q4 2023 Retention Analysis",
          period: "October - December 2023",
          status: "generated",
          created_at: "2024-01-10T10:30:00Z",
          sections: ["Executive Summary", "Key Metrics", "Cohort Analysis", "Recommendations"]
        },
        {
          id: "exec_002", 
          title: "January 2024 Performance Report",
          period: "January 1-31, 2024",
          status: "ready",
          created_at: "2024-01-15T14:20:00Z",
          sections: ["Revenue Analysis", "Customer Segments", "Product Performance", "Action Items"]
        },
        {
          id: "exec_003",
          title: "Retention Strategy Review",
          period: "January 2024",
          status: "draft",
          created_at: "2024-01-20T09:15:00Z",
          sections: ["Current State", "Benchmarks", "Opportunities", "Next Steps"]
        }
      ],
      total_reports: 3,
      latest_generated: "2024-01-20T09:15:00Z"
    };

    return NextResponse.json({
      success: true,
      data: mockData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'ETag': `"reports-${Date.now()}"`
      }
    });

  } catch (error) {
    console.error('Reports summary API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reports data' 
      },
      { status: 500 }
    );
  }
}
