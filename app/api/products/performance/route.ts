import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface ProductPerformanceData {
  product_id: string;
  product_name: string;
  category: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  units_sold: number;
  conversion_rate: number;
  return_rate: number;
  customer_satisfaction: number;
  inventory_turnover: number;
  profit_margin: number;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    // const { searchParams } = new URL(request.url);
    // const limit = parseInt(searchParams.get('limit') || '50');
    // const category = searchParams.get('category');
    
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

    // For now, return mock data since we don't have products table yet
    const mockProducts: ProductPerformanceData[] = [
      {
        product_id: "prod_1",
        product_name: "Premium Headphones",
        category: "Electronics",
        total_orders: 150,
        total_revenue: 45000,
        avg_order_value: 300,
        units_sold: 150,
        conversion_rate: 0.12,
        return_rate: 0.02,
        customer_satisfaction: 4.8,
        inventory_turnover: 6.5,
        profit_margin: 0.35
      },
      {
        product_id: "prod_2",
        product_name: "Wireless Mouse",
        category: "Electronics",
        total_orders: 200,
        total_revenue: 20000,
        avg_order_value: 100,
        units_sold: 200,
        conversion_rate: 0.15,
        return_rate: 0.01,
        customer_satisfaction: 4.6,
        inventory_turnover: 8.2,
        profit_margin: 0.25
      }
    ];

    console.log(`Product performance data fetched successfully: ${mockProducts.length} records`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        products: mockProducts,
        total_products: mockProducts.length,
        best_performing: "Premium Headphones",
        worst_performing: "Wireless Mouse",
        calculated_at: new Date().toISOString()
      }
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in products performance API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}