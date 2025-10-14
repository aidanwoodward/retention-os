import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createShopifyClient } from "@/lib/shopifyClient";
import { hashEmail, getAccountId } from "@/lib/database";

export async function POST(request: NextRequest) {
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

    // Start sync metadata record
    const { data: syncRecord } = await supabase
      .from('sync_metadata')
      .insert({
        account_id: accountId,
        sync_type: 'full',
        started_at: new Date().toISOString(),
        status: 'running'
      })
      .select()
      .single();

    if (!syncRecord) {
      throw new Error("Failed to create sync metadata record");
    }

    console.log(`Starting Shopify sync for account ${accountId}`);

    // Create Shopify client
    const shopify = await createShopifyClient(session.user.id, supabase);
    if (!shopify) {
      await updateSyncStatus(supabase, syncRecord.id, 'failed', 'Failed to create Shopify client');
      return NextResponse.json({ error: "Failed to create Shopify client" }, { status: 500 });
    }

    // Sync customers
    const customersResult = await syncCustomers(supabase, shopify, accountId);
    console.log(`Customers sync: ${customersResult.ingested} ingested, ${customersResult.updated} updated, ${customersResult.skipped} skipped`);

    // Sync orders
    const ordersResult = await syncOrders(supabase, shopify, accountId);
    console.log(`Orders sync: ${ordersResult.ingested} ingested, ${ordersResult.updated} updated, ${ordersResult.skipped} skipped`);

    // Complete sync metadata
    await supabase
      .from('sync_metadata')
      .update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        rows_ingested: customersResult.ingested + ordersResult.ingested,
        rows_updated: customersResult.updated + ordersResult.updated,
        rows_skipped: customersResult.skipped + ordersResult.skipped,
        shopify_count: customersResult.shopifyCount + ordersResult.shopifyCount,
        local_count: customersResult.localCount + ordersResult.localCount
      })
      .eq('id', syncRecord.id);

    return NextResponse.json({
      success: true,
      message: "Shopify sync completed successfully",
      data: {
        customers: customersResult,
        orders: ordersResult,
        sync_id: syncRecord.id
      }
    });

  } catch (error) {
    console.error("Shopify sync error:", error);
    return NextResponse.json({ 
      error: "Failed to sync Shopify data", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

async function updateSyncStatus(supabase: any, syncId: string, status: string, errorMessage?: string) {
  await supabase
    .from('sync_metadata')
    .update({
      completed_at: new Date().toISOString(),
      status,
      error_message: errorMessage
    })
    .eq('id', syncId);
}

async function syncCustomers(supabase: any, shopify: any, accountId: string) {
  console.log("Syncing customers...");
  
  let allCustomers: any[] = [];
  let hasNext = true;
  let cursor = null;

  // Fetch all customers with pagination
  while (hasNext) {
    const params: any = { limit: 250 };
    if (cursor) params.after = cursor;

    const response = await shopify.customers.list(params);
    const customers = response.customers || [];
    
    allCustomers.push(...customers);
    hasNext = response.pageInfo?.hasNextPage || false;
    cursor = response.pageInfo?.endCursor || null;

    console.log(`Fetched ${customers.length} customers, total: ${allCustomers.length}`);
  }

  console.log(`Total customers from Shopify: ${allCustomers.length}`);

  // Process customers
  let ingested = 0;
  let updated = 0;
  let skipped = 0;

  for (const customer of allCustomers) {
    try {
      // Hash email for PII protection
      const { hash: emailHash, salt: emailSalt } = hashEmail(customer.email || '');

      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, source_updated_at')
        .eq('account_id', accountId)
        .eq('source_id', customer.id)
        .single();

      const customerData = {
        account_id: accountId,
        source_id: customer.id,
        source_created_at: customer.created_at,
        source_updated_at: customer.updated_at,
        email_hash: emailHash,
        email_salt: emailSalt,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        accepts_marketing: customer.accepts_marketing || false,
        total_spent: parseFloat(customer.total_spent || '0'),
        orders_count: parseInt(customer.orders_count || '0'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingCustomer) {
        // Check if update is needed
        const existingUpdated = new Date(existingCustomer.source_updated_at);
        const newUpdated = new Date(customer.updated_at);
        
        if (newUpdated > existingUpdated) {
          await supabase
            .from('customers')
            .update(customerData)
            .eq('id', existingCustomer.id);
          updated++;
        } else {
          skipped++;
        }
      } else {
        await supabase
          .from('customers')
          .insert(customerData);
        ingested++;
      }
    } catch (error) {
      console.error(`Error processing customer ${customer.id}:`, error);
      skipped++;
    }
  }

  // Get local count
  const { count: localCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId);

  return {
    ingested,
    updated,
    skipped,
    shopifyCount: allCustomers.length,
    localCount: localCount || 0
  };
}

async function syncOrders(supabase: any, shopify: any, accountId: string) {
  console.log("Syncing orders...");
  
  let allOrders: any[] = [];
  let hasNext = true;
  let cursor = null;

  // Fetch all orders with pagination
  while (hasNext) {
    const params: any = { 
      limit: 250,
      status: 'any' // Get all orders regardless of status
    };
    if (cursor) params.after = cursor;

    const response = await shopify.orders.list(params);
    const orders = response.orders || [];
    
    allOrders.push(...orders);
    hasNext = response.pageInfo?.hasNextPage || false;
    cursor = response.pageInfo?.endCursor || null;

    console.log(`Fetched ${orders.length} orders, total: ${allOrders.length}`);
  }

  console.log(`Total orders from Shopify: ${allOrders.length}`);

  // Process orders
  let ingested = 0;
  let updated = 0;
  let skipped = 0;

  for (const order of allOrders) {
    try {
      // Find customer if exists
      let customerId = null;
      if (order.customer && order.customer.id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('account_id', accountId)
          .eq('source_id', order.customer.id)
          .single();
        customerId = customer?.id || null;
      }

      // Check if order exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, source_updated_at')
        .eq('account_id', accountId)
        .eq('source_id', order.id)
        .single();

      const orderData = {
        account_id: accountId,
        customer_id: customerId,
        source_id: order.id,
        order_number: order.order_number || order.name,
        source_created_at: order.created_at,
        source_updated_at: order.updated_at,
        financial_status: order.financial_status || 'pending',
        fulfillment_status: order.fulfillment_status,
        subtotal_price: parseFloat(order.subtotal_price || '0'),
        total_price: parseFloat(order.total_price || '0'),
        total_tax: parseFloat(order.total_tax || '0'),
        currency: order.currency || 'USD',
        customer_email_hash: order.email ? hashEmail(order.email).hash : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingOrder) {
        // Check if update is needed
        const existingUpdated = new Date(existingOrder.source_updated_at);
        const newUpdated = new Date(order.updated_at);
        
        if (newUpdated > existingUpdated) {
          await supabase
            .from('orders')
            .update(orderData)
            .eq('id', existingOrder.id);
          updated++;
        } else {
          skipped++;
        }
      } else {
        await supabase
          .from('orders')
          .insert(orderData);
        ingested++;
      }

      // TODO: Sync order items (line items)
      // This would be a separate function to sync order_items table

    } catch (error) {
      console.error(`Error processing order ${order.id}:`, error);
      skipped++;
    }
  }

  // Get local count
  const { count: localCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId);

  return {
    ingested,
    updated,
    skipped,
    shopifyCount: allOrders.length,
    localCount: localCount || 0
  };
}
