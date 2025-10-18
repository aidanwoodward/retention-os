import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string | null;
  sync_frequency: string;
  data_quality: number;
  records_synced: number;
  error_message?: string;
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

    // Check for Shopify connection
    const { data: shopifyConnection } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('account_id', accountId)
      .single();

    // Mock integration status data
    const integrations: IntegrationStatus[] = [
      {
        name: 'Shopify',
        status: shopifyConnection ? 'connected' : 'disconnected',
        last_sync: shopifyConnection ? new Date().toISOString() : null,
        sync_frequency: 'Every 15 minutes',
        data_quality: 0.95,
        records_synced: shopifyConnection ? 5000 : 0
      },
      {
        name: 'Klaviyo',
        status: 'disconnected',
        last_sync: null,
        sync_frequency: 'Every hour',
        data_quality: 0,
        records_synced: 0
      }
    ];

    console.log(`Integration status fetched successfully: ${integrations.length} integrations`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        integrations,
        total_connected: integrations.filter(i => i.status === 'connected').length,
        total_integrations: integrations.length,
        last_updated: new Date().toISOString()
      }
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in integrations status API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}