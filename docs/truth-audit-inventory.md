# Truth Audit Inventory

**Date:** 2025-01-27  
**Objective:** Identify all dummy/mock/dev fallbacks, hardcoded behaviors, and AI Analysis panels that could mislead in client meetings

---

## Summary

This audit identifies **HIGH RISK** items that could mislead users by appearing to be real data-driven insights when they are actually placeholder/mock content.

### Risk Levels
- **HIGH**: User-facing content that looks real but is placeholder/mock - could mislead in client meetings
- **MEDIUM**: Dev-only fallbacks that are properly gated but could leak to production
- **LOW**: Internal utilities or clearly labeled demo content

---

## Inventory Table

| File Path | Type | Where It Appears | Trigger Condition | Risk Level | Recommended Action |
|-----------|------|------------------|-------------------|------------|-------------------|
| `components/ai/AIAnalysis.tsx` | placeholder-analysis | Revenue Cohorts, Retention Curves, Repeat Rates pages | Always (on click) | **HIGH** | Add Preview badge, disable when `is_demo=true`, show filter context |
| `app/(protected)/dashboard/REDHomePage.tsx` | placeholder-analysis | Dashboard home page | When `insights.length === 0` | **HIGH** | Remove fallback to `mockInsights`, show empty state instead |
| `app/(protected)/dashboard/PremiumDashboard.tsx` | placeholder-analysis | Premium dashboard | Always (computed from metrics) | **MEDIUM** | Verify metrics are real, add data source indicator |
| `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` | dummy-data | Revenue Cohorts page | Dev mode when no auth OR no data found | **LOW** | ✅ Already has `is_demo` flag and banner |
| `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` | dummy-data | LTV Cohorts page | Dev mode when no auth OR no data found | **LOW** | ✅ Already has `is_demo` flag and banner |
| `app/(protected)/retention-ltv/curves/page.tsx` | dummy-data | Retention Curves page | Dev mode when no auth OR no data found | **LOW** | ✅ Already has `is_demo` flag and banner |
| `app/api/metrics/cohorts/route.ts` | dummy-data | API endpoint | Dev mode when no auth OR no data found | **LOW** | ✅ Returns `is_demo: true` flag correctly |
| `lib/filters/config.ts` (geographyFilter) | hardcoded-options | Revenue Cohorts, Retention Curves, LTV Cohorts pages | Always shown in UI | **HIGH** | Remove from UI (not wired to API) OR disable with "Coming soon" tooltip |
| `lib/filters/config.ts` (productCategoryFilter) | hardcoded-options | Revenue Cohorts, Retention Curves, LTV Cohorts pages | Always shown in UI | **HIGH** | Remove from UI (not wired to API) OR disable with "Coming soon" tooltip |
| `lib/filters/config.ts` (customerSegmentFilter) | hardcoded-options | Revenue Cohorts, Retention Curves pages | Always shown in UI | **HIGH** | Remove from UI (not wired to API) OR disable with "Coming soon" tooltip |
| `lib/filters/config.ts` (customerTypeFilter) | hardcoded-options | Revenue Cohorts, Retention Curves pages | Always shown in UI | **HIGH** | Remove from UI (not wired to API) OR disable with "Coming soon" tooltip |
| `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` (insights) | placeholder-analysis | LTV Cohorts "What this tells you" section | When `useDevDummy === true` OR insufficient data | **LOW** | ✅ Already gated, shows fallback message |
| `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (insights) | placeholder-analysis | Repeat Rates "What this tells you" section | Always (computed from data) | **LOW** | ✅ Data-driven, no hardcoded copy |
| `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (AIAnalysis) | placeholder-analysis | Repeat Rates AI Analysis panel | Always (on click) | **HIGH** | Pass `is_demo` prop, add Preview badge |
| `app/api/dashboard/metrics/route.ts` | dummy-data | Dashboard API | Dev mode when no auth | **LOW** | Verify `is_demo` flag is returned |

---

## Detailed Findings

### 1. AI Analysis Component (`components/ai/AIAnalysis.tsx`)

**Issue:** Uses hardcoded `mockInsights` array that doesn't respond to actual data or filters.

**Current Behavior:**
- Generates mock insights on click
- References geography filter in text but insights are still hardcoded
- No indication that insights are preview/placeholder
- No check for `is_demo` flag
- Always shows same insights regardless of actual cohort data

**Risk:** **HIGH** - Users could present these as real insights in client meetings.

**Recommended Fix:**
1. Add `isDemo` prop to component
2. When `isDemo === true`, disable "Generate insights" button OR show preview badge
3. Add "Preview" badge with tooltip: "Insights are example copy until AI is enabled / data-backed"
4. Show filter context (cohortType + dateRange) in analysis
5. If analysis is not computed from displayed dataset, label as Preview

---

### 2. Dashboard Mock Insights (`app/(protected)/dashboard/REDHomePage.tsx`)

**Issue:** Falls back to `mockInsights` when no real insights available (line 380).

**Current Behavior:**
```typescript
const displayInsights = insights.length > 0 ? insights : mockInsights;
```

**Risk:** **HIGH** - Mock insights shown as if they were real.

**Recommended Fix:**
- Remove fallback to `mockInsights`
- Show empty state: "No insights available yet" or hide section entirely

---

### 3. Hardcoded Filter Options (`lib/filters/config.ts`)

**Issue:** Geography, Product Category, Customer Segment, and Customer Type filters are hardcoded but not wired to API.

**Current Behavior:**
- Filters appear in UI on Revenue Cohorts, Retention Curves, and LTV Cohorts pages
- API route (`/api/metrics/cohorts`) only parses `limit` and `cohort_month`
- Filters are silently ignored

**Risk:** **HIGH** - Users can select filters that do nothing, creating false impression of functionality.

**Recommended Fix:**
- **Option A (Preferred):** Remove unwired filters from UI (use V1 filter configs)
- **Option B:** Show filters disabled with tooltip "Coming soon - filter not yet implemented"

**Note:** According to `docs/cohort-pages-v1-filter-compliance.md`, V1 filter configs already exist (`revenueCohortsV1Filters`, `retentionCurvesV1Filters`, `ltvCurvesV1Filters`) that only include wired filters. Verify pages are using these.

---

### 4. LTV Cohorts Insights (`app/(protected)/retention-ltv/ltv-cohorts/page.tsx`)

**Status:** ✅ **GOOD** - Already properly gated:
- Checks `useDevDummy` flag (line 674)
- Returns empty array when dummy data detected
- Shows fallback message in UI when no insights
- Insights are computed from actual data

**No action needed** - This is the correct pattern.

---

### 5. Repeat Rates Insights (`app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx`)

**Status:** ✅ **GOOD** - Insights are data-driven:
- Computed from `displayData` (line 344)
- No hardcoded copy
- Uses actual metrics from API

**Issue:** Still uses `AIAnalysis` component which shows mock insights.

**Recommended Fix:**
- Pass `is_demo` prop to `AIAnalysis` component
- Or remove `AIAnalysis` component entirely (since page already has data-driven insights)

---

### 6. API Demo Data (`app/api/metrics/cohorts/route.ts`)

**Status:** ✅ **GOOD** - Properly implemented:
- Returns `is_demo: true` flag in development mode
- Never returns demo data in production
- Demo data only returned when no auth OR no data found in dev mode

**No action needed** - This is the correct pattern.

---

## Implementation Plan

### Part A: Inventory ✅
- [x] Search codebase for dummy/mock/hardcoded patterns
- [x] Create inventory document

### Part B: Standardize Demo Signalling
- [ ] Create reusable `<DemoBanner>` component
- [ ] Ensure all API responses include `is_demo` flag (verify existing)
- [ ] Replace inline demo banners with `<DemoBanner>` component

### Part C: Fix AI Analysis Honesty
- [ ] Update `AIAnalysis` component to:
  - Accept `isDemo` prop
  - Show Preview badge when insights are placeholder
  - Disable "Generate insights" when `isDemo === true`
  - Show filter context (cohortType + dateRange)
- [ ] Update all pages using `AIAnalysis` to pass `isDemo` prop
- [ ] Remove `mockInsights` fallback from dashboard

### Part D: Hardcoded Filter Options Safety
- [ ] Verify pages use V1 filter configs (only wired filters)
- [ ] If unwired filters still appear, remove them OR disable with "Coming soon" tooltip
- [ ] Document which filters are wired vs unwired

---

## Files Requiring Changes

1. `components/ai/AIAnalysis.tsx` - Add Preview badge, respect `isDemo`
2. `components/ui/DemoBanner.tsx` - **NEW** - Reusable demo banner component
3. `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` - Pass `isDemo` to `AIAnalysis`
4. `app/(protected)/retention-ltv/curves/page.tsx` - Pass `isDemo` to `AIAnalysis`
5. `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` - Pass `isDemo` to `AIAnalysis` OR remove component
6. `app/(protected)/dashboard/REDHomePage.tsx` - Remove `mockInsights` fallback
7. `lib/filters/config.ts` - Verify V1 configs are used, document unwired filters

---

## Verification Checklist

After implementation, verify:
- [ ] No AI Analysis panels show mock insights without Preview badge
- [ ] All demo data shows `<DemoBanner>` component
- [ ] No unwired filters appear in UI (or are disabled with tooltip)
- [ ] Dashboard doesn't show mock insights as real
- [ ] All pages pass `isDemo` prop to `AIAnalysis` when applicable
- [ ] Filter context (cohortType + dateRange) shown in AI Analysis when available

