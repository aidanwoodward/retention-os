import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";
import { computeRepeatPurchaseApiMetrics } from "@/lib/metrics";
import type { Customer } from "@/lib/types";
import type { Order } from "@/lib/types/order";

// Ensure this is a server route (no client-side code)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface RepeatPurchaseResponse {
  purchaseBreakdown: ReturnType<typeof computeRepeatPurchaseApiMetrics>["purchaseBreakdown"];
  totalCustomers: number;
  secondPurchaseRate: number;
  medianPurchases: number;
  customersWith3PlusPurchases: number;
  medianPurchasesFor5Plus: number | null;
  calculated_at: string;
}

function toMetricCustomer(row: { id: string; first_order_at: string | null }): Customer {
  return {
    id: row.id,
    firstOrderAt: row.first_order_at ?? "1970-01-01T00:00:00.000Z",
  };
}

function toMetricOrder(row: {
  id: string;
  customer_id: string | null;
  source_created_at: string;
}): Order | null {
  if (!row.customer_id) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    orderedAt: row.source_created_at,
    grossRevenue: 0,
    discounts: 0,
    refunds: 0,
    lineItems: [],
  };
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    // Parse URL and search params
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse filters (V1 supported filters only)
    const dateRangeFrom = searchParams.get('dateRange_from');
    const dateRangeTo = searchParams.get('dateRange_to');
    const customerType = searchParams.get('customerType');
    
    // Get Supabase client
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

    // Authenticate
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check for development mode - Next.js sets NODE_ENV automatically in dev mode
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NEXT_PUBLIC_ENV === 'development' ||
                         !process.env.VERCEL; // Not on Vercel = likely local dev
    
    if (!session) {
      // In production, always require authentication
      if (!isDevelopment) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // In development, return empty result structure (no session found)
      console.log("Development mode: Returning empty repeat purchases data (no session found)");
      return NextResponse.json({
        success: true,
        data: {
          purchaseBreakdown: [],
          totalCustomers: 0,
          secondPurchaseRate: 0,
          medianPurchases: 0,
          customersWith3PlusPurchases: 0,
          medianPurchasesFor5Plus: null,
          calculated_at: new Date().toISOString(),
        },
        is_demo: true
      });
    }

    // Get account ID
    const accountId = await getAccountId(session.user.id);
    if (!accountId) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Build customer query with filters
    let customerQuery = supabase
      .from('customers')
      .select('id, first_order_at, orders_count')
      .eq('account_id', accountId)
      .not('first_order_at', 'is', null); // Only customers with at least one order

    // Apply date range filter to first_order_at
    if (dateRangeFrom) {
      customerQuery = customerQuery.gte('first_order_at', dateRangeFrom);
    }
    if (dateRangeTo) {
      customerQuery = customerQuery.lte('first_order_at', dateRangeTo);
    }

    // Apply customerType filter (V1: new/returning only)
    // Note: VIP and at-risk are outputs/narratives, not filters in V1
    if (customerType) {
      const customerTypes = Array.isArray(customerType) ? customerType : [customerType];
      const hasNew = customerTypes.includes('new');
      const hasReturning = customerTypes.includes('returning');
      
      if (hasNew && !hasReturning) {
        customerQuery = customerQuery.eq('orders_count', 1);
      } else if (hasReturning && !hasNew) {
        customerQuery = customerQuery.gt('orders_count', 1);
      }
      // If both selected or neither selected, no filter applied (show all)
    }

    // Fetch customers
    const { data: customers, error: customersError } = await customerQuery;

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      return NextResponse.json({ 
        error: "Failed to fetch customer data",
        details: customersError.message 
      }, { status: 500 });
    }

    if (!customers || customers.length === 0) {
      // Return empty result structure (not an error)
      return NextResponse.json({
        success: true,
        data: {
          purchaseBreakdown: [],
          totalCustomers: 0,
          secondPurchaseRate: 0,
          medianPurchases: 0,
          customersWith3PlusPurchases: 0,
          medianPurchasesFor5Plus: null,
          calculated_at: new Date().toISOString(),
        }
      });
    }

    // Get actual purchase counts from orders table (more accurate than orders_count)
    const customerIds = customers.map(c => c.id);
    
    let ordersData: Array<{ id: string; customer_id: string | null; source_created_at: string }> = [];
    if (customerIds.length > 0) {
      const { data, error: ordersError } = await supabase
        .from('orders')
        .select('id, customer_id, source_created_at')
        .eq('account_id', accountId)
        .eq('financial_status', 'paid')
        .in('customer_id', customerIds);

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        return NextResponse.json({ 
          error: "Failed to fetch order data",
          details: ordersError.message 
        }, { status: 500 });
      }
      ordersData = data || [];
    }

    const metricCustomers = customers.map(toMetricCustomer);
    const metricOrders = ordersData
      .map((row) => toMetricOrder(row))
      .filter((o): o is Order => o != null);

    const derived = computeRepeatPurchaseApiMetrics(metricCustomers, metricOrders);

    const response: RepeatPurchaseResponse = {
      purchaseBreakdown: derived.purchaseBreakdown,
      totalCustomers: derived.totalCustomers,
      secondPurchaseRate: derived.secondPurchaseRate,
      medianPurchases: derived.medianPurchases,
      customersWith3PlusPurchases: derived.customersWith3PlusPurchases,
      medianPurchasesFor5Plus: derived.medianPurchasesFor5Plus,
      calculated_at: new Date().toISOString(),
    };

    const httpResponse = NextResponse.json({
      success: true,
      data: response
    }, { status: 200 });
    
    // Set cache headers for performance
    httpResponse.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return httpResponse;

  } catch (error) {
    console.error("Repeat purchases API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch repeat purchase data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}


