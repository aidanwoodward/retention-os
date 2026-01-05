# Phase 0 Trust Audit: Retention Curves (/retention-ltv/curves)

**Date**: 2025-01-27  
**Scope**: `/retention-ltv/curves` page and `/api/metrics/cohorts` endpoint  
**Status**: ⚠️ **Requires fixes before trust**

---

## Executive Summary

The Retention Curves page displays cohort-based retention metrics with two critical issues:

1. **Aggregation Method Mismatch**: The aggregated view uses a different retention calculation than individual cohorts, creating potential confusion.
2. **Incomplete Cohort Handling**: Incomplete cohorts are included in aggregations without clear visual indication, which can skew results.

However, the core definitions are clear and defensible. With fixes to aggregation transparency and maturity handling, this page can be trusted.

---

## Metric Definitions

### 1. Retention Rate by Period

#### User-Facing Definition
**Aggregated View**: "Percentage of customers from all cohorts who were active in Period 0 and remain active in Period N."

**Individual Cohort View**: "Percentage of customers from this cohort who were active in Period 0 and remain active in Period N."

#### Exact Formula

**Database Level** (`mv_cohorts`):
```sql
retention_rate_percent = (COUNT(DISTINCT customer_id) * 100.0) / cohort_size
WHERE customer_id IN (
  SELECT customer_id 
  FROM orders 
  WHERE order_month = period_month 
  AND financial_status = 'paid'
)
```

**Aggregated View** (Frontend):
```javascript
period0_activeCustomers = SUM(active_customers) for period_number = 0 across all cohorts
periodN_activeCustomers = SUM(active_customers) for period_number = N across all cohorts
retentionRate = (periodN_activeCustomers / period0_activeCustomers) * 100
```

**Individual Cohort View** (Frontend):
```javascript
// Uses retention_rate_percent from database directly, OR:
period0_activeCustomers = active_customers for period_number = 0 for this cohort
periodN_activeCustomers = active_customers for period_number = N for this cohort
retentionRate = (periodN_activeCustomers / period0_activeCustomers) * 100
```

#### Time Window Semantics
- **Period**: Discrete time buckets (monthly, quarterly, half-yearly, or annual)
- **Period 0**: The acquisition period (first purchase month/quarter/year)
- **Period N**: N periods after acquisition
- **NOT Cumulative**: Each period measures activity in that specific period only

#### Cohort Inclusion Rules
- Cohorts are defined by `cohort_month` (first purchase month)
- Only customers with `financial_status = 'paid'` orders are included
- All cohorts matching the date range filter are included in aggregation

#### Maturity Rules
- **maxPossiblePeriod**: Calculated based on oldest cohort's age from current date
- **Incomplete Cohorts**: Included in aggregation, but missing periods show 0% retention
- **No Visual Indication**: Incomplete cohorts are not visually distinguished from complete cohorts in aggregated view
- **Data Gaps**: Periods with 0% retention followed by non-zero retention are marked as `isDataGap` in individual cohort view, but not in aggregated view

#### Aggregation Method Across Cohorts
- **Method**: Sum-based aggregation (NOT weighted average)
- **Process**:
  1. Sum `active_customers` across all cohorts for each period
  2. Sum `total_revenue` across all cohorts for each period
  3. Calculate retention as ratio to Period 0 totals
- **Weighting**: Implicitly weighted by cohort size (larger cohorts contribute more customers)
- **Issue**: This is NOT a simple average of retention percentages, but a ratio of aggregated counts

---

### 2. Cohort Size

#### User-Facing Definition
"Total number of customers who made their first purchase in this cohort period."

#### Exact Formula
```sql
cohort_size = COUNT(DISTINCT customer_id)
WHERE first_order_at BETWEEN cohort_month_start AND cohort_month_end
AND EXISTS (SELECT 1 FROM orders WHERE customer_id = c.id AND financial_status = 'paid')
```

**Aggregated View**:
```javascript
totalCohortSize = SUM(cohort_size) for all cohorts in filtered set
```

#### Time Window Semantics
- **Period**: Single acquisition period (month/quarter/half-year/year)
- **NOT Cumulative**: Represents only the customers acquired in that specific period

#### Cohort Inclusion Rules
- Only customers with at least one paid order are included
- Customers are assigned to the cohort based on their `first_order_at` date

#### Maturity Rules
- Cohort size is fixed at acquisition and does not change over time
- All cohorts are included regardless of maturity

#### Aggregation Method
- Simple sum across all cohorts in the filtered set

---

### 3. Active Customers

#### User-Facing Definition
"Number of distinct customers from the cohort who placed at least one paid order in this period."

#### Exact Formula
```sql
active_customers = COUNT(DISTINCT customer_id)
WHERE customer_id IN (
  SELECT customer_id 
  FROM orders 
  WHERE order_month = period_month 
  AND financial_status = 'paid'
)
AND customer_id IN (
  SELECT customer_id 
  FROM customers 
  WHERE cohort_month = target_cohort_month
)
```

**Aggregated View**:
```javascript
activeCustomers = SUM(active_customers) across all cohorts for period N
```

#### Time Window Semantics
- **Period**: Discrete time bucket (month/quarter/half-year/year)
- **NOT Cumulative**: Counts only customers active in that specific period
- **Activity Definition**: ≥1 paid order in the period

#### Cohort Inclusion Rules
- Only customers who were part of the cohort at Period 0
- Only orders with `financial_status = 'paid'` are counted

#### Maturity Rules
- Incomplete cohorts may have 0 active customers for future periods
- Missing periods show 0 active customers in aggregated view

#### Aggregation Method
- Simple sum across all cohorts for each period

---

### 4. Orders

#### User-Facing Definition
"Total number of paid orders placed by cohort customers in this period."

#### Exact Formula
```sql
total_orders = SUM(orders_in_month)
WHERE customer_id IN cohort
AND order_month = period_month
AND financial_status = 'paid'
```

**Aggregated View**:
```javascript
totalOrders = SUM(total_orders) across all cohorts for period N
```

#### Time Window Semantics
- **Period**: Discrete time bucket
- **NOT Cumulative**: Counts only orders placed in that specific period

#### Cohort Inclusion Rules
- Only orders from customers in the cohort
- Only paid orders are included

#### Maturity Rules
- Incomplete cohorts may have 0 orders for future periods

#### Aggregation Method
- Simple sum across all cohorts for each period

---

### 5. Revenue

#### User-Facing Definition
"Total revenue from paid orders placed by cohort customers in this period."

#### Exact Formula
```sql
total_revenue = SUM(total_price)
WHERE customer_id IN cohort
AND order_month = period_month
AND financial_status = 'paid'
```

**Aggregated View**:
```javascript
revenue = SUM(total_revenue) across all cohorts for period N
revenueRetention = (revenue_periodN / revenue_period0) * 100
```

#### Time Window Semantics
- **Period**: Discrete time bucket
- **NOT Cumulative**: Sums only revenue from that specific period

#### Cohort Inclusion Rules
- Only revenue from customers in the cohort
- Only paid orders are included

#### Maturity Rules
- Incomplete cohorts may have $0 revenue for future periods

#### Aggregation Method
- Simple sum across all cohorts for each period

---

## Critical Questions Answered

### Q1: Is retention defined as survival since acquisition, activity in a given period, or something else?

**Answer**: **Activity in a given period** (period-based retention).

- Retention measures whether customers are **active** (placed ≥1 paid order) in Period N
- It is **NOT** cumulative survival (e.g., "still active since acquisition")
- It is **NOT** "ever returned" (customers can churn and reactivate)
- Each period is independent: a customer active in Period 1 but not Period 2, then active again in Period 3, will show as:
  - Period 1: Active (counted)
  - Period 2: Inactive (not counted)
  - Period 3: Active (counted)

**Defensibility**: ✅ **Clear and defensible**. This is a standard cohort retention definition.

---

### Q2: When aggregating across cohorts, are we weighting by cohort size or averaging percentages equally?

**Answer**: **Implicitly weighted by cohort size** (sum-based aggregation).

**Method**:
1. Sums `active_customers` across all cohorts for each period
2. Calculates retention as: `(sum_active_customers_periodN / sum_active_customers_period0) * 100`

**This is NOT**:
- Simple average: `AVG(retention_rate_percent)` across cohorts
- Weighted average: `SUM(cohort_size * retention_rate) / SUM(cohort_size)`

**Example**:
- Cohort A: 100 customers, 50% retention → 50 active customers
- Cohort B: 1000 customers, 30% retention → 300 active customers
- Aggregated retention = (50 + 300) / (100 + 1000) = 31.8% (NOT 40% average)

**Defensibility**: ⚠️ **Potentially confusing**. The tooltip says "Weighted to reflect the customer experience across cohorts (larger cohorts contribute more)" which is accurate, but the method is sum-based aggregation, not weighted average. This is mathematically correct but may not match user expectations.

---

### Q3: Are incomplete cohorts included, excluded, or visually marked?

**Answer**: **Included without clear visual marking** in aggregated view.

**Current Behavior**:
- Incomplete cohorts are **included** in aggregation
- Missing periods show **0% retention** (treated as if no customers were active)
- **No visual indication** that a cohort is incomplete in aggregated view
- Individual cohort view marks data gaps with `isDataGap` flag and dashed lines

**Maturity Calculation**:
```javascript
maxPossiblePeriod = floor((currentDate - oldestCohortDate) / periodLength)
// All periods from 0 to maxPossiblePeriod are included
// Missing periods show 0% retention
```

**Example**:
- Cohort 2024-01 (12 months old): Has data for periods 0-11
- Cohort 2024-12 (1 month old): Has data for period 0 only
- Aggregated view shows periods 0-11, but period 11 only includes data from 2024-01 cohort
- No indication that 2024-12 cohort is incomplete

**Defensibility**: ⚠️ **Problematic**. Incomplete cohorts can skew aggregated retention downward, especially for recent periods. Users may misinterpret low retention in recent periods as actual churn when it's just incomplete data.

---

## Issues Found

### Issue 1: Aggregation Method Transparency

**Severity**: Medium  
**Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 297-396

**Problem**: The aggregated retention calculation uses sum-based aggregation (sum active customers, then calculate ratio), which is mathematically correct but may not match user expectations of "weighted average."

**Current Code**:
```javascript
// Sums active_customers across cohorts
periodData.activeCustomers += period.active_customers;
// Then calculates retention as ratio
retentionRate = (periodData.activeCustomers / period0Customers) * 100
```

**Impact**: Users may expect a simple average or explicit weighted average, but get sum-based aggregation instead.

**Recommendation**: 
- Add tooltip explaining: "Aggregated retention sums active customers across cohorts, then calculates the ratio. This naturally weights by cohort size."
- Consider showing both aggregated retention and average retention for comparison.

---

### Issue 2: Incomplete Cohort Handling

**Severity**: High  
**Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 340-393

**Problem**: Incomplete cohorts are included in aggregation without visual indication. Missing periods show 0% retention, which can be misinterpreted as churn.

**Current Code**:
```javascript
// Includes ALL periods up to maxPossiblePeriod
for (let periodNum = 0; periodNum <= maxPossiblePeriod; periodNum++) {
  if (!periodData) {
    // Shows 0% for missing periods
    retentionRate: 0,
  }
}
```

**Impact**: 
- Recent periods may show artificially low retention due to incomplete cohorts
- Users cannot distinguish between "no retention" and "incomplete data"

**Recommendation**:
- Option A: Exclude incomplete cohorts from aggregation (only include cohorts with data for all periods up to maxPossiblePeriod)
- Option B: Visual indication (gray out or mark incomplete periods)
- Option C: Show maturity filter (e.g., "Only show cohorts with ≥12 months of data")

---

### Issue 3: Period 0 Baseline Inconsistency

**Severity**: Low  
**Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 332-358

**Problem**: Period 0 uses aggregated `active_customers` as baseline, not `cohort_size`. This means retention is calculated as "active in period 0" not "acquired in period 0."

**Current Code**:
```javascript
const period0Customers = period0Data.activeCustomers; // Sum of active customers in period 0
retentionRate = (periodData.activeCustomers / period0Customers) * 100
```

**Impact**: If some customers in a cohort don't place orders in Period 0, retention will be calculated against a smaller baseline than cohort_size.

**Example**:
- Cohort size: 100 customers
- Active in Period 0: 90 customers (10 didn't order in their acquisition month)
- Active in Period 1: 60 customers
- Retention = 60/90 = 66.7% (NOT 60/100 = 60%)

**Defensibility**: This is actually correct if retention is defined as "activity retention" (customers active in period 0), but may not match expectations if users think of it as "acquisition retention" (customers acquired in period 0).

**Recommendation**: 
- Clarify in tooltip: "Retention is calculated against customers active in Period 0, not total cohort size."
- Consider offering both metrics: "Activity Retention" vs "Acquisition Retention"

---

## Positive Findings

### ✅ Clear Definitions
- User-facing definitions are clear and accurate
- Tooltips explain metrics well
- Period semantics are unambiguous

### ✅ Correct Database Logic
- `mv_cohorts` materialized view correctly calculates per-cohort retention
- Period calculation using `EXTRACT(month FROM AGE(...))` is correct
- Only paid orders are included

### ✅ Individual Cohort View
- Individual cohort curves correctly show per-cohort retention
- Data gaps are visually marked with dashed lines
- Cohort selection is flexible and well-implemented

### ✅ Time Window Semantics
- Period-based (not cumulative) retention is correctly implemented
- Period conversion (monthly → quarterly → annual) is mathematically sound

---

## Recommendations

### Priority 1: Fix Incomplete Cohort Handling

**Action**: Add visual indication or filtering for incomplete cohorts in aggregated view.

**Options**:
1. **Visual Indication**: Gray out periods where <50% of cohorts have data
2. **Maturity Filter**: Add filter "Only show cohorts with ≥N periods of data"
3. **Exclude Incomplete**: Only include cohorts with complete data up to maxPossiblePeriod

**Code Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 340-393

---

### Priority 2: Clarify Aggregation Method

**Action**: Add explicit explanation of aggregation method in tooltip or definition strip.

**Suggested Text**: 
> "Aggregated retention sums active customers across all cohorts for each period, then calculates the ratio to Period 0. This naturally weights by cohort size—larger cohorts contribute more customers to the total."

**Code Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 1754-1794

---

### Priority 3: Document Period 0 Baseline

**Action**: Clarify that retention is calculated against "active in Period 0" not "acquired in Period 0."

**Suggested Text**:
> "Retention is calculated against customers who were active (placed ≥1 order) in Period 0. Customers who were acquired but didn't order in Period 0 are excluded from the baseline."

**Code Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 1619-1633

---

## Final Verdict

⚠️ **Retention Curves requires fixes before trust.**

**Reasoning**:
- Core definitions are clear and defensible ✅
- Database logic is correct ✅
- Aggregation method is mathematically sound but potentially confusing ⚠️
- Incomplete cohort handling can mislead users ⚠️

**Required Fixes**:
1. Add visual indication or filtering for incomplete cohorts (Priority 1)
2. Clarify aggregation method in UI (Priority 2)
3. Document Period 0 baseline semantics (Priority 3)

**After Fixes**: ✅ Retention Curves can be Phase 0 trusted.

---

## Appendix: Code References

### Key Files
- **Page Component**: `app/(protected)/retention-ltv/curves/page.tsx`
- **API Endpoint**: `app/api/metrics/cohorts/route.ts`
- **Database View**: `supabase/migrations/006_create_metric_views.sql` (lines 80-118)

### Key Functions
- **Aggregated Retention**: `retentionCurveData` (lines 297-396)
- **Individual Cohort Curves**: `cohortCurvesData` (lines 632-818)
- **Maturity Calculation**: `maxPossiblePeriod` (lines 268-294)
- **Period Conversion**: `convertPeriodNumber` (lines 242-252)

### Database Schema
```sql
mv_cohorts:
  - cohort_month: First purchase month
  - cohort_size: Count of customers in cohort
  - period_number: Months since acquisition
  - active_customers: Distinct customers with orders in period
  - retention_rate_percent: (active_customers / cohort_size) * 100
```

