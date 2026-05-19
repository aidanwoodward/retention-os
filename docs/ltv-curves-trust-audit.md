# Phase 0 Trust Audit: LTV Curves (/retention-ltv/ltv-cohorts)

**Date**: 2025-01-27  
**Scope**: `/retention-ltv/ltv-cohorts` page and `/api/metrics/cohorts` endpoint  
**Status**: ✅ **Phase 0 Trusted** (All fixes implemented - see `ltv-curves-phase0-verification.md` and `ltv-curves-phase0-final-verification.md`)

---

## Executive Summary

The LTV Curves page displays cumulative revenue per customer (LTV) over time since first purchase. The implementation has solid foundations with clear definitions and correct aggregation logic, but contains critical issues that can mislead users:

1. **Incomplete Cohort Handling**: Incomplete cohorts are included in aggregation without clear visual indication, which can skew aggregated LTV downward for recent periods.
2. **Monotonicity Enforcement Logic**: Non-monotonic LTV values are silently converted to null (line breaks) without user explanation, potentially hiding data quality issues.
3. **CLR Definition Ambiguity**: CLR (Cohort Lifetime Revenue) is defined as "LTV at last fully observed bucket" but the criteria for "fully observed" is not clearly documented.

However, the core LTV calculation is mathematically sound and defensible. With fixes to maturity handling transparency and monotonicity explanation, this page can be trusted.

---

## Metric Definitions

### 1. Lifetime Value (LTV)

#### User-Facing Definition
"Cumulative revenue per customer over time since first purchase."

#### Exact Formula

**Database Level** (`mv_cohorts`):
```sql
-- Incremental revenue per period (per cohort)
total_revenue = SUM(revenue_in_month)
WHERE customer_id IN cohort
AND order_month = period_month
AND financial_status = 'paid'

-- Per-customer LTV at period N (calculated in frontend)
cumulativeRevenue_N = SUM(total_revenue) for periods 0 to N
LTV_N = cumulativeRevenue_N / cohort_size
```

**Frontend Calculation** (`normalizedCohortLTVData`, lines 315-329):
```javascript
// For each cohort:
let cumulativeRevenue = 0;
sortedPeriods.forEach(period => {
  cumulativeRevenue += period.total_revenue; // Incremental sum
  const bucket = convertPeriodToBucket(period.period_number);
  const cohortLTV = cohort.cohort_size > 0 
    ? cumulativeRevenue / cohort.cohort_size 
    : 0;
  // Aggregate across cohorts in group (weighted by cohort size)
  bucketMap.set(bucket, bucketMap.get(bucket)! + (cohortLTV * cohort.cohort_size));
});

// Normalize by total cohort size
if (totalCohortSize > 0) {
  bucketMap.forEach((weightedSum, bucket) => {
    bucketMap.set(bucket, weightedSum / totalCohortSize);
  });
}
```

**Aggregated View** (`aggregatedLTVData`, lines 401-471):
```javascript
// Weighted average across all cohorts
for (let bucket = 0; bucket <= maxPossibleBucket; bucket++) {
  let weightedSum = 0;
  let totalWeight = 0;
  
  normalizedCohortLTVData.forEach(cohort => {
    const bucketData = cohort.buckets.find(b => b.bucket === bucket);
    if (bucketData && bucketData.ltv !== null) {
      const weight = cohort.cohortSize;
      weightedSum += bucketData.ltv * weight;
      totalWeight += weight;
    }
  });
  
  if (totalWeight > 0) {
    const aggregatedLTV = weightedSum / totalWeight;
    // Enforce monotonicity (see Maturity Handling section)
  }
}
```

#### Time Window Semantics
- **Period**: Discrete time buckets (monthly, quarterly, half-yearly, or annual)
- **Period 0**: The acquisition period (first purchase month/quarter/year)
- **Period N**: N periods after acquisition
- **Cumulative**: LTV accumulates revenue from Period 0 through Period N
- **NOT Incremental**: Each bucket shows total revenue per customer up to that point, not revenue in that period only

#### Cohort Inclusion Rules
- Cohorts are defined by `cohort_month` (first purchase month)
- Only customers with `financial_status = 'paid'` orders are included
- All cohorts matching the date range filter are included in aggregation
- Cohorts are grouped by `cohortType` label (e.g., all monthly cohorts in 2024 → one "2024" annual cohort)

#### Maturity Rules
- **maxPossibleBucket**: Calculated based on oldest cohort's age from current date (lines 253-279)
- **Incomplete Cohorts**: Included in aggregation, but missing periods show `null` LTV (line breaks)
- **No Visual Indication**: Incomplete cohorts are not visually distinguished from complete cohorts in aggregated view
- **Monotonicity Enforcement**: If LTV decreases between buckets (beyond tolerance), the later bucket is set to `null` (lines 339-383, 430-458)

#### Aggregation Method Across Cohorts
- **Method**: Weighted average by cohort size
- **Process**:
  1. Calculate per-cohort LTV for each bucket (cumulative revenue / cohort_size)
  2. Weight each cohort's LTV by its cohort_size
  3. Sum weighted LTVs and divide by total cohort size
- **Weighting**: Explicitly weighted by cohort size (larger cohorts contribute more to the average)
- **Formula**: `aggregatedLTV = SUM(cohortLTV_i * cohortSize_i) / SUM(cohortSize_i)`

**Example**:
- Cohort A: 100 customers, LTV at Y1 = £500 → weighted contribution = £500 × 100 = £50,000
- Cohort B: 1000 customers, LTV at Y1 = £300 → weighted contribution = £300 × 1000 = £300,000
- Aggregated LTV = (£50,000 + £300,000) / (100 + 1000) = £318.18

**Defensibility**: ✅ **Clear and defensible**. This is a standard weighted average calculation.

---

### 2. Cohort Lifetime Revenue (CLR)

#### User-Facing Definition
"Long-run cohort value (matured cohorts only)" / "LTV at last fully observed bucket"

#### Exact Formula
```javascript
// CLR = LTV at last fully observed bucket (matured cohorts only)
const clr = lastObservedLTV; // Set during bucket iteration (line 386)
```

**Calculation** (`normalizedCohortLTVData`, lines 339-386):
```javascript
let lastObservedLTV: number | null = null;
for (let bucket = 0; bucket <= maxPossibleBucket; bucket++) {
  const ltv = bucketMap.get(bucket);
  if (ltv !== undefined) {
    // Enforce monotonicity
    if (previousLTV !== null && ltv < previousLTV - TOLERANCE) {
      // Set to null (line break)
      buckets.push({ bucket, bucketLabel, ltv: null });
    } else {
      // Valid monotonic point
      buckets.push({ bucket, bucketLabel, ltv });
      previousLTV = ltv;
      lastObservedLTV = ltv; // Update CLR
    }
  }
}
const clr = lastObservedLTV;
```

#### Time Window Semantics
- **"Last fully observed bucket"**: The highest bucket index where LTV is non-null and monotonic
- **"Matured cohorts only"**: Cohorts with CLR are those that have reached at least one fully observed bucket beyond Period 0
- **NOT "Final LTV"**: CLR represents the LTV at the last bucket with complete data, not necessarily the final LTV

#### Cohort Inclusion Rules
- Only cohorts with `clr !== null` are considered "matured" for CLR calculations
- CLR is calculated per cohort, then averaged (weighted by cohort size) for KPIs

#### Maturity Rules
- CLR is set to `null` if no valid buckets exist (all buckets are null or non-monotonic)
- CLR may be lower than actual final LTV if the cohort has incomplete data at later buckets

#### Aggregation Method
- **Avg CLR KPI**: Weighted average of CLR across matured cohorts only (lines 536-541)
```javascript
const maturedCohorts = normalizedCohortLTVData.filter(c => c.clr !== null);
const maturedTotalSize = maturedCohorts.reduce((sum, c) => sum + c.cohortSize, 0);
const avgCLR = maturedTotalSize > 0
  ? maturedCohorts.reduce((sum, c) => sum + (c.clr! * c.cohortSize), 0) / maturedTotalSize
  : null;
```

**Defensibility**: ⚠️ **Potentially confusing**. The definition of "fully observed" is not clearly documented. Users may interpret CLR as "final LTV" when it's actually "LTV at last complete bucket."

---

### 3. Time Buckets

#### User-Facing Definition
"Time since first purchase" (labeled as M1, Q1, Y1, etc. based on cohort type)

#### Exact Formula
```javascript
// Convert period_number (months) to bucket index
const convertPeriodToBucket = (periodNumberMonths: number): number => {
  if (cohortType === 'annual') {
    return Math.floor(periodNumberMonths / 12);
  } else if (cohortType === 'quarterly') {
    return Math.floor(periodNumberMonths / 3);
  } else if (cohortType === 'half-year') {
    return Math.floor(periodNumberMonths / 6);
  } else {
    return periodNumberMonths; // monthly
  }
};
```

#### Time Window Semantics
- **Bucket 0**: Period 0 (acquisition period)
- **Bucket N**: N periods after acquisition (where period length depends on cohort type)
- **Bucket Labels**: 
  - Monthly: M1, M2, M3, ...
  - Quarterly: Q1, Q2, Q3, ...
  - Half-yearly: H1, H2, H3, ...
  - Annual: Y0, Y1, Y2, ...

#### Cohort Inclusion Rules
- All cohorts are aligned to the same bucket system based on `cohortType`
- Buckets are calculated from `period_number` (months since acquisition)

#### Maturity Rules
- `maxPossibleBucket` is calculated from the oldest cohort's age (lines 253-279)
- All buckets from 0 to `maxPossibleBucket` are included in the chart/table
- Missing buckets show `null` LTV (line breaks in chart)

#### Aggregation Method
- Buckets are aligned across cohorts by `period_number` → bucket conversion
- Aggregation happens within each bucket (weighted average of LTV at that bucket)

**Defensibility**: ✅ **Clear and defensible**. Time bucket conversion is mathematically sound.

---

## Critical Questions Answered

### Q1: Is LTV defined as cumulative revenue since acquisition, incremental revenue per period, or something else?

**Answer**: **Cumulative revenue since acquisition** (per customer).

- LTV accumulates revenue from Period 0 through Period N
- Formula: `LTV_N = SUM(revenue_period_0_to_N) / cohort_size`
- Each bucket shows total revenue per customer up to that point, not revenue in that period only
- This is the standard definition of Lifetime Value

**Defensibility**: ✅ **Clear and defensible**. This matches industry-standard LTV definition.

---

### Q2: When aggregating across cohorts, are we weighting by cohort size or averaging percentages equally?

**Answer**: **Explicitly weighted by cohort size** (weighted average).

**Method**:
1. Calculate per-cohort LTV for each bucket: `cohortLTV = cumulativeRevenue / cohort_size`
2. Weight each cohort's LTV by its cohort size: `weightedSum += cohortLTV * cohortSize`
3. Divide by total cohort size: `aggregatedLTV = weightedSum / totalCohortSize`

**This is NOT**:
- Simple average: `AVG(cohortLTV)` across cohorts
- Unweighted sum: `SUM(cohortLTV)` without normalization

**Example**:
- Cohort A: 100 customers, LTV = £500 → contribution = £500 × 100 = £50,000
- Cohort B: 1000 customers, LTV = £300 → contribution = £300 × 1000 = £300,000
- Aggregated LTV = (£50,000 + £300,000) / (100 + 1000) = £318.18

**Defensibility**: ✅ **Clear and defensible**. Weighted average is the correct method for aggregating per-customer metrics.

---

### Q3: Are incomplete cohorts included, excluded, or visually marked?

**Answer**: **Included without clear visual marking** in aggregated view.

**Current Behavior**:
- Incomplete cohorts are **included** in aggregation
- Missing periods show **`null` LTV** (line breaks in chart, "—" in table)
- **No visual indication** that a cohort is incomplete in aggregated view
- Individual cohort view shows line breaks but doesn't explain why

**Maturity Calculation**:
```javascript
maxPossibleBucket = floor((currentDate - oldestCohortDate) / periodLength)
// All buckets from 0 to maxPossibleBucket are included
// Missing buckets show null LTV
```

**Example**:
- Cohort 2024-01 (12 months old, annual view): Has data for buckets Y0, Y1
- Cohort 2024-12 (1 month old, annual view): Has data for bucket Y0 only
- Aggregated view shows buckets Y0, Y1, but Y1 only includes data from 2024-01 cohort
- No indication that 2024-12 cohort is incomplete

**Impact**:
- Recent periods may show artificially low aggregated LTV due to incomplete cohorts
- Users cannot distinguish between "low LTV" and "incomplete data"
- Aggregated LTV at bucket Y1 may be misleading if most cohorts are incomplete

**Defensibility**: ⚠️ **Problematic**. Incomplete cohorts can skew aggregated LTV downward, especially for recent periods. Users may misinterpret low LTV in recent periods as actual poor performance when it's just incomplete data.

---

### Q4: How is monotonicity enforced, and what happens when LTV decreases?

**Answer**: **Non-monotonic LTV values are converted to `null` (line breaks) without user explanation**.

**Monotonicity Enforcement** (lines 339-383, 430-458):
```javascript
const TOLERANCE = 0.001;
if (previousLTV !== null && ltv < previousLTV - TOLERANCE) {
  // Break the line - set to null for incomplete/partial bucket
  buckets.push({ bucket, bucketLabel, ltv: null });
} else {
  // Valid monotonic point
  buckets.push({ bucket, bucketLabel, ltv });
  previousLTV = ltv;
}
```

**Rationale** (from code comments):
- "Cumulative LTV should not decrease. If a bucket appears lower, it's typically partial/incomplete data; we break the line by setting null."
- "Enforce monotonicity: if aggregated LTV decreases, set to null (line break)"

**What Happens**:
1. If LTV decreases between buckets (beyond 0.001 tolerance), the later bucket is set to `null`
2. Chart shows a line break (gap) at that bucket
3. Table shows "—" for that bucket
4. **No explanation** is provided to users about why the line breaks
5. **No warning** is shown about potential data quality issues

**Potential Causes of Non-Monotonicity**:
1. **Data Quality Issues**: Negative revenue adjustments, refunds exceeding period revenue, or data corruption
2. **Incomplete Data**: Partial period data that hasn't been fully aggregated
3. **Cohort Grouping Issues**: When grouping monthly cohorts into annual cohorts, timing misalignment

**Defensibility**: ⚠️ **Problematic**. Silent conversion to null hides data quality issues. Users cannot distinguish between "incomplete data" and "data quality problem." The tolerance (0.001) may be too strict for real-world scenarios with refunds or adjustments.

---

### Q5: How is CLR (Cohort Lifetime Revenue) defined and calculated?

**Answer**: **CLR = LTV at last fully observed bucket (matured cohorts only)**.

**Calculation**:
- CLR is set to the LTV value at the last bucket where LTV is non-null and monotonic
- Only cohorts with `clr !== null` are considered "matured"
- CLR may be lower than actual final LTV if the cohort has incomplete data

**Issues**:
1. **"Fully observed" is ambiguous**: Does this mean "has data" or "has complete data"?
2. **CLR may not represent final LTV**: If a cohort has incomplete data at later buckets, CLR will be lower than actual final LTV
3. **No distinction between "matured" and "complete"**: A cohort may be "matured" (has CLR) but not "complete" (has data for all possible buckets)

**Defensibility**: ⚠️ **Potentially confusing**. The definition of "fully observed" is not clearly documented. Users may interpret CLR as "final LTV" when it's actually "LTV at last complete bucket."

---

## Issues Found

### Issue 1: Incomplete Cohort Handling

**Severity**: High  
**Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 253-279, 401-471

**Problem**: Incomplete cohorts are included in aggregation without visual indication. Missing periods show `null` LTV, which can skew aggregated LTV downward for recent periods.

**Current Code**:
```javascript
// maxPossibleBucket calculated from oldest cohort
const maxPossibleBucket = Math.max(0, yearsSinceOldest);

// Aggregation includes ALL cohorts, even incomplete ones
normalizedCohortLTVData.forEach(cohort => {
  const bucketData = cohort.buckets.find(b => b.bucket === bucket);
  if (bucketData && bucketData.ltv !== null) {
    // Include in aggregation
    weightedSum += bucketData.ltv * weight;
    totalWeight += weight;
  }
  // Missing buckets contribute nothing (not excluded)
});
```

**Impact**: 
- Recent periods may show artificially low aggregated LTV due to incomplete cohorts
- Users cannot distinguish between "low LTV" and "incomplete data"
- Aggregated LTV at bucket Y1 may be misleading if most cohorts are incomplete

**Example**:
- 10 cohorts total, all acquired in 2024
- 9 cohorts are 1 month old (only have Y0 data)
- 1 cohort is 12 months old (has Y0, Y1 data)
- Aggregated LTV at Y1 = LTV from 1 cohort only (10% of total)
- No indication that 90% of cohorts are incomplete

**Recommendation**: 
- **Option A**: Exclude incomplete cohorts from aggregation (only include cohorts with data for all buckets up to maxPossibleBucket)
- **Option B**: Visual indication (gray out or mark incomplete periods)
- **Option C**: Maturity filter (e.g., "Only show cohorts with ≥N periods of data")
- **Option D**: Show cohort count per bucket in tooltip/table (e.g., "LTV: £500 (from 5 cohorts)")

---

### Issue 2: Monotonicity Enforcement Transparency

**Severity**: High  
**Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 339-383, 430-458

**Problem**: Non-monotonic LTV values are silently converted to `null` (line breaks) without user explanation. This hides data quality issues and makes it impossible to distinguish between "incomplete data" and "data quality problem."

**Current Code**:
```javascript
const TOLERANCE = 0.001;
if (previousLTV !== null && ltv < previousLTV - TOLERANCE) {
  // Break the line - set to null for incomplete/partial bucket
  buckets.push({ bucket, bucketLabel, ltv: null });
  // No user-facing explanation
}
```

**Impact**:
- Users cannot distinguish between "incomplete data" and "data quality problem"
- Data quality issues (refunds, adjustments) are hidden
- Line breaks may be misinterpreted as "no data" when they're actually "data quality issue"

**Recommendation**:
- **Option A**: Show warning/explanation when monotonicity is violated (e.g., "Data quality issue detected: LTV decreased at Y2")
- **Option B**: Distinguish between "missing data" (null from missing period) and "data quality issue" (null from monotonicity violation)
- **Option C**: Allow users to toggle monotonicity enforcement (show raw data vs. enforced monotonicity)
- **Option D**: Increase tolerance or make it configurable (0.001 may be too strict for real-world scenarios)

---

### Issue 3: CLR Definition Ambiguity

**Severity**: Medium  
**Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 385-386, 536-541

**Problem**: CLR is defined as "LTV at last fully observed bucket" but the criteria for "fully observed" is not clearly documented. Users may interpret CLR as "final LTV" when it's actually "LTV at last complete bucket."

**Current Code**:
```javascript
// CLR = LTV at last fully observed bucket (matured cohorts only)
const clr = lastObservedLTV; // Set during bucket iteration
```

**Issues**:
1. **"Fully observed" is ambiguous**: Does this mean "has data" or "has complete data"?
2. **CLR may not represent final LTV**: If a cohort has incomplete data at later buckets, CLR will be lower than actual final LTV
3. **No distinction between "matured" and "complete"**: A cohort may be "matured" (has CLR) but not "complete" (has data for all possible buckets)

**Impact**:
- Users may misinterpret CLR as "final LTV" when it's actually "LTV at last complete bucket"
- CLR comparisons across cohorts may be misleading if cohorts have different maturity levels

**Recommendation**:
- **Option A**: Clarify definition in tooltip: "CLR = LTV at last bucket with complete data (matured cohorts only). May be lower than final LTV if cohort has incomplete data."
- **Option B**: Show maturity indicator (e.g., "CLR: £500 (at Y2, cohort is 3 years old)")
- **Option C**: Distinguish between "CLR" (last complete bucket) and "Final LTV" (last bucket with any data)

---

### Issue 4: Period 0 Revenue Inclusion

**Severity**: Low  
**Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 315-329

**Problem**: Period 0 revenue is included in LTV calculation. This means LTV at bucket 0 includes revenue from the acquisition period, which may not match user expectations if they expect LTV to start at 0.

**Current Code**:
```javascript
let cumulativeRevenue = 0;
sortedPeriods.forEach(period => {
  cumulativeRevenue += period.total_revenue; // Includes Period 0
  const bucket = convertPeriodToBucket(period.period_number);
  const cohortLTV = cumulativeRevenue / cohort.cohort_size;
});
```

**Impact**:
- LTV at bucket 0 (Y0) shows revenue from Period 0, not 0
- This is mathematically correct (cumulative revenue includes first purchase) but may not match user expectations

**Defensibility**: This is actually correct if LTV is defined as "cumulative revenue since first purchase" (which includes the first purchase). However, some users may expect LTV to start at 0.

**Recommendation**: 
- Clarify in tooltip: "LTV includes revenue from first purchase (Period 0). LTV at Y0 shows revenue from acquisition period."

---

### Issue 5: Cohort Grouping Logic

**Severity**: Low  
**Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 283-399

**Problem**: When `cohortType` is annual/quarterly/half-year, monthly cohorts are grouped by their label (e.g., all 2024 monthly cohorts → one "2024" annual cohort). This grouping may not be intuitive to users.

**Current Code**:
```javascript
// Group cohorts by their cohort label (based on cohortType)
const cohortGroups = new Map<string, typeof cohorts>();

cohorts.forEach(cohort => {
  const label = getCohortLabel(cohort.cohort_month);
  if (!cohortGroups.has(label)) {
    cohortGroups.set(label, []);
  }
  cohortGroups.get(label)!.push(cohort);
});
```

**Impact**:
- Users may not understand that "2024" cohort includes all 12 monthly cohorts from 2024
- Grouping may not match user expectations (e.g., "2024" may be interpreted as "customers acquired in 2024" but it's actually "all monthly cohorts from 2024 grouped together")

**Defensibility**: This is mathematically correct (grouping monthly cohorts into annual cohorts), but the grouping logic may not be intuitive.

**Recommendation**: 
- Clarify in tooltip: "Annual cohorts group all monthly cohorts from that year. LTV is weighted average across all monthly cohorts."

---

## Positive Findings

### ✅ Clear LTV Definition
- User-facing definition is clear: "Cumulative revenue per customer over time since first purchase"
- Formula is mathematically sound: `LTV = cumulativeRevenue / cohort_size`
- Matches industry-standard LTV definition

### ✅ Correct Aggregation Logic
- Weighted average by cohort size is the correct method for aggregating per-customer metrics
- Aggregation formula is transparent and defensible
- Cohort grouping logic is mathematically sound

### ✅ Monotonicity Enforcement
- Monotonicity enforcement prevents misleading decreases in LTV
- Tolerance (0.001) is reasonable for floating-point comparisons
- Line breaks clearly indicate where monotonicity was violated

### ✅ Time Bucket Conversion
- Period-to-bucket conversion is mathematically sound
- Bucket labels are clear and consistent (M1, Q1, Y1, etc.)
- Time alignment across cohorts is correct

### ✅ Individual Cohort View
- Individual cohort curves correctly show per-cohort LTV
- Line breaks are visually clear (null values create gaps)
- Cohort selection is flexible and well-implemented

---

## Recommendations

### Priority 1: Fix Incomplete Cohort Handling

**Action**: Add visual indication or filtering for incomplete cohorts in aggregated view.

**Options**:
1. **Visual Indication**: Gray out periods where <50% of cohorts have data
2. **Maturity Filter**: Add filter "Only show cohorts with ≥N periods of data"
3. **Exclude Incomplete**: Only include cohorts with complete data up to maxPossibleBucket
4. **Cohort Count**: Show cohort count per bucket in tooltip/table (e.g., "LTV: £500 (from 5 cohorts)")

**Code Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 253-279, 401-471

**Required for Trust**: ✅ **YES** - Incomplete cohorts can mislead users about recent LTV performance.

---

### Priority 2: Clarify Monotonicity Enforcement

**Action**: Add explanation when monotonicity is violated (line breaks).

**Suggested Text**: 
> "Line breaks indicate where LTV decreased (data quality issue detected). This may be due to refunds, adjustments, or incomplete data."

**Code Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 339-383, 430-458

**Required for Trust**: ✅ **YES** - Users need to understand why line breaks occur.

---

### Priority 3: Document CLR Definition

**Action**: Clarify CLR definition in tooltip and documentation.

**Suggested Text**:
> "CLR = LTV at last bucket with complete data (matured cohorts only). May be lower than final LTV if cohort has incomplete data at later buckets."

**Code Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 929-941, 1073-1085

**Required for Trust**: ⚠️ **RECOMMENDED** - CLR ambiguity may confuse users.

---

### Priority 4: Document Period 0 Inclusion

**Action**: Clarify that LTV includes Period 0 revenue.

**Suggested Text**:
> "LTV includes revenue from first purchase (Period 0). LTV at Y0 shows revenue from acquisition period."

**Code Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 1050-1054

**Required for Trust**: ⚠️ **OPTIONAL** - Minor clarification, not critical for trust.

---

### Priority 5: Document Cohort Grouping

**Action**: Clarify cohort grouping logic in tooltip.

**Suggested Text**:
> "Annual cohorts group all monthly cohorts from that year. LTV is weighted average across all monthly cohorts."

**Code Location**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` lines 283-399

**Required for Trust**: ⚠️ **OPTIONAL** - Minor clarification, not critical for trust.

---

## Final Verdict

⚠️ **LTV Curves requires fixes before trust.**

**Reasoning**:
- Core LTV definition is clear and defensible ✅
- Aggregation logic is mathematically sound ✅
- Monotonicity enforcement is correct but lacks transparency ⚠️
- Incomplete cohort handling can mislead users ⚠️
- CLR definition is ambiguous ⚠️

**Required Fixes**:
1. Add visual indication or filtering for incomplete cohorts (Priority 1) - **REQUIRED**
2. Clarify monotonicity enforcement in UI (Priority 2) - **REQUIRED**
3. Document CLR definition (Priority 3) - **RECOMMENDED**

**After Fixes**: ✅ LTV Curves can be Phase 0 trusted.

---

## Appendix: Code References

### Key Files
- **Page Component**: `app/(protected)/retention-ltv/ltv-cohorts/page.tsx`
- **API Endpoint**: `app/api/metrics/cohorts/route.ts`
- **Database View**: `supabase/migrations/006_create_metric_views.sql` (lines 80-118)

### Key Functions
- **LTV Normalization**: `normalizedCohortLTVData` (lines 283-399)
- **Aggregated LTV**: `aggregatedLTVData` (lines 401-471)
- **Maturity Calculation**: `maxPossibleBucket` (lines 253-279)
- **Period Conversion**: `convertPeriodToBucket` (lines 148-159)
- **Monotonicity Enforcement**: Lines 339-383 (individual cohorts), 430-458 (aggregated)

### Database Schema
```sql
mv_cohorts:
  - cohort_month: First purchase month
  - cohort_size: Count of customers in cohort
  - period_number: Months since acquisition
  - total_revenue: Incremental revenue per period (NOT cumulative)
  - active_customers: Distinct customers with orders in period
  - retention_rate_percent: (active_customers / cohort_size) * 100
```

### LTV Calculation Flow
1. **Database**: `mv_cohorts` provides incremental `total_revenue` per period
2. **Frontend Normalization**: Sum `total_revenue` across periods → cumulative revenue
3. **Per-Cohort LTV**: `cumulativeRevenue / cohort_size`
4. **Aggregation**: Weighted average by cohort size
5. **Monotonicity**: Enforce non-decreasing LTV (set to null if decreases)
6. **CLR**: LTV at last fully observed bucket

