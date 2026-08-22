# Sprint 6B-DATA — Data page trust + Golden presentation migration

## Status

`CLOSEOUT READY — UNCOMMITTED`

## Founder Gate 1

- Decision: **APPROVE WITH LOCKS**
- Base SHA: `f713a3198bd2233fa10c774d256fdc73dd53aaf0`
- Feature branch: `sprint-6b-data`

## Locked page question

> What data is RetentionOS using, and what is still needed to trust customer-economics metrics?

## Founder locks (binding)

1. Trust + action page — not analytics dashboard or ETL console
2. No metric engine / contract / lifecycle / import engine edits
3. No `data-page-view-model.ts` — reuse `buildDashboardDataCompletenessView`
4. No `DataPageShell.tsx` — `CommandCentrePageFrame` in `page.tsx` (existing pattern)
5. No route coverage section; `DemoJourneyStrip` removed from hierarchy
6. `AcquisitionEconomicsPanel` untouched
7. No Golden imports/values; no confidence score; no definition browser; no channel CAC
8. Shopify roadmap copy only

## Implementation summary

- `DataPageAnalysisReadinessPanel` — completeness spine via `buildDashboardDataCompletenessView`
- `lib/mvp/data-readiness-presentation.ts` — presentation label mapping only
- `DataPageBody` — five-section hierarchy; frame remains in `page.tsx`
- Slimmed `DataPageSourceHero`; aligned `ImportedDatasetReviewPanel` trust labels
- Trimmed `AcquisitionDataPreview` copy

## Files changed

Modify:

- `app/(protected)/data/page.tsx` (client frame wiring via `DataPageClient`)
- `components/data/DataPageBody.tsx`
- `components/data/DataPageSourceHero.tsx`
- `components/data/ImportedDatasetReviewPanel.tsx`
- `components/data/AcquisitionDataPreview.tsx`
- `lib/mvp/cohesion.ts`
- `package.json` (test registration)
- `tsconfig.test.json` (test registration)

Add:

- `components/data/DataPageClient.tsx`
- `lib/mvp/data-readiness-presentation.ts`
- `lib/mvp/data-readiness-presentation.test.ts`
- `components/data/DataTrustLabel.tsx`
- `components/data/DataPageAnalysisReadinessPanel.tsx`
- `docs/agent/sprints/6b-data.md`
