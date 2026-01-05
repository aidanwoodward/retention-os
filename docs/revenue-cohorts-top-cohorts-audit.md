# Revenue Cohorts - Top Cohorts & Shares Audit

**Date:** 2025-01-XX  
**Scope:** `/retention-ltv/revenue-cohorts` page only  
**Goal:** Ensure all "Top cohort" metrics and revenue share breakouts use the same canonical time window as "Current Period"

## Current State Analysis

### 1. Active Cohorts Count

**User-facing label:** "Active cohorts" (line 1281)  
**Component/file:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**Exact calculation code:** Lines 834-914 (`cohortCoverage` useMemo), specifically line 863:
```typescript
const activeCount = cohortRevenues.filter(c => c.revenue > 0).length;
```

**Inputs used:**
- `getAggregatedCohorts` (line 857) - aggregated cohorts with lifetime revenue
- Derived from: `/api/metrics/cohorts` → `filteredCohorts` → `getAggregatedCohorts`

**Time window used:** ❌ **LIFETIME REVENUE** (sums all periods across all time)
- Uses `getAggregatedCohorts` which sums revenue from ALL periods (line 337: `cohort.periods.reduce((sum, p) => sum + p.total_revenue, 0)`)

**Cohort inclusion rules:**
- Includes all cohorts with >0 lifetime revenue
- No filtering for incomplete cohorts
- No minimum cohort age requirement

**Weighting definition:** N/A (count only)

**Can / cannot conclude:**
- ❌ **MISALIGNED**: Uses lifetime revenue instead of Current Period revenue
- ❌ Does not respect `dateRange` when present
- ❌ Does not align with `currentPeriodKey` logic

---

### 2. Top Cohort Revenue + Top Cohort Revenue Share

**User-facing label:** "Top cohort" with percentage and revenue (lines 1320-1325)  
**Component/file:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**Exact calculation code:** Lines 889-902 (`cohortCoverage` useMemo):
```typescript
const topCohort = cohortRevenues[0];
const topCohortRevenue = topCohort?.revenue || 0;
// ...
topCohortShare: (topCohortRevenue / totalRevenue) * 100,
```

**Inputs used:**
- `getAggregatedCohorts` (line 857) - aggregated cohorts with lifetime revenue
- Derived from: `/api/metrics/cohorts` → `filteredCohorts` → `getAggregatedCohorts`

**Time window used:** ❌ **LIFETIME REVENUE** (sums all periods across all time)
- Uses `getAggregatedCohorts` which sums revenue from ALL periods

**Cohort inclusion rules:**
- Includes all cohorts with >0 lifetime revenue
- Sorted by lifetime revenue descending
- Top cohort = highest lifetime revenue cohort

**Weighting definition for shares:**
- Share = `(topCohortRevenue / totalRevenue) * 100`
- `totalRevenue` = sum of ALL cohorts' lifetime revenue (line 867)

**Can / cannot conclude:**
- ❌ **MISALIGNED**: Uses lifetime revenue instead of Current Period revenue
- ❌ Does not respect `dateRange` when present
- ❌ Does not align with `currentPeriodKey` logic
- ❌ Share denominator uses lifetime revenue total, not Current Period total

---

### 3. Top 3 Cohorts Revenue + Share

**User-facing label:** "Top 3 cohorts" with percentage and revenue (lines 1349-1354)  
**Component/file:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**Exact calculation code:** Lines 891-905 (`cohortCoverage` useMemo):
```typescript
const top3Cohorts = cohortRevenues.slice(0, 3);
const top3Revenue = top3Cohorts.reduce((sum, c) => sum + c.revenue, 0);
// ...
top3Share: (top3Revenue / totalRevenue) * 100,
```

**Inputs used:**
- `getAggregatedCohorts` (line 857) - aggregated cohorts with lifetime revenue

**Time window used:** ❌ **LIFETIME REVENUE**

**Cohort inclusion rules:**
- Top 3 = cohorts ranked 1-3 by lifetime revenue

**Weighting definition for shares:**
- Share = `(top3Revenue / totalRevenue) * 100`
- `totalRevenue` = sum of ALL cohorts' lifetime revenue

**Can / cannot conclude:**
- ❌ **MISALIGNED**: Same issues as Top Cohort

---

### 4. Top 10 Cohorts Revenue + Share

**User-facing label:** "Top 10 cohorts" with percentage and revenue (lines 1378-1383)  
**Component/file:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**Exact calculation code:** Lines 893-908 (`cohortCoverage` useMemo):
```typescript
const top10Cohorts = cohortRevenues.slice(0, 10);
const top10Revenue = top10Cohorts.reduce((sum, c) => sum + c.revenue, 0);
// ...
top10Share: (top10Revenue / totalRevenue) * 100,
```

**Time window used:** ❌ **LIFETIME REVENUE**

**Can / cannot conclude:**
- ❌ **MISALIGNED**: Same issues as Top Cohort

---

### 5. Others Revenue + Share

**User-facing label:** "Others" with percentage and revenue (lines 1407-1412)  
**Component/file:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**Exact calculation code:** Lines 895-909 (`cohortCoverage` useMemo):
```typescript
const othersCohorts = cohortRevenues.slice(10);
const othersRevenue = othersCohorts.reduce((sum, c) => sum + c.revenue, 0);
// ...
othersShare: (othersRevenue / totalRevenue) * 100,
```

**Time window used:** ❌ **LIFETIME REVENUE**

**Can / cannot conclude:**
- ❌ **MISALIGNED**: Same issues as Top Cohort

---

### 6. Top Cohorts Leaderboard (Top 5 list)

**User-facing label:** "Top Cohorts" leaderboard (lines 1434-1489)  
**Component/file:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**Exact calculation code:** Lines 560-643 (`getTopCohorts` useMemo):
```typescript
// Calculate revenue per cohort for the current period only
const cohortRevenuesInPeriod: Array<{ month: string; revenue: number }> = [];

filteredCohorts.forEach((cohort) => {
  // ... determine cohortLabel ...
  
  cohort.periods.forEach((period) => {
    // ... determine periodKey ...
    
    if (periodKey === currentPeriodKey) {
      revenueInPeriod += period.total_revenue;
    }
  });
  
  if (revenueInPeriod > 0) {
    cohortRevenuesInPeriod.push({ month: cohortLabel, revenue: revenueInPeriod });
  }
});

const totalRevenueInPeriod = cohortRevenuesInPeriod.reduce((sum, c) => sum + c.revenue, 0);
const top5Cohorts = [...cohortRevenuesInPeriod]
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 5)
  .map(c => ({
    ...c,
    share: totalRevenueInPeriod > 0 ? (c.revenue / totalRevenueInPeriod) * 100 : 0
  }));
```

**Inputs used:**
- `filteredCohorts` - cohorts filtered by dateRange if present
- `currentPeriodKey` - last period key from filteredCohorts (excluding Pre-2020)
- Derived from: `/api/metrics/cohorts` → `filteredCohorts`

**Time window used:** ✅ **CURRENT PERIOD** (uses `currentPeriodKey`)
- Filters revenue to periods matching `currentPeriodKey` (line 612)
- However: `currentPeriodKey` is always the last period from `filteredCohorts`, which may not align with `dateRange` when present

**Cohort inclusion rules:**
- Includes cohorts with >0 revenue in the current period
- Aggregates cohorts by viewMode (annual/quarterly/monthly)
- Excludes cohorts with zero revenue in current period

**Weighting definition for shares:**
- Share = `(cohort.revenue / totalRevenueInPeriod) * 100`
- `totalRevenueInPeriod` = sum of all cohorts' revenue in current period only

**Can / cannot conclude:**
- ✅ Uses Current Period revenue (filtered by `currentPeriodKey`)
- ⚠️ **PARTIALLY ALIGNED**: Uses `currentPeriodKey` which may not match `dateRange` when present
- ⚠️ Does not respect `dateRange` directly (relies on `filteredCohorts` being pre-filtered)

---

### 7. Active Cohorts Count (for leaderboard)

**User-facing label:** "Top X of Y cohorts" (line 1449)  
**Component/file:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**Exact calculation code:** Lines 645-748 (`cohortsInCurrentPeriodCount` useMemo)
- Uses same logic as `getTopCohorts` (filters by `currentPeriodKey`)
- Returns count of cohorts with >0 revenue in current period

**Time window used:** ✅ **CURRENT PERIOD** (uses `currentPeriodKey`)

**Can / cannot conclude:**
- ✅ Aligned with `getTopCohorts`
- ⚠️ Same partial alignment issue as `getTopCohorts`

---

## Canonical Alignment Rules

### Current Period Definition (from existing code, lines 756-832):

1. **When `dateRange` is present:**
   - Current Period = All revenue where `order_month` falls within `dateRange`
   - Uses `isDateInRange(orderDate, dateRange)` to filter

2. **When `dateRange` is absent:**
   - Current Period = Last data point from `revenueTrendData.currentData`
   - This is the last complete period from the trend chart
   - Uses `currentPeriodKey` (last period key excluding Pre-2020)

### Required Alignment:

All "Top cohort" and share metrics must:
- Use the same revenue total as `totalRevenue` (Current Period definition)
- Use the same cohort set (filtered by dateRange if present)
- Calculate shares using Current Period revenue, not lifetime revenue
- Exclude incomplete periods consistently (if dateRange is absent, use last complete period)

---

## Issues Identified

### Critical Issues:

1. **`cohortCoverage` uses lifetime revenue** (lines 834-914)
   - Calculates shares based on lifetime revenue totals
   - Does not filter by Current Period
   - Does not respect `dateRange` when present

2. **`getTopCohorts` partially aligned**
   - Uses `currentPeriodKey` which may not match `dateRange` when present
   - Should use same logic as `totalRevenue` calculation

3. **Inconsistent time windows**
   - `cohortCoverage`: Lifetime revenue
   - `getTopCohorts`: Current Period (via `currentPeriodKey`)
   - `totalRevenue`: Current Period (via `dateRange` or trend data)

### Required Changes:

1. Create helper function `getCohortRevenuesForCurrentPeriod()` that:
   - Respects `dateRange` when present (filters by dateRange)
   - Uses `currentPeriodKey` when dateRange is absent
   - Returns cohort revenues filtered to Current Period only

2. Update `cohortCoverage` to use this helper instead of `getAggregatedCohorts`

3. Update `getTopCohorts` to use this helper (or refactor to use same logic)

4. Ensure all share calculations use the same total revenue (Current Period total)

---

## Implementation Plan

1. Create `getCohortRevenuesForCurrentPeriod()` helper function
2. Update `cohortCoverage` to use Current Period revenue
3. Refactor `getTopCohorts` to use same helper
4. Add inline comments documenting the canonical time window logic
5. Verify all metrics align with `totalRevenue` calculation

