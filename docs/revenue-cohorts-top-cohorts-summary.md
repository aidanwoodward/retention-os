# Revenue Cohorts - Top Cohorts & Shares: Before → After Summary

## Overview

All "Top cohort" metrics and revenue share calculations have been aligned to use the same canonical time window as the "Current Period" definition used by `totalRevenue`.

---

## Changes Made

### 1. Created Canonical Helper Function

**New Function:** `getCohortRevenuesForCurrentPeriod` (lines 511-655)

**Purpose:** Single source of truth for calculating cohort revenues in Current Period only.

**Time Window Logic:**
- **When `dateRange` is present:** Filters revenue where `order_month` falls within `dateRange` (matches `totalRevenue` when dateRange exists)
- **When `dateRange` is absent:** Filters revenue where `periodKey` matches `currentPeriodKey` (last complete period, excluding Pre-2020) (matches `totalRevenue` when dateRange is absent)

**Returns:** Array of `{ label: string, revenue: number }` sorted by revenue descending

---

### 2. Updated `cohortCoverage` Calculation

**Before (lines 834-914):**
- Used `getAggregatedCohorts` which sums **lifetime revenue** across all periods
- Calculated shares based on lifetime revenue totals
- Did not respect `dateRange` when present
- Did not align with Current Period definition

**After (lines 857-920):**
- Uses `getCohortRevenuesForCurrentPeriod()` which filters to Current Period only
- Calculates shares based on Current Period revenue totals
- Respects `dateRange` when present (filters by dateRange)
- Aligns with Current Period definition (uses `currentPeriodKey` when dateRange is absent)

**Metrics Updated:**
- Active Cohorts Count
- Top Cohort Revenue + Share
- Top 3 Cohorts Revenue + Share
- Top 10 Cohorts Revenue + Share
- Others Revenue + Share

---

### 3. Updated `getTopCohorts` Calculation

**Before (lines 560-643):**
- Manually calculated cohort revenues filtering by `currentPeriodKey`
- Did not respect `dateRange` when present
- Duplicated logic from other calculations

**After (lines 622-650):**
- Uses `getCohortRevenuesForCurrentPeriod()` helper
- Respects `dateRange` when present
- Eliminates code duplication
- Ensures consistency with other metrics

**Metrics Updated:**
- Top 5 Cohorts Leaderboard
- Share calculations for each cohort

---

### 4. Updated `cohortsInCurrentPeriodCount` Calculation

**Before (lines 645-748):**
- Manually calculated cohort revenues filtering by `currentPeriodKey`
- Duplicated logic from `getTopCohorts`

**After (lines 652-655):**
- Uses `getCohortRevenuesForCurrentPeriod()` helper
- Simplified to single line: `cohortRevenues.filter(c => c.revenue > 0).length`
- Eliminates code duplication

**Metrics Updated:**
- Active Cohorts Count (for "Top X of Y" display)

---

## Alignment Verification

### Time Window Consistency

All metrics now use the same time window logic:

1. **When `dateRange` is present:**
   - `totalRevenue`: ✅ Filters by `dateRange` using `isDateInRange()`
   - `cohortCoverage`: ✅ Filters by `dateRange` using `isDateInRange()`
   - `getTopCohorts`: ✅ Filters by `dateRange` using `isDateInRange()`
   - `cohortsInCurrentPeriodCount`: ✅ Filters by `dateRange` using `isDateInRange()`

2. **When `dateRange` is absent:**
   - `totalRevenue`: ✅ Uses last data point from `revenueTrendData.currentData` (last complete period)
   - `cohortCoverage`: ✅ Uses `currentPeriodKey` (last complete period, excluding Pre-2020)
   - `getTopCohorts`: ✅ Uses `currentPeriodKey` (last complete period, excluding Pre-2020)
   - `cohortsInCurrentPeriodCount`: ✅ Uses `currentPeriodKey` (last complete period, excluding Pre-2020)

### Share Calculation Consistency

All share calculations now use the same denominator:

- **Before:** Shares calculated using lifetime revenue totals (inconsistent)
- **After:** Shares calculated using Current Period revenue totals (consistent)

Example:
- `topCohortShare = (topCohortRevenue / totalRevenue) * 100`
- `totalRevenue` = sum of all cohorts' revenue in Current Period only
- This matches the `totalRevenue` shown in KPI cards

---

## Code Quality Improvements

1. **Eliminated Duplication:** Removed ~150 lines of duplicated cohort revenue calculation logic
2. **Single Source of Truth:** All metrics use `getCohortRevenuesForCurrentPeriod()` helper
3. **Documentation:** Added canonical definition comments explaining time window logic
4. **Consistency:** All metrics now align with `totalRevenue` calculation

---

## Testing Recommendations

1. **With `dateRange` selected:**
   - Verify all Top cohort metrics show revenue within the selected date range
   - Verify shares sum to 100% (or close, accounting for rounding)
   - Verify Active Cohorts Count matches cohorts with revenue in date range

2. **Without `dateRange` (default view):**
   - Verify all Top cohort metrics show revenue for the last complete period
   - Verify shares align with the period shown in trend chart
   - Verify Active Cohorts Count matches cohorts with revenue in last period

3. **Edge Cases:**
   - Empty data: Verify fallback dummy data displays correctly
   - Single cohort: Verify shares display correctly
   - Pre-2020 cohorts: Verify they're excluded from current period calculations

---

## Files Modified

- `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`
  - Added `getCohortRevenuesForCurrentPeriod()` helper function (lines 511-655)
  - Updated `cohortCoverage` calculation (lines 857-920)
  - Updated `getTopCohorts` calculation (lines 622-650)
  - Updated `cohortsInCurrentPeriodCount` calculation (lines 652-655)
  - Added canonical definition comments

---

## Impact

**Before:** Top cohort metrics showed lifetime revenue, making them inconsistent with Current Period KPI cards and potentially misleading.

**After:** All Top cohort metrics show Current Period revenue only, ensuring consistency across the entire page and accurate representation of cohort performance in the selected time window.


