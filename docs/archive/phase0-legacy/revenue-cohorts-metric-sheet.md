> **Historical evidence � archived Phase 0 legacy route audits.** Not authoritative for the eight-route MVP spine. Current architecture: [RETENTIONOS_ARCHITECTURE.md](../../RETENTIONOS_ARCHITECTURE.md). Current metrics: [METRIC_CONTRACTS.md](../../METRIC_CONTRACTS.md).

# Revenue Cohorts Metric Sheet
## Phase 0 Trust Audit — V1 Scope

**Target Page:** `/retention-ltv/revenue-cohorts`  
**Audit Date:** 2025-01-XX  
**Scope:** V1 only (excludes `/dashboard`, legacy routes, comingSoon pages)

---

## 1. KPI Cards Section

### 1.1 Revenue KPI Card
**User-facing label:** "Revenue"  
**Component:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` (lines 1179-1246)

**Metrics displayed:**
- **Current Period Revenue** (`totalRevenue`)
  - Label: "This year"
  - Format: Currency (e.g., "$30.5m")
  - Location: Line 1219
  - Data source: Frontend-computed from `filteredCohorts`
  - Calculation: Lines 810-886 (`useMemo` hook)
  
- **Previous Period Revenue** (`previousRevenue`)
  - Label: "Last year"
  - Format: Currency (e.g., "$25.6m")
  - Location: Line 1226
  - Data source: Frontend-computed from `filteredCohorts`
  - Calculation: Lines 810-886 (`useMemo` hook)

- **Delta Percentage & Amount**
  - Format: "+X.X% (Δ $Y)"
  - Location: Lines 1199-1207
  - Calculation: `((totalRevenue - previousRevenue) / previousRevenue) * 100`
  - Display: Green badge if positive, red if negative

- **Subtitle**
  - Text: "Current {period} vs same {period} last year"
  - Location: Line 1210
  - `getPeriodName` derived from `viewMode` (line 971-979)

- **Trend Chart**
  - Component: `EnhancedTrendChart`
  - Data: `revenueTrend.currentData` and `revenueTrend.previousData`
  - Location: Lines 1232-1244
  - Source: `generateTrendDataFromCohorts('revenue', currentPeriodKey)` (lines 452-555)

**Current vs Previous Period Logic:**
- **If `dateRange` is set:** Compare selected date range vs previous period of equal length
  - Current: Sum of all `period.total_revenue` where `order_month` falls within `dateRange`
  - Previous: Sum of all `period.total_revenue` where `order_month` falls within `getPreviousPeriodRange(dateRange)`
  - Uses ALL cohorts (not filtered) to calculate previous period
  - Location: Lines 821-866

- **If no `dateRange`:** Use last data point from trend series
  - Current: Last value in `revenueTrendData.currentData` array
  - Previous: Last value in `revenueTrendData.previousData` array
  - Location: Lines 868-886

**Trend Data Generation:**
- Function: `generateTrendDataFromCohorts` (lines 452-555)
- Aggregates revenue by time period across all cohorts
- For each period:
  - Current: Revenue in that time period (aggregated across all cohorts)
  - Previous: Revenue in equivalent period from previous year (using `getPreviousPeriodKey`)
- Period keys determined by `viewMode`:
  - Annual: Year (e.g., "2025")
  - Half-year: Year + half (e.g., "2025 H1")
  - Quarterly: Year-Q (e.g., "2025-Q1")
  - Monthly: YYYY-MM (e.g., "2025-01")

---

### 1.2 Customers KPI Card
**User-facing label:** "Customers"  
**Component:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` (lines 1248-1315)

**Metrics displayed:**
- **Current Period Customers** (`totalCustomers`)
  - Label: "This year"
  - Format: Number (e.g., "14.2k")
  - Location: Line 1288
  - Data source: Frontend-computed from `filteredCohorts`
  - Calculation: Lines 810-886 (`useMemo` hook)

- **Previous Period Customers** (`previousCustomers`)
  - Label: "Last year"
  - Format: Number (e.g., "12.4k")
  - Location: Line 1295
  - Data source: Frontend-computed from `filteredCohorts`
  - Calculation: Lines 810-886 (`useMemo` hook)

- **Delta Percentage & Amount**
  - Format: "+X.X% (Δ Y)"
  - Location: Lines 1268-1276
  - Calculation: `((totalCustomers - previousCustomers) / previousCustomers) * 100`

- **Trend Chart**
  - Component: `EnhancedTrendChart`
  - Data: `customersTrend.currentData` and `customersTrend.previousData`
  - Location: Lines 1301-1313
  - Source: `generateTrendDataFromCohorts('customers', currentPeriodKey)` (lines 452-555)

**Current vs Previous Period Logic:** Same as Revenue (lines 810-886)

---

### 1.3 Cohort Coverage KPI Card
**User-facing label:** "Cohort Coverage"  
**Component:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` (lines 1317-1490)

**Metrics displayed:**
- **Active Cohorts Count** (`cohortCoverage.activeCount`)
  - Format: Number (e.g., "18")
  - Location: Line 1339
  - Calculation: Lines 888-968 (`useMemo` hook)
  - Logic: Count of aggregated cohorts with revenue > 0
  - Data source: `getAggregatedCohorts` (lines 288-443)

- **Top Cohort Share** (`cohortCoverage.topCohortShare`)
  - Format: Percentage (e.g., "18.5%")
  - Location: Line 1381
  - Calculation: `(topCohortRevenue / totalRevenue) * 100` (line 954)
  - Revenue: `cohortCoverage.topCohortRevenue` (line 1383)

- **Top 3 Cohorts Share** (`cohortCoverage.top3Share`)
  - Format: Percentage (e.g., "15.2%")
  - Location: Line 1410
  - Calculation: `(top3Revenue / totalRevenue) * 100` (line 957)
  - Revenue: `cohortCoverage.top3Revenue` (line 1412)

- **Top 10 Cohorts Share** (`cohortCoverage.top10Share`)
  - Format: Percentage (e.g., "28.3%")
  - Location: Line 1439
  - Calculation: `(top10Revenue / totalRevenue) * 100` (line 960)
  - Revenue: `cohortCoverage.top10Revenue` (line 1441)

- **Others Share** (`cohortCoverage.othersShare`)
  - Format: Percentage (e.g., "38.0%")
  - Location: Line 1468
  - Calculation: `(othersRevenue / totalRevenue) * 100` (line 963)
  - Revenue: `cohortCoverage.othersRevenue` (line 1470)

**Data Source:**
- `getAggregatedCohorts` (lines 288-443)
- Aggregates cohorts by `viewMode`:
  - Annual: Groups by year
  - Half-year: Groups by year + half (H1/H2)
  - Quarterly: Groups by year-quarter
  - Monthly: Uses original cohort_month
- Pre-2020 cohorts grouped as "Pre-2020" for half-year view
- Revenue calculated as sum of all periods' `total_revenue` for each aggregated cohort

---

### 1.4 Top Cohorts Leaderboard
**User-facing label:** "Top Cohorts"  
**Component:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` (lines 1492-1558)

**Metrics displayed:**
- **Top 5 Cohorts by Revenue** (`getTopCohorts`)
  - Format: List with rank, cohort label, revenue, and share percentage
  - Location: Lines 1514-1556
  - Calculation: Lines 620-715 (`useMemo` hook)
  - Logic:
    1. For each cohort, sum revenue from periods matching `currentPeriodKey`
    2. Aggregate cohorts by `viewMode` (same as `getAggregatedCohorts`)
    3. Sort by revenue descending
    4. Take top 5
    5. Calculate share: `(cohort.revenue / totalRevenueInPeriod) * 100`
  - Data source: `filteredCohorts` filtered by `currentPeriodKey`

- **Cohorts Count** (`cohortsInCurrentPeriodCount`)
  - Format: "Top X of Y cohorts"
  - Location: Line 1507
  - Calculation: Lines 718-789 (`useMemo` hook)
  - Logic: Count of unique aggregated cohorts with revenue > 0 in current period

**Current Period Key:**
- Determined by `currentPeriodKey` (lines 558-617)
- Logic: Most recent period key from `filteredCohorts` (excluding "Pre-2020")
- Format depends on `viewMode`:
  - Annual: Year (e.g., "2025")
  - Half-year: "2025 H1" or "2025 H2"
  - Quarterly: "2025-Q1"
  - Monthly: "2025-01"

---

## 2. Revenue Cohort Trends Chart

**Component:** `components/charts/RevenueCohortsChart.tsx`

### 2.1 Chart Data
**Metrics displayed:**
- **Revenue by Cohort** (stacked bars)
  - Data: `cohortData` (lines 567-586)
  - Transformation: `transformCohortData` (lines 86-233)
  - Aggregation: Half-year buckets (unless `viewMode === 'annual'`)
  - Source: `cohorts` prop (from `filteredCohorts`)

- **New vs Returning Revenue** (alternative view)
  - Data: `transformNewReturningData` (lines 236-290)
  - New Revenue: `period_number === 0` (first purchase)
  - Returning Revenue: `period_number > 0` (repeat purchases)
  - Aggregation: Half-year buckets (unless `viewMode === 'annual'`)

- **Total Revenue per Period**
  - Calculated: Sum of all cohort revenue for each period
  - Displayed: Above bars (lines 1217-1221) and below bars (lines 1223-1227)

### 2.2 CAGR Display
**User-facing label:** "{yearRange} CAGR"  
**Location:** Lines 1009-1021

**Current Calculation:**
- Function: `cagrData` useMemo (lines 720-825)
- Logic:
  1. Filter to complete cohorts only:
     - Exclude pre-2020 (≤ 2019)
     - Exclude current year if incomplete (annual view)
     - Exclude current half-year if incomplete (half-year view)
  2. Get first and last complete cohort labels
  3. Sum total revenue for each cohort (all periods)
  4. Calculate years difference: `(lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25)`
  5. CAGR formula: `((lastRevenue / firstRevenue) ^ (1 / yearsDiff)) - 1) * 100`

**Issue:** CAGR uses cohort lifetime totals, not trend chart series data

---

## 3. Cohort Matrix

**Component:** `components/charts/CohortMatrix.tsx`

### 3.1 Matrix Cells
**Metrics displayed:**
- **Revenue per Cohort-Period**
  - Format: Currency (e.g., "$5.6m")
  - Location: Lines 652-653
  - Calculation: `generateMatrixData` (lines 81-214)
  - Source: `cohort.periods[period_number].total_revenue`

- **Retention Rate**
  - Format: Percentage (e.g., "65.0%")
  - Location: Lines 655-661
  - Calculation: `(periodRevenue / originalRevenue) * 100` (line 162)
  - Original Revenue: Period 0 revenue for the cohort

- **Percentile** (for color mapping)
  - Calculation: `calculatePercentile` (lines 56-78)
  - Logic: Interpolated percentile within period column
  - Used for: Color intensity (darker = higher retention)

### 3.2 Total Revenue Row
**Metrics displayed:**
- **Total Revenue per Period**
  - Format: Currency
  - Location: Lines 699-713
  - Calculation: Sum of all cohorts' revenue for each period
  - Source: `matrixData[cohort][period].revenue`

---

## 4. Data Sources

### 4.1 API Endpoint
**Route:** `/api/metrics/cohorts`  
**File:** `app/api/metrics/cohorts/route.ts`

**Response Structure:**
```typescript
{
  success: boolean;
  data: {
    cohorts: Array<{
      cohort_month: string;        // YYYY-MM format
      cohort_size: number;
      periods: Array<{
        period_number: number;      // 0 = acquisition period
        order_month: string;        // YYYY-MM format
        active_customers: number;
        total_orders: number;
        total_revenue: number;
        retention_rate_percent: number;
      }>;
    }>;
    total_cohorts: number;
    calculated_at: string;
  };
}
```

**Data Source:** `mv_cohorts` materialized view (SQL)  
**SQL File:** `supabase/migrations/006_create_metric_views.sql` (lines 80-121)

**SQL Logic:**
- Groups customers by `DATE_TRUNC('month', first_order_at)` as `cohort_month`
- Groups orders by `DATE_TRUNC('month', source_created_at)` as `order_month`
- Calculates `period_number` as `EXTRACT(month FROM AGE(order_month, cohort_month))`
- Aggregates: `active_customers`, `total_orders`, `total_revenue`, `retention_rate_percent`

---

## 5. Frontend Computations

### 5.1 Date Range Filtering
**Function:** `filteredCohorts` (lines 155-201)  
**Logic:**
- If `dateRange` is set: Filter periods where `order_month` falls within range
- Keep cohorts with at least one period in range
- Edge case: If no cohorts match, return closest cohort with extended range

### 5.2 Cohort Aggregation
**Function:** `getAggregatedCohorts` (lines 288-443)  
**Logic:**
- Groups cohorts by `viewMode`:
  - Annual: Year only
  - Half-year: Year + H1/H2
  - Quarterly: Year-Q
  - Monthly: Original format
- Aggregates revenue and customers across grouped cohorts
- Pre-2020 grouping for half-year view

### 5.3 Trend Data Generation
**Function:** `generateTrendDataFromCohorts` (lines 452-555)  
**Logic:**
- Collects all unique time periods from all cohorts
- Aggregates revenue/customers by period across all cohorts
- For each period:
  - Current: Revenue in this period
  - Previous: Revenue in equivalent period from previous year
- Uses `getPreviousPeriodKey` to determine previous period

### 5.4 Previous Period Key Calculation
**Function:** `getPreviousPeriodKey` (lines 258-285)  
**Logic:**
- Annual: `year - 1`
- Half-year: Previous half (H2 → H1, H1 → previous year H2)
- Quarterly: Previous quarter (Q1 → previous year Q4, etc.)
- Monthly: Previous month

---

## 6. Canonical Definitions (TO BE IMPLEMENTED)

### 6.1 Current Period vs Previous Period

**Rule Set:**

1. **When `dateRange` is present:**
   - **Current Period:** All revenue/customers where `order_month` falls within `dateRange`
   - **Previous Period:** All revenue/customers where `order_month` falls within `getPreviousPeriodRange(dateRange)`
   - **Previous Range Calculation:** Equal-length period immediately before the selected range
   - **Incomplete Periods:** Include all data available in the range (no filtering for completeness)

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
   - Previous period uses `getPreviousPeriodKey` logic
   - Incomplete periods: Current period included if it has data

5. **Incomplete Cohorts Handling:**
   - Always include cohorts with at least one period of data
   - Do not exclude incomplete cohorts from calculations
   - For CAGR: Exclude incomplete periods (current year/half-year) from CAGR calculation

### 6.2 Revenue CAGR

**Canonical Definition:**

CAGR should be calculated from the **same series data shown in the trend chart**, not from cohort lifetime totals.

**Formula:**
```
CAGR = ((End / Start) ^ (1 / years)) - 1
```

Where:
- **Start:** First non-zero value in `trendData.currentData` array
- **End:** Last non-zero value in `trendData.currentData` array
- **years:** Time difference between first and last periods (in years)
  - Annual: `(lastYear - firstYear)`
  - Half-year: `(lastYear - firstYear) + (lastHalf - firstHalf) / 2`
  - Quarterly: `(lastYear - firstYear) + (lastQuarter - firstQuarter) / 4`
  - Monthly: `(lastYear - firstYear) + (lastMonth - firstMonth) / 12`

**Exclusions:**
- Exclude "Pre-2020" periods
- Exclude current incomplete period (if current year/half-year is incomplete)
- Use only complete periods for CAGR calculation

**Alignment:**
- CAGR must match the exact time window shown in the trend chart
- If trend chart shows 2020-2024, CAGR should use 2020-2024 data
- CAGR should reflect the same aggregation mode as the chart (half-year unless annual)

---

## 7. Issues Identified

### 7.1 CAGR Calculation Mismatch
**Issue:** CAGR currently uses cohort lifetime totals instead of trend chart series data  
**Location:** `components/charts/RevenueCohortsChart.tsx` lines 720-825  
**Impact:** CAGR may not match what users see in the trend chart  
**Fix Required:** Calculate CAGR from `trendData.currentData` array instead

### 7.2 Inconsistent Period Comparison Logic
**Issue:** Multiple comparison methods depending on filters/dateRange  
**Location:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` lines 810-886  
**Impact:** Users may see different comparisons for the same data  
**Fix Required:** Document and standardize canonical rules (see Section 6.1)

### 7.3 Missing Documentation
**Issue:** Formulas and calculation logic not documented in code  
**Impact:** Difficult to maintain and verify correctness  
**Fix Required:** Add inline comments documenting formulas and canonical definitions

---

## 8. Deliverables Summary

### A) Complete Metric Sheet
✅ This document lists all metrics displayed on `/retention-ltv/revenue-cohorts`

### B) Canonical Definition for Current vs Previous Period
✅ See Section 6.1

### C) Canonical Definition for Revenue CAGR
✅ See Section 6.2

### D) Patch Plan
See implementation files for code changes


