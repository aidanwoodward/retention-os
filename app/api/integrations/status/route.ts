import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Mock data for integrations status
    // This will be replaced with real data once we implement the integrations system
    
    const mockData = {
      success: true,
      data: {
        integrations: [
          {
            id: "shopify_1",
            name: "Shopify Store",
            type: "shopify" as const,
            status: "connected" as const,
            lastSync: "2023-10-23T10:30:00Z",
            recordCount: 5295,
            latency: 120,
            health: "good" as const,
          },
          {
            id: "klaviyo_1", 
            name: "Klaviyo Marketing",
            type: "klaviyo" as const,
            status: "disconnected" as const,
            lastSync: "2023-10-20T15:45:00Z",
            recordCount: 0,
            latency: 0,
            health: "error" as const,
          },
          {
            id: "analytics_1",
            name: "Google Analytics",
            type: "analytics" as const,
            status: "syncing" as const,
            lastSync: "2023-10-23T11:00:00Z",
            recordCount: 1250,
            latency: 85,
            health: "warning" as const,
          },
        ],
        total_connections: 3,
        healthy_connections: 1,
        last_updated: "2023-10-23T11:15:00Z",
      },
    };

    return NextResponse.json(mockData, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching integrations status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch integrations status" },
      { status: 500 }
    );
  }
}
