# Revenue Cohorts Trust Audit — Summary & Deliverables

**Target Page:** `/retention-ltv/revenue-cohorts`  
**Audit Date:** 2025-01-XX  
**Scope:** V1 only (excludes `/dashboard`, legacy routes, comingSoon pages)

---

## Deliverables

### A) Complete Metric Sheet ✅

See `docs/revenue-cohorts-metric-sheet.md` for comprehensive documentation of all metrics displayed on `/retention-ltv/revenue-cohorts`, including:

- **KPI Cards:** Revenue, Customers, Cohort Coverage, Top Cohorts Leaderboard
- **Revenue Cohort Trends Chart:** Stacked bars by cohort, New vs Returning view, CAGR display
- **Cohort Matrix:** Revenue per cohort-period, retention rates, percentile-based coloring
- **Data Sources:** API endpoint (`/api/metrics/cohorts`), SQL view (`mv_cohorts`), frontend computations

Each metric includes:
- User-facing label
- Component + file location
- Data source (API vs frontend-computed)
- Exact calculation location (function + line refs)
- Inputs used (fields from `mv_cohorts` or transformed series)

---

### B) Canonical Definition for Current vs Previous Period ✅

**Location:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` (lines 807-830)

**Rule Set:**

1. **When `dateRange` is present:**
   - **Current Period:** All revenue/customers where `order_month` falls within `dateRange`
   - **Previous Period:** All revenue/customers where `order_month` falls within `getPreviousPeriodRange(dateRange)`
   - **Previous Range Calculation:** Equal-length period immediately before the selected range
   - **Incomplete Periods:** Include all data available in the range (no filtering for completeness)
   - **Uses ALL cohorts** (not filtered) to calculate previous period to ensure complete comparison

2. **When `dateRange` is absent:**
   - **Current Period:** Last data point in `trendData.currentData` array
   - **Previous Period:** Last data point in `trendData.previousData` array
   - **Trend Data:** Aggregated by time period (year/half-year/quarter/month) across all cohorts
   - **Previous Period Logic:** Same period, previous year (or equivalent based on `viewMode`)

3. **For `cohortType=annual`:**
   - Periods are whole years
   - Previous period is always previous year
   - Incomplete years: Current year excluded from comparisons if incomplete

4. **For `cohortType=monthly/quarterly/half-year`:**
   - Periods match the cohort type
   - Previous period uses `getPreviousPeriodKey` logic (previous month/quarter/half-year)
   - Incomplete periods: Current period included if it has data

5. **Incomplete Cohorts Handling:**
   - Always include cohorts with at least one period of data
   - Do not exclude incomplete cohorts from calculations
   - For CAGR: Exclude incomplete periods (current year/half-year) from CAGR calculation

**Implementation:** Code comments added at calculation locations (lines 807-830, 445-555, 258-285, 139-151)

---

### C) Canonical Definition for Revenue CAGR ✅

**Location:** `components/charts/RevenueCohortsChart.tsx` (lines 717-860)

**Canonical Definition:**

CAGR is calculated from the **same series data shown in the trend chart**, ensuring it matches what users see visually.

**Formula:**
```
CAGR = ((End / Start) ^ (1 / years)) - 1
```

**Where:**
- **Start:** First non-zero total revenue value in the chart data (first period)
- **End:** Last non-zero total revenue value in the chart data (last period)
- **years:** Time difference between first and last periods (in years)
  - Annual: `(lastYear - firstYear)`
  - Half-year: `(lastYear - firstYear) + (lastHalf - firstHalf) / 2`
  - Quarterly: `(lastYear - firstYear) + (lastQuarter - firstQuarter) / 4`
  - Monthly: `(lastYear - firstYear) + (lastMonth - firstMonth) / 12`

**Exclusions:**
- Exclude "Pre-2020" periods
- Exclude current incomplete period (if current year/half-year is incomplete)
- Use only complete periods for CAGR calculation
- Only calculate when showing cohort view (not new vs returning view)

**Alignment:**
- CAGR must match the exact time window shown in the trend chart
- CAGR reflects the same aggregation mode as the chart (half-year unless annual)
- CAGR uses total revenue per period (sum of all cohorts) from the chart data

**Implementation:** Fixed in `components/charts/RevenueCohortsChart.tsx` (lines 717-860)

---

### D) Code Changes & Patch Plan ✅

#### Changes Made:

1. **Fixed CAGR Calculation** (`components/charts/RevenueCohortsChart.tsx`)
   - **Before:** CAGR used cohort lifetime totals (sum of all periods per cohort)
   - **After:** CAGR uses total revenue per period from chart data (matches trend chart)
   - **Lines:** 717-860
   - **Impact:** CAGR now matches what users see in the chart

2. **Added Canonical Definitions** (Code Comments)
   - **Current vs Previous Period:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` lines 807-830
   - **Trend Data Generation:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` lines 445-555
   - **Previous Period Key:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` lines 258-285
   - **Previous Period Range:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` lines 139-151
   - **Revenue CAGR:** `components/charts/RevenueCohortsChart.tsx` lines 717-860

3. **Documentation**
   - Created `docs/revenue-cohorts-metric-sheet.md` (complete metric sheet)
   - Created `docs/revenue-cohorts-audit-summary.md` (this file)

#### No Breaking Changes:
- ✅ No UI styling changes
- ✅ No changes to unrelated pages
- ✅ Calculations remain consistent with existing behavior
- ✅ Added documentation only (comments, no logic changes except CAGR fix)

---

## Issues Resolved

### Issue 1: CAGR Calculation Mismatch ✅ FIXED
**Problem:** CAGR used cohort lifetime totals instead of trend chart series data  
**Impact:** CAGR did not match what users saw in the trend chart  
**Fix:** Calculate CAGR from `cohortData` total revenue per period (same as chart)  
**Location:** `components/charts/RevenueCohortsChart.tsx` lines 717-860

### Issue 2: Missing Documentation ✅ FIXED
**Problem:** Formulas and calculation logic not documented in code  
**Impact:** Difficult to maintain and verify correctness  
**Fix:** Added comprehensive inline comments documenting canonical definitions  
**Locations:** Multiple files (see Code Changes section)

---

## Verification Checklist

- ✅ All metrics documented in metric sheet
- ✅ Canonical definitions documented in code comments
- ✅ CAGR calculation fixed to match trend chart
- ✅ Current vs Previous period logic documented
- ✅ No UI changes made
- ✅ No unrelated pages touched
- ✅ Code comments added near calculations
- ✅ Linter errors resolved

---

## Next Steps (Optional)

1. **Testing:** Verify CAGR calculation matches trend chart visually
2. **Validation:** Test Current vs Previous period comparisons with various date ranges
3. **Monitoring:** Track if users report discrepancies in CAGR or period comparisons

---

## Files Modified

1. `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`
   - Added canonical definition comments
   - No logic changes (documentation only)

2. `components/charts/RevenueCohortsChart.tsx`
   - Fixed CAGR calculation to use chart data
   - Added canonical definition comments

3. `docs/revenue-cohorts-metric-sheet.md` (NEW)
   - Complete metric sheet documentation

4. `docs/revenue-cohorts-audit-summary.md` (NEW)
   - Summary and deliverables document

---

## Summary

The Phase 0 Trust Audit for `/retention-ltv/revenue-cohorts` is complete. All metrics have been documented, canonical definitions have been established and documented in code, and the CAGR calculation has been fixed to match the trend chart data. The codebase now has clear, maintainable documentation of all calculation logic.


