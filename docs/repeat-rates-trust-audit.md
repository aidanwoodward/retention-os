# Phase 0 Trust Audit: Repeat Purchase Rates (/retention-ltv/repeat-rates)

**Date**: 2025-01-27  
**Scope**: `/retention-ltv/repeat-rates` page and `/api/metrics/repeat-purchases` endpoint  
**Status**: ⚠️ **Requires fixes before trust**

---

## Executive Summary

The Repeat Purchase Rates page displays cumulative and incremental repeat purchase metrics with clear definitions and solid frontend logic. However, the implementation has critical trust blockers:

1. **API Returns Dummy Data Only**: The API endpoint always returns dummy data regardless of filters, making all metrics untrustworthy for production use.
2. **Silent Fallback to Dummy Data**: In development mode, the frontend silently falls back to dummy data without clear user indication, which can mislead QA/testing.
3. **Filters Not Applied**: All date range, customer type, segment, and geography filters are parsed but ignored, breaking user expectations.
4. **No Period Handling**: Unlike other retention pages, there's no maturity gating or incomplete period handling, which may be intentional but should be documented.

However, the core metric definitions are clear and defensible. The frontend logic for cumulative/incremental views is correct, and the chart transforms are mathematically sound. With fixes to API implementation and fallback transparency, this page can be trusted.

---

## Metric Definitions

### 1. Second Purchase Rate

#### User-Facing Definition
"Percentage of customers who placed at least one additional order after their first purchase."

#### Exact Formula

**API Level** (`app/api/metrics/repeat-purchases/route.ts`):
```typescript
// Currently dummy data (line 142)
secondPurchaseRate = breakdown[1].percentOfOriginal; // 45% in dummy data

// Expected real implementation:
totalCustomers = COUNT(DISTINCT customer_id) WHERE purchase_count >= 1
customersWith2Plus = COUNT(DISTINCT customer_id) WHERE purchase_count >= 2
secondPurchaseRate = (customersWith2Plus / totalCustomers) * 100
```

**Frontend Display** (`RepeatPurchaseRatesContent.tsx`, line 474):
```typescript
displayData.secondPurchaseRate.toFixed(1) + '%'
```

#### Time Window Semantics
- **Not time-period-based**: Unlike retention curves, repeat purchase rates are not measured over time periods
- **Cumulative depth**: Measures "reached N purchases" regardless of when those purchases occurred
- **Lifetime view**: All purchases from first order to present are counted

#### Cohort Inclusion Rules
- **Denominator**: All customers with ≥1 paid purchase
- **Inclusion**: Customers whose first purchase (`first_order_at`) falls within date range filter (when implemented)
- **Order filtering**: Only `financial_status = 'paid'` orders count

#### Maturity Rules
- **No maturity gating**: All customers included regardless of how long ago first purchase occurred
- **No incomplete period handling**: Not applicable (not time-period-based)
- **Potential issue**: Recent customers may not have had time to make repeat purchases, skewing rates downward

---

### 2. Median Purchases

#### User-Facing Definition
"The median number of purchases made per customer. This avoids distortion from a small number of very high-frequency buyers."

#### Exact Formula

**API Level** (currently dummy data, lines 146-157):
```typescript
// Dummy data generation
purchaseDistribution = [1, 1, 2, 2, ..., 5, 6, ...] // per customer
purchaseDistribution.sort((a, b) => a - b)
medianPurchases = purchaseDistribution[Math.floor(purchaseDistribution.length / 2)]

// Expected real implementation:
purchaseCounts = [COUNT(orders) per customer WHERE financial_status = 'paid']
medianPurchases = MEDIAN(purchaseCounts)
```

**Frontend Display** (line 498):
```typescript
displayData.medianPurchases.toFixed(1)
```

#### Time Window Semantics
- **Lifetime view**: Counts all purchases from first order to present
- **Not time-bounded**: No time window restrictions

#### Cohort Inclusion Rules
- Same as Second Purchase Rate (all customers with ≥1 purchase)

---

### 3. Customers with ≥3 Purchases

#### User-Facing Definition
"Percentage of customers who reached at least their third purchase, indicating early repeat loyalty."

#### Exact Formula

**API Level** (currently dummy data, line 143):
```typescript
customersWith3PlusPurchases = breakdown[2].percentOfOriginal; // 25% in dummy data

// Expected real implementation:
customersWith3Plus = COUNT(DISTINCT customer_id) WHERE purchase_count >= 3
customersWith3PlusPurchases = (customersWith3Plus / totalCustomers) * 100
```

**Frontend Display** (line 522):
```typescript
displayData.customersWith3PlusPurchases.toFixed(1) + '%'
```

#### Time Window Semantics
- Same as Second Purchase Rate (lifetime view, not time-bounded)

---

### 4. Purchase Breakdown (1–5+)

#### User-Facing Definition
"Breakdown showing % of customers who reached at least N purchases."

#### Exact Formula

**API Level** (currently dummy data, lines 103-139):
```typescript
// Dummy data structure
breakdown = [
  { purchaseCount: 1, customersReaching: 10000, percentOfOriginal: 100 },
  { purchaseCount: 2, customersReaching: 4500, percentOfOriginal: 45 },
  { purchaseCount: 3, customersReaching: 2500, percentOfOriginal: 25 },
  { purchaseCount: 4, customersReaching: 1500, percentOfOriginal: 15 },
  { purchaseCount: 5, purchaseCountLabel: '5+', customersReaching: 1000, percentOfOriginal: 10 }
]

// Expected real implementation:
for (N in [1, 2, 3, 4, 5+]) {
  customersReaching[N] = COUNT(DISTINCT customer_id) WHERE purchase_count >= N
  percentOfOriginal[N] = (customersReaching[N] / totalCustomers) * 100
  dropOffVsPrevious[N] = N > 1 ? percentOfOriginal[N-1] - percentOfOriginal[N] : null
}
```

**Frontend Transform** (`cumulativeChartData`, lines 265-285):
```typescript
// Monotonicity enforcement for chart display
let previousValue = 100;
return breakdown.map(d => {
  const clampedValue = Math.min(d.percentOfOriginal, previousValue);
  previousValue = clampedValue;
  return {
    purchaseNum: d.purchaseCount,
    value: clampedValue, // Clamped for chart
    rawValue: d.percentOfOriginal // Original for tooltip/table
  };
});
```

#### Cumulative vs Incremental

**Cumulative View (default):**
- Shows "% reached ≥N purchases"
- Monotonic (non-increasing): 100% → 45% → 25% → 15% → 10%
- Chart type: `stepAfter` line chart

**Incremental View (advanced):**
- Shows "% continued from N → N+1"
- Formula: `(reached[N+1] / reached[N]) * 100`
- Not monotonic: Can increase or decrease
- Frontend calculation: Lines 288-338
- Warning displayed: "Advanced view: Use with caution as small populations can appear deceptively healthy."

---

## Trust Blockers / Risks

### 🔴 CRITICAL: API Returns Dummy Data Only

**Severity:** CRITICAL  
**Location:** `app/api/metrics/repeat-purchases/route.ts` (lines 50-59)

**Issue:**
- API always returns dummy data regardless of filters or real data availability
- TODO comment indicates real implementation is pending (line 50)
- All filters are parsed but ignored (lines 51-55)

**Impact:**
- All metrics are untrustworthy for production use
- Users cannot trust any displayed values
- Filters have no effect, breaking user expectations

**Required Fix:**
- Implement real data fetching from database
- Apply date range filter to `first_order_at` (first purchase date)
- Apply customer type, segment, geography filters
- Return 500 error if data fetch fails (instead of dummy data fallback)

**Priority:** P0 (must fix before Phase 0 trust)

---

### 🟡 HIGH: Silent Fallback to Dummy Data in Dev

**Severity:** HIGH  
**Location:** `RepeatPurchaseRatesContent.tsx` (lines 100-172, 178-261)

**Issue:**
- In development mode, API failures silently fall back to dummy data
- Console warnings are logged but no UI indication
- Users/QA may not realize they're viewing dummy data

**Impact:**
- QA/testing may report bugs on dummy data
- Developers may not notice API failures
- Production-like testing is impossible

**Required Fix:**
- Add visual indicator when dummy data is displayed (dev mode only)
- Consider: Banner, badge, or tooltip indicating "Demo Data"
- Keep console warnings for debugging
- Ensure production mode shows error UI instead (already implemented, line 159)

**Priority:** P1 (should fix for Phase 0 trust)

---

### 🟡 HIGH: Filters Not Applied

**Severity:** HIGH  
**Location:** `app/api/metrics/repeat-purchases/route.ts` (lines 51-55)

**Issue:**
- Date range, customer type, segment, cohort type filters are parsed but ignored
- API always returns same dummy data regardless of filter values

**Impact:**
- Users expect filters to work but they don't
- Cannot analyze specific time periods or customer segments
- Breaks user trust in filter functionality

**Required Fix:**
- When implementing real data fetching:
  - Apply `dateRange_from/to` to filter `first_order_at`
  - Apply `customerType` filter
  - Apply `segment` filter
  - Apply `cohortType` filter (if applicable)
- Document filter semantics in API

**Priority:** P1 (must fix when implementing real data)

---

### 🟢 MEDIUM: No Maturity Gating

**Severity:** MEDIUM  
**Location:** Not implemented (intentional design choice)

**Issue:**
- Unlike retention curves, repeat purchase rates don't exclude incomplete cohorts
- Recent customers may not have had time to make repeat purchases
- This can skew rates downward for recent periods

**Impact:**
- Metrics may be misleading for recent cohorts
- No visual indication of data maturity
- Users may not understand why recent periods show lower rates

**Required Fix:**
- Document this design choice (repeat purchase rates are lifetime-based, not period-based)
- Consider adding maturity indicator if filtering by date range
- Add tooltip explaining that recent customers may not have had time for repeat purchases

**Priority:** P2 (documentation/clarity fix)

---

### 🟢 MEDIUM: Chart Monotonicity Clamping

**Severity:** MEDIUM  
**Location:** `RepeatPurchaseRatesContent.tsx` (lines 271-274)

**Issue:**
- Chart values are clamped to ensure monotonicity (non-increasing)
- Original values are preserved in `rawValue` for tooltips/tables
- This is correct behavior but not explicitly documented

**Impact:**
- Chart may show slightly different values than table/tooltip
- Users may notice discrepancy and question data quality
- Clamping hides potential data quality issues (non-monotonic values)

**Required Fix:**
- Add comment explaining why clamping is necessary
- Ensure tooltip shows `rawValue` (already implemented, line 753)
- Consider: Show warning if raw values are non-monotonic (data quality issue)

**Priority:** P2 (documentation/clarity fix)

---

### 🟢 LOW: Incremental View Warning

**Severity:** LOW  
**Location:** `RepeatPurchaseRatesContent.tsx` (lines 552-562, 624-628)

**Issue:**
- Incremental view has warning tooltip and "Advanced" badge
- Warning text is clear but may be missed by users

**Impact:**
- Users may misinterpret incremental rates as cumulative
- Small bases can make incremental rates appear deceptively healthy

**Current Mitigation:**
- Tooltip warning (lines 552-562)
- "Advanced" badge (line 627)
- Italic "(Advanced)" label (line 621)

**Required Fix:**
- Current implementation is acceptable
- Consider: Add inline explanation text below chart when incremental view is active

**Priority:** P3 (nice to have)

---

### 🟢 LOW: No Previous Period Comparison

**Severity:** LOW  
**Location:** Not implemented

**Issue:**
- Unlike revenue cohorts page, repeat purchase rates don't show period-over-period comparison
- Users cannot see if repeat purchase rates are improving/declining

**Impact:**
- Less actionable insights
- Cannot track trends over time

**Required Fix:**
- Not required for Phase 0 trust
- Consider for future enhancement

**Priority:** P3 (future enhancement)

---

## Priority-Ordered Fixes Required for Phase 0 Trust

### P0: Critical Fixes (Must Fix)

1. **Implement Real Data Fetching**
   - File: `app/api/metrics/repeat-purchases/route.ts`
   - Replace dummy data generation with real database query
   - Query customers and orders tables with proper filters
   - Return 500 error if query fails (don't fall back to dummy data)

2. **Apply Filters**
   - File: `app/api/metrics/repeat-purchases/route.ts`
   - Apply `dateRange_from/to` to filter `first_order_at`
   - Apply `customerType`, `segment`, `geography` filters
   - Document filter semantics

### P1: High Priority Fixes (Should Fix)

3. **Add Dev Mode Dummy Data Indicator**
   - File: `RepeatPurchaseRatesContent.tsx`
   - Add visual banner/badge when `useDevDummy` is true
   - Text: "Demo Data - API unavailable" or similar
   - Only show in development mode

4. **Error Handling Consistency**
   - File: `RepeatPurchaseRatesContent.tsx`
   - Ensure production mode always shows error UI (already implemented)
   - Remove silent fallback in production (already implemented)
   - Verify error messages are user-friendly

### P2: Medium Priority Fixes (Documentation/Clarity)

5. **Document Maturity Handling**
   - File: `RepeatPurchaseRatesContent.tsx` or documentation
   - Add tooltip explaining that repeat purchase rates are lifetime-based
   - Note that recent customers may not have had time for repeat purchases
   - Consider maturity indicator if filtering by date range

6. **Document Chart Clamping**
   - File: `RepeatPurchaseRatesContent.tsx`
   - Add comment explaining monotonicity clamping
   - Ensure tooltip always shows `rawValue` (already implemented)

### P3: Nice to Have (Future Enhancements)

7. **Previous Period Comparison**
   - Not required for Phase 0 trust
   - Consider for future enhancement

8. **Incremental View Inline Explanation**
   - Add explanation text below chart when incremental view is active
   - Not critical (warning tooltip exists)

---

## Implementation Notes

### Database Schema Requirements

**Expected query structure:**
```sql
-- Get customers with purchase counts
WITH customer_purchase_counts AS (
  SELECT 
    c.id as customer_id,
    c.first_order_at,
    COUNT(DISTINCT o.id) as purchase_count
  FROM customers c
  INNER JOIN orders o ON c.id = o.customer_id
  WHERE o.financial_status = 'paid'
    AND c.first_order_at BETWEEN :dateRange_from AND :dateRange_to
    -- Apply customerType, segment, geography filters
  GROUP BY c.id, c.first_order_at
)
SELECT 
  purchase_count,
  COUNT(DISTINCT customer_id) as customers_reaching
FROM customer_purchase_counts
GROUP BY purchase_count
ORDER BY purchase_count;
```

**Note:** This is a simplified example. Actual implementation should:
- Handle 5+ grouping
- Calculate median purchases
- Apply all filters correctly
- Handle edge cases (no data, single customer, etc.)

### Frontend Consistency

**Maturity gating pattern (from other audits):**
- Other retention pages use maturity gating to exclude incomplete cohorts
- Repeat purchase rates intentionally don't use this (lifetime-based)
- Document this difference clearly

**Tooltip transparency pattern:**
- Chart tooltips show `rawValue` (original, unclamped)
- Table shows original values
- This is correct and consistent with other pages

---

## Phase 0 Verification Summary

### Current Status: ✅ **TRUSTED AND CLOSED**

**All Required Fixes Completed:**
1. ✅ Real data fetching implemented (no dummy data in production)
2. ✅ V1-compliant filters applied (date range, customer type: new/returning only)
3. ✅ Dev mode dummy data indicator added
4. ✅ Lifetime-based semantics documented
5. ✅ Chart clamping behavior documented

### V1 Filter Policy Compliance

**Supported Filters (Fully Implemented):**
- ✅ **Date Range**: Filters `first_order_at` in database query
- ✅ **Customer Type**: Only `new` and `returning` (VIP/at-risk are outputs, not filters)

**Filters NOT Exposed (Per V1 Policy):**
- ❌ Geography (future - not yet supported)
- ❌ Product Category (future - not yet supported)
- ❌ Customer Segment/VIP/At-risk/RFM (outputs/narratives only, not filters)

**Filter Configuration:**
- Uses dedicated `repeatRatesFilters` config (not `retentionCurvesFilters`)
- Only includes V1-supported filters
- No parsed-but-unused filter logic in API
- No misleading filter UI elements

### Trust Criteria Met

**The page now has:**
- ✅ Clear metric definitions
- ✅ Correct formulas
- ✅ Proper filter application (V1-compliant)
- ✅ Transparent data source (real vs dummy)
- ✅ Adequate tooltips and explanations
- ✅ Lifetime-based semantics clearly documented
- ✅ Chart clamping behavior explained
- ✅ No unsupported filters exposed or implied

### Final Verdict

**Repeat Purchase Rates is Phase 0 trusted and closed.**

All Phase 0 requirements have been met:
- Real production data only (no dummy fallback in production)
- V1 filter policy compliance (only supported filters exposed)
- Clear transparency (lifetime-based, chart clamping, dev mode indicators)
- No misleading filter logic or UI elements

**Date Closed:** 2025-01-27

---

## Appendix: Comparison with Other Retention Pages

### Similarities
- Uses V1-compliant filter configuration (`repeatRatesFilters` - dedicated config)
- Same error handling pattern (production shows error, dev falls back)
- Same chart library (Recharts)
- Same tooltip pattern (shows raw values)

### Differences
- **No maturity gating**: Unlike retention curves, doesn't exclude incomplete cohorts
- **No period-based aggregation**: Lifetime view, not time-period buckets
- **No previous period comparison**: Unlike revenue cohorts
- **Simpler data structure**: Single breakdown array, not cohort-by-cohort
- **V1 filter policy**: Only exposes supported filters (date range, customer type: new/returning)

### Consistency Recommendations
- Use same maturity gating pattern IF we add time-period filtering
- Use same error handling pattern (already consistent)
- Use same tooltip transparency (already consistent)
- Follow V1 filter policy (only expose fully supported filters)

