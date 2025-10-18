import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface UserSettings {
  user_id: string;
  email: string;
  name: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    email_reports: boolean;
    dashboard_layout: string;
  };
  account: {
    plan: 'free' | 'pro' | 'enterprise';
    created_at: string;
    last_login: string;
  };
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET() {
  try {
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

    // Get user data from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();

    // Mock user settings data
    const userSettings: UserSettings = {
      user_id: user?.id || '',
      email: user?.email || '',
      name: user?.user_metadata?.full_name || 'User',
      preferences: {
        theme: 'light',
        notifications: true,
        email_reports: true,
        dashboard_layout: 'default'
      },
      account: {
        plan: 'pro',
        created_at: user?.created_at || new Date().toISOString(),
        last_login: new Date().toISOString()
      }
    };

    console.log(`User settings fetched successfully for user: ${user?.id}`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: userSettings
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in user settings API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}