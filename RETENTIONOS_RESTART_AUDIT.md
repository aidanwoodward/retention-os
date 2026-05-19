# RetentionOS Restart Audit

## 1. Executive Summary

RetentionOS is a Next.js 15 App Router application with Supabase auth/data access, a broad set of analytics routes, and a recently preserved WIP baseline focused on retention/LTV diagnosis. The repo is not in a clean production-ready state: the dev server starts, but lint and production build fail on ESLint errors introduced around the retention-LTV/diagnosis work.

Biggest risks:

- Metric logic is fragmented across Supabase materialized views, API route handlers, large React pages, chart components, and demo generators instead of a shared metric engine.
- Demo/mock data is mixed into live routes and pages, making it hard to know whether a screen is showing real customer economics.
- The route surface is much larger than the MVP and includes many placeholders, missing APIs, archived clients, internal docs pages, and partially wired integrations.
- Shopify tokens are stored plaintext in `shopify_connections`, and dummy-data POST routes delete tenant data before reseeding.
- `lib/diagnosis/types.ts` imports component types from React components, which couples business/diagnostic logic to UI.

Biggest opportunities:

- There is already useful scaffolding for auth, Supabase tables, cohort materialized views, demo mode, charts, filters, and diagnosis/decision cards.
- The best current product surface is the retention-LTV cluster: revenue cohorts, retention curves, LTV cohorts, repeat purchase rates, and decisions.
- The restart can simplify the app sharply by keeping the current UI shell and rebuilding the metric engine as pure TypeScript functions over a canonical order/customer dataset.

Current app health:

- `npm run dev` starts successfully on `http://localhost:3000` and reaches Ready.
- `npm run lint` fails with 8 errors and 20 warnings.
- `npm run build` compiles successfully with Turbopack, then fails during lint/type validation on the same lint blockers.
- There is no `npm run typecheck` script; standalone typecheck should be added as `tsc --noEmit`.

Most important next step: freeze the broad route/integration surface, fix the lint/build blockers, then create `/lib/types`, `/lib/demo`, `/lib/metrics`, and `/lib/insights` so dashboard, cohort, retention, LTV, acquisition, product, scenario, and insight pages all consume the same metric engine.

## 2. Current Tech Stack


| Area               | Current State                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Framework          | Next.js `15.5.9` with App Router and route groups                                                     |
| Language           | TypeScript `^5`, strict mode enabled                                                                  |
| Runtime            | React `19.1.0`, React DOM `19.1.0`                                                                    |
| Package manager    | npm, `package-lock.json` lockfile version 3                                                           |
| Styling            | Tailwind CSS `^4`, `@tailwindcss/postcss`, shadcn/Radix-style primitives, custom CSS tokens           |
| Auth               | Supabase auth through `@supabase/ssr`; middleware only protects `/dashboard`, `/sync`, and `/connect` |
| Database           | Supabase/Postgres migrations in `supabase/migrations`; canonical tables plus materialized views       |
| Hosting/deployment | README says Vercel live deployment; no `vercel.json` found                                            |
| Charts             | Recharts, Tremor wrappers, custom chart components                                                    |
| UI dependencies    | Radix UI primitives, lucide-react, Carbon icons, TanStack Table, motion                               |
| Env/config         | `.env.local` is present at runtime; README documents Supabase, Shopify, Klaviyo variables             |


Scripts:


| Script      | Command                  | Audit Result                                     |
| ----------- | ------------------------ | ------------------------------------------------ |
| `dev`       | `next dev --turbopack`   | Starts successfully                              |
| `build`     | `next build --turbopack` | Bundle compiles, then fails lint/type validation |
| `start`     | `next start`             | Not run; production build currently fails        |
| `lint`      | `eslint`                 | Fails with 8 errors                              |
| `typecheck` | Missing                  | Add `tsc --noEmit`                               |


## 3. Current App Structure

Folder tree summary:

```text
/app
  /(protected)
    /cohorts
    /connect
    /customer-intelligence
    /customers
    /dashboard
    /executive
    /financials
    /guides
    /integrations
    /product-economics
    /products
    /reports
    /retention
    /retention-ltv
    /segments
    /settings
    /sync
  /api
  /auth
  /login
  /verify
/components
  /ai
  /charts
  /diagnosis
  /filters
  /integrations
  /ui
/hooks
/lib
  /demo-data
  /demo-mode
  /diagnosis
  /filters
/supabase
  /migrations
/docs
```

Important files:


| File                                                  | Why It Matters                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `package.json`                                        | Defines Next 15, React 19, npm scripts, dependency surface              |
| `middleware.ts`                                       | Supabase session refresh and partial route protection                   |
| `lib/supabaseClient.ts`                               | Browser Supabase client                                                 |
| `lib/database.ts`                                     | Canonical DB types, client factories, PII hashing, account helpers      |
| `lib/shopifyClient.ts`                                | Shopify REST client and connection lookup                               |
| `supabase/migrations/002_create_canonical_schema.sql` | Accounts, customers, orders, order_items, sync_metadata                 |
| `supabase/migrations/006_create_metric_views.sql`     | `mv_kpis`, `mv_cohorts`, `mv_retention_periods`, `mv_customer_segments` |
| `lib/demo-mode/context.tsx`                           | Client demo-mode provider and write suppression                         |
| `lib/demo-data/*`                                     | Seeded demo data for several newer MVP-like pages                       |
| `lib/diagnosis/*`                                     | WIP rule-based diagnosis and decision logic                             |
| `components/app-sidebar.tsx`                          | Current navigation model                                                |
| `app/(protected)/retention-ltv/*`                     | Most complete analytics surfaces                                        |


Important route observation: the current product shape is not aligned to the target MVP routes. The app currently favors `/retention-ltv/...`, `/executive`, `/financials`, `/products`, `/product-economics`, `/customer-intelligence`, and many legacy/placeholder routes. Target routes like `/ltv`, `/acquisition`, `/scenarios`, `/insights`, and `/data` are missing.

## 4. Route Audit


| Route                              | Status                                                                             | Data Source                                                           | MVP Relevance                                     | Recommendation                                         | Priority |
| ---------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ | -------- |
| `/`                                | Exists; dev redirects to `/retention-ltv/revenue-cohorts`; prod shows starter page | Hardcoded                                                             | Nice-to-have                                      | Fix to redirect to `/dashboard` or login consistently  | P1       |
| `/login`                           | Exists                                                                             | Supabase auth                                                         | MVP-critical                                      | Keep, verify env-driven auth copy                      | P0       |
| `/verify`                          | Exists                                                                             | Supabase auth                                                         | MVP-critical                                      | Keep                                                   | P1       |
| `/dashboard`                       | Exists; likely works in dev/demo                                                   | Supabase connection check plus `REDHomePage` hardcoded/demo content   | MVP-critical                                      | Keep, simplify into executive MVP dashboard            | P0       |
| `/executive`                       | Exists; redirects to `/dashboard`                                                  | Client redirect                                                       | Duplicate                                         | Pause or remove from nav after target route decision   | P2       |
| `/executive/reconciliation`        | Exists                                                                             | Likely static/internal                                                | Data health useful                                | Fix later as `/data` health                            | P2       |
| `/executive/exports`               | Exists                                                                             | Placeholder/static                                                    | Nice-to-have                                      | Pause                                                  | Later    |
| `/cohorts`                         | Exists                                                                             | `/api/metrics/cohorts`; Supabase view or dev dummy                    | MVP-critical                                      | Keep temporarily, replace with metric engine           | P0       |
| `/cohorts/category`                | Exists but calls missing `/api/metrics/category-cohorts`                           | Broken/missing API                                                    | Nice-to-have                                      | Hide                                                   | P2       |
| `/cohorts/composition`             | Exists but calls missing `/api/metrics/composition`                                | Broken/missing API                                                    | Nice-to-have                                      | Hide                                                   | P2       |
| `/retention`                       | Exists                                                                             | `lib/demo-data/retention` via demo mode only                          | MVP-critical                                      | Keep concept, wire to metric engine                    | P0       |
| `/retention/curve`                 | Exists                                                                             | `/api/retention/curve`                                                | MVP-critical subset                               | Merge with `/retention` or `/cohorts`                  | P1       |
| `/retention/churn`                 | Exists but calls missing `/api/retention/churn`                                    | Broken/missing API                                                    | Later                                             | Hide                                                   | P2       |
| `/retention/reactivation`          | Exists but calls missing `/api/retention/reactivation`                             | Broken/missing API                                                    | Later                                             | Hide                                                   | P2       |
| `/retention-ltv/revenue-cohorts`   | Exists; large page                                                                 | `/api/metrics/cohorts` plus local derived/dummy top cohorts           | MVP-critical under target `/dashboard`/`/cohorts` | Keep as source, refactor                               | P0       |
| `/retention-ltv/curves`            | Exists; large page                                                                 | `/api/metrics/cohorts`, page-level calculations                       | MVP-critical under target `/retention`            | Keep as source, fix lint/build                         | P0       |
| `/retention-ltv/ltv-cohorts`       | Exists; large page                                                                 | `/api/metrics/cohorts`, page-level LTV transforms, dev dummy fallback | MVP-critical under target `/ltv`                  | Keep as source, refactor                               | P0       |
| `/retention-ltv/repeat-rates`      | Exists                                                                             | `/api/metrics/repeat-purchases`                                       | MVP-critical                                      | Keep as source, refactor                               | P0       |
| `/retention-ltv/decisions`         | Exists but lint-failing and placeholder-heavy                                      | Fetches cohorts/repeat APIs; synthesizes diagnosis                    | MVP-critical under target `/insights`             | Fix types, then refactor into insight engine           | P1       |
| `/ltv`                             | Missing                                                                            | None                                                                  | MVP-critical                                      | Add later as target route after engine                 | P0       |
| `/acquisition`                     | Missing                                                                            | None                                                                  | MVP-critical                                      | Add after marketing spend data model exists            | P1       |
| `/products`                        | Exists; ComingSoon                                                                 | None                                                                  | MVP-critical                                      | Replace with product customer quality MVP              | P1       |
| `/products/performance`            | Exists                                                                             | `/api/products/performance`, mock data                                | MVP-critical source                               | Keep as prototype, refactor                            | P1       |
| `/products/replenishment`          | Exists but calls missing `/api/products/replenishment`                             | Broken/missing API                                                    | Later                                             | Hide                                                   | P2       |
| `/products/cross-sell`             | Exists but calls missing `/api/products/cross-sell`                                | Broken/missing API                                                    | Later                                             | Hide                                                   | P2       |
| `/product-economics/performance`   | Exists                                                                             | `/api/products/performance`, mock data                                | Duplicate                                         | Pause; merge into `/products`                          | P2       |
| `/product-economics/concentration` | Exists                                                                             | Local mock data                                                       | Later                                             | Hide                                                   | Later    |
| `/product-economics/discounts`     | Exists                                                                             | Unknown/static                                                        | Later                                             | Hide                                                   | Later    |
| `/scenarios`                       | Missing                                                                            | None                                                                  | MVP-critical                                      | Add after metric engine; start simple                  | P1       |
| `/financials`                      | Exists; ComingSoon                                                                 | None                                                                  | Duplicate/future                                  | Pause                                                  | Later    |
| `/financials/revenue`              | Exists; ComingSoon                                                                 | None                                                                  | Nice-to-have                                      | Pause                                                  | Later    |
| `/financials/ltv-summary`          | Exists; ComingSoon                                                                 | None                                                                  | Duplicate with `/ltv`                             | Pause                                                  | Later    |
| `/financials/forecasts`            | Exists; ComingSoon                                                                 | None                                                                  | Scenario-adjacent                                 | Use as source for `/scenarios` copy only               | P2       |
| `/insights`                        | Missing                                                                            | None                                                                  | MVP-critical                                      | Add as target route backed by `lib/insights`           | P1       |
| `/data`                            | Missing                                                                            | None                                                                  | MVP-critical for demo/upload                      | Add as data import/demo status route                   | P1       |
| `/settings`                        | Exists                                                                             | `/api/settings/user`                                                  | MVP-critical                                      | Keep                                                   | P1       |
| `/settings/integrations`           | Exists                                                                             | Static cards                                                          | Nice-to-have                                      | Keep as settings subpage, but hide future integrations | P2       |
| `/settings/feedback`               | Exists                                                                             | Static/form-like                                                      | Nice-to-have                                      | Pause                                                  | Later    |
| `/integrations`                    | Exists                                                                             | Integration status client/API                                         | Nice-to-have                                      | Merge into `/data` or settings                         | P2       |
| `/connect/shopify`                 | Exists                                                                             | Shopify OAuth                                                         | Future integration                                | Pause until metric engine stable                       | P2       |
| `/connect/klaviyo`                 | Exists; ComingSoon                                                                 | None                                                                  | Future integration                                | Pause                                                  | Later    |
| `/sync`                            | Exists                                                                             | POSTs Shopify sync and dummy-data sync                                | Useful but risky                                  | Hide destructive dummy writes from MVP nav             | P1       |
| `/customers`                       | Exists                                                                             | Demo client                                                           | Nice-to-have                                      | Pause unless needed for drilldowns                     | P2       |
| `/customers/list`                  | Exists                                                                             | `/api/customers/list`                                                 | Supporting                                        | Keep later                                             | P2       |
| `/customers/profile`               | Exists but calls missing `/api/customers/profile`                                  | Broken/missing API                                                    | Later                                             | Hide                                                   | Later    |
| `/customers/segments`              | Exists                                                                             | `/api/metrics/segments` or related API                                | Supporting                                        | Pause                                                  | P2       |
| `/customer-intelligence/*`         | Exists                                                                             | Mostly static/mock                                                    | Future                                            | Hide                                                   | Later    |
| `/segments`                        | Exists; ComingSoon                                                                 | None                                                                  | Future                                            | Hide                                                   | Later    |
| `/reports`                         | Exists                                                                             | `/api/reports/summary`                                                | Nice-to-have                                      | Pause                                                  | Later    |
| `/guides`                          | Exists                                                                             | `/api/guides/list`                                                    | Nice-to-have                                      | Pause                                                  | Later    |
| `/roadmap`                         | Exists                                                                             | Static/internal                                                       | Internal only                                     | Remove from production nav                             | Later    |
| `/feedback`                        | Exists                                                                             | Static/form-like                                                      | Nice-to-have                                      | Pause                                                  | Later    |


## 5. Data Flow Audit

Current data sources:

- Supabase auth sessions through `@supabase/ssr` in middleware, pages, and API routes.
- Supabase canonical tables: `accounts`, `shopify_connections`, `customers`, `orders`, `order_items`, `sync_metadata`.
- Supabase materialized views: `mv_kpis`, `mv_cohorts`, `mv_retention_periods`, `mv_customer_segments`.
- Shopify REST integration for products, orders, customers, and OAuth connection.
- Client demo data in `lib/demo-data/*`.
- API-route dummy/mock data in metrics/product/dashboard routes.
- Local hardcoded page mock data in several product/diagnosis/AI surfaces.

Mock/demo data:

- `lib/demo-data/*` provides seeded demo data for newer page patterns.
- `/api/metrics/cohorts` generates large dummy cohort data in development when unauthenticated or empty.
- `/api/metrics/kpis` returns mock KPI data when no materialized-view row exists.
- `/api/dashboard/metrics` falls back to generated dummy metrics when real data is empty.
- `/api/products/performance` always returns mock products because there is no products table.
- `components/ai/AIAnalysis.tsx` simulates AI output with hardcoded insight cards.
- `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` has page-local dummy LTV data fallback.
- `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` contains dummy top-cohort/contribution values.

Supabase usage:

- Browser client is in `lib/supabaseClient.ts`.
- Server clients are recreated in many API routes/pages rather than centralized under `/lib/supabase`.
- `lib/database.ts` defines Supabase client factories and typed helpers.
- Materialized views are filtered by `account_id` in API code because materialized views do not enforce RLS directly.

API routes/server actions:

- API routes exist for dashboard metrics, KPIs, cohorts, repeat purchases, segments, products performance, customers list, retention curve/analysis, reports, guides, integrations status, settings, Shopify auth/callback/sync, dummy data, and auth signout.
- No server actions were found.
- Several page routes call APIs that do not exist: category cohorts, composition, churn, reactivation, product replenishment, cross-sell, customer profile.

CSV/upload status:

- CSV export exists in chart/page code (`CohortMatrix`, `RevenueCohortsChart`, retention-LTV pages).
- No CSV upload/import logic was found.
- No upload components were found under `components/upload`.

Integration status:

- Shopify OAuth and sync exist but are premature for the restart. Sync is simplified, limited to 250 records in places, and stores access tokens plaintext.
- Klaviyo is scaffolded as ComingSoon/config documentation only; no real ingestion was found.
- No marketing spend ingestion or model was found.
- No margin assumptions model was found.

Risky write endpoints:

- `/api/dev/generate-dummy-data` and `/api/sync/dummy-data` delete existing tenant customers/orders before inserting generated data. They should be hidden/guarded for restart and never used during audit.

## 6. Data Model Audit

Existing types:

- `lib/database.ts`: `Account`, `Customer`, `Order`, `OrderItem`, `SyncMetadata`.
- `lib/demo-data/types.ts`: generic demo metric/table types.
- `lib/shopifyClient.ts`: local Shopify product/order interfaces.
- Multiple page/API-local duplicate interfaces for customers, orders, products, metrics, segments, and insights.
- `components/ai/AIAnalysis.tsx` and `app/(protected)/dashboard/REDHomePage.tsx` each define local `AIInsight`-style structures.
- `lib/diagnosis/types.ts` defines `EnhancedDiagnosisResult` but imports UI component types.

Missing target types:

- Canonical `Customer`, `Order`, `OrderLineItem`, `Product`, `MarketingSpend`, `Channel`, `Cohort`, `RetentionPoint`, `LTVPoint`, `MetricSnapshot`, `Insight`, `ScenarioInput`, `ScenarioOutput`.
- Dedicated types for CAC, payback, gross margin, contribution margin, channel quality, product-level customer quality, and Revenue Durability Score.
- Stable input/output contracts for every metric function.

Supabase schema assumptions:

- Current schema assumes Shopify is the primary source and stores source IDs, order totals, customer order counts, and hashed emails.
- There is no first-class products table; `order_items` stores product identifiers and line-item fields.
- There is no marketing spend table.
- There is no channel attribution table.
- There is no margin/gross-profit table.
- Materialized views encode some metric definitions in SQL.

Recommended target types:

```ts
type Customer = {
  id: string
  firstOrderAt: string
  lastOrderAt?: string
  acquisitionChannel?: string
  firstProductId?: string
}

type Order = {
  id: string
  customerId: string
  orderedAt: string
  grossRevenue: number
  discounts: number
  refunds: number
  contributionMargin?: number
  channel?: string
  lineItems: OrderLineItem[]
}

type MarketingSpend = {
  month: string
  channel: string
  spend: number
}

type Insight = {
  id: string
  severity: "info" | "warning" | "critical"
  title: string
  evidence: string
  recommendedAction?: string
  metricRefs: string[]
}
```

## 7. Metric Calculation Audit


| Metric                   | Exists?      | Current Location                                                                  | Quality                                                     | Recommendation                                                                           |
| ------------------------ | ------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cohorts                  | Partial      | `mv_cohorts`, `/api/metrics/cohorts`, `CohortMatrix`, retention-LTV pages         | Useful but split between SQL/API/UI and dev dummy generator | Rebuild as `calculateCohorts()` in `/lib/metrics`, with optional SQL cache later         |
| Retention                | Partial      | `mv_cohorts`, `mv_retention_periods`, `/api/retention/curve`, retention-LTV pages | Reusable concepts, not pure/shared                          | Rebuild `calculateRetentionByCohort()` over canonical orders                             |
| Repeat purchase          | Partial      | `/api/metrics/repeat-purchases`                                                   | Reasonable first version but route-local                    | Extract to `calculateRepeatPurchaseRate()` and `calculateFirstToSecondOrderConversion()` |
| First-to-second purchase | Partial      | `/api/metrics/repeat-purchases` as `secondPurchaseRate`                           | Exists implicitly                                           | Make explicit metric with tested output                                                  |
| LTV                      | Partial      | `mv_kpis.customer_lifetime_value`, `/retention-ltv/ltv-cohorts` page transforms   | Page-level and average-based; not robust cohort LTV engine  | Build `calculateLTVByCohort()`                                                           |
| Contribution LTV         | Missing      | None                                                                              | Not present                                                 | Add after margin assumptions type exists                                                 |
| CAC                      | Missing      | None                                                                              | Not present                                                 | Add `MarketingSpend` model then `calculateCACByMonth()`                                  |
| LTV/CAC                  | Missing      | None                                                                              | Not present                                                 | Add after LTV and CAC are stable                                                         |
| Payback                  | Missing      | None                                                                              | Not present                                                 | Add after contribution LTV and CAC                                                       |
| Product-level LTV        | Missing/Mock | Product pages/API mock data, `order_items` schema                                 | Product views are not real customer-quality metrics         | Build from first product purchased and future customer revenue                           |
| Channel quality          | Missing      | No channel attribution/spend model                                                | Not present                                                 | Define channel attribution assumptions before implementation                             |
| Revenue Durability Score | Missing      | Diagnosis language touches durability but no score                                | Not present                                                 | Build rules-based composite from retention, repeat, LTV concentration, and payback       |
| AI/rules insights        | Partial      | `components/ai/AIAnalysis.tsx`, `lib/diagnosis/*`, `/retention-ltv/decisions`     | Good direction but mixed mock/placeholder/UI coupling       | Create `/lib/insights/generateDiagnosticInsights()` with deterministic rules first       |


Current calculation placement problems:

- `app/(protected)/retention-ltv/curves/page.tsx`, `ltv-cohorts/page.tsx`, and `revenue-cohorts/page.tsx` are very large and contain metric transforms, filters, CSV export, diagnosis gating, and rendering in one file.
- `components/charts/RevenueCohortsChart.tsx` calculates revenue deltas inside a chart component.
- `components/charts/CohortMatrix.tsx` calculates percentiles for display classification.
- `app/api/dashboard/metrics/route.ts` has route-local `calculateRetentionMetrics()`.
- Supabase materialized views are useful for performance but currently act as the metric definition source.

## 8. Component/UI Audit

Reusable components:

- `components/ui/*` has a broad shadcn-like base: buttons, cards, sidebar, dialog, popover, table-section, kpi-section, page-header, data-state, empty, skeleton, filters, etc.
- `components/charts/*` includes useful chart/table foundations: cohort matrix, revenue cohorts chart, retention curve chart, product and segment charts, Tremor wrappers, error boundary, standard tooltip.
- `components/filters/*` has `FilterBar`, `FilterChip`, and `DateRangePicker`.
- `components/diagnosis/*` is a useful WIP insight/diagnosis component set.

Duplicates and inconsistencies:

- Multiple sidebar variants exist: `sidebar.tsx`, `sidebar-component.tsx`, `clean-sidebar.tsx`, `hierarchical-sidebar.tsx`, `sidebar-layout.tsx`, plus `app-sidebar.tsx`.
- Product routes are duplicated across `/products` and `/product-economics`.
- Customer routes are duplicated across `/customers` and `/customer-intelligence`.
- Legacy pages and archive clients still exist under `app/(protected)/_archive`.
- Some routes use the newer `DataState/PageHeader/KpiSection` pattern, while retention-LTV pages use large custom layouts.

Broken components/pages:

- Build-blocking lint errors exist in retention-LTV pages, diagnosis components, charts, and filters.
- Pages that call missing APIs will fail at runtime unless hidden.
- `components/filters/FilterChip.tsx` has an explicit `any` lint error.
- `components/charts/RevenueCohortsChart.tsx` has a `prefer-const` lint error.

Loading/empty/error states:

- Stronger pattern exists in `components/ui/data-state.tsx`.
- Older pages use local ad hoc loading/error cards.
- The restart should standardize around `DataState`, `EmptyState`, and `ErrorState`.

Components to keep:

- `components/ui` base primitives, but consolidate sidebar variants.
- `components/charts/CohortMatrix.tsx`, `RevenueCohortsChart.tsx`, `RetentionCurveChart.tsx`, `EnhancedTrendChart.tsx` after metric extraction.
- `components/diagnosis/*` after moving types out of UI and into `/lib/types` or `/lib/insights`.
- `components/filters/*` after type/lint cleanup.

Components to pause/hide:

- Broad product/customer/segment charts not tied to the core metric engine.
- AI mock component until rules-based insights exist.
- Integration cards beyond Shopify/demo/CSV.

## 9. Technical Debt

Build errors:

- `npm run build` fails during lint/type validation.
- Bundle compilation itself completed successfully under Turbopack.

Lint errors:


| File                                                     | Error Summary                        |
| -------------------------------------------------------- | ------------------------------------ |
| `app/(protected)/retention-ltv/curves/page.tsx`          | Unescaped apostrophe                 |
| `app/(protected)/retention-ltv/decisions/page.tsx`       | Two `any` usages                     |
| `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` | Two unescaped apostrophes            |
| `components/charts/RevenueCohortsChart.tsx`              | `legendCohortsSet` should be `const` |
| `components/diagnosis/UncomfortableDecisions.tsx`        | Unescaped apostrophe                 |
| `components/filters/FilterChip.tsx`                      | Explicit `any`                       |


Lint warnings:

- Unused diagnosis imports in retention-LTV pages.
- Missing hook dependencies in retention curves.
- Unused variables in charts, diagnosis impact ranges, and filters.

Dead or risky code:

- `app/(protected)/_archive` indicates old client implementations still in tree.
- Several existing pages call API routes that do not exist.
- Dummy-data routes delete rows and should not be exposed to normal users.
- README has old deployment comments and broad feature claims that overstate real readiness.

Env/config issues:

- No `.env.example` was found.
- Supabase and Shopify env variables are documented in README.
- Middleware protection is incomplete: only `/dashboard`, `/sync`, and `/connect` are matched, while most protected pages are under other paths.

Architecture issues:

- No `/lib/metrics`, `/lib/types`, `/lib/insights`, `/lib/demo`, or `/lib/supabase` target structure yet.
- Metric definitions are split between SQL materialized views, API route handlers, and React components.
- Demo mode uses multiple mechanisms: local seeded demo generators, API dummy fallbacks, and database-seeding dummy routes.
- `lib/diagnosis` depends on component-exported types.

Security/auth issues:

- Shopify access tokens are stored plaintext with a comment saying to encrypt in production.
- Dev auth bypasses make local work easy but obscure whether routes are truly protected.
- Materialized views rely on API-level account filtering.
- Dummy-data write routes use service role and delete account data before reseeding.

## 10. Keep / Fix / Pause / Remove Matrix


| Item                                            | Type              | Status                                 | Decision  | Reason                                          | Priority |
| ----------------------------------------------- | ----------------- | -------------------------------------- | --------- | ----------------------------------------------- | -------- |
| `app/(protected)/dashboard`                     | Route             | Exists, demo/connection based          | Fix       | MVP executive dashboard destination             | P0       |
| `app/(protected)/cohorts`                       | Route             | Exists, API-backed                     | Fix       | Cohort retention MVP source                     | P0       |
| `app/(protected)/retention`                     | Route             | Exists, demo-only                      | Fix       | Target retention route                          | P0       |
| `app/(protected)/retention-ltv/revenue-cohorts` | Route             | Exists, large/custom                   | Keep      | Best current revenue cohort surface             | P0       |
| `app/(protected)/retention-ltv/curves`          | Route             | Exists, lint-failing                   | Fix       | Core retention source                           | P0       |
| `app/(protected)/retention-ltv/ltv-cohorts`     | Route             | Exists, mixed data                     | Fix       | Core LTV source                                 | P0       |
| `app/(protected)/retention-ltv/repeat-rates`    | Route             | Exists                                 | Fix       | First-to-second/repeat MVP source               | P0       |
| `app/(protected)/retention-ltv/decisions`       | Route             | Exists, lint-failing/placeholders      | Fix       | Seed for `/insights`                            | P1       |
| `/ltv`                                          | Target route      | Missing                                | Fix       | MVP target route                                | P0       |
| `/acquisition`                                  | Target route      | Missing                                | Fix       | CAC/payback/channel quality                     | P1       |
| `/products`                                     | Route             | ComingSoon                             | Fix       | Product-level customer quality MVP              | P1       |
| `/scenarios`                                    | Target route      | Missing                                | Fix       | Simple scenario model                           | P1       |
| `/insights`                                     | Target route      | Missing                                | Fix       | Diagnostic insight cards                        | P1       |
| `/data`                                         | Target route      | Missing                                | Fix       | Demo/CSV/upload/status                          | P1       |
| `lib/database.ts`                               | Library           | Useful but broad                       | Keep      | Current canonical DB bridge                     | P0       |
| `lib/supabaseClient.ts`                         | Library           | Browser-only client                    | Fix       | Move under `/lib/supabase` later                | P1       |
| `lib/demo-data/*`                               | Library           | Useful seeded demo data                | Keep      | Basis for `/lib/demo`                           | P0       |
| `lib/demo-mode/context.tsx`                     | Library           | Useful, write suppression              | Keep      | Demo mode is MVP useful                         | P1       |
| `lib/diagnosis/*`                               | Library           | WIP rules                              | Fix       | Move to `/lib/insights`, decouple UI            | P1       |
| `components/diagnosis/*`                        | Components        | Useful WIP, lint issue                 | Fix       | Good insight-card UI base                       | P1       |
| `components/ai/AIAnalysis.tsx`                  | Component         | Mock AI simulation                     | Pause     | Should be replaced by deterministic rules first | P2       |
| `components/charts/*`                           | Components        | Mixed quality                          | Keep/Fix  | Valuable chart base, needs metric extraction    | P0-P1    |
| Sidebar variants                                | Components        | Duplicated                             | Fix       | Consolidate to one navigation system            | P1       |
| `/connect/shopify`                              | Integration route | Exists                                 | Pause     | Useful later, not before metric engine          | P2       |
| `/connect/klaviyo`                              | Integration route | ComingSoon                             | Pause     | Future integration                              | Later    |
| `/sync`                                         | Route             | Contains destructive dummy-data action | Pause/Fix | Hide dangerous actions, keep sync status later  | P1       |
| `/api/sync/dummy-data`                          | API               | Deletes data then seeds                | Pause     | Risky outside controlled dev                    | P1       |
| `/api/dev/generate-dummy-data`                  | API               | Deletes data then seeds                | Pause     | Risky outside controlled dev                    | P1       |
| `/product-economics/*`                          | Routes            | Duplicate/future                       | Pause     | Distracts from MVP target `/products`           | P2       |
| `/customer-intelligence/*`                      | Routes            | Future/mock                            | Pause     | Useful later, not core restart                  | Later    |
| `/reports`, `/guides`, `/roadmap`               | Routes            | Nice-to-have/internal                  | Pause     | Not needed for MVP demo                         | Later    |
| `supabase/migrations/*`                         | Schema            | Useful but incomplete                  | Keep      | Documents existing DB assumptions               | P1       |


## 11. Recommended MVP Architecture

Target structure:

```text
/app
  /dashboard
  /cohorts
  /retention
  /ltv
  /acquisition
  /products
  /scenarios
  /insights
  /data
  /settings

/components
  /ui
  /dashboard
  /charts
  /insights
  /upload
  /scenarios

/lib
  /supabase
  /metrics
  /insights
  /demo
  /types
```

Recommended route structure:


| Target Route   | Purpose                                             | Current Source                                          |
| -------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `/dashboard`   | Executive KPI overview and Revenue Durability Score | `dashboard`, `retention-ltv/revenue-cohorts`, `mv_kpis` |
| `/cohorts`     | Cohort matrix and cohort health                     | `cohorts`, `retention-ltv/revenue-cohorts`              |
| `/retention`   | Retention curves and repeat purchase behavior       | `retention-ltv/curves`, `retention-ltv/repeat-rates`    |
| `/ltv`         | Cohort LTV and contribution LTV                     | `retention-ltv/ltv-cohorts`                             |
| `/acquisition` | CAC, LTV:CAC, payback, channel quality              | Missing                                                 |
| `/products`    | First-product LTV and product customer quality      | Product mock pages plus `order_items`                   |
| `/scenarios`   | Simple what-if model                                | `financials/forecasts` placeholder copy only            |
| `/insights`    | Rules-based diagnosis cards and decisions           | `lib/diagnosis`, `retention-ltv/decisions`              |
| `/data`        | Demo mode, CSV upload, source status                | `sync`, `integrations`, demo mode                       |
| `/settings`    | Account/settings                                    | Current settings route                                  |


Recommended data flow:

```text
Raw input
  -> normalize to canonical Customer/Order/OrderLineItem/MarketingSpend
  -> pure metric functions in /lib/metrics
  -> insight rules in /lib/insights
  -> route-level loaders/API adapters
  -> UI components
```

Demo mode should feed the same canonical input shape into the same metric functions. Supabase/API results and CSV uploads should be normalized before metrics are calculated.

## 12. Recommended Calculation Engine

`/lib/metrics` should contain pure TypeScript functions with no React, no Supabase client, no browser APIs, and no UI imports. Each function should accept canonical arrays and options, and return stable typed results.

Recommended files:

```text
/lib/metrics
  cohorts.ts
  retention.ts
  repeat-purchase.ts
  ltv.ts
  acquisition.ts
  products.ts
  durability.ts
  index.ts
```

Recommended functions:

- `calculateCohorts(customers, orders, options)`
- `calculateRetentionByCohort(cohorts, orders, options)`
- `calculateRepeatPurchaseRate(customers, orders)`
- `calculateFirstToSecondOrderConversion(customers, orders)`
- `calculateLTVByCohort(cohorts, orders)`
- `calculateContributionLTV(cohorts, orders, marginAssumptions)`
- `calculateCACByMonth(marketingSpend, customers)`
- `calculateLtvToCac(ltvByCohort, cacByMonth)`
- `calculatePaybackPeriod(contributionLtvCurve, cac)`
- `calculateFirstProductLTV(customers, orders)`
- `calculateRevenueDurabilityScore(metrics)`

Initial rule: materialized views may cache results later, but they should not be the only source of metric definitions. Define metrics in TypeScript first, test them with demo fixtures, then decide which queries should be pushed down into SQL for performance.

## 13. Recommended Insight Engine

`/lib/insights` should contain deterministic rules first, then optional AI-assisted summaries later. It should not import React components.

Recommended files:

```text
/lib/insights
  rules.ts
  thresholds.ts
  generate-diagnostic-insights.ts
  revenue-durability.ts
  decisions.ts
  index.ts
```

First diagnostic rules:

- Low first-to-second conversion: flag if second purchase conversion is below threshold or down materially vs prior cohort.
- Fast early retention decay: flag if month-1/month-2 customer retention drop exceeds threshold.
- Weak LTV expansion: flag if cohort LTV does not grow after first purchase window.
- CAC payback breach: flag if payback exceeds target months.
- Channel quality mismatch: flag channels with high CAC and low repeat/LTV.
- Product quality mismatch: flag first products with high first-order volume but low downstream LTV.
- Revenue concentration risk: flag if one cohort/product/channel drives too much revenue.
- Margin illusion: flag high revenue/LTV cohorts with weak contribution LTV.

Insight output should include severity, evidence, metric references, recommended action, and confidence. The current `lib/diagnosis/*` copy and causality concepts are useful, but the type layer needs to move into `/lib/types` or `/lib/insights`.

## 14. Recommended Scenario Model

The first scenario model should be deliberately simple and numeric. It should take current baseline metrics and allow a user to adjust:

- Repeat rate / first-to-second conversion
- AOV
- CAC
- Gross margin
- Payback target
- Contribution LTV horizon

Minimum useful output:

- Projected revenue impact
- Projected contribution LTV
- Projected LTV:CAC
- Projected CAC payback period
- Change in Revenue Durability Score
- Plain-English interpretation of which lever matters most

Recommended implementation:

```text
/lib/metrics/scenarios.ts
  calculateScenarioBaseline(metrics)
  applyScenarioInputs(baseline, inputs)
  compareScenarioToBaseline(baseline, scenario)

/components/scenarios
  ScenarioControls.tsx
  ScenarioSummary.tsx
  ScenarioImpactChart.tsx
```

Do not build forecasting, probability, or integrations yet. Use demo/current metrics and make the model transparent.

## 15. Next 10 Tasks

1. Fix the 8 lint errors blocking `npm run lint` and `npm run build` without refactoring behavior.
2. Add `npm run typecheck` as `tsc --noEmit`, then run it and document/fix only blocking type errors.
3. Create `/lib/types` with canonical customer, order, order line item, product, marketing spend, metric, insight, and scenario types.
4. Create `/lib/demo` by moving/adapting seeded demo generators to output canonical types.
5. Create `/lib/metrics` with `calculateCohorts`, `calculateRetentionByCohort`, `calculateRepeatPurchaseRate`, and `calculateFirstToSecondOrderConversion` first.
6. Add focused tests or fixture checks for the first metric functions before wiring UI.
7. Rewire `/dashboard`, `/cohorts`, `/retention`, and `/retention-ltv/repeat-rates` to use the shared metric functions through a thin adapter.
8. Create `/ltv` backed by `calculateLTVByCohort`, then migrate useful UI from `/retention-ltv/ltv-cohorts`.
9. Create `/lib/insights/generateDiagnosticInsights()` using deterministic rules and move useful `lib/diagnosis` logic behind that API.
10. Simplify navigation to the MVP routes only, hiding broken/missing/placeholder routes until the metric engine is stable.

Stop point: review this audit before making major code changes.