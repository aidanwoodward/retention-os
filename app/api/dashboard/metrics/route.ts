import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createShopifyClient } from "@/lib/shopifyClient";

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

    // TEMPORARY: Use dummy data for testing
    console.log("Using dummy data for testing...");
    
    // Generate realistic dummy data
    const dummyCustomers = Array.from({ length: 1247 }, (_, i) => ({
      id: i + 1,
      email: `customer${i + 1}@example.com`,
      first_name: `Customer`,
      last_name: `${i + 1}`,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const dummyOrders = Array.from({ length: 2156 }, (_, i) => ({
      id: i + 1,
      order_number: i + 1000,
      email: `customer${Math.floor(Math.random() * 1247) + 1}@example.com`,
      created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      total_price: (Math.random() * 200 + 25).toFixed(2), // $25-$225
      financial_status: Math.random() > 0.1 ? "paid" : "pending", // 90% paid
      customer: {
        id: Math.floor(Math.random() * 1247) + 1,
        email: `customer${Math.floor(Math.random() * 1247) + 1}@example.com`,
      }
    }));

    // Filter orders to only include paid orders
    const paidOrders = dummyOrders.filter(order => order.financial_status === "paid");
    console.log("Dummy data:", { customersCount: dummyCustomers.length, ordersCount: paidOrders.length });

    // Calculate retention metrics
    const metrics = calculateRetentionMetrics(dummyCustomers, paidOrders);

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: dummyCustomers.length,
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

interface ShopifyCustomer {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  email?: string;
  created_at: string;
  total_price: string;
  financial_status: string;
  customer?: {
    id: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

function calculateRetentionMetrics(customers: ShopifyCustomer[], orders: ShopifyOrder[]) {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Group orders by customer
  const customerOrders: { [key: string]: ShopifyOrder[] } = {};
  orders.forEach(order => {
    if (order.customer && order.customer.id) {
      const customerId = order.customer.id.toString();
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
    const lastOrder = customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!lastOrder) return false;
    return new Date(lastOrder.created_at) < sixtyDaysAgo;
  });

  // Dormant customers (no purchase in 90+ days)
  const dormantCustomers = Object.entries(customerOrders).filter(([, customerOrders]) => {
    const lastOrder = customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!lastOrder) return false;
    return new Date(lastOrder.created_at) < ninetyDaysAgo;
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
