import { NextResponse } from "next/server";

export async function GET() {
  try {
    // const supabase = createServiceDatabaseClient();
    
    // For now, return mock data since we don't have the product performance materialized view yet
    // This will be replaced with real data once we create the mv_product_performance view
    
    const mockData = {
      performance: [
        {
          product_id: "prod_001",
          product_name: "Premium Wireless Headphones",
          category: "Electronics",
          total_revenue: 125000,
          total_orders: 450,
          average_order_value: 278,
          repeat_purchase_rate: 85.2,
          discount_usage_rate: 15.8,
          cross_sell_score: 0.42,
          replenishment_rate: 78.5,
          median_days_between_orders: 45,
          last_ordered: "2024-01-15"
        },
        {
          product_id: "prod_002", 
          product_name: "Organic Coffee Beans",
          category: "Food & Beverage",
          total_revenue: 89000,
          total_orders: 1200,
          average_order_value: 74,
          repeat_purchase_rate: 92.1,
          discount_usage_rate: 8.3,
          cross_sell_score: 0.38,
          replenishment_rate: 89.2,
          median_days_between_orders: 28,
          last_ordered: "2024-01-14"
        },
        {
          product_id: "prod_003",
          product_name: "Yoga Mat Pro",
          category: "Fitness",
          total_revenue: 67000,
          total_orders: 890,
          average_order_value: 75,
          repeat_purchase_rate: 76.8,
          discount_usage_rate: 22.1,
          cross_sell_score: 0.35,
          replenishment_rate: 65.4,
          median_days_between_orders: 60,
          last_ordered: "2024-01-12"
        },
        {
          product_id: "prod_004",
          product_name: "Smart Water Bottle",
          category: "Fitness",
          total_revenue: 45000,
          total_orders: 600,
          average_order_value: 75,
          repeat_purchase_rate: 68.3,
          discount_usage_rate: 18.7,
          cross_sell_score: 0.28,
          replenishment_rate: 58.9,
          median_days_between_orders: 75,
          last_ordered: "2024-01-10"
        },
        {
          product_id: "prod_005",
          product_name: "Artisan Ceramic Mugs",
          category: "Home & Kitchen",
          total_revenue: 32000,
          total_orders: 800,
          average_order_value: 40,
          repeat_purchase_rate: 82.5,
          discount_usage_rate: 12.4,
          cross_sell_score: 0.45,
          replenishment_rate: 72.1,
          median_days_between_orders: 35,
          last_ordered: "2024-01-13"
        }
      ],
      cross_sell: [
        {
          product_a: "Premium Wireless Headphones",
          product_b: "Phone Case",
          frequency: 89,
          joint_aov: 320,
          lift: 15.2
        },
        {
          product_a: "Organic Coffee Beans",
          product_b: "Artisan Ceramic Mugs",
          frequency: 156,
          joint_aov: 95,
          lift: 28.4
        },
        {
          product_a: "Yoga Mat Pro",
          product_b: "Smart Water Bottle",
          frequency: 78,
          joint_aov: 140,
          lift: 12.8
        },
        {
          product_a: "Artisan Ceramic Mugs",
          product_b: "Coffee Grinder",
          frequency: 92,
          joint_aov: 85,
          lift: 18.7
        },
        {
          product_a: "Smart Water Bottle",
          product_b: "Workout Towel",
          frequency: 45,
          joint_aov: 95,
          lift: 8.9
        }
      ],
      replenishment: [
        {
          product_id: "prod_001",
          product_name: "Premium Wireless Headphones",
          median_days: 45,
          replenishment_rate: 78.5,
          customer_count: 342
        },
        {
          product_id: "prod_002",
          product_name: "Organic Coffee Beans", 
          median_days: 28,
          replenishment_rate: 89.2,
          customer_count: 1080
        },
        {
          product_id: "prod_003",
          product_name: "Yoga Mat Pro",
          median_days: 60,
          replenishment_rate: 65.4,
          customer_count: 684
        },
        {
          product_id: "prod_004",
          product_name: "Smart Water Bottle",
          median_days: 75,
          replenishment_rate: 58.9,
          customer_count: 410
        },
        {
          product_id: "prod_005",
          product_name: "Artisan Ceramic Mugs",
          median_days: 35,
          replenishment_rate: 72.1,
          customer_count: 656
        }
      ],
      total_products: 5,
      total_revenue: 358000,
      average_aov: 108,
      latest_calculated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: mockData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'ETag': `"products-${Date.now()}"`
      }
    });

  } catch (error) {
    console.error('Product performance API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product performance data' 
      },
      { status: 500 }
    );
  }
}
