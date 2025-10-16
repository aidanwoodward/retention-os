import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Mock data for guides
    // This will be replaced with real content once we implement the guides system
    
    const mockData = {
      success: true,
      data: {
        guides: [
          {
            id: "retention_101",
            title: "Understanding Customer Retention",
            category: "metrics" as const,
            description: "Learn the fundamentals of customer retention and why it matters for your business growth.",
            difficulty: "beginner" as const,
            readTime: 5,
            tags: ["retention", "basics", "customers"],
            lastUpdated: "2023-10-20T09:00:00Z",
            featured: true,
          },
          {
            id: "cohort_analysis",
            title: "Cohort Analysis Deep Dive",
            category: "formulas" as const,
            description: "Master cohort analysis techniques and formulas to understand customer behavior patterns.",
            difficulty: "intermediate" as const,
            readTime: 12,
            tags: ["cohorts", "analysis", "formulas"],
            lastUpdated: "2023-10-22T14:30:00Z",
            featured: true,
          },
          {
            id: "churn_prediction",
            title: "Predicting Customer Churn",
            category: "best-practices" as const,
            description: "Advanced techniques for identifying customers at risk of churning and prevention strategies.",
            difficulty: "advanced" as const,
            readTime: 18,
            tags: ["churn", "prediction", "machine-learning"],
            lastUpdated: "2023-10-21T11:15:00Z",
            featured: false,
          },
          {
            id: "lifetime_value",
            title: "Customer Lifetime Value (CLV)",
            category: "metrics" as const,
            description: "Calculate and optimize customer lifetime value to maximize revenue per customer.",
            difficulty: "intermediate" as const,
            readTime: 8,
            tags: ["clv", "lifetime-value", "revenue"],
            lastUpdated: "2023-10-19T16:45:00Z",
            featured: false,
          },
          {
            id: "retention_curves",
            title: "Reading Retention Curves",
            category: "formulas" as const,
            description: "How to interpret retention curves and what they tell you about customer loyalty.",
            difficulty: "beginner" as const,
            readTime: 6,
            tags: ["retention-curves", "visualization", "loyalty"],
            lastUpdated: "2023-10-18T10:20:00Z",
            featured: false,
          },
          {
            id: "sync_troubleshooting",
            title: "Data Sync Troubleshooting",
            category: "troubleshooting" as const,
            description: "Common issues with data synchronization and how to resolve them quickly.",
            difficulty: "intermediate" as const,
            readTime: 10,
            tags: ["sync", "troubleshooting", "data"],
            lastUpdated: "2023-10-17T13:30:00Z",
            featured: false,
          },
        ],
        categories: {
          metrics: 2,
          formulas: 2,
          "best-practices": 1,
          troubleshooting: 1,
        },
        total_guides: 6,
      },
    };

    return NextResponse.json(mockData, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching guides list:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guides list" },
      { status: 500 }
    );
  }
}
