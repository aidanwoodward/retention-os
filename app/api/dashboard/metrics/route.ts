import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createShopifyClient } from "@/lib/shopifyClient";
import { getAccountId } from "@/lib/database";

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

    // Get Shopify connection
    const { data: shopifyConnections } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .limit(1);

    if (!shopifyConnections || shopifyConnections.length === 0) {
      return NextResponse.json({ error: "No Shopify connection found" }, { status: 404 });
    }

    const shopifyConnection = shopifyConnections[0];
    
    // Create Shopify client
    console.log("Creating Shopify client for user:", session.user.id);
    const shopify = await createShopifyClient(session.user.id, supabase);
    if (!shopify) {
      console.error("Failed to create Shopify client");
      return NextResponse.json({ error: "Failed to create Shopify client" }, { status: 500 });
    }
    console.log("Shopify client created successfully");

    // Get account ID for the user
    const accountId = await getAccountId(session.user.id);

    // Fetch real data from our canonical schema
    console.log("Fetching real data from canonical schema...");
    
    const [customersResult, ordersResult] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('account_id', accountId),
      supabase
        .from('orders')
        .select('*')
        .eq('account_id', accountId)
        .eq('financial_status', 'paid')
    ]);

    const customers = customersResult.data || [];
    const paidOrders = ordersResult.data || [];

    console.log("Real data:", { customersCount: customers.length, ordersCount: paidOrders.length });
    console.log("Sample customer:", customers[0]);
    console.log("Sample order:", paidOrders[0]);

    // Calculate retention metrics
    const metrics = calculateRetentionMetrics(customers, paidOrders);
    console.log("Calculated metrics:", metrics);

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        totalOrders: paidOrders.length,
        ...metrics,
        shopDomain: shopifyConnection.shop_domain,
        lastSync: shopifyConnection.connected_at
      }
    });

  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

interface Customer {
  id: string;
  customer_id?: string;
  source_created_at: string;
  source_updated_at: string;
  total_spent: number;
  orders_count: number;
  first_order_at: string;
  last_order_at: string;
}

interface Order {
  id: string;
  customer_id?: string;
  source_created_at: string;
  total_price: number;
  financial_status: string;
}

function calculateRetentionMetrics(customers: Customer[], orders: Order[]) {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Group orders by customer using customer_id field
  const customerOrders: { [key: string]: Order[] } = {};
  orders.forEach(order => {
    if (order.customer_id) {
      const customerId = order.customer_id.toString();
      if (!customerOrders[customerId]) {
        customerOrders[customerId] = [];
      }
      customerOrders[customerId].push(order);
    }
  });

  // Calculate metrics
  const repeatCustomers = Object.values(customerOrders).filter(orders => orders.length > 1);
  const retentionRate = customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0;

  // Calculate Customer Lifetime Value (CLV)
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(String(order.total_price || "0")), 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const averageOrdersPerCustomer = customers.length > 0 ? orders.length / customers.length : 0;
  const customerLifetimeValue = averageOrderValue * averageOrdersPerCustomer;

  // At-risk customers (no purchase in 60+ days)
  const atRiskCustomers = Object.entries(customerOrders).filter(([, customerOrders]) => {
    const lastOrder = customerOrders.sort((a, b) => new Date(b.source_created_at).getTime() - new Date(a.source_created_at).getTime())[0];
    if (!lastOrder) return false;
    return new Date(lastOrder.source_created_at) < sixtyDaysAgo;
  });

  // Dormant customers (no purchase in 90+ days)
  const dormantCustomers = Object.entries(customerOrders).filter(([, customerOrders]) => {
    const lastOrder = customerOrders.sort((a, b) => new Date(b.source_created_at).getTime() - new Date(a.source_created_at).getTime())[0];
    if (!lastOrder) return false;
    return new Date(lastOrder.source_created_at) < ninetyDaysAgo;
  });

  // One-time buyers
  const oneTimeBuyers = Object.values(customerOrders).filter(orders => orders.length === 1);

  return {
    retentionRate: Math.round(retentionRate * 10) / 10, // Round to 1 decimal
    customerLifetimeValue: Math.round(customerLifetimeValue * 100) / 100, // Round to 2 decimals
    atRiskCustomers: atRiskCustomers.length,
    dormantCustomers: dormantCustomers.length,
    oneTimeBuyers: oneTimeBuyers.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    repeatCustomers: repeatCustomers.length
  };
}
