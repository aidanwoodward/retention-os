# Cohort Pages V1 Filter Compliance

**Date:** 2025-01-27  
**Status:** ✅ Complete

---

## Summary

All cohort analytics pages now comply with V1 filter policy:
- ✅ Only show filters that are parsed and applied by the API
- ✅ Demo data is never returned in production
- ✅ Demo data is clearly labeled when shown in development

---

## Filter Changes: Before vs After

### Revenue Cohorts (`/retention-ltv/revenue-cohorts`)

**Before:**
- ❌ `geography` (checkbox) - **IGNORED by API**
- ✅ `cohortType` (select) - Supported
- ✅ `dateRange` (date-range) - Supported
- ❌ `customerSegment` (checkbox) - **IGNORED by API**
- ❌ `productCategory` (checkbox) - **IGNORED by API**
- ❌ `customerType` (checkbox) - **IGNORED by API**

**After:**
- ✅ `cohortType` (select) - Supported
- ✅ `dateRange` (date-range) - Supported

**Removed:** `geography`, `customerSegment`, `productCategory`, `customerType`

---

### Retention Curves (`/retention-ltv/curves`)

**Before:**
- ❌ `geography` (checkbox) - **IGNORED by API**
- ✅ `cohortType` (select) - Supported
- ✅ `dateRange` (date-range) - Supported
- ❌ `customerSegment` (checkbox) - **IGNORED by API**
- ❌ `productCategory` (checkbox) - **IGNORED by API**
- ❌ `customerType` (checkbox) - **IGNORED by API**

**After:**
- ✅ `cohortType` (select) - Supported
- ✅ `dateRange` (date-range) - Supported

**Removed:** `geography`, `customerSegment`, `productCategory`, `customerType`

---

### LTV Curves (`/retention-ltv/ltv-cohorts`)

**Before:**
- ❌ `geography` (checkbox) - **IGNORED by API**
- ✅ `cohortType` (select) - Supported
- ✅ `dateRange` (date-range) - Supported
- ❌ `customerSegment` (checkbox) - **IGNORED by API**
- ❌ `productCategory` (checkbox) - **IGNORED by API**
- ❌ `customerType` (checkbox) - **IGNORED by API**

**After:**
- ✅ `cohortType` (select) - Supported
- ✅ `dateRange` (date-range) - Supported

**Removed:** `geography`, `customerSegment`, `productCategory`, `customerType`

---

## API Changes

### `/api/metrics/cohorts`

**Before:**
- ❌ Returned dummy data in production when no data found
- ❌ No flag to indicate demo data
- ❌ Dummy data returned silently in development

**After:**
- ✅ **Production:** Returns empty state (`cohorts: []`) when no data found
- ✅ **Development:** Returns dummy data with `is_demo: true` flag
- ✅ **Production:** Never returns dummy data (requires authentication)
- ✅ All responses include `is_demo` flag (true/false)

**Response Structure:**
```typescript
{
  success: true,
  data: {
    cohorts: CohortData[],
    total_cohorts: number,
    calculated_at: string,
    is_demo: boolean  // NEW: true when showing demo data
  }
}
```

---

## URL Parameter Cleaning

All three pages now automatically clean URL parameters on mount:

**Supported Parameters:**
- `cohortType` - Cohort aggregation type (monthly/quarterly/annual)
- `dateRange` - Date range filter (format: `from:to`)
- `limit` - Result limit (API parameter)
- `cohort_month` - Specific cohort filter (API parameter)

**Removed Parameters:**
- `geography` - Removed from URL if present
- `productCategory` - Removed from URL if present
- `customerSegment` - Removed from URL if present
- `customerType` - Removed from URL if present
- Any other unsupported parameters

**Implementation:**
- Runs on component mount and when `searchParams` change
- Uses `router.replace()` to clean URL without adding history entry
- Defaults `cohortType` to `'annual'` if not present

---

## Demo Data Banner

All three pages now show a banner when demo data is displayed:

**Banner Appearance:**
- Amber/yellow styling (amber-50 background, amber-200 border)
- AlertTriangle icon
- Clear messaging: "Demo data — no real cohorts found"
- Explanation text

**Banner Logic:**
- Only shown when `is_demo === true` in API response
- Matches Repeat Rates page styling and messaging
- Positioned between FilterBar and main content

**Example Banner:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Demo data — no real cohorts found                  │
│                                                         │
│     No real cohort data is available. This page is     │
│     showing demo data for development purposes only.   │
│     All metrics are simulated and should not be used   │
│     for decision-making.                               │
└─────────────────────────────────────────────────────────┘
```

---

## Filter Verification

### Proof That Every Visible Filter Affects Output

**`cohortType` Filter:**
- ✅ Parsed by API: `searchParams.get('cohortType')`
- ✅ Applied: Frontend uses `cohortType` to determine view mode (monthly/quarterly/annual)
- ✅ Affects output: Changes how cohorts are aggregated and displayed

**`dateRange` Filter:**
- ✅ Parsed by API: `searchParams.get('dateRange')`
- ✅ Applied: Frontend filters cohorts by date range
- ✅ Affects output: Only shows cohorts/periods within selected date range

**Removed Filters (No Longer Visible):**
- ❌ `geography` - Not parsed by API, removed from UI
- ❌ `productCategory` - Not parsed by API, removed from UI
- ❌ `customerSegment` - Not parsed by API, removed from UI
- ❌ `customerType` - Not parsed by API, removed from UI

---

## Files Changed

### Filter Configurations
- `lib/filters/config.ts`
  - Added: `revenueCohortsV1Filters`
  - Added: `retentionCurvesV1Filters`
  - Added: `ltvCurvesV1Filters`

### API Route
- `app/api/metrics/cohorts/route.ts`
  - Fixed: Never returns dummy data in production
  - Added: `is_demo` flag in all responses
  - Fixed: Returns empty state in production when no data

### Pages
- `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`
  - Updated: Uses `revenueCohortsV1Filters`
  - Added: URL parameter cleaning
  - Added: Demo data banner
  - Added: `isDemo` state tracking

- `app/(protected)/retention-ltv/curves/page.tsx`
  - Updated: Uses `retentionCurvesV1Filters`
  - Added: URL parameter cleaning
  - Added: Demo data banner
  - Added: `isDemo` state tracking

- `app/(protected)/retention-ltv/ltv-cohorts/page.tsx`
  - Updated: Uses `ltvCurvesV1Filters`
  - Added: URL parameter cleaning
  - Added: Demo data banner
  - Added: `isDemo` state tracking
  - Removed: Client-side dummy data fallback (now handled by API)

---

## Verification Checklist

### Filter Compliance
- ✅ Revenue Cohorts: Only shows V1-compliant filters
- ✅ Retention Curves: Only shows V1-compliant filters
- ✅ LTV Curves: Only shows V1-compliant filters
- ✅ All visible filters are parsed by API
- ✅ All visible filters affect output

### Demo Data Handling
- ✅ Production: Never returns dummy data
- ✅ Development: Returns dummy data with `is_demo: true`
- ✅ All pages show demo banner when `is_demo === true`
- ✅ Demo banner matches Repeat Rates styling

### URL Parameter Cleaning
- ✅ Unsupported filters removed from URL
- ✅ URL cleaned on page mount
- ✅ URL cleaned when searchParams change
- ✅ Default `cohortType` set if missing

---

## Testing Recommendations

1. **Filter Functionality:**
   - Verify `cohortType` filter changes aggregation
   - Verify `dateRange` filter filters cohorts correctly
   - Verify removed filters don't appear in UI

2. **Demo Data:**
   - Test in development: Verify demo banner appears
   - Test in production: Verify no dummy data returned
   - Test empty state: Verify empty array returned in production

3. **URL Cleaning:**
   - Navigate with old URL params (geography, productCategory, etc.)
   - Verify params are cleaned on page load
   - Verify default cohortType is set

---

**Status:** ✅ All requirements met  
**Next Steps:** Ready for V1.1 when Geography and Product Category dimensions are implemented


