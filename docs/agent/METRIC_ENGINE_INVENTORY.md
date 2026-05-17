# RetentionOS Metric Engine Inventory

**Sprint:** A — Metric Engine Inventory (audit/documentation only)  
**Generated:** 2026-05-18  
**Scope:** File-path-specific map of where customer economics logic lives, overlaps, and should converge.  
**Related docs:** `docs/active-metrics-map.md`, `docs/metric-inventory-audit.md` (page-level audits; some routes/components have moved since — this doc reflects the repo as inspected).

---

## Executive summary

RetentionOS currently runs **two parallel metric ecosystems**:

1. **Command-centre / MVP metric engine (trusted path for demo + CSV)** — Pure TypeScript in `lib/metrics`, consumed by **client-side view models** (`build*ViewModelFromDataset`) on Dashboard (`DashboardExecutive.tsx`), Cohorts, LTV, Retention, Insights, and `/data` previews. `lib/insights` applies rules on top of the same scalar inputs. This path keeps **heavy math out of React**; components mostly format and render view models.

2. **Legacy Supabase / Shopify API pages** — Materialized views (`mv_kpis`, `mv_cohorts`, `mv_customer_segments`, `mv_retention_periods`) plus **hand-rolled calculations inside API routes** (`app/api/metrics/*`, `app/api/dashboard/metrics/route.ts`). Large **retention-LTV** and **customers/products** UIs fetch these APIs and often **aggregate or derive** metrics in the browser (see `RepeatPurchaseRatesContent`, `retention-ltv/revenue-cohorts`, `retention-ltv/ltv-cohorts`, `retention-ltv/curves`).

**Consolidation priority:** Align the **canonical definitions** for repeat rate, first-to-second, retention %, and LTV with **one implementation** callable from both engine and API; eliminate silent dummy fallbacks on production-shaped routes; retire or quarantine **orphaned** dashboard code (`REDHomePage` + `/api/dashboard/metrics`) that duplicates `mv_kpis` semantics.

---

## Core metric location map

| Metric | Current location(s) | Source type | Risk level | Notes |
|--------|----------------------|-------------|------------|--------|
| **Cohorts (table / matrix)** | `lib/metrics/cohorts.ts`, `cohort-view-model.ts`, `cohort-matrix.ts`; `app/(protected)/cohorts/page.tsx` | Engine + view models | **Medium** | Primary MVP path for uploaded/demo dataset. |
| | `supabase/migrations/006_create_metric_views.sql` → `mv_cohorts`; `app/api/metrics/cohorts/route.ts` | SQL + API shaping | **High** | Same *labels*, different pipeline (`DateTrunc`/`AGE` in SQL vs UTC month keys in TS). |
| **Cohort retention (Month+N active %)** | `lib/metrics/retention.ts`; `retention-view-model.ts` | Engine | **Medium** | Used in command-centre retention page. |
| | `mv_cohorts.retention_rate_percent`; cohort API | SQL / API | **High** | SQL: active_customers / cohort_size for **calendar month offset**. |
| **Repeat purchase rate (portfolio)** | `lib/metrics/repeat-purchase.ts` → `calculateRepeatPurchaseRate` | Engine | **Medium** | Feeds dashboard + insights bundle. |
| | `app/api/metrics/repeat-purchases/route.ts` (counts from `orders` per customer) | API-only | **High** | **Does not import** `lib/metrics`; logic must stay in sync manually. |
| **First-to-second purchase (e.g. within 90d)** | `lib/metrics/repeat-purchase.ts` → `calculateFirstToSecondOrderConversion` | Engine | **Medium** | Window-based journey metric. |
| | Cohort SQL / mv paths — not same definition | — | **High** | Month+N “active” ≠ first→second within X days. |
| **Revenue LTV (cohort staircase)** | `lib/metrics/ltv.ts` → `calculateLTVByCohort`; `ltv-view-model.ts` | Engine | **Medium** | Net merchandise revenue ladder; documented in `ltv.ts`. |
| | `mv_cohorts` revenue + **frontend** aggregation on `retention-ltv/ltv-cohorts/page.tsx` | SQL + React aggregation | **High** | Different shape & normalization (monotonicity enforced in UI per prior audits). |
| **Contribution LTV** | `lib/metrics/ltv.ts` + `utils.ts` (`orderContribution`); cohort matrix metric kind `contribution_ltv` | Engine | **Medium** | Depends on margin assumptions / order rows. |
| | Not in materialized views | — | **Low** | SQL path is revenue-centric. |
| **CAC (blended / by month)** | `lib/metrics/acquisition.ts` | Engine | **Medium** | Uses marketing spend + new customers by first-order month. |
| | `/api/dashboard/metrics` (legacy) — separate story | API | **Critical** | Orphan route; not wired to main dashboard. |
| **LTV/CAC & payback** | `lib/metrics/acquisition.ts` (`calculateLtvToCac`, `calculatePaybackPeriod`, etc.) | Engine | **Medium** | Surfaced in `components/data/AcquisitionDataPreview.tsx` ( `/data` preview). |
| | No dedicated acquisition dashboard page yet (`app/(protected)/acquisition/page.tsx` placeholder) | — | **Low** | Product surface not built. |
| **Product-level customer quality** | `app/api/products/performance/route.ts` (**mock** comments) | Mock API | **Critical** | Not economics-grade; placeholder. |
| | `app/api/metrics/category-cohorts/route.ts`; category cohorts UI | API | **High** | Separate from `lib/metrics` product engine. |
| **Channel-level acquisition quality** | `lib/metrics/acquisition.ts` (spend channels listed on preview); `lib/import/marketing-spend-schema.ts`, `lib/demo/demo-marketing-spend.ts` | Engine / import | **Medium** | Channel × month spend exists; **full channel LTV/CAC views** not in command-centre nav. |
| | `app/(protected)/customer-intelligence/composition/page.tsx` — inline mock channel LTV | React + hardcoded | **Critical** | Explicit mock data in component. |
| **Revenue Durability Snapshot (posture)** | `lib/metrics/dashboard-view-model.ts` → `computeDurability` | Engine (threshold vote) | **Medium** | Heuristic **Healthy / Mixed / Watch** — not a formal index. |
| | `lib/insights/rules.ts` → `evaluateRevenueDurabilityStatus` | Rules duplicate | **High** | **Intentionally mirrored** with `computeDurability`; two copies must stay aligned. |
| **Diagnostic insights** | `lib/insights/generate-diagnostic-insights.ts`, `rules.ts`, `thresholds.ts`, `insights-view-model.ts` | Rules on engine outputs | **Medium** | Uses same scalars as dashboard; duplicates some helpers (e.g. terminal cohort picks) as `generate-diagnostic-insights.ts`. |

---

## Metric logic inside React components

Strict interpretation: **core** formulas should live in `lib/metrics`; React still contains **presentation math** (sorting, clamping for CFO-trust demo, chart series transforms).

| Area | File(s) | What is computed in UI |
|------|-----------|-------------------------|
| **Repeat purchase views** | `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` | Cumulative / incremental series from API breakdown; derived chart semantics. |
| **Revenue cohorts** | `app/(protected)/retention-ltv/revenue-cohorts/page.tsx` | Trend series, top-cohort shares, period comparisons (see `docs/active-metrics-map.md`). |
| **LTV cohorts** | `app/(protected)/retention-ltv/ltv-cohorts/page.tsx` | Weighted averages, monotonic LTV normalization, bucket aggregations. |
| **Retention curves** | `app/(protected)/retention-ltv/curves/page.tsx` | `clampRevenueRetention` for demo mode; period/cohort chart transforms; uses **`is_demo`** from cohort API. |
| **Cohort matrix (legacy chart)** | `components/charts/CohortMatrix.tsx` | Period-0 “original revenue” and similar derivations from API payload. |
| **Customer intelligence composition** | `app/(protected)/customer-intelligence/composition/page.tsx` | **Hardcoded mock** channel LTV table. |
| **Legacy RED dashboard** | `app/(protected)/dashboard/REDHomePage.tsx` | Fetches `/api/dashboard/metrics`; KPI/mock tile definitions (page **not** used by `app/(protected)/dashboard/page.tsx`, which renders `DashboardExecutive`). |

**Positive pattern:** `DashboardExecutive.tsx`, `cohorts/page.tsx`, `ltv/page.tsx`, `RetentionClient.tsx`, `InsightsClient.tsx` use **`useMemo(() => build*ViewModelFromDataset(...))`** — formatting only, not core calculus.

---

## Duplicate or conflicting calculations

| Topic | Locations | Conflict |
|-------|-----------|----------|
| **Portfolio repeat rate** | `lib/metrics/repeat-purchase.ts` vs `app/api/metrics/repeat-purchases/route.ts` | Two independent implementations; filter semantics (date range, customer type) only in API. |
| **Retention %** | `mv_kpis` repeat-based formula vs `mv_cohorts` active/cohort_size vs dashboard `calculateRetentionMetrics` in `app/api/dashboard/metrics/route.ts` | Different denominators and cohort grain. |
| **“LTV” KPI** | `mv_kpis.customer_lifetime_value` (= total revenue / customers) vs engine **terminal cohort LTV** / staircase | Same name, **different concepts** — documentation hazard. |
| **AOV** | `mv_kpis.average_order_value` (`AVG`) vs dashboard route (`totalRevenue / orders.length`) | Can diverge on edge cases. |
| **At-risk / dormant** | SQL uses `customers.last_order_at`; dashboard route uses order `source_created_at` patterns (per prior audit) | Inconsistent risk of population mismatch. |
| **Revenue durability vote** | `computeDurability` in `dashboard-view-model.ts` vs `evaluateRevenueDurabilityStatus` in `insights/rules.ts` | **Duplicate threshold logic** — comments claim parity; risk of **drift** on change. |
| **LTV terminal pick / cohort spread helpers** | `dashboard-view-model.ts` vs `generate-diagnostic-insights.ts` | Nearly identical **pure helpers** (`groupLtvCurveByCohort`, `pickBest`, etc.). |
| **Cohort retention-LTV pages** | Engine `calculateLTVByCohort` vs SQL `mv_cohorts` + React aggregation | Three-way split; hard to assert one number. |

---

## Demo/mock fallback risks

| Location | Behaviour | Risk |
|----------|-----------|------|
| `app/api/dashboard/metrics/route.ts` | If no customers or no paid orders → **`generateDummyMetrics()`** | **Silent replacement** of real absence with dummy KPIs for connected Shopify users. |
| `app/api/metrics/cohorts/route.ts` | No session in **dev** → dummy cohorts + `is_demo`; empty/err in dev → dummy; **production** empty → empty array | Dev-only dummy is explicit; prod avoids dummy. |
| `app/api/metrics/repeat-purchases/route.ts` | No session in dev → empty structure + `is_demo: true` | Marked demo. |
| `app/api/retention/curve/route.ts` | Comment: returns **mock** curve data | **Production route returns mock** — high trust risk if linked from live nav. |
| `app/api/products/performance/route.ts`, `app/api/reports/summary/route.ts` | Mock payloads | Non-economics placeholders. |
| `app/(protected)/customer-intelligence/composition/page.tsx` | Hardcoded channel metrics | Clearly fake; should not be mistaken for Shopify-backed. |
| Command-centre pages | `lib/data-source/client-selected-source.ts` — explicit **demo vs uploaded_csv** | Intentional; not a silent DB fallback. |

---

## SQL / materialized view risks

| Item | Where | Risk |
|------|-------|------|
| **`mv_kpis`** | `006_create_metric_views.sql` | Account-level rollups; **LEFT JOIN** orders can **inflate customer counts** if not understood (classic many-to-one join aggregation issue — verify against intent). |
| **`mv_cohorts`** | Same migration | `period_number` = `EXTRACT(month FROM AGE(order_month, cohort_month))` — **month index**, not necessarily “week” labels if UI says weeks. |
| **Refresh** | Materialized views | **Staleness** if refresh job not aligned with UX expectations (`calculated_at` only as fresh as last refresh). |
| **`mv_customer_segments`** | Threshold CASE statements (spend / days / orders) | **Hardcoded** segment boundaries — product judgement; must stay consistent if TS engine segments ever added. |
| **`mv_retention_periods`** | Defined in migration | Additional path for retention shape; may overlap conceptually with `mv_cohorts`. |

---

## Recommended consolidation sequence

1. **Freeze nomenclature** — Publish a one-pager: “LTV (KPI)”, “LTV (cohort staircase)”, “retention (portfolio)”, “retention (cohort Month+N)” to stop label collision (no code change required for that doc).
2. **Single implementation for repeat + first-to-second** — Implement `lib/metrics` helpers as **shared library** called from `app/api/metrics/repeat-purchases/route.ts` (and optionally SQL for aggregates later). **Highest ROI / lowest scope.**
3. **Unify durability voting** — Export one function (e.g. from `lib/insights/rules.ts` or a tiny `lib/metrics/durability.ts`) consumed by dashboard view model and insights; **delete duplicate** threshold arrays from `dashboard-view-model.ts`.
4. **Dedupe LTV cohort helpers** — Move `groupLtvCurveByCohort` / terminal picks to `lib/metrics/utils.ts` or `ltv-helpers.ts`; import from insights generator and dashboard.
5. **Route-quarantine** — Remove or guard **`/api/dashboard/metrics`** + `REDHomePage` behind explicit “legacy lab” or delete after porting any still-needed KPI to `mv_kpis` or engine.
6. **Cohort API vs engine** — Longer horizon: either materialized views call documented parity tests against `lib/metrics` on a fixture, or **one** pipeline (TS job or SQL) feeds both.

---

## What to do now

- Treat **`lib/metrics` + `build*FromDataset`** as the **reference implementation** for demo/CSV command-centre surfaces.
- Treat **`mv_*` + `/api/metrics/cohorts`** as the **Shopify-connected** path until unified.
- Add **integration tests** (future sprint) that assert `calculateRepeatPurchaseRate` matches API repeat definition when filters are default.
- Flag **`/api/dashboard/metrics`** dummy fallback in runbooks for anyone testing Shopify-connected accounts.

---

## What to do next

- Wire **acquisition economics** (`lib/metrics/acquisition.ts`) into a real **Acquisition** product page when channel/CAC scope is defined.
- Replace **mock** `retention/curve`, `products/performance`, `reports/summary` with real data or hide routes from production nav until implemented.
- Optional: **refresh strategy** doc + UI “as of” for materialized views.

---

## What to avoid for now

- **Big-bang rewrite** of all SQL to TS or vice versa before parity tests exist.
- **Deleting** `REDHomePage` / `/api/dashboard/metrics` **without** confirming no external bookmark or feature flag depends on them.
- **Merging** `mv_kpis` “LTV” with cohort staircase without a **renamed UI label**.

---

## Open questions for human review

1. **Product truth:** Should the **executive dashboard** for connected data eventually be **100% SQL**, **100% TS engine**, or **hybrid** (engine for CSV, SQL for sync)?  
2. **LTV naming:** Rename KPI “customer lifetime value” in `mv_kpis` consumer UIs to “average revenue per customer” or similar?  
3. **Repeat purchase API:** Should date-filtered repeat rates **reuse** engine functions with the same customer universe rules?  
4. **Channel quality:** Is **month × channel spend vs cohort LTV** the first ship, or **attribution-quality** requirements block shipping?  
5. **Durability:** Keep **heuristic posture** vs evolve to a **published formula** (weighting, statistical guardrails)?  
6. **What to delete later:** `REDHomePage.tsx` and duplicate dashboard metrics API if superseded — confirm with stakeholders.  
7. **`customer-intelligence/composition` mock page:** Remove from sidebar or label **Prototype** until wired to real data.

---

## Appendix: key files quick index

| Layer | Paths |
|-------|--------|
| Engine | `lib/metrics/*.ts` (notably `cohorts.ts`, `retention.ts`, `repeat-purchase.ts`, `ltv.ts`, `acquisition.ts`, `*-view-model.ts`, `cohort-matrix.ts`, `dashboard-view-model.ts`) |
| Insights | `lib/insights/*.ts` |
| Demo / data | `lib/demo/*`, `lib/data-source/*`, `components/data/AcquisitionDataPreview.tsx` |
| Types | `lib/types/*` |
| SQL | `supabase/migrations/006_create_metric_views.sql` |
| APIs (metrics) | `app/api/metrics/**`, `app/api/dashboard/metrics/route.ts`, `app/api/retention/**`, `app/api/products/**`, `app/api/reports/**` |
| Diagnosis (narrative) | `lib/diagnosis/*` — consulting-style copy on top of chart payloads; **not** the numeric source of truth |
