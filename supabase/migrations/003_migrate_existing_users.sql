-- M1: Migrate existing users to new account-based schema
-- This migration creates accounts for existing users and updates shopify_connections

-- =============================================================================
-- CREATE ACCOUNTS FOR EXISTING USERS
-- =============================================================================

-- Create accounts for all existing users who don't have one
INSERT INTO accounts (user_id, name)
SELECT 
  id as user_id,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name', 
    email
  ) as name
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM accounts)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- UPDATE EXISTING SHOPIFY CONNECTIONS
-- =============================================================================

-- Link existing shopify_connections to their accounts
UPDATE shopify_connections 
SET account_id = a.id
FROM accounts a
WHERE shopify_connections.user_id = a.user_id
  AND shopify_connections.account_id IS NULL;

-- =============================================================================
-- VERIFY MIGRATION
-- =============================================================================

-- Check that all shopify_connections now have account_id
DO $$
DECLARE
  unlinked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unlinked_count 
  FROM shopify_connections 
  WHERE account_id IS NULL;
  
  IF unlinked_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % shopify_connections without account_id', unlinked_count;
  ELSE
    RAISE NOTICE 'Migration successful: All shopify_connections linked to accounts';
  END IF;
END $$;

-- =============================================================================
-- CREATE SAMPLE DATA FOR TESTING (Optional)
-- =============================================================================

-- Only create sample data if no customers exist
DO $$
DECLARE
  customer_count INTEGER;
  account_id UUID;
BEGIN
  -- Check if we have any customers
  SELECT COUNT(*) INTO customer_count FROM customers;
  
  -- If no customers exist, create sample data for the first account
  IF customer_count = 0 THEN
    SELECT id INTO account_id FROM accounts LIMIT 1;
    
    IF account_id IS NOT NULL THEN
      -- Insert sample customers
      INSERT INTO customers (
        account_id, source_id, source_created_at, source_updated_at,
        email_hash, email_salt, first_name, last_name, 
        total_spent, orders_count, first_order_at, last_order_at,
        customer_lifetime_value
      ) VALUES 
      (
        account_id, 1001, NOW() - INTERVAL '365 days', NOW() - INTERVAL '30 days',
        'sample_hash_1', 'sample_salt_1', 'John', 'Doe',
        450.00, 3, NOW() - INTERVAL '365 days', NOW() - INTERVAL '30 days',
        450.00
      ),
      (
        account_id, 1002, NOW() - INTERVAL '200 days', NOW() - INTERVAL '15 days',
        'sample_hash_2', 'sample_salt_2', 'Jane', 'Smith',
        275.50, 2, NOW() - INTERVAL '200 days', NOW() - INTERVAL '15 days',
        275.50
      ),
      (
        account_id, 1003, NOW() - INTERVAL '90 days', NOW() - INTERVAL '7 days',
        'sample_hash_3', 'sample_salt_3', 'Mike', 'Johnson',
        125.00, 1, NOW() - INTERVAL '90 days', NOW() - INTERVAL '7 days',
        125.00
      );
      
      -- Insert sample orders
      INSERT INTO orders (
        account_id, customer_id, source_id, order_number,
        source_created_at, source_updated_at, financial_status,
        subtotal_price, total_price, total_tax, currency
      )
      SELECT 
        c.account_id, c.id, 
        2001 + (row_number() OVER () - 1), -- Unique order IDs
        'ORDER-' || (2001 + (row_number() OVER () - 1))::text,
        c.first_order_at, c.last_order_at, 'paid',
        c.total_spent * 0.9, c.total_spent, c.total_spent * 0.1, 'USD'
      FROM customers c
      WHERE c.account_id = account_id;
      
      RAISE NOTICE 'Sample data created for account %', account_id;
    END IF;
  END IF;
END $$;
