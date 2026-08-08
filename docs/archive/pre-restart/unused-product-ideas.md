# Unused Product Ideas Archive

> **Historical product archive.** Preserved component intent from pre-restart exploration; not current roadmap authority. See [`PRODUCT_RECONCILIATION_BACKLOG.md`](../../PRODUCT_RECONCILIATION_BACKLOG.md) §10.

**Generated:** 2024-12-19  
**Purpose:** Preserve product intent and hypotheses for unused components/pages

This document catalogs React components and pages that were built but are currently unused, preserving their original product intent for future reference.

---

## SegmentsClient.tsx

**File Path:** `app/(protected)/segments/SegmentsClient.tsx`

**Original Idea / Hypothesis:**
Segment Explorer was designed to help users build, monitor, and activate lifecycle segments across retention plays. The component provided:
- KPI dashboard showing total active segments, dynamic audiences, segment coverage, and lifecycle gaps
- Insight panel with segment health metrics
- Table view of lifecycle segment health with coverage and value metrics
- Actions to create segments and sync to Klaviyo
- Integration with demo mode for showcasing segment capabilities

**Why it is currently unused:**
The `/segments` route was converted to a "Coming Soon" placeholder to align with product prioritization. The full Segment Explorer feature is planned but not yet implemented with real data integration.

**Conditions under which it should be reintroduced:**
- When segment creation and management APIs are ready
- When Klaviyo integration supports segment syncing
- When lifecycle segment tracking is prioritized in the product roadmap
- When customer data is structured to support dynamic segment definitions

**Recommended action:** ARCHIVE
- Move to `app/(protected)/_archive/segments/SegmentsClient.tsx`
- Keep for reference when implementing full segments feature
- Component structure and UI patterns are reusable

---

## ProductsClient.tsx

**File Path:** `app/(protected)/products/ProductsClient.tsx`

**Original Idea / Hypothesis:**
Product Analytics dashboard was designed to provide comprehensive product performance insights including:
- SKU performance metrics (revenue, margin, retention)
- Cross-sell and upsell opportunity identification
- Replenishment frequency and timing optimization
- Product-level retention insights
- Integration with demo mode for showcasing product analytics

**Why it is currently unused:**
The `/products` route was converted to a "Coming Soon" placeholder. Product analytics requires deeper integration with product catalog data and order line items, which is planned for a future release.

**Conditions under which it should be reintroduced:**
- When product catalog sync is implemented
- When order line items are tracked and analyzed
- When SKU-level retention metrics are prioritized
- When cross-sell/replenishment algorithms are ready

**Recommended action:** ARCHIVE
- Move to `app/(protected)/_archive/products/ProductsClient.tsx`
- Keep for reference when implementing product analytics
- UI structure and KPI patterns are valuable for future implementation

---

## FinancialsClient.tsx

**File Path:** `app/(protected)/financials/FinancialsClient.tsx`

**Original Idea / Hypothesis:**
Financial Intelligence dashboard was designed to track revenue health and financial metrics:
- Revenue breakdown and trend analysis (gross/net revenue, refunds, discounts)
- Margin performance tracking
- Monthly revenue and margin tables
- Retention-adjusted financial forecasts
- Integration with demo mode for showcasing financial insights

**Why it is currently unused:**
The `/financials` route and sub-routes were converted to "Coming Soon" placeholders. Financial analytics requires comprehensive revenue data modeling and forecasting capabilities that are planned for future releases.

**Conditions under which it should be reintroduced:**
- When revenue data modeling is complete
- When refund and discount tracking is implemented
- When financial forecasting algorithms are ready
- When margin analysis is prioritized in the product roadmap

**Recommended action:** ARCHIVE
- Move to `app/(protected)/_archive/financials/FinancialsClient.tsx`
- Keep for reference when implementing financial intelligence features
- Financial metrics structure is valuable for future implementation

---

## Archive Notes

All archived components follow a consistent pattern:
- Use `DataState`, `EmptyState`, `ErrorState` for state management
- Integrate with demo mode for showcasing capabilities
- Use `PageHeader`, `KpiSection`, `InsightPanel`, `TableSection` for UI consistency
- Support search params for filtering and state management

When reintroducing these components:
1. Review the archived implementation for UI patterns
2. Update data fetching to use real APIs instead of demo data
3. Ensure integration with actual data sources
4. Test with production data structures
5. Update content-map.ts with any new content requirements

---

## Related Content Configuration

The following entries in `lib/content-map.ts` are associated with these unused components:
- `segments` - Segment Explorer content configuration
- `products` - Product Analytics content configuration  
- `financials` - Financial Intelligence content configuration

These content configurations should be preserved as they define the intended structure and KPIs for these features.

