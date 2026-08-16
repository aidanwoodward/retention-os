# Sprint 6B-PRODUCTS — Products Golden presentation migration

## Status

`IMPLEMENTING` (uncommitted — closeout revision applied)

## Closeout revision (independent review)

- verdict: `REVISE BEFORE CLOSURE` → addressed in closeout
- Revenue LTV executive card: removed `metricId="revenue_ltv"` (cohort Month+N `/ltv` tooltip ≠ product-quality snapshot lifetime average)
- Highest repeat rate card: removed `metricId="repeat_purchase_rate"` (portfolio repeat tooltip ≠ segment repeat)
- Cohesion `lookingAt`: corrected — quality rows are single-product only; multi/unknown are coverage residuals
- Added VM tests: classified unknown with line-item coverage; all-insufficient executive leaders unavailable
- Reviewer browser QA: `/products` checked at 1440 and 390; `/retention`, `/ltv`, `/insights` spot-checked
- Dashboard live route: auth-blocked in reviewer session; dashboard VM contract preserved via automated tests
- Builder browser QA: not claimed in initial Gate 2 packet; closeout includes reviewer viewport checks only

## Final plan and scope

### Objective

Upgrade production `/products` toward the approved Golden-inspired hierarchy using only canonical first-product customer quality metrics already in the engine — no formula or engine changes.

### Commercial reason

Operators should see which first products create durable, repeating customers, with attribution coverage honesty and three distinct executive leaders (rank, repeat, Revenue LTV) without collapsing them into one “best product.”

### Locked page question

> Which first products create more durable, repeating customers?

Attribution coverage is a trust strip below framing — not in the headline.

### In scope

- Attribution coverage strip (single / multi / unknown reconciling to snapshot customers)
- Exactly three `MetricStat` executive cards: Overall quality leader, Highest repeat rate, Highest Revenue LTV
- `AnalyticalPanel` table with Share column (`shareOfSnapshotCustomers`)
- VM extensions: `AttributionCoverageView`, `ProductsExecutiveView`, trust copy constants
- Sufficiency: `qualitySignal !== "insufficient_data"` for all three executive cards
- Tie-break for highest repeat / LTV: `productId` `localeCompare(..., "en")` ascending
- Preserve `strongestProductId` / `weakestProductId` summary fields for dashboard
- Cohesion hook + canonical attribution `lookingAt` copy
- `DiagnosisContinueSection`: Retention, LTV, Diagnostic Insights (`/insights`)
- VM tests A–M including conflicting leaders fixture
- This sprint record

### Out of scope

- `product-quality.ts`, `first-product-attribution.ts`, `revenue-concentration.ts` engine changes
- `lib/insights/matrix.ts`, `METRIC_CONTRACTS.md`
- Golden runtime imports, charts, concentration hero, cross-sell / progression
- Strongest/weakest UI cards (dashboard spine retains VM fields)

### Acceptance criteria

- [x] Engine formulas unchanged
- [x] Coverage strip + exactly three executive cards (no duplicated coverage in hero)
- [x] Table columns per spec; dropped 3+ orders and avg orders columns
- [x] `insufficient_data` excluded from executive leaders
- [x] Conflicting leaders preserved (rank ≠ repeat ≠ Revenue LTV)
- [x] Contribution conservative trust copy; `—` when unavailable
- [x] Validation suite: lint, typecheck, npm test, build, `git diff --check`

### Files changed

Modify:

- `app/(protected)/products/page.tsx`
- `components/products/FirstProductQualityPanel.tsx`
- `lib/metrics/product-quality-view-model.ts`
- `lib/mvp/cohesion.ts`
- `tsconfig.test.json`
- `package.json` (test registration only)

Create:

- `lib/metrics/product-quality-view-model.test.ts`
- `docs/agent/sprints/6b-products.md`

## Plan-review verdict

- verdict: `APPROVE_WITH_LOCKS`
- reviewer_mode: `founder_gate_1`
- builder_context_used: true
- notes: Founder Gate 1 approved with locked question, three-card hierarchy, coverage strip semantics, tie-break rules.

## Founder plan approval

- Recorded after: Founder Gate 1 APPROVED WITH LOCKS; EXECUTION MODE
- Date/time: 2026-08-16
- Base SHA: `b3cd3e24a72ee799dc8f6d40cfd97492ace150d6`

## Approved-plan identity

- Plan section hash: 6b-products-golden-locks
- Base branch: `restart-retentionos-mvp`
- Base SHA: `b3cd3e24a72ee799dc8f6d40cfd97492ace150d6`
- Feature branch: `sprint-6b-products`

## Implementation summary

- Extended `product-quality-view-model` with attribution coverage, executive leaders, row share, trust copy constants
- Rebuilt `FirstProductQualityPanel` with coverage strip, three `MetricStat` cards, `AnalyticalPanel` table
- Removed four count KPIs and strongest/weakest section from panel
- Cohesion: approved hook; `lookingAt` states single-product quality rows with multi/unknown as coverage residuals
- Products page next links: Retention, LTV, Insights

### Executive card semantics

| Card | Source |
|------|--------|
| Overall quality leader | Engine `strongestProduct` / `rankScore` (unchanged) |
| Highest repeat rate | Max `repeatPurchaseRate` among sufficient segments |
| Highest Revenue LTV | Max `avgRevenueLtv` among sufficient segments |

Tie-break for repeat and Revenue LTV only: smallest `productId` (`localeCompare` `en` ascending).

`qualitySignal` is table-only; not the same algorithm as rankScore.

### Revenue LTV caveat

Snapshot lifetime average net revenue per customer in segment — not age-standardised, not `/ltv` staircase.

### F2S caveat

Segment denominator is all customers in the row; short-history customers remain in denominator.

## Validation and PR/check evidence

### Local validation

- Commands: `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`
- Result: pass (575 tests after closeout; 73 app routes compiled)

### PR

Not applicable yet — uncommitted implementation.

## Notes

- Dashboard `mapDashboardProductQualityExecutive` continues to consume `summary.strongestProductId` / `weakestProductId` — preserved in VM.
