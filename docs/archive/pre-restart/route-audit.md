# Route Audit Report

> **Historical audit — superseded for current architecture.** This report records the route surface inspected on 2024-12-19. Its counts, navigation model, and recommendations are not current. Use [`RETENTIONOS_ARCHITECTURE.md`](../../RETENTIONOS_ARCHITECTURE.md) for the commit-pinned route/API inventory and evidence-backed dispositions.

**Generated:** 2024-12-19  
**Purpose:** Identify dead routes (unused/legacy) and broken links (pointing to non-existent routes)

---

## Executive Summary

- **Total Page Routes:** 50
- **Total API Routes:** 20
- **Total Navigation Links:** 49
- **Dead Routes (unused):** 9
- **Broken Links:** 7

---

## 1. Canonical Routes (Keep)

### Page Routes (50 total)

#### Core Application Routes
- `/` - Root page (redirects in dev)
- `/login` - Authentication
- `/verify` - OTP verification
- `/dashboard` - Main dashboard

#### Executive & Analytics
- `/executive` - Executive overview
- `/executive/reconciliation` - Data health
- `/executive/exports` - Export management

#### Cohorts
- `/cohorts` - Cohort explorer
- `/cohorts/category` - Category cohorts
- `/cohorts/composition` - Customer composition
- `/retention-ltv/revenue-cohorts` - Revenue cohorts (canonical)
- `/retention-ltv/curves` - Retention curves
- `/retention-ltv/ltv-cohorts` - LTV cohorts
- `/retention-ltv/repeat-rates` - Repeat purchase rates

#### Retention
- `/retention` - Retention overview
- `/retention/curve` - Retention curve visualization
- `/retention/churn` - Churn risk analysis
- `/retention/reactivation` - Reactivation opportunities

#### Customers
- `/customers` - Customer overview
- `/customers/list` - Customer listing
- `/customers/profile` - Individual customer profile
- `/customers/segments` - Customer segments
- `/customer-intelligence/composition` - Customer composition
- `/customer-intelligence/segments` - Intelligence segments
- `/customer-intelligence/profiles` - Customer profiles

#### Products
- `/products` - Product overview
- `/products/performance` - Product performance
- `/products/cross-sell` - Cross-sell analysis
- `/products/replenishment` - Replenishment metrics
- `/product-economics/performance` - Product economics performance
- `/product-economics/concentration` - Product concentration
- `/product-economics/discounts` - Discount impact

#### Reports & Guides
- `/reports` - Reports hub
- `/guides` - Guides library

#### Settings & Integrations
- `/settings` - Settings overview
- `/settings/integrations` - Integration management
- `/settings/feedback` - Support & feedback
- `/integrations` - Integration status
- `/connect/shopify` - Shopify OAuth connection
- `/sync` - Sync status

#### Other
- `/segments` - Segments (Coming Soon placeholder)

---

## 2. Dead Routes (Routes that exist but are NOT referenced in navigation)

These routes exist in the filesystem but are not linked anywhere in the UI:

### High Priority (Likely Legacy)
1. **`/filter-demo`** - `app/(protected)/filter-demo/page.tsx`
   - **Status:** Demo/development route
   - **Recommendation:** DELETE (development/testing only)

2. **`/sidebar-demo`** - `app/(protected)/sidebar-demo/page.tsx`
   - **Status:** Demo/development route
   - **Recommendation:** DELETE (development/testing only)

3. **`/connect/klaviyo`** - `app/(protected)/connect/klaviyo/page.tsx`
   - **Status:** Unused integration page
   - **Recommendation:** KEEP if Klaviyo integration is planned, otherwise DELETE

### Medium Priority (May be intentionally unlinked)
4. **`/financials`** - `app/(protected)/financials/page.tsx`
   - **Status:** Exists but not in navigation
   - **Recommendation:** ADD to navigation OR DELETE if unused

5. **`/financials/revenue`** - `app/(protected)/financials/revenue/page.tsx`
   - **Status:** Exists but not in navigation
   - **Recommendation:** ADD to navigation OR DELETE if unused

6. **`/financials/ltv-summary`** - `app/(protected)/financials/ltv-summary/page.tsx`
   - **Status:** Exists but not in navigation
   - **Recommendation:** ADD to navigation OR DELETE if unused

7. **`/financials/forecasts`** - `app/(protected)/financials/forecasts/page.tsx`
   - **Status:** Exists but not in navigation
   - **Recommendation:** ADD to navigation OR DELETE if unused

8. **`/product-economics/replenishment`** - `app/(protected)/product-economics/replenishment/page.tsx`
   - **Status:** Exists but not in navigation
   - **Note:** `/products/replenishment` exists and IS linked
   - **Recommendation:** CONSOLIDATE or DELETE duplicate

9. **`/feedback`** - `app/(protected)/feedback/page.tsx`
   - **Status:** Exists but not directly linked (may be accessed via floating button)
   - **Recommendation:** VERIFY usage, KEEP if accessed programmatically

---

## 3. Broken Links (Links pointing to non-existent routes)

These links exist in navigation/config but point to routes that don't exist:

### Guides Sub-pages (3 broken links)
1. **`/guides/metrics`** - Referenced in `hierarchical-sidebar.tsx`
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

2. **`/guides/rfm`** - Referenced in `hierarchical-sidebar.tsx`
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

3. **`/guides/playbook`** - Referenced in `hierarchical-sidebar.tsx`
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

### Reports Sub-pages (2 broken links)
4. **`/reports/weekly`** - Referenced in `hierarchical-sidebar.tsx`
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

5. **`/reports/executive`** - Referenced in `hierarchical-sidebar.tsx`
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

### Settings Sub-pages (2 broken links)
6. **`/settings/account`** - Referenced in `hierarchical-sidebar.tsx`
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

7. **`/settings/preferences`** - Referenced in `hierarchical-sidebar.tsx`
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

### Segment Project Links (3 broken links)
8. **`/segments/uk`** - Referenced in `app-sidebar.tsx` (projects)
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

9. **`/segments/europe`** - Referenced in `app-sidebar.tsx` (projects)
   - **Status:** Link exists, route does not
   - **Recommendation:** CREATE route OR REMOVE link

10. **`/segments/premium`** - Referenced in `app-sidebar.tsx` (projects)
    - **Status:** Link exists, route does not
    - **Recommendation:** CREATE route OR REMOVE link

---

## 4. API Routes (20 total)

### Metrics & Analytics
- `/api/metrics/cohorts` - Cohort data
- `/api/metrics/kpis` - KPI metrics
- `/api/metrics/repeat-purchases` - Repeat purchase data
- `/api/metrics/segments` - Segment metrics

### Dashboard & Reports
- `/api/dashboard/metrics` - Dashboard metrics
- `/api/reports/summary` - Report summaries

### Retention
- `/api/retention/curve` - Retention curve data
- `/api/retention/analysis` - Retention analysis

### Products & Customers
- `/api/products/performance` - Product performance data
- `/api/customers/list` - Customer listing data

### Integrations & Sync
- `/api/integrations/status` - Integration status
- `/api/shopify/auth` - Shopify OAuth initiation
- `/api/shopify/callback` - Shopify OAuth callback
- `/api/sync/shopify` - Shopify sync
- `/api/sync/dummy-data` - Dummy data generation

### Settings & Guides
- `/api/settings/user` - User settings
- `/api/guides/list` - Guides listing

### Development
- `/api/dev/generate-dummy-data` - Development dummy data

### Auth
- `/auth/callback` - Auth callback (Supabase)
- `/auth/signout` - Sign out endpoint

**Note:** API routes are not included in dead route analysis as they're accessed programmatically.

---

## 5. Cleanup Recommendations

### Immediate Actions (Safe to Delete)

1. **Delete demo routes:**
   - `app/(protected)/filter-demo/page.tsx`
   - `app/(protected)/sidebar-demo/page.tsx`

### Review Required

2. **Financials routes** - Decide if these should be in navigation or removed:
   - `app/(protected)/financials/page.tsx`
   - `app/(protected)/financials/revenue/page.tsx`
   - `app/(protected)/financials/ltv-summary/page.tsx`
   - `app/(protected)/financials/forecasts/page.tsx`

3. **Duplicate replenishment route:**
   - `app/(protected)/product-economics/replenishment/page.tsx` (duplicate of `/products/replenishment`)

4. **Klaviyo integration:**
   - `app/(protected)/connect/klaviyo/page.tsx` - Keep if planned, delete if not

### Fix Broken Links

5. **Remove or create missing routes:**
   - Guides sub-pages: `/guides/metrics`, `/guides/rfm`, `/guides/playbook`
   - Reports sub-pages: `/reports/weekly`, `/reports/executive`
   - Settings sub-pages: `/settings/account`, `/settings/preferences`
   - Segment projects: `/segments/uk`, `/segments/europe`, `/segments/premium`

---

## 6. Navigation Structure Analysis

### Active Navigation Components

1. **`components/ui/hierarchical-sidebar.tsx`** - Main navigation sidebar
   - Contains most navigation links
   - Has broken links to guides, reports, and settings sub-pages

2. **`components/app-sidebar.tsx`** - Alternative sidebar (AppSidebar)
   - Uses different navigation structure
   - Has broken links to segment projects

3. **`components/ui/clean-sidebar.tsx`** - Simplified sidebar
   - Only top-level navigation

4. **`components/ui/sidebar-layout.tsx`** - Icon navigation
   - Minimal navigation set

### Recommendation

Consolidate navigation to a single source of truth to avoid inconsistencies.

---

## 7. Route Groups Analysis

The app uses Next.js route groups `(protected)` for organization. These don't affect URLs:
- All routes under `app/(protected)/` are accessible without the `(protected)` prefix
- Example: `app/(protected)/dashboard/page.tsx` → `/dashboard`

---

## 8. Next Steps

1. ✅ **Delete demo routes** (`filter-demo`, `sidebar-demo`) - **COMPLETED**
2. ✅ **Fix broken links** - **COMPLETED** (removed broken links from navigation)
3. ✅ **Consolidate duplicate routes** - **COMPLETED** (removed `/product-economics/replenishment`)
4. ⚠️ **Review financials routes** - Add to nav or remove
5. ⚠️ **Review Klaviyo integration** - Keep or remove
6. ⚠️ **Verify `/feedback` route** - Ensure it's accessible via floating button

## 9. Cleanup Actions Taken

### Completed Cleanup

1. **Deleted demo routes:**
   - ✅ `app/(protected)/filter-demo/page.tsx`
   - ✅ `app/(protected)/sidebar-demo/page.tsx`

2. **Fixed broken links in navigation:**
   - ✅ Removed `/reports/weekly` and `/reports/executive` from `hierarchical-sidebar.tsx`
   - ✅ Removed `/guides/metrics`, `/guides/rfm`, `/guides/playbook` from `hierarchical-sidebar.tsx`
   - ✅ Removed `/settings/account` and `/settings/preferences` from `hierarchical-sidebar.tsx`
   - ✅ Removed broken segment project links (`/segments/uk`, `/segments/europe`, `/segments/premium`) from `app-sidebar.tsx`

3. **Removed duplicate route:**
   - ✅ Deleted `app/(protected)/product-economics/replenishment/page.tsx` (duplicate of `/products/replenishment`)

4. **Converted routes to Coming Soon placeholders:**
   - ✅ `/segments` - Now uses ComingSoon component (intentionally placeholder)
   - ✅ `/products` - Now uses ComingSoon component
   - ✅ `/financials` and sub-routes - Now use ComingSoon component
   - ✅ `/connect/klaviyo` - Now uses ComingSoon component

5. **Added "Coming soon" badges:**
   - ✅ Added visual "Coming soon" badges to placeholder routes in hierarchical sidebar
   - ✅ Products route shows "Coming soon" badge

6. **Enhanced feedback page:**
   - ✅ Added area context display from query parameter
   - ✅ Added `/feedback` to navigation sidebar

### Remaining Actions

- All placeholder routes are now consistent with ComingSoon component
- Segments is intentionally placeholder (demo UI removed)

## 10. Product Hygiene Updates (2024-12-19)

### Unused Code Archive

Unused React components have been archived to preserve product intent:

- **SegmentsClient.tsx** → `app/(protected)/_archive/segments/SegmentsClient.tsx`
- **ProductsClient.tsx** → `app/(protected)/_archive/products/ProductsClient.tsx`
- **FinancialsClient.tsx** → `app/(protected)/_archive/financials/FinancialsClient.tsx`

All archived files include documentation comments explaining:
- Original product intent
- Why they were archived
- Conditions for reintroduction

See `unused-product-ideas.md` for complete documentation.

### SEO Protection

All placeholder routes now include `noindex, nofollow` metadata to prevent search engine indexing:
- `/segments`
- `/products`
- `/financials` and sub-routes
- `/connect/klaviyo`

### Product Roadmap

A new `/roadmap` page has been added at `app/(protected)/roadmap/page.tsx` that:
- Groups features into Live, Coming Soon, and Exploring sections
- Provides clear status badges for each feature
- Links to feedback forms with area context
- Helps align product priorities and demos

The roadmap page is accessible but not yet added to main navigation (can be added when needed).

---

## Appendix: Route Mapping

### File Path → URL Path Conversion

- `app/page.tsx` → `/`
- `app/login/page.tsx` → `/login`
- `app/(protected)/dashboard/page.tsx` → `/dashboard`
- `app/(protected)/cohorts/page.tsx` → `/cohorts`
- `app/(protected)/cohorts/category/page.tsx` → `/cohorts/category`
- `app/api/metrics/cohorts/route.ts` → `/api/metrics/cohorts`
- `app/auth/callback/route.ts` → `/auth/callback`

Route groups `(protected)` are stripped from URLs.

