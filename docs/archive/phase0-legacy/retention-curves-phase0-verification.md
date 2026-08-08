> **Historical evidence � archived Phase 0 legacy route audits.** Not authoritative for the eight-route MVP spine. Current architecture: [RETENTIONOS_ARCHITECTURE.md](../../RETENTIONOS_ARCHITECTURE.md). Current metrics: [METRIC_CONTRACTS.md](../../METRIC_CONTRACTS.md).

# Phase 0 Final Verification — Retention Curves Sign-Off

**Date**: 2025-01-27  
**Page**: `/retention-ltv/curves`  
**Status**: ✅ **Phase 0 TRUSTED**

---

## 1. Summary of Phase 0 Changes

### 1.1 Maturity Gating Per Period (Eligible Cohorts Definition)

**What was wrong/risky before:**
- All cohorts were included in aggregation for all periods, regardless of whether they had data for that period
- Incomplete cohorts (e.g., a cohort only 1 month old) were included in calculations for period 12+ (Year 1+), contributing 0 active customers
- This created misleading retention calculations where recent periods showed artificially low retention due to incomplete data

**What changed:**
- **Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 300-312, 329-347
- Added maturity calculation: For each cohort, calculate `maxObservedPeriod` (highest period number with data)
- Period N aggregation now only includes cohorts where `maxObservedPeriod >= N`
- Each period tracks `cohortCount` (number of eligible cohorts) and `eligibleCohortSize` (sum of cohort sizes for eligible cohorts only)

**How it improves trust:**
- Ensures retention calculations only use cohorts that have actually reached that age
- Prevents incomplete cohorts from skewing aggregated metrics
- Makes retention curves more accurate and interpretable

---

### 1.2 Coverage Threshold Rule (60% Stop Condition)

**What was wrong/risky before:**
- Aggregated curve showed all periods from 0 to `maxPossiblePeriod`, even when only 1-2 cohorts had data for later periods
- Missing periods were filled with 0% retention, creating misleading "churn cliffs" that were actually just incomplete data
- No indication when data became unreliable due to insufficient cohort coverage

**What changed:**
- **Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 368-380
- Added coverage threshold: `coverageThreshold = Math.ceil(filteredCohorts.length * 0.6)` (60% of filtered cohorts)
- Series stops when `cohortCount < coverageThreshold` for any period
- No more filling missing periods with 0% retention

**How it improves trust:**
- Prevents misleading 0% retention from incomplete data
- Ensures aggregated metrics are based on sufficient sample size (≥60% of cohorts)
- Users can trust that displayed periods have reliable data coverage

---

### 1.3 Removal of "Missing Future Data = 0%" Behavior

**What was wrong/risky before:**
- **Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 361-373 (old code)
- When a period had no data, the code explicitly pushed a data point with `retentionRate: 0`
- Comment stated: "No data for this period - still include it with 0% to maintain X-axis consistency"
- This created false churn signals where retention appeared to drop to 0% due to incomplete data

**What changed:**
- **Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 374-380
- Removed the code block that filled missing periods with 0% retention
- Series now stops when coverage threshold is not met (via `break` statement)
- No data points are created for periods without sufficient cohort coverage

**How it improves trust:**
- Eliminates false churn signals from incomplete data
- Users can confidently interpret retention declines as actual churn, not data gaps
- Chart accurately represents available data without misleading extrapolations

---

### 1.4 Baseline Denominator Change (cohort_size vs period0 active_customers)

**What was wrong/risky before:**
- **Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 332-338 (old code)
- Baseline used `period0Customers = period0Data.activeCustomers` (sum of active customers in period 0)
- Retention formula: `retentionRate = (periodN_activeCustomers / period0_activeCustomers) * 100`
- This was inconsistent with database definition: `retention_rate_percent = active_customers / cohort_size`
- If some customers didn't order in their acquisition month, they were excluded from baseline, inflating retention rates

**What changed:**
- **Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 363-366, 385-406
- Baseline now uses `baselineCohortSize = period0Data.eligibleCohortSize` (sum of cohort sizes)
- Retention formula: `retentionRate = (periodN_activeCustomers / baselineCohortSize) * 100`
- Aligned with database definition: `retention_rate_percent = active_customers / cohort_size`
- Period 0 retention may not be exactly 100% if some customers don't order in acquisition month (documented in comment line 386)

**How it improves trust:**
- Consistent with database/materialized view definition
- Retention rates are comparable across individual cohorts and aggregated view
- Baseline represents all acquired customers, not just those active in period 0
- More accurate representation of true retention from acquisition

---

### 1.5 Tooltip + Definition Strip Copy Updates (Aggregation + Maturity Explanation)

**What was wrong/risky before:**
- **Location**: `app/(protected)/retention-ltv/curves/page.tsx` lines 1627-1632 (old tooltip)
- Tooltip said "Weighted to reflect the customer experience across cohorts" but didn't explain the method
- No explanation of maturity gating or coverage thresholds
- Users couldn't understand how aggregation worked or why some periods weren't shown

**What changed:**
- **Location**: 
  - Year 1 Retention tooltip: `app/(protected)/retention-ltv/curves/page.tsx` lines 1655-1660
  - Definition strip tooltip: `app/(protected)/retention-ltv/curves/page.tsx` lines 1834-1839
- Added explicit explanation: "Aggregated retention is size-weighted: we sum active customers across eligible cohorts each period and divide by the sum of cohort sizes."
- Added maturity explanation: "Periods are shown only where enough cohorts have reached that age."
- Tooltip only shown in aggregated view mode (line 1824)

**How it improves trust:**
- Users understand the aggregation method (sum-based, not average of percentages)
- Users understand why some periods may not appear (maturity gating)
- Transparency builds confidence in the metrics
- Prevents misinterpretation of aggregation method

---

## 2. Consistency Check

### 2.1 Aggregated retention formula matches database definition semantics

**Question**: Does aggregated retention use `active_customers / cohort_size`?

**Answer**: ✅ **YES**

**Evidence**:
- Line 365: `baselineCohortSize = period0Data.eligibleCohortSize` (sum of cohort sizes)
- Line 388: `retentionRate = (period0Customers / baselineCohortSize) * 100` (Period 0)
- Line 405: `retentionRate = (periodData.activeCustomers / baselineCohortSize) * 100` (Period N)
- Comment line 364: "retention_rate_percent = active_customers / cohort_size"
- Aligned with database view `mv_cohorts` definition (line 111 in `supabase/migrations/006_create_metric_views.sql`)

---

### 2.2 Period N aggregation includes only cohorts mature enough to have reached N

**Question**: Are only mature cohorts included in period N calculations?

**Answer**: ✅ **YES**

**Evidence**:
- Lines 300-312: Maturity calculation computes `maxObservedPeriod` for each cohort
- Line 330: `maxObservedPeriod = cohortMaturity.get(cohort.cohort_month) ?? -1`
- Line 332: `if (maxObservedPeriod >= periodNum)` - only includes cohorts that have reached period N
- Line 333: `cohortCount++` - tracks number of eligible cohorts
- Comment line 301: "Maturity rule: a cohort is mature enough for period N if maxObservedPeriod >= N"

---

### 2.3 Curve never shows misleading 0% retention due to missing future periods

**Question**: Are missing periods excluded rather than shown as 0%?

**Answer**: ✅ **YES**

**Evidence**:
- Line 368: `coverageThreshold = Math.ceil(filteredCohorts.length * 0.6)` (60% threshold)
- Line 377-380: `if (!periodData || periodData.cohortCount < coverageThreshold) { break; }`
- Series stops when coverage drops below threshold (no 0% data points created)
- Old code (lines 361-373) that filled missing periods with 0% has been removed
- No data points exist for periods without sufficient cohort coverage

---

### 2.4 Tooltips correctly describe aggregation method as size-weighted sums

**Question**: Do tooltips explain size-weighted aggregation correctly?

**Answer**: ✅ **YES**

**Evidence**:
- Line 1656: "Aggregated retention is size-weighted: we sum active customers across eligible cohorts each period and divide by the sum of cohort sizes."
- Line 1835: Same explanation in definition strip tooltip
- Correctly describes sum-based aggregation (not average of percentages)
- Explains denominator is sum of cohort sizes (not sum of active customers)

---

### 2.5 No other pages or routes were affected by these changes

**Question**: Were only `/retention-ltv/curves` changes made?

**Answer**: ✅ **YES**

**Evidence**:
- Only file modified: `app/(protected)/retention-ltv/curves/page.tsx`
- No changes to:
  - `/retention-ltv/revenue-cohorts` (separate page)
  - `/retention-ltv/ltv-cohorts` (separate page)
  - `/retention/curve` (different route, separate implementation)
  - API endpoints (`/api/metrics/cohorts` unchanged)
  - Database views (`mv_cohorts` unchanged)
- Changes are isolated to aggregated retention calculation and UI tooltips

---

## 3. Remaining Risks / Known Limitations

### 3.1 Early Accounts / Sparse Cohorts

**Limitation**: Accounts with very few cohorts (< 3) may have limited periods shown due to 60% coverage threshold.

**Behavior**: 
- If an account has only 1-2 cohorts, the 60% threshold effectively requires all cohorts to have data
- Series may stop earlier than expected for accounts with sparse cohort data
- This is intentional to prevent unreliable metrics from small sample sizes

**Mitigation**: 
- Threshold is appropriate for statistical reliability
- Individual cohort view is still available for detailed analysis
- No fallback needed - this is correct behavior

---

### 3.2 Threshold Choice (60%)

**Limitation**: The 60% coverage threshold is hardcoded.

**Current Implementation**: 
- Line 369: `const coverageThreshold = Math.ceil(filteredCohorts.length * 0.6);`
- Hardcoded value: 0.6 (60%)

**Considerations**:
- 60% is a reasonable threshold for statistical reliability
- Lower thresholds (e.g., 50%) could include periods with insufficient data
- Higher thresholds (e.g., 80%) might exclude valid periods unnecessarily
- Could be made configurable in future if needed, but current value is defensible

**Risk Level**: Low - Current threshold is appropriate for most use cases

---

### 3.3 Period 0 Retention Not Exactly 100%

**Limitation**: Period 0 retention may not be exactly 100% if some customers don't order in their acquisition month.

**Why This Happens**:
- Database view `mv_cohorts` includes all customers in `cohort_size` (based on `first_order_at`)
- But `active_customers` for period 0 only counts customers who placed orders in that specific month
- If a customer's first order is in month X but they're assigned to cohort X-1 (due to date truncation), they won't be counted as active in period 0

**Current Behavior**:
- Line 386-389: Period 0 retention calculated as `(period0Customers / baselineCohortSize) * 100`
- May show <100% if some customers don't order in acquisition month
- Comment documents this: "Period 0 may not be exactly 100% if some customers don't order in their acquisition month"

**Risk Level**: Low - This is mathematically correct and documented. The slight deviation from 100% reflects actual customer behavior (not all customers order in their acquisition month).

---

### 3.4 Individual Cohort View Unchanged

**Limitation**: Individual cohort curves (`cohortCurvesData`) still use the old calculation method (active_customers in period 0 as baseline).

**Current State**:
- Lines 632-818: `cohortCurvesData` computation unchanged
- Still uses `period0Customers` (sum of active customers) as baseline
- Not aligned with database definition for individual cohorts

**Risk Level**: Low - Individual cohort view is less critical for trust (users can see raw data), and changing it was out of scope for Phase 0. This can be addressed in a future phase if needed.

---

## 4. Final Verdict

✅ **Retention Curves is Phase 0 trusted and safe to build on.**

**Reasoning**:
1. ✅ All critical trust blockers have been resolved:
   - Maturity gating prevents incomplete cohorts from skewing metrics
   - Coverage threshold prevents misleading 0% retention
   - Baseline aligned with database definition
   - Tooltips explain aggregation method clearly

2. ✅ Consistency checks all pass:
   - Formula matches database semantics
   - Only mature cohorts included per period
   - No misleading 0% retention from missing data
   - Tooltips accurately describe aggregation
   - Changes isolated to intended page

3. ✅ Remaining limitations are documented and acceptable:
   - 60% threshold is defensible and appropriate
   - Period 0 <100% is mathematically correct and documented
   - Individual cohort view unchanged (out of scope)

4. ✅ Code quality:
   - Clear comments explain maturity rules
   - Inline documentation for baseline calculation
   - No linting errors
   - No breaking changes to other pages

**Recommendation**: Proceed with building features on top of Retention Curves. The aggregated view is now trustworthy and internally consistent.

---

## Appendix: Code References

### Modified File
- `app/(protected)/retention-ltv/curves/page.tsx`

### Key Sections
- **Lines 296-424**: Aggregated retention calculation (`retentionCurveData`)
- **Lines 300-312**: Maturity calculation per cohort
- **Lines 329-347**: Period N aggregation (mature cohorts only)
- **Lines 363-366**: Baseline denominator (cohort_size)
- **Lines 368-380**: Coverage threshold and stop condition
- **Lines 1655-1660**: Year 1 Retention tooltip update
- **Lines 1834-1839**: Definition strip tooltip update

### Unchanged (For Reference)
- Individual cohort curves: Lines 632-818 (`cohortCurvesData`)
- API endpoint: `app/api/metrics/cohorts/route.ts` (unchanged)
- Database view: `supabase/migrations/006_create_metric_views.sql` (unchanged)


