/**
 * Database utilities for the canonical data layer
 * Provides type-safe access to the new schema
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface Account {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  account_id: string;
  source_id: number;
  source_created_at: string;
  source_updated_at: string;
  email_hash: string;
  email_salt: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  accepts_marketing: boolean;
  total_spent: number;
  orders_count: number;
  first_order_at?: string;
  last_order_at?: string;
  customer_lifetime_value: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  account_id: string;
  customer_id?: string;
  source_id: number;
  order_number: string;
  source_created_at: string;
  source_updated_at: string;
  financial_status: string;
  fulfillment_status?: string;
  subtotal_price: number;
  total_price: number;
  total_tax: number;
  currency: string;
  customer_email_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  source_id: number;
  product_id?: number;
  variant_id?: number;
  title: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  price: number;
  total_discount: number;
  created_at: string;
  updated_at: string;
}

export interface SyncMetadata {
  id: string;
  account_id: string;
  sync_type: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  rows_ingested: number;
  rows_updated: number;
  rows_skipped: number;
  error_message?: string;
  shopify_count?: number;
  local_count?: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PII PROTECTION UTILITIES
// =============================================================================

/**
 * Hash an email with a random salt for PII protection
 */
export function hashEmail(email: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(email + salt).digest('hex');
  return { hash, salt };
}

/**
 * Verify an email against a stored hash and salt
 */
export function verifyEmailHash(email: string, storedHash: string, storedSalt: string): boolean {
  const computedHash = crypto.createHash('sha256').update(email + storedSalt).digest('hex');
  return computedHash === storedHash;
}

// =============================================================================
// DATABASE CLIENT
// =============================================================================

/**
 * Create a database client for the canonical schema
 */
export function createDatabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Create a database client with service role key (bypasses RLS)
 * Use this for server-side operations that need to create accounts
 */
export function createServiceDatabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get or create an account for a user
 */
export async function getOrCreateAccount(userId: string, name?: string): Promise<Account> {
  const supabase = createServiceDatabaseClient();
  
  // Try to get existing account
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (existingAccount) {
    return existingAccount;
  }
  
  // Create new account
  const { data: newAccount, error } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: name || 'My Account'
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create account: ${error.message}`);
  }
  
  return newAccount;
}

/**
 * Get customers for an account with pagination
 */
export async function getCustomers(
  accountId: string, 
  limit = 50, 
  offset = 0
): Promise<{ data: Customer[]; count: number }> {
  const supabase = createDatabaseClient();
  
  const { data, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }
  
  return { data: data || [], count: count || 0 };
}

/**
 * Get orders for an account with pagination
 */
export async function getOrders(
  accountId: string,
  limit = 50,
  offset = 0
): Promise<{ data: Order[]; count: number }> {
  const supabase = createDatabaseClient();
  
  const { data, error, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('source_created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }
  
  return { data: data || [], count: count || 0 };
}

/**
 * Get sync metadata for an account
 */
export async function getSyncMetadata(
  accountId: string,
  limit = 10
): Promise<SyncMetadata[]> {
  const supabase = createDatabaseClient();
  
  const { data, error } = await supabase
    .from('sync_metadata')
    .select('*')
    .eq('account_id', accountId)
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch sync metadata: ${error.message}`);
  }
  
  return data || [];
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate that a user has access to an account
 */
export async function validateAccountAccess(userId: string, accountId: string): Promise<boolean> {
  const supabase = createDatabaseClient();
  
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();
  
  return !error && !!data;
}

/**
 * Get account ID for a user
 */
export async function getAccountId(userId: string): Promise<string> {
  const account = await getOrCreateAccount(userId);
  return account.id;
}
