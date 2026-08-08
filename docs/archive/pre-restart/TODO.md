# Retention OS - Development TODO List

> **Historical pre-restart checklist.** Not current product or architecture truth. Canonical routing: [`AGENTS.md`](../../AGENTS.md).

## ✅ Completed Pages

### Retention & LTV Section (100% Complete)

- **Revenue Cohorts** (`/retention-ltv/revenue-cohorts`) - ✅ FINALIZED
  - All bugs fixed
  - FilterBar integration complete
  - Charts and visualizations working
  - AI Analysis integrated

- **Retention Curves** (`/retention-ltv/curves`) - ✅ COMPLETE
  - FilterBar migration complete (uses `retentionCurvesFilters` config)
  - FilterBar config added to `lib/filters/config.ts`
  - URL-based fetching implemented (FilterBar handles URL sync)
  - Comprehensive visualizations implemented (aggregated and cohort views)
  - AI Analysis integrated (gated behind `NEXT_PUBLIC_ENABLE_AI_ANALYSIS` feature flag)
  - KPI cards implemented (Year 1 Retention, Revenue Retention, etc.)
  - Design quality matches Revenue Cohorts benchmark
  - Diagnosis, Decision Axes, and Impact Ranges integrated

- **CLR & LTV Cohorts** (`/retention-ltv/ltv-cohorts`) - ✅ COMPLETE (Phase 0 Trusted)
  - Page fully implemented
  - FilterBar integrated
  - LTV cohort visualization complete (aggregated and cohort-by-cohort views)
  - CLR (Customer Lifetime Revenue) metrics implemented
  - LTV calculations and comparison charts complete
  - AI Analysis integrated
  - Maturity gating and coverage thresholds implemented
  - Phase 0 trusted status achieved (per `docs/ltv-curves-pre-flight-checklist.md`)

- **Repeat Purchase Rates** (`/retention-ltv/repeat-rates`) - ✅ COMPLETE (Phase 0 Trusted)
  - Page exists (`RepeatPurchaseRatesContent.tsx`)
  - FilterBar integrated (uses `repeatRatesFilters` config)
  - Repeat purchase visualization complete (cumulative and incremental views)
  - Cohort-based repeat purchase analysis implemented
  - Metrics implemented (second purchase rate, median purchases, etc.)
  - AI Analysis integrated
  - V1 filter compliance verified
  - Phase 0 trusted status achieved (per `docs/repeat-rates-phase0-final-verification.md`)

## 📋 Remaining Sections (Future)

### Customer Intelligence
- Customer Composition
- Segments
- Customer Profiles

### Product Economics
- Product Performance ✅ (FilterBar done)
- Concentration Curve
- Discount Usage
- Replenishment Frequency ✅ (FilterBar done)

### Financials
- Revenue Analysis
- Profitability
- Cost Analysis

## 🧪 Demo Polish (Non-blocking)

- Retention Curves: Occasional >100% customer retention values in demo mode
  - Cause: dummy data + aggregation artifacts
  - Impact: cosmetic only
  - Note: does NOT affect real data path or retention semantics
  - Status: deprioritized until demo data v2

## 🔧 Technical Improvements (Ongoing)

- [ ] Pause Klaviyo/Shopify integrations (use dummy data only)
- [x] Ensure all pages use FilterBar consistently - **Retention & LTV section: 100% compliant** ✅
- [ ] Standardize chart components
- [x] Add AI Analysis to all major pages - **Retention & LTV section: 100% complete** ✅
- [ ] Create comprehensive dummy data generators
- [ ] Ensure all visualizations work with dummy data

## 📝 Notes

- **Retention & LTV Section**: All 4 pages are complete and production-ready
- Revenue Cohorts page is the quality benchmark for other pages
- Retention Curves AI Analysis is intentionally gated behind `NEXT_PUBLIC_ENABLE_AI_ANALYSIS` feature flag
- All Retention & LTV pages follow consistent patterns: FilterBar → AI Analysis → KPI Cards → Visualizations → Diagnosis
- Next focus areas: Customer Intelligence and Product Economics sections
- Focus on showcasing visualizations with dummy data first
- Real data integration can come later once all pages are complete
