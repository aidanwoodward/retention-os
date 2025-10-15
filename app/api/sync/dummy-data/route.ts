import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServiceDatabaseClient, hashEmail } from "@/lib/database";
import { getAccountId } from "@/lib/database";

interface DummyCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  accepts_marketing: boolean;
  total_spent: number;
  orders_count: number;
  first_order_at: string;
  last_order_at: string;
  customer_lifetime_value: number;
}

interface DummyOrder {
  id: string;
  customer_id: string;
  order_number: string;
  source_created_at: string;
  source_updated_at: string;
  financial_status: string;
  subtotal_price: number;
  total_price: number;
  total_tax: number;
  currency: string;
  customer_email_hash: string;
}

export async function POST() {
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

    // Get account ID for the user
    const accountId = await getAccountId(session.user.id);

    // Create service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceDatabaseClient();

    // Clear existing data first
    console.log("Clearing existing data...");
    await serviceSupabase.from('order_items').delete().like('order_id', '%');
    await serviceSupabase.from('orders').delete().eq('account_id', accountId);
    await serviceSupabase.from('customers').delete().eq('account_id', accountId);

    // Generate realistic dummy data
    const customers = generateDummyCustomers();
    const orders = generateDummyOrders(customers);

    console.log(`Generating ${customers.length} customers and ${orders.length} orders over 4 years...`);

    // Insert customers
    const customerInserts = customers.map(customer => {
      const { hash, salt } = hashEmail(customer.email);
      return {
        account_id: accountId,
        source_id: parseInt(customer.id),
        source_created_at: customer.first_order_at,
        source_updated_at: customer.last_order_at,
        email_hash: hash,
        email_salt: salt,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        accepts_marketing: customer.accepts_marketing,
        total_spent: customer.total_spent,
        orders_count: customer.orders_count,
        first_order_at: customer.first_order_at,
        last_order_at: customer.last_order_at,
        customer_lifetime_value: customer.customer_lifetime_value
      };
    });

    const { data: insertedCustomers, error: customerError } = await serviceSupabase
      .from('customers')
      .insert(customerInserts)
      .select();

    if (customerError) {
      console.error("Customer insert error:", customerError);
      throw new Error(`Failed to insert customers: ${customerError.message}`);
    }

    // Insert orders
    const orderInserts = orders.map(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      const { hash } = hashEmail(customer?.email || '');
      return {
        account_id: accountId,
        customer_id: insertedCustomers?.find(c => c.source_id === parseInt(order.customer_id))?.id,
        source_id: parseInt(order.id),
        order_number: order.order_number,
        source_created_at: order.source_created_at,
        source_updated_at: order.source_updated_at,
        financial_status: order.financial_status,
        subtotal_price: order.subtotal_price,
        total_price: order.total_price,
        total_tax: order.total_tax,
        currency: order.currency,
        customer_email_hash: hash
      };
    });

    const { error: orderError } = await serviceSupabase
      .from('orders')
      .insert(orderInserts)
      .select();

    if (orderError) {
      console.error("Order insert error:", orderError);
      throw new Error(`Failed to insert orders: ${orderError.message}`);
    }

    // Create sync metadata record
    const { data: syncRecord } = await serviceSupabase
      .from('sync_metadata')
      .insert({
        account_id: accountId,
        sync_type: 'dummy_data',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'completed',
        rows_ingested: customers.length + orders.length,
        rows_updated: 0,
        rows_skipped: 0,
        shopify_count: 0,
        local_count: customers.length + orders.length
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      message: "Dummy data generated successfully",
      data: {
        customers: {
          ingested: customers.length,
          updated: 0,
          skipped: 0,
          shopifyCount: 0,
          localCount: customers.length
        },
        orders: {
          ingested: orders.length,
          updated: 0,
          skipped: 0,
          shopifyCount: 0,
          localCount: orders.length
        },
        sync_id: syncRecord?.id
      }
    });

  } catch (error) {
    console.error("Dummy data generation error:", error);
    return NextResponse.json({ 
      error: "Failed to generate dummy data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

function generateDummyCustomers(): DummyCustomer[] {
  const customers: DummyCustomer[] = [];
  const now = new Date();
  const fourYearsAgo = new Date(now.getTime() - (4 * 365 * 24 * 60 * 60 * 1000));
  
  // Generate 500 customers with realistic patterns over 4 years
  for (let i = 1; i <= 500; i++) {
    // First order between 4 years ago and 6 months ago
    const daysAgo = Math.floor(Math.random() * (4 * 365 - 180)); // 4 years minus 6 months
    const firstOrderDate = new Date(fourYearsAgo.getTime() + (daysAgo * 24 * 60 * 60 * 1000));
    
    // Last order between first order and now (but not too recent for some customers)
    const daysSinceFirst = Math.floor(Math.random() * (4 * 365 - daysAgo));
    const lastOrderDate = new Date(firstOrderDate.getTime() + (daysSinceFirst * 24 * 60 * 60 * 1000));
    
    // More realistic order patterns
    const orderCount = Math.floor(Math.random() * 20) + 1; // 1-20 orders
    const avgOrderValue = 30 + Math.random() * 300; // $30-$330
    const totalSpent = orderCount * avgOrderValue;
    
    // Some customers are dormant (last order > 90 days ago)
    const isDormant = Math.random() > 0.7; // 30% chance of being dormant
    const finalLastOrder = isDormant && lastOrderDate > new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
      ? new Date(now.getTime() - (Math.random() * 365 * 24 * 60 * 60 * 1000)) // Random day in last year
      : lastOrderDate;
    
    customers.push({
      id: (1000 + i).toString(),
      email: `customer${i}@example.com`,
      first_name: `Customer${i}`,
      last_name: `Lastname${i}`,
      phone: Math.random() > 0.5 ? `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}` : undefined,
      accepts_marketing: Math.random() > 0.3,
      total_spent: totalSpent,
      orders_count: orderCount,
      first_order_at: firstOrderDate.toISOString(),
      last_order_at: finalLastOrder.toISOString(),
      customer_lifetime_value: totalSpent * (1.1 + Math.random() * 0.3) // 10-40% higher than total spent
    });
  }
  
  return customers;
}

function generateDummyOrders(customers: DummyCustomer[]): DummyOrder[] {
  const orders: DummyOrder[] = [];
  const now = new Date();
  
  customers.forEach(customer => {
    const orderCount = customer.orders_count;
    const firstOrderDate = new Date(customer.first_order_at);
    const lastOrderDate = new Date(customer.last_order_at);
    
    // Generate orders with realistic patterns
    for (let i = 0; i < orderCount; i++) {
      // More realistic order distribution (not linear)
      const progress = i / (orderCount - 1);
      const jitter = (Math.random() - 0.5) * 0.3; // Add some randomness
      const adjustedProgress = Math.max(0, Math.min(1, progress + jitter));
      
      const orderDate = new Date(
        firstOrderDate.getTime() + 
        adjustedProgress * (lastOrderDate.getTime() - firstOrderDate.getTime())
      );
      
      // Seasonal and customer value variations
      const month = orderDate.getMonth();
      const isHolidaySeason = month >= 10 || month <= 1; // Nov-Feb
      const isSummer = month >= 5 && month <= 8; // Jun-Sep
      
      // Base order value with seasonal adjustments
      let baseValue = 40 + Math.random() * 250; // $40-$290
      if (isHolidaySeason) baseValue *= 1.3; // 30% higher during holidays
      if (isSummer) baseValue *= 1.1; // 10% higher in summer
      
      // Customer loyalty discount (repeat customers get better deals)
      if (i > 0) baseValue *= (0.85 + Math.random() * 0.15); // 0-15% discount for repeat
      
      const subtotal = Math.round(baseValue * 100) / 100;
      const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
      const total = Math.round((subtotal + tax) * 100) / 100;
      
      orders.push({
        id: (2000 + orders.length + 1).toString(),
        customer_id: customer.id,
        order_number: `ORDER-${2000 + orders.length + 1}`,
        source_created_at: orderDate.toISOString(),
        source_updated_at: orderDate.toISOString(),
        financial_status: 'paid',
        subtotal_price: subtotal,
        total_price: total,
        total_tax: tax,
        currency: 'USD',
        customer_email_hash: '' // Will be set during insert
      });
    }
  });
  
  // Sort orders by date for better realism
  orders.sort((a, b) => new Date(a.source_created_at).getTime() - new Date(b.source_created_at).getTime());
  
  return orders;
}
