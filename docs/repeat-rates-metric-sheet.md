# Repeat Purchase Rates Metric Sheet
## Phase 0 Trust Audit — V1 Scope

**Target Page:** `/retention-ltv/repeat-rates`  
**Audit Date:** 2025-01-27  
**Scope:** V1 only (excludes legacy routes, unrelated pages)

---

## 1. KPI Cards Section

### 1.1 Second Purchase Rate
**User-facing label:** "Second Purchase Rate"  
**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (lines 442-476)

**Metric displayed:**
- **Value:** `secondPurchaseRate` (percentage)
- **Format:** "X.X%" (1 decimal place)
- **Location:** Line 474
- **Data source:** API-computed (`app/api/metrics/repeat-purchases/route.ts`)
- **API field:** `data.secondPurchaseRate` (line 42)
- **Calculation location:** API route line 142

**Canonical Definition:**
- **User-facing:** "Percentage of customers who placed at least one additional order after their first purchase."
- **Exact formula:** `(customersReaching[2] / totalCustomers) * 100`
  - Where `customersReaching[2]` = number of customers who reached ≥2 purchases
  - `totalCustomers` = denominator cohort (all customers with ≥1 purchase)
- **Denominator cohort:** All customers who made at least one purchase (first purchase cohorts)
- **Cumulative vs Incremental:** Cumulative ("reached 2+ purchases")
- **Refunds/cancellations handling:** Only `financial_status = 'paid'` orders are counted (per database schema `mv_cohorts`)

**Subtitle:**
- Text: "Customer-weighted, aggregated across all cohorts"
- Location: Line 472
- Meaning: Aggregated across all first-purchase cohorts matching filters

**Status badges:**
- "Good" (green): ≥50% (line 458)
- "Fair" (blue): ≥30% (line 462)
- "Needs Improvement" (red): <30% (line 466)

---

### 1.2 Median Purchases
**User-facing label:** "Median Purchases"  
**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (lines 478-500)

**Metric displayed:**
- **Value:** `medianPurchases` (number)
- **Format:** "X.X" (1 decimal place)
- **Location:** Line 498
- **Data source:** API-computed (`app/api/metrics/repeat-purchases/route.ts`)
- **API field:** `data.medianPurchases` (line 43)
- **Calculation location:** API route lines 146-157 (dummy data generation)

**Canonical Definition:**
- **User-facing:** "The median number of purchases made per customer. This avoids distortion from a small number of very high-frequency buyers."
- **Exact formula:** `MEDIAN(purchase_count per customer)`
  - For each customer: count total purchases (≥1)
  - Calculate median across all customers
- **Denominator cohort:** All customers with ≥1 purchase
- **Refunds/cancellations handling:** Only `financial_status = 'paid'` orders counted

**Subtitle:**
- Text: "Per customer"
- Location: Line 496

---

### 1.3 Customers with ≥3 Purchases
**User-facing label:** "Customers with ≥3 Purchases"  
**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (lines 502-525)

**Metric displayed:**
- **Value:** `customersWith3PlusPurchases` (percentage)
- **Format:** "X.X%" (1 decimal place)
- **Location:** Line 522
- **Data source:** API-computed (`app/api/metrics/repeat-purchases/route.ts`)
- **API field:** `data.customersWith3PlusPurchases` (line 44)
- **Calculation location:** API route line 143

**Canonical Definition:**
- **User-facing:** "Percentage of customers who reached at least their third purchase, indicating early repeat loyalty."
- **Exact formula:** `(customersReaching[3] / totalCustomers) * 100`
  - Where `customersReaching[3]` = number of customers who reached ≥3 purchases
  - `totalCustomers` = denominator cohort
- **Denominator cohort:** All customers with ≥1 purchase
- **Cumulative vs Incremental:** Cumulative ("reached 3+ purchases")
- **Refunds/cancellations handling:** Only `financial_status = 'paid'` orders counted

**Subtitle:**
- Text: "% of original cohort"
- Location: Line 520

---

## 2. Chart Section: Repeat Purchase Depth

**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (lines 527-858)

### 2.1 Chart Data: Purchase Breakdown

**Data source:** API-computed (`app/api/metrics/repeat-purchases/route.ts`)
- **API field:** `data.purchaseBreakdown` (array of `RepeatPurchaseData`)
- **Structure:** Array with 5 elements (purchase counts 1, 2, 3, 4, 5+)

**Each breakdown item contains:**
- `purchaseCount`: number (1, 2, 3, 4, 5)
- `purchaseCountLabel`: string ("1", "2", "3", "4", "5+")
- `customersReaching`: number (count of customers who reached ≥N purchases)
- `percentOfOriginal`: number (percentage of original cohort)
- `dropOffVsPrevious`: number | null (incremental drop-off percentage)

**Calculation locations:**
- API route lines 103-139 (dummy data generation)
- Frontend chart transform: lines 265-285 (`cumulativeChartData`)

### 2.2 Purchase Breakdown Metrics

#### 2.2.1 Customers Reaching (per purchase count)
**Display location:** Table column (line 900), Chart tooltip (line 756)

**Canonical Definition:**
- **Exact formula:** `COUNT(DISTINCT customer_id) WHERE purchase_count >= N`
- **Cumulative:** Yes ("reached ≥N purchases")
- **Denominator:** All customers with ≥1 purchase

#### 2.2.2 % of Original Cohort
**Display location:** Table column (line 903), Chart Y-axis (line 722), Chart tooltip (line 753)

**Canonical Definition:**
- **Exact formula:** `(customersReaching[N] / totalCustomers) * 100`
- **Cumulative:** Yes ("% who reached ≥N purchases")
- **Denominator:** All customers with ≥1 purchase (`totalCustomers`)

#### 2.2.3 Drop-off vs Previous
**Display location:** Table column (line 906)

**Canonical Definition:**
- **Exact formula:** `percentOfOriginal[N-1] - percentOfOriginal[N]`
- **Incremental:** Yes (drop-off from previous purchase level)
- **Example:** If 100% reached 1 purchase and 45% reached 2 purchases, drop-off = 55%
- **Null handling:** `null` for purchase count 1 (no previous level)

### 2.3 Chart Views

#### 2.3.1 Cumulative View (default)
**Toggle location:** Lines 601-611
**Chart data:** `cumulativeChartData` (lines 265-285)

**Canonical Definition:**
- **User-facing:** "Shows the % of customers who reached at least N purchases."
- **Interpretation:** Step-down survival curve (monotonic non-increasing)
- **Chart type:** Line chart with `stepAfter` type (line 781)
- **X-axis:** Purchase count (1, 2, 3, 4, 5+)
- **Y-axis:** Percentage (0-100%)
- **Monotonicity enforcement:** Lines 271-274 (clamps to ensure non-increasing)

**Tooltip content:** Lines 745-759
- Shows: "Reached ≥ N purchases"
- Displays: `rawValue` (original percentage), `customersReaching` count

#### 2.3.2 Incremental View (advanced)
**Toggle location:** Lines 612-622
**Chart data:** `incrementalChartData` (lines 288-338)

**Canonical Definition:**
- **User-facing:** "Shows the % of customers who continue from one purchase to the next."
- **Exact formula:** `(reached[N+1] / reached[N]) * 100`
- **Frontend calculation:** Lines 314-318
- **Interpretation:** Step-to-step continuation rate (can appear healthy on small bases)
- **X-axis:** Purchase count (1, 2, 3, 4) - no 5+ in incremental view
- **Y-axis:** Percentage (0-100%)

**Tooltip content:** Lines 760-775
- Shows: "Continued from N → N+1 purchases"
- Displays: Incremental continuation rate
- Warning: "This is a step-to-step continuation rate, not cumulative."

**Guard rails:** Lines 308-322
- Skips invalid data (null, zero, non-finite)
- Division by zero protection
- Clamps to [0, 100] range

---

## 3. Supporting Table

**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (lines 860-914)

**Table columns:**
1. **Purchase Count** (line 880): `purchaseCountLabel` ("1", "2", "3", "4", "5+")
2. **Customers Reaching** (line 883): `customersReaching` (formatted with `formatNumber`)
3. **% of Original Cohort** (line 886): `percentOfOriginal` (1 decimal place)
4. **Drop-off vs Previous** (line 889): `dropOffVsPrevious` (formatted as "-X.X%" or "–")

**Data source:** Same as chart (`displayData.purchaseBreakdown`)

**Note:** Table always shows cumulative view (line 870), even when chart is in incremental mode.

---

## 4. Inline Insights

**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (lines 343-363, 841-857)

**Insights generated:**
1. **Never placed second order:** `100 - breakdown[1].percentOfOriginal` (line 351)
2. **Reach fourth purchase:** `breakdown[3].percentOfOriginal` (line 355)
3. **Median for 5+ customers:** `medianPurchasesFor5Plus` (if available, line 358)

**Display:** Maximum 2 insights shown (line 362)

---

## 5. Additional Metrics (Not Displayed in UI)

### 5.1 Median Purchases for 5+ Customers
**API field:** `data.medianPurchasesFor5Plus` (nullable)
**Location:** API route lines 159-162
**Usage:** Only shown in insights if available (line 358)

**Canonical Definition:**
- **Exact formula:** `MEDIAN(purchase_count) WHERE purchase_count >= 5`
- **Subset:** Only customers who reached 5+ purchases

### 5.2 Total Customers
**API field:** `data.totalCustomers`
**Location:** API route line 41
**Usage:** Denominator for all percentage calculations

**Canonical Definition:**
- **Exact formula:** `COUNT(DISTINCT customer_id) WHERE purchase_count >= 1`
- **Meaning:** All customers who made at least one purchase (denominator cohort)

---

## 6. API Endpoint Details

**File:** `app/api/metrics/repeat-purchases/route.ts`

### 6.1 Request Parameters
**Filters supported (parsed but not used in current implementation):**
- `dateRange_from`: Start date filter (line 51)
- `dateRange_to`: End date filter (line 52)
- `customerType`: Customer type filter (line 53)
- `segment`: Segment filter (line 54)
- `cohortType`: Cohort type filter (default: 'annual', line 55)

**Note:** All filters are currently ignored - API always returns dummy data (line 59).

### 6.2 Response Structure
```typescript
{
  success: boolean;
  data: {
    purchaseBreakdown: RepeatPurchaseData[];
    totalCustomers: number;
    secondPurchaseRate: number;
    medianPurchases: number;
    customersWith3PlusPurchases: number;
    medianPurchasesFor5Plus: number | null;
    calculated_at: string;
  };
  error?: string;
}
```

### 6.3 Current Implementation Status
- **Data source:** Dummy data only (lines 100-173)
- **Real data:** Not implemented (TODO comment line 50)
- **Error handling:** Always returns 200 with dummy data (lines 42-48, 74-96)

---

## 7. Frontend Fallback Logic

**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (lines 178-261)

### 7.1 Dev Dummy Data Fallback
**Condition:** `isDev && !hasRealData && !loading` (line 181)
**Generation:** Lines 184-258

**Behavior:**
- Only active in development mode (`NODE_ENV !== 'production'`)
- Generated when API returns non-OK or invalid data
- Same structure as API dummy data
- Console warnings logged in dev (lines 103, 115, 125, 144, 150, 164)

### 7.2 Production Error Handling
**Condition:** `NODE_ENV === 'production'` (line 159)
**Behavior:** Shows error UI (lines 395-413) instead of falling back to dummy data

---

## 8. Date Range Semantics

**Current status:** Filters parsed but not applied (API route lines 51-55)

**Expected behavior (when implemented):**
- **Date range filter:** Should filter customers by first purchase date (`first_order_at`)
- **Cohort inclusion:** Only customers whose first purchase falls within date range
- **Period handling:** Not applicable (repeat purchase rates are not time-period-based)

---

## 9. Summary: API-Computed vs Frontend-Computed

### API-Computed Metrics
- `secondPurchaseRate`
- `medianPurchases`
- `customersWith3PlusPurchases`
- `medianPurchasesFor5Plus`
- `purchaseBreakdown` (all fields)
- `totalCustomers`

### Frontend-Computed Metrics
- **Incremental continuation rate:** Calculated in `incrementalChartData` (lines 288-338)
- **Chart monotonicity clamping:** Applied in `cumulativeChartData` (lines 271-274)
- **Insights:** Generated in `insights` memo (lines 343-363)
- **Chart label formatting:** Applied in X-axis formatter (lines 710-714)

---

## 10. Canonical Definitions Summary

### Denominator Cohort
**Definition:** All customers who made at least one purchase (`purchase_count >= 1`)

**Inclusion rules:**
- Customers with ≥1 paid order (`financial_status = 'paid'`)
- Filtered by date range (when implemented) based on `first_order_at`
- Filtered by customer type, segment, geography (when implemented)

### Refunds/Cancellations/Failed Payments Handling
**Current implementation:** Only `financial_status = 'paid'` orders are counted
- **Source:** Database schema (`mv_cohorts` materialized view, line 90 in `006_create_metric_views.sql`)
- **Excluded:** Refunded, cancelled, pending, failed orders
- **Rationale:** Only successful, paid transactions count toward repeat purchase behavior

### Cumulative vs Incremental Rates
**Cumulative (default view):**
- Definition: "% of customers who reached ≥N purchases"
- Formula: `(customersReaching[N] / totalCustomers) * 100`
- Monotonic: Always non-increasing (100% → X% → Y% where Y ≤ X)

**Incremental (advanced view):**
- Definition: "% of customers who continued from N → N+1 purchases"
- Formula: `(customersReaching[N+1] / customersReaching[N]) * 100`
- Not monotonic: Can increase or decrease between steps
- Warning: Can appear deceptively healthy on small bases

### Previous Period Comparison
**Current status:** Not implemented
**Expected behavior (when implemented):**
- Compare current date range vs previous period of equal length
- Calculate same metrics for both periods
- Show delta/change indicators

