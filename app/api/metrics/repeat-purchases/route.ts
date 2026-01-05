import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// Ensure this is a server route (no client-side code)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface RepeatPurchaseData {
  purchaseCount: number;
  purchaseCountLabel: string;
  customersReaching: number;
  percentOfOriginal: number;
  dropOffVsPrevious: number | null;
}

interface RepeatPurchaseResponse {
  purchaseBreakdown: RepeatPurchaseData[];
  totalCustomers: number;
  secondPurchaseRate: number;
  medianPurchases: number;
  customersWith3PlusPurchases: number;
  medianPurchasesFor5Plus: number | null;
  calculated_at: string;
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    
    // Count paid orders per customer
    let ordersData: Array<{ customer_id: string | null }> = [];
    if (customerIds.length > 0) {
      const { data, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id')
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

    // Calculate purchase counts per customer
    const purchaseCounts: Map<string, number> = new Map();
    ordersData?.forEach(order => {
      if (order.customer_id) {
        const current = purchaseCounts.get(order.customer_id) || 0;
        purchaseCounts.set(order.customer_id, current + 1);
      }
    });

    // Build purchase breakdown
    const totalCustomers = customers.length;
    const purchaseDistribution: number[] = [];
    
    // Count customers reaching each purchase level (cumulative: ≥N)
    const customersReaching: Map<number, number> = new Map();
    for (let n = 1; n <= 5; n++) {
      customersReaching.set(n, 0);
    }

    customers.forEach(customer => {
      const purchaseCount = purchaseCounts.get(customer.id) || 0;
      if (purchaseCount > 0) {
        purchaseDistribution.push(purchaseCount);
        
        // Count cumulative (reached ≥N)
        // Level 1: all customers with ≥1 purchase
        // Level 2: all customers with ≥2 purchases
        // Level 3: all customers with ≥3 purchases
        // Level 4: all customers with ≥4 purchases
        // Level 5: all customers with ≥5 purchases (5+)
        for (let n = 1; n <= 5; n++) {
          if (purchaseCount >= n) {
            customersReaching.set(n, (customersReaching.get(n) || 0) + 1);
          }
        }
      }
    });

    // Calculate breakdown array
    const breakdown: RepeatPurchaseData[] = [];
    let previousPercent = 100;

    for (let n = 1; n <= 5; n++) {
      const count = customersReaching.get(n) || 0;
      const percent = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0;
      const dropOff = n > 1 ? previousPercent - percent : null;

      breakdown.push({
        purchaseCount: n,
        purchaseCountLabel: n === 5 ? '5+' : String(n),
        customersReaching: count,
        percentOfOriginal: percent,
        dropOffVsPrevious: dropOff,
      });

      previousPercent = percent;
    }

    // Calculate KPIs
    const secondPurchaseRate = breakdown[1]?.percentOfOriginal || 0;
    const customersWith3PlusPurchases = breakdown[2]?.percentOfOriginal || 0;

    // Calculate median purchases
    purchaseDistribution.sort((a, b) => a - b);
    const medianPurchases = purchaseDistribution.length > 0
      ? purchaseDistribution[Math.floor(purchaseDistribution.length / 2)]
      : 0;

    // Calculate median for 5+ customers
    const fivePlusPurchases = purchaseDistribution.filter(p => p >= 5);
    const medianPurchasesFor5Plus = fivePlusPurchases.length > 0
      ? fivePlusPurchases[Math.floor(fivePlusPurchases.length / 2)]
      : null;

    const response: RepeatPurchaseResponse = {
      purchaseBreakdown: breakdown,
      totalCustomers,
      secondPurchaseRate,
      medianPurchases,
      customersWith3PlusPurchases,
      medianPurchasesFor5Plus,
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


