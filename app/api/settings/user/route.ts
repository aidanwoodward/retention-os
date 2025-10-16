import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Mock data for user settings
    // This will be replaced with real data once we implement the settings system
    
    const mockData = {
      success: true,
      data: {
        user: {
          id: "user_123",
          name: "RetentionOS User",
          email: "user@retentionos.com",
          role: "admin" as const,
          timezone: "America/New_York",
          language: "en",
          theme: "light" as const,
          notifications: {
            email: true,
            push: true,
            weekly_reports: true,
            sync_alerts: false,
          },
        },
        team: [
          {
            id: "member_1",
            name: "Sarah Johnson",
            email: "sarah@company.com",
            role: "analyst" as const,
            status: "active" as const,
            lastActive: "2023-10-23T10:30:00Z",
          },
          {
            id: "member_2",
            name: "Mike Chen",
            email: "mike@company.com",
            role: "viewer" as const,
            status: "active" as const,
            lastActive: "2023-10-22T16:45:00Z",
          },
          {
            id: "member_3",
            name: "Emily Davis",
            email: "emily@company.com",
            role: "analyst" as const,
            status: "pending" as const,
            lastActive: "2023-10-20T09:15:00Z",
          },
        ],
        rls_settings: {
          enabled: true,
          visibility: "team" as const,
          data_retention_days: 365,
        },
        account: {
          name: "RetentionOS Analytics",
          plan: "pro" as const,
          usage: {
            data_sources: 2,
            team_members: 3,
            storage_gb: 15.2,
          },
        },
      },
    };

    return NextResponse.json(mockData, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}
