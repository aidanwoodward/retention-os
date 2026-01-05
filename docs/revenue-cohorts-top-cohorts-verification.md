# Revenue Cohorts Top Cohorts Helper - Verification

## 1. Full Implementation of `getCohortRevenuesForCurrentPeriod()`

**Location:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`, lines 560-655

```typescript
/**
 * CANONICAL DEFINITION: Get Cohort Revenues for Current Period
 * 
 * Calculates revenue per cohort for the Current Period only, ensuring alignment with
 * the canonical Current Period definition used by totalRevenue.
 * 
 * Time Window Logic (matches totalRevenue calculation):
 * - When dateRange is present: Filters revenue where order_month falls within dateRange
 *   (same as totalRevenue when dateRange exists)
 * - When dateRange is absent: Filters revenue where periodKey matches currentPeriodKey
 *   (last complete period from trend chart, excluding Pre-2020)
 *   (same as totalRevenue when dateRange is absent - uses last trend data point)
 * 
 * This ensures all "Top cohort" metrics and share calculations use the same time window
 * as totalRevenue, providing consistent metrics across the page.
 * 
 * Returns: Array of { label: string, revenue: number } sorted by revenue descending
 */
const getCohortRevenuesForCurrentPeriod = React.useMemo(() => {
  if (filteredCohorts.length === 0) {
    return [];
  }

  const cohortRevenues: Array<{ label: string; revenue: number }> = [];

  filteredCohorts.forEach((cohort) => {
    // Determine cohort label based on viewMode
    let cohortLabel: string;
    const cohortDate = new Date(cohort.cohort_month);
    
    if (viewMode === 'annual') {
      cohortLabel = cohortDate.getFullYear().toString();
    } else if (viewMode === 'quarterly') {
      const year = cohortDate.getFullYear();
      const quarter = Math.floor(cohortDate.getMonth() / 3) + 1;
      cohortLabel = `${year}-Q${quarter}`;
    } else {
      cohortLabel = cohort.cohort_month;
    }
    
    // Sum revenue from periods that match the Current Period
    let revenueInPeriod = 0;
    
    if (dateRange) {
      // When dateRange is present: filter by dateRange (same logic as totalRevenue)
      cohort.periods.forEach((period) => {
        const orderDate = new Date(period.order_month);
        if (isDateInRange(orderDate, dateRange)) {
          revenueInPeriod += period.total_revenue;
        }
      });
    } else {
      // When dateRange is absent: filter by currentPeriodKey (last complete period)
      // currentPeriodKey is calculated separately and represents the last period
      // from the trend chart (excluding Pre-2020)
      if (!currentPeriodKey) {
        return; // Skip if no current period key available
      }
      
      cohort.periods.forEach((period) => {
        const orderDate = new Date(period.order_month);
        let periodKey: string;
        
        if (viewMode === 'annual') {
          periodKey = orderDate.getFullYear().toString();
        } else if (viewMode === 'quarterly') {
          const year = orderDate.getFullYear();
          const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
          periodKey = `${year}-Q${quarter}`;
        } else {
          periodKey = period.order_month;
        }
        
        if (periodKey === currentPeriodKey) {
          revenueInPeriod += period.total_revenue;
        }
      });
    }
    
    if (revenueInPeriod > 0) {
      // Check if cohort already exists (for aggregated cohorts like Pre-2020)
      const existing = cohortRevenues.find(c => c.label === cohortLabel);
      if (existing) {
        existing.revenue += revenueInPeriod;
      } else {
        cohortRevenues.push({
          label: cohortLabel,
          revenue: revenueInPeriod
        });
      }
    }
  });
  
  // Sort by revenue descending
  return cohortRevenues.sort((a, b) => b.revenue - a.revenue);
}, [filteredCohorts, viewMode, dateRange, currentPeriodKey, isDateInRange]);
```

---

## 2. Function/Block That Determines "Last Complete Period"

**Location:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`, lines 511-558

```typescript
// Get the current period key (e.g., "2025" for annual, "2025-Q4" for quarterly)
const currentPeriodKey = React.useMemo(() => {
  if (filteredCohorts.length === 0) return '';
  
  const periodRevenueMap = new Map<string, { revenue: number; customers: number }>();
  
  filteredCohorts.forEach((cohort) => {
    cohort.periods.forEach((period) => {
      const orderDate = new Date(period.order_month);
      let periodKey: string;
      
      if (viewMode === 'annual') {
        periodKey = orderDate.getFullYear().toString();
      } else if (viewMode === 'quarterly') {
        const year = orderDate.getFullYear();
        const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
        periodKey = `${year}-Q${quarter}`;
      } else {
        periodKey = period.order_month;
      }
      
      if (!periodRevenueMap.has(periodKey)) {
        periodRevenueMap.set(periodKey, { revenue: 0, customers: 0 });
      }
    });
  });
  
  const sortedPeriods = Array.from(periodRevenueMap.keys()).sort((a, b) => {
    if (viewMode === 'annual') {
      return parseInt(a) - parseInt(b);
    } else if (viewMode === 'quarterly') {
      const [yearA, quarterA] = a.split('-Q');
      const [yearB, quarterB] = b.split('-Q');
      const yearANum = parseInt(yearA);
      const yearBNum = parseInt(yearB);
      if (yearANum !== yearBNum) return yearANum - yearBNum;
      return parseInt(quarterA) - parseInt(quarterB);
    } else {
      return a.localeCompare(b);
    }
  });
  
  const periodsForComparison = sortedPeriods.filter(key => 
    !key.startsWith('Pre-') && !key.startsWith('≤')
  );
  
  return periodsForComparison[periodsForComparison.length - 1] || '';
}, [filteredCohorts, viewMode]);
```

**Logic:**
- Collects all unique period keys from `filteredCohorts`
- Sorts periods chronologically based on `viewMode`:
  - **Annual:** Integer year comparison (e.g., "2024" < "2025")
  - **Quarterly:** Year first, then quarter (e.g., "2024-Q1" < "2024-Q2" < "2025-Q1")
  - **Monthly:** String comparison (e.g., "2024-01" < "2024-02")
- Filters out "Pre-2020" and "≤" prefixed periods
- Returns the **last** period key from the sorted, filtered list

---

## 3. Exact Code That Computes Active Cohorts Count

**Location:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`, lines 877-878

```typescript
// Count active cohorts (with >0 revenue in Current Period)
const activeCount = cohortRevenues.filter(c => c.revenue > 0).length;
```

Where `cohortRevenues = getCohortRevenuesForCurrentPeriod` (line 855)

---

## 4. Exact Code That Computes Total Revenue Denominator for Shares

**Location:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`, lines 880-883

```typescript
// Total revenue is sum of all cohorts' revenue in Current Period
// This matches the totalRevenue calculation when dateRange is absent
// (when dateRange is present, totalRevenue uses dateRange directly)
const totalRevenue = cohortRevenues.reduce((sum, c) => sum + c.revenue, 0);
```

Where `cohortRevenues = getCohortRevenuesForCurrentPeriod` (line 855)

**Used for share calculations:**
- Line 917: `topCohortShare: (topCohortRevenue / totalRevenue) * 100`
- Line 920: `top3Share: (top3Revenue / totalRevenue) * 100`
- Line 923: `top10Share: (top10Revenue / totalRevenue) * 100`
- Line 926: `othersShare: (othersRevenue / totalRevenue) * 100`

---

## 5. Verification Confirmation

### ✅ What "last complete period" means for monthly/quarterly/annual:

- **Monthly:** Last month (YYYY-MM format) that appears in `filteredCohorts`, excluding Pre-2020 periods. Example: If data contains "2024-01" through "2024-12", returns "2024-12".
- **Quarterly:** Last quarter (YYYY-QN format) that appears in `filteredCohorts`, excluding Pre-2020 periods. Example: If data contains "2024-Q1" through "2024-Q4", returns "2024-Q4".
- **Annual:** Last year (YYYY format) that appears in `filteredCohorts`, excluding Pre-2020 periods. Example: If data contains "2020" through "2024", returns "2024".

**Note:** "Complete" here means the period exists in the data (has at least one period entry), not that it's necessarily a complete calendar period. The function does not check if a period is "incomplete" (e.g., current month/quarter/year in progress).

### ✅ Shares denominator equals the same totalRevenue window:

**When `dateRange` is present:**
- `getCohortRevenuesForCurrentPeriod`: Filters by `dateRange` using `isDateInRange()` (lines 603-610)
- `totalRevenue` (from KPI cards): Filters by `dateRange` using `isDateInRange()` (lines 791-792)
- **✅ ALIGNED:** Both use the same `dateRange` filter

**When `dateRange` is absent:**
- `getCohortRevenuesForCurrentPeriod`: Filters by `currentPeriodKey` (last period from sorted list, lines 611-637)
- `totalRevenue` (from KPI cards): Uses last data point from `revenueTrendData.currentData[lastIndex]` (line 835)
- `revenueTrendData`: Generated by `generateTrendDataFromCohorts('revenue', currentPeriodKey)` (line 721)
- `generateTrendDataFromCohorts`: Uses same period key generation logic as `currentPeriodKey`:
  - Same period key format (lines 435-443 match lines 522-530)
  - Same sorting logic (lines 455-472 match lines 538-551)
  - Same Pre-2020 filtering (lines 474-477 match lines 553-555)
- **✅ ALIGNED:** Both `currentPeriodKey` and `revenueTrendData.currentData[lastIndex]` represent the last period from the same sorted, filtered list of periods from `filteredCohorts`. The period key generation, sorting, and filtering logic are identical.

### ✅ Active cohorts count matches the cohort set shown in the UI:

- **Active Cohorts Count:** `cohortRevenues.filter(c => c.revenue > 0).length` (line 878)
- **UI Display:** Shows "Top X of Y cohorts" where Y = `cohortsInCurrentPeriodCount` (line 1449)
- **`cohortsInCurrentPeriodCount`:** Uses `getCohortRevenuesForCurrentPeriod` and filters for >0 revenue (lines 930-933)
- **✅ ALIGNED:** Both use the same `getCohortRevenuesForCurrentPeriod` helper and same filtering logic

---

## 6. Verification Result: No Mismatch Found

### Alignment Confirmed: `currentPeriodKey` and `revenueTrendData.currentData[lastIndex]`

**Analysis:**
- `revenueTrendData` is generated by `generateTrendDataFromCohorts('revenue', currentPeriodKey)` (line 721)
- `generateTrendDataFromCohorts()` uses the same period key generation logic as `currentPeriodKey`:
  - **Period Key Format:** Identical (lines 435-443 vs 522-530)
  - **Sorting Logic:** Identical (lines 455-472 vs 538-551)
  - **Pre-2020 Filtering:** Identical (lines 474-477 vs 553-555)
- Both operate on the same `filteredCohorts` data source
- Both return the last period from the sorted, filtered list

**Conclusion:** ✅ **ALIGNED** - `currentPeriodKey` and `revenueTrendData.currentData[lastIndex]` represent the same period. No changes needed.

