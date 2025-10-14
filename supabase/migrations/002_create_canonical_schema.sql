-- M1: Canonical Data Layer Schema for Retention OS
-- This creates the foundational tables for multi-tenant Shopify data storage

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ACCOUNTS TABLE
-- =============================================================================
-- Represents tenant accounts (each user can have multiple Shopify stores)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one account per user for now (can be extended later)
  UNIQUE(user_id)
);

-- =============================================================================
-- SHOPIFY CONNECTIONS (Enhanced from existing)
-- =============================================================================
-- Enhanced version of existing shopify_connections with account relationship
ALTER TABLE shopify_connections 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_connections_account_id ON shopify_connections(account_id);

-- =============================================================================
-- CUSTOMERS TABLE
-- =============================================================================
-- Canonical customer data from Shopify with PII protection
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Shopify source data
  source_id BIGINT NOT NULL, -- Shopify customer ID
  source_created_at TIMESTAMPTZ NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL,
  
  -- PII Protection: Store email hash instead of raw email
  email_hash TEXT NOT NULL, -- SHA256(email + salt)
  email_salt TEXT NOT NULL, -- Random salt per customer
  
  -- Safe customer data (non-PII)
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  accepts_marketing BOOLEAN DEFAULT false,
  total_spent NUMERIC(10,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  
  -- Retention analytics fields
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  customer_lifetime_value NUMERIC(10,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique customers per account
  UNIQUE(account_id, source_id)
);

-- =============================================================================
-- ORDERS TABLE
-- =============================================================================
-- Canonical order data from Shopify
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Shopify source data
  source_id BIGINT NOT NULL, -- Shopify order ID
  order_number TEXT NOT NULL,
  source_created_at TIMESTAMPTZ NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL,
  
  -- Order details
  financial_status TEXT NOT NULL, -- paid, pending, refunded, etc.
  fulfillment_status TEXT, -- fulfilled, partial, unfulfilled, etc.
  
  -- Financial data
  subtotal_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Customer reference (for non-registered customers)
  customer_email_hash TEXT, -- For guest orders
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique orders per account
  UNIQUE(account_id, source_id)
);

-- =============================================================================
-- ORDER ITEMS TABLE
-- =============================================================================
-- Individual line items within orders
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Shopify source data
  source_id BIGINT NOT NULL, -- Shopify line item ID
  
  -- Product details
  product_id BIGINT, -- Shopify product ID
  variant_id BIGINT, -- Shopify variant ID
  title TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,
  
  -- Quantities and pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(10,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique items per order
  UNIQUE(order_id, source_id)
);

-- =============================================================================
-- SYNC METADATA TABLE
-- =============================================================================
-- Track ingestion pipeline health and sync status
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type TEXT NOT NULL, -- 'customers', 'orders', 'full'
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  
  -- Statistics
  rows_ingested INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Reconciliation data
  shopify_count INTEGER, -- Count from Shopify API
  local_count INTEGER, -- Count in our database
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_account_id ON customers(account_id);
CREATE INDEX IF NOT EXISTS idx_customers_source_id ON customers(source_id);
CREATE INDEX IF NOT EXISTS idx_customers_email_hash ON customers(email_hash);
CREATE INDEX IF NOT EXISTS idx_customers_first_order_at ON customers(first_order_at);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_at ON customers(last_order_at);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_account_id ON orders(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_source_id ON orders(source_id);
CREATE INDEX IF NOT EXISTS idx_orders_source_created_at ON orders(source_created_at);
CREATE INDEX IF NOT EXISTS idx_orders_financial_status ON orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_orders_total_price ON orders(total_price);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Sync metadata indexes
CREATE INDEX IF NOT EXISTS idx_sync_metadata_account_id ON sync_metadata(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_started_at ON sync_metadata(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_status ON sync_metadata(status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own account data

-- Accounts policy
CREATE POLICY "Users can manage their own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- Customers policy  
CREATE POLICY "Users can access customers from their accounts" ON customers
  FOR ALL USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- Orders policy
CREATE POLICY "Users can access orders from their accounts" ON orders
  FOR ALL USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- Order items policy
CREATE POLICY "Users can access order items from their accounts" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM orders o 
      JOIN accounts a ON o.account_id = a.id 
      WHERE a.user_id = auth.uid()
    )
  );

-- Sync metadata policy
CREATE POLICY "Users can access sync metadata from their accounts" ON sync_metadata
  FOR ALL USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_accounts_updated_at 
  BEFORE UPDATE ON accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at 
  BEFORE UPDATE ON order_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_metadata_updated_at 
  BEFORE UPDATE ON sync_metadata 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to hash email with salt (returns composite type)
CREATE OR REPLACE FUNCTION hash_email(email TEXT)
RETURNS TABLE(hash TEXT, salt TEXT) AS $$
DECLARE
  random_salt TEXT;
  email_hash TEXT;
BEGIN
  -- Generate random salt
  random_salt := encode(gen_random_bytes(16), 'hex');
  
  -- Hash email + salt
  email_hash := encode(digest(email || random_salt, 'sha256'), 'hex');
  
  RETURN QUERY SELECT email_hash, random_salt;
END;
$$ LANGUAGE plpgsql;

-- Function to verify email hash
CREATE OR REPLACE FUNCTION verify_email_hash(email TEXT, stored_hash TEXT, stored_salt TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  computed_hash TEXT;
BEGIN
  computed_hash := encode(digest(email || stored_salt, 'sha256'), 'hex');
  RETURN computed_hash = stored_hash;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE accounts IS 'Tenant accounts for multi-store support';
COMMENT ON TABLE customers IS 'Canonical customer data with PII protection via email hashing';
COMMENT ON TABLE orders IS 'Canonical order data from Shopify';
COMMENT ON TABLE order_items IS 'Individual line items within orders';
COMMENT ON TABLE sync_metadata IS 'Track ingestion pipeline health and sync statistics';

COMMENT ON COLUMN customers.email_hash IS 'SHA256 hash of email + salt for PII protection';
COMMENT ON COLUMN customers.email_salt IS 'Random salt used for email hashing';
COMMENT ON COLUMN orders.customer_email_hash IS 'Email hash for guest orders without customer records';
