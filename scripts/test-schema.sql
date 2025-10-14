-- Test script for the canonical schema
-- Run this in Supabase SQL Editor to validate the schema

-- =============================================================================
-- VERIFY SCHEMA CREATION
-- =============================================================================

-- Check that all tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('accounts', 'customers', 'orders', 'order_items', 'sync_metadata')
ORDER BY table_name;

-- =============================================================================
-- VERIFY RLS POLICIES
-- =============================================================================

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('accounts', 'customers', 'orders', 'order_items', 'sync_metadata');

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('accounts', 'customers', 'orders', 'order_items', 'sync_metadata')
ORDER BY tablename, policyname;

-- =============================================================================
-- VERIFY INDEXES
-- =============================================================================

-- Check indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('accounts', 'customers', 'orders', 'order_items', 'sync_metadata')
ORDER BY tablename, indexname;

-- =============================================================================
-- TEST PII FUNCTIONS
-- =============================================================================

-- Test email hashing function
SELECT 
  'test@example.com' as email,
  hash_email('test@example.com') as hash_result;

-- Test email verification function
WITH test_hash AS (
  SELECT hash_email('test@example.com') as hash_data
)
SELECT 
  verify_email_hash(
    'test@example.com', 
    (hash_data).hash, 
    (hash_data).salt
  ) as is_valid
FROM test_hash;

-- =============================================================================
-- TEST SAMPLE DATA (if created)
-- =============================================================================

-- Check if sample data exists
SELECT 
  'accounts' as table_name,
  COUNT(*) as row_count
FROM accounts
UNION ALL
SELECT 
  'customers' as table_name,
  COUNT(*) as row_count
FROM customers
UNION ALL
SELECT 
  'orders' as table_name,
  COUNT(*) as row_count
FROM orders
UNION ALL
SELECT 
  'order_items' as table_name,
  COUNT(*) as row_count
FROM order_items;

-- =============================================================================
-- VERIFY FOREIGN KEY RELATIONSHIPS
-- =============================================================================

-- Check foreign key constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('accounts', 'customers', 'orders', 'order_items', 'sync_metadata')
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================================================
-- PERFORMANCE CHECK
-- =============================================================================

-- Check table sizes (should be small for new schema)
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('accounts', 'customers', 'orders', 'order_items', 'sync_metadata')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
