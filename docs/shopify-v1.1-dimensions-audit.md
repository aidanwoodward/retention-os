# Shopify V1.1 Dimensions Availability Audit

**Date:** 2025-01-27  
**Scope:** Read-only audit of Geography and Product Category dimensions  
**Status:** ✅ Audit Complete

---

## Executive Summary

### Geography (Order-Level)
**Status:** ❌ **NOT AVAILABLE**

### Product Category (Line-Item-Level)
**Status:** ❌ **NOT AVAILABLE**

### UI Filters Reality Check
**Status:** ⚠️ **FILTERS EXIST IN UI BUT NOT PARSED IN API**

---

## 1. Geography (Order-Level) Audit

### 1.1 Shopify API Interface
**File:** `lib/shopifyClient.ts`

```typescript
interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  total_price: string;
  financial_status: string;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}
```

**Finding:** ❌ `shipping_address` field is **NOT** included in the interface.

### 1.2 Order Ingestion Code
**File:** `app/api/sync/shopify/route.ts` (lines 244-348)

**Finding:** ❌ The `syncOrders` function does **NOT** extract shipping address data from Shopify orders.

**Order Data Structure Being Saved:**
```typescript
const orderData = {
  account_id: accountId,
  customer_id: customerId,
  source_id: order.id.toString(),
  order_number: order.order_number?.toString() || order.id.toString(),
  source_created_at: order.created_at,
  source_updated_at: order.created_at,
  financial_status: order.financial_status || 'pending',
  subtotal_price: parseFloat(order.total_price || '0') * 0.9,
  total_price: parseFloat(order.total_price || '0'),
  total_tax: parseFloat(order.total_price || '0') * 0.1,
  currency: 'USD',
  customer_email_hash: order.email ? (await hashEmail(order.email)).hash : null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

**Finding:** ❌ No `shipping_country`, `shipping_address.country_code`, or `shipping_address.country` fields are extracted or stored.

### 1.3 Database Schema
**File:** `supabase/migrations/002_create_canonical_schema.sql` (lines 74-104)

**Orders Table Schema:**
```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Shopify source data
  source_id BIGINT NOT NULL,
  order_number TEXT NOT NULL,
  source_created_at TIMESTAMPTZ NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL,
  
  -- Order details
  financial_status TEXT NOT NULL,
  fulfillment_status TEXT,
  
  -- Financial data
  subtotal_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Customer reference (for non-registered customers)
  customer_email_hash TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, source_id)
);
```

**Finding:** ❌ No geography/shipping country column exists in the `orders` table.

### 1.4 Historical Data Availability
**Finding:** ❌ Historical orders **DO NOT** include geography data because:
1. The field was never extracted from Shopify API
2. The field was never stored in the database
3. No migration exists to add this field retroactively

### 1.5 Geography Summary

| Item | Status | Details |
|------|--------|---------|
| Shopify API Interface | ❌ Missing | `shipping_address` not in `ShopifyOrder` interface |
| Order Ingestion | ❌ Missing | `syncOrders` does not extract shipping address |
| Database Column | ❌ Missing | No `shipping_country` or similar column in `orders` table |
| Historical Data | ❌ Missing | No historical geography data available |
| **Overall Availability** | **❌ NOT AVAILABLE** | |

---

## 2. Product Category (Line-Item-Level) Audit

### 2.1 Shopify API Interface
**File:** `lib/shopifyClient.ts`

**Finding:** ❌ No `ShopifyLineItem` interface exists. The `ShopifyOrder` interface does not include `line_items` array.

### 2.2 Line Item Ingestion Code
**File:** `app/api/sync/shopify/route.ts` (line 326-327)

```typescript
// TODO: Sync order items (line items)
// This would be a separate function to sync order_items table
```

**Finding:** ❌ Line items are **NOT** being synced at all. There is a TODO comment indicating this functionality is missing.

### 2.3 Database Schema - Order Items Table
**File:** `supabase/migrations/002_create_canonical_schema.sql` (lines 110-135)

```sql
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
  
  UNIQUE(order_id, source_id)
);
```

**Finding:** ❌ No `product_category`, `product_type`, or `category` column exists in the `order_items` table.

### 2.4 Products Table
**Finding:** ❌ No separate `products` table exists in the schema to store product metadata like category.

### 2.5 Product Category Summary

| Item | Status | Details |
|------|--------|---------|
| Shopify API Interface | ❌ Missing | No `ShopifyLineItem` interface, no `line_items` in `ShopifyOrder` |
| Line Item Ingestion | ❌ Missing | `syncOrders` has TODO comment - line items not synced |
| Database Column | ❌ Missing | No `product_category` or `product_type` in `order_items` table |
| Products Table | ❌ Missing | No separate `products` table exists |
| Historical Data | ❌ Missing | No line items synced = no historical category data |
| **Overall Availability** | **❌ NOT AVAILABLE** | |

---

## 3. Filters Reality Check

### 3.1 Revenue Cohorts Page
**File:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`

**Filter Configuration:** Uses `revenueCohortsFilters` from `lib/filters/config.ts`

**Filters Exposed in UI:**
- ✅ `geography` (checkbox filter)
- ✅ `productCategory` (checkbox filter)
- ✅ `cohortType` (select filter)
- ✅ `dateRange` (date-range filter)
- ✅ `customerSegment` (checkbox filter)
- ✅ `customerType` (checkbox filter)

**API Call:** `fetch('/api/metrics/cohorts?${queryString}')` (line 85)

**API Route:** `app/api/metrics/cohorts/route.ts`

**API Filter Parsing:**
```typescript
const { searchParams } = new URL(request.url);
const limit = parseInt(searchParams.get('limit') || '50');
const cohortMonth = searchParams.get('cohort_month');
```

**Finding:** ⚠️ The API route only parses `limit` and `cohort_month`. It does **NOT** parse `geography` or `productCategory` parameters.

**Conclusion:** Geography and Product Category filters exist in UI but are **IGNORED** by the API.

### 3.2 Retention Curves Page
**File:** `app/(protected)/retention-ltv/curves/page.tsx`

**Filter Configuration:** Uses `retentionCurvesFilters` from `lib/filters/config.ts`

**Filters Exposed in UI:**
- ✅ `geography` (checkbox filter)
- ✅ `productCategory` (checkbox filter)
- ✅ `cohortType` (select filter)
- ✅ `dateRange` (date-range filter)
- ✅ `customerSegment` (checkbox filter)
- ✅ `customerType` (checkbox filter)

**API Call:** `fetch('/api/metrics/cohorts?${queryString}')` (line 119)

**API Route:** `app/api/metrics/cohorts/route.ts` (same as Revenue Cohorts)

**Finding:** ⚠️ Same API route - filters are **IGNORED**.

**Conclusion:** Geography and Product Category filters exist in UI but are **IGNORED** by the API.

### 3.3 LTV Curves Page
**File:** `app/(protected)/retention-ltv/ltv-cohorts/page.tsx`

**Filter Configuration:** Uses `retentionCurvesFilters` from `lib/filters/config.ts` (line 6)

**Filters Exposed in UI:**
- ✅ `geography` (checkbox filter)
- ✅ `productCategory` (checkbox filter)
- ✅ `cohortType` (select filter)
- ✅ `dateRange` (date-range filter)
- ✅ `customerSegment` (checkbox filter)
- ✅ `customerType` (checkbox filter)

**API Call:** `fetch('/api/metrics/cohorts?${queryString}')` (line 152)

**API Route:** `app/api/metrics/cohorts/route.ts` (same as Revenue Cohorts)

**Finding:** ⚠️ Same API route - filters are **IGNORED**.

**Conclusion:** Geography and Product Category filters exist in UI but are **IGNORED** by the API.

### 3.4 Filters Summary

| Page | Geography Filter | Product Category Filter | API Parses Filters? |
|------|------------------|------------------------|---------------------|
| Revenue Cohorts | ✅ Exists in UI | ✅ Exists in UI | ❌ No - Only parses `limit` and `cohort_month` |
| Retention Curves | ✅ Exists in UI | ✅ Exists in UI | ❌ No - Only parses `limit` and `cohort_month` |
| LTV Curves | ✅ Exists in UI | ✅ Exists in UI | ❌ No - Only parses `limit` and `cohort_month` |

---

## 4. Blockers Summary

### 4.1 Geography Blocker
**Blocker:** Geography dimension is **completely missing** from the ingestion pipeline.

**Required Changes (for future implementation):**
1. Add `shipping_address` to `ShopifyOrder` interface in `lib/shopifyClient.ts`
2. Extract `shipping_address.country_code` or `shipping_address.country` in `syncOrders` function
3. Add `shipping_country` column to `orders` table (migration required)
4. Update `orderData` object to include shipping country
5. Backfill historical orders (if Shopify API supports historical shipping addresses)

### 4.2 Product Category Blocker
**Blocker:** Product category dimension is **completely missing** because:
1. Line items are not being synced at all
2. No product category field exists in schema

**Required Changes (for future implementation):**
1. Add `line_items` array to `ShopifyOrder` interface
2. Create `ShopifyLineItem` interface with `product_type` or `product.category` field
3. Implement `syncOrderItems` function to sync line items
4. Add `product_category` or `product_type` column to `order_items` table (migration required)
5. Extract product category from Shopify line items during sync
6. Backfill historical line items (if Shopify API supports historical line items)

---

## 5. Final Answers

### 5.1 Is Geography Available Today?
**Answer:** ❌ **NO**

**Details:**
- Not extracted from Shopify API
- Not stored in database
- Not available in historical orders
- Filter exists in UI but is ignored by API

### 5.2 Is Product Category Available Today?
**Answer:** ❌ **NO**

**Details:**
- Line items are not synced at all
- No product category field in schema
- Not available in historical data
- Filter exists in UI but is ignored by API

### 5.3 List of Blockers

**Geography Blockers:**
1. ❌ `shipping_address` not in `ShopifyOrder` interface
2. ❌ `syncOrders` does not extract shipping address
3. ❌ No `shipping_country` column in `orders` table
4. ❌ No historical geography data available

**Product Category Blockers:**
1. ❌ Line items not synced (TODO comment in code)
2. ❌ No `line_items` in `ShopifyOrder` interface
3. ❌ No `product_category` or `product_type` column in `order_items` table
4. ❌ No products table for category lookup
5. ❌ No historical line item data available

---

## 6. Recommendations

### 6.1 Immediate Actions (No Schema Changes)
1. ✅ **Documentation:** This audit document serves as the documentation
2. ⚠️ **UI Consideration:** Consider hiding or disabling Geography and Product Category filters until data is available, OR clearly label them as "Coming Soon"

### 6.2 Future Implementation (V1.1)
1. **Geography:** Follow the blockers list above to implement geography support
2. **Product Category:** Follow the blockers list above to implement product category support
3. **Filter Integration:** Update API routes to parse and apply filters once data is available

---

## Appendix: Code References

### Key Files Reviewed
- `lib/shopifyClient.ts` - Shopify API client and interfaces
- `app/api/sync/shopify/route.ts` - Order ingestion logic
- `supabase/migrations/002_create_canonical_schema.sql` - Database schema
- `lib/filters/config.ts` - Filter configurations
- `app/api/metrics/cohorts/route.ts` - Cohorts API endpoint
- `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` - Revenue Cohorts page
- `app/(protected)/retention-ltv/curves/page.tsx` - Retention Curves page
- `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` - LTV Curves page

---

**Audit Completed:** 2025-01-27  
**Next Steps:** Review blockers and plan V1.1 implementation


