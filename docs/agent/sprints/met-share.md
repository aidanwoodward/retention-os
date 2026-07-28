# Sprint MET-SHARE — Acquisition-cohort revenue contribution

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Implement the deterministic metric answering: which acquisition cohorts generated the trusted net revenue in the selected reporting period?

Flow: `RetentionOSDataset` + `AnalysisContext` → `buildAnalysisSelection` → `calculateCohortRevenueContribution(selection)` → reconciled contribution rows and coverage metadata.

### Commercial reason

Brands need period portfolio share by acquisition cohort (with absolute $ support), distinct from cumulative LTV — locked in PRODUCT_RECONCILIATION_BACKLOG §2.3 / §6.1.

### In scope

- Pure metric `calculateCohortRevenueContribution(selection: AnalysisSelection)`
- Residual categories: unidentified_customer, outside_selected_acquisition_period, unresolved_customer
- Separate `selectedCohortRevenue` vs `cohortResolvedRevenue` / attribution coverage
- MetricId + METRIC_CONTRACTS + contract-index (empty VM/routes — current wiring)
- Focused unit tests + Jan 2025 golden expectation
- Sprint record

### Out of scope

- View models, routes, pages, React
- analysis-context semantic changes
- Existing cohorts/LTV/retention/CAC formula changes
- demo-sanity, Shopify, persistence
- Weekly cohorts, D7/D14/D28, revenue-retention, new/returning, AOV, concentration, signals, RDS

### Founder-locked corrections (Gate 1)

1. Separate `selectedCohortRevenue` / `selectedCohortShareOfReportingRevenue` from `cohortResolvedRevenue` / `cohortAttributionCoverage` (coverage = cohort + outside; excludes unidentified/unresolved)
2. Contract index: `viewModelBuilders: []`, `uiRoutes: []` (verified current wiring only)
3. `unresolved_customer` only for missing canonical customer; invalid `firstOrderAt` → `RangeError`
4. Engine empty = no reporting activity; do not document as Locked
5. AnalysisSelection-only input; no raw-orders overload
6. Reuse `netOrderRevenue`; no engine rounding; 1e-9 reconciliation; null ratios when denom 0
7. Emission when `orderCount > 0`; residual ordering locked; customerCount semantics locked
8. Additional tests for selected vs coverage split, coverage exclusions, invalid firstOrderAt, empty index wiring
9. Approved file allowlist only

### Acceptance criteria

- [x] Formula attributes via canonical `firstOrderAt` over `reportingOrders`
- [x] Residuals explicit; outside absent when acquisition scope all
- [x] Selected share ≠ coverage under bounded acquisition with outside revenue
- [x] Shares/revenues reconcile; null ratios when total 0; empty vs zero-net available
- [x] Invalid firstOrderAt throws RangeError
- [x] Contracted MetricId with empty VM/route linkage
- [x] Golden Jan 2025 locked
- [x] Validation + PR + Gate 2 packet

### Files expected to change

- `lib/metrics/cohort-revenue-contribution.ts`
- `lib/metrics/cohort-revenue-contribution.test.ts`
- `lib/metrics/index.ts`
- `lib/metrics/metric-definitions.ts`
- `lib/metrics/metric-contract-index.ts`
- `lib/metrics/metric-contract-index.test.ts`
- `docs/METRIC_CONTRACTS.md`
- `lib/metrics/golden/GOLDEN_EXPECTED_RESULTS.md`
- `lib/metrics/golden/golden-expected.ts`
- `lib/metrics/golden-reconciliation.test.ts`
- `package.json`
- `tsconfig.test.json`
- `docs/agent/sprints/met-share.md`

### Stop conditions

- UI/VM/page wiring
- analysis-context or existing metric formula edits outside allowlist
- Inventing Locked engine status

## Plan-review verdict

- verdict: `APPROVE` (cycle 2; then founder Gate 1 with locked corrections)
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Founder locked selected vs coverage split, empty contract-index wiring, narrow unresolved, empty terminology, AnalysisSelection-only input.

## Founder plan approval

- Recorded after: `Approve Sprint MET-SHARE for execution with the following founder-locked corrections.`
- Date/time: 2026-07-28
- Base SHA: `d30cd4e21103f37618c6a3bf05320a7a3cfd54d3`

## Approved-plan identity

- Plan section hash: founder-locked-corrections-met-share-2026-07-28
- Base branch: `restart-retentionos-mvp`
- Base SHA: `d30cd4e21103f37618c6a3bf05320a7a3cfd54d3`

## Implementation summary

- Added `calculateCohortRevenueContribution` over `AnalysisSelection.reportingOrders` using `netOrderRevenue` and canonical `firstOrderAt` cohort keys
- Explicit residuals; selected cohort share separated from attribution coverage (cohort + outside)
- Contracted MetricId `cohort_revenue_contribution` (18); index reports empty VM/route wiring; METRIC_CONTRACTS section added
- Focused unit matrix + Jan 2025 golden expectation (410 / 80 / 330)
- No analysis-context, existing cohort/LTV formulas, VM, or page changes

## Implementation-review verdict

- verdict: `APPROVE` (cycle 2 after REQUEST_CHANGES for ASCII apostrophe in metric-definitions)
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Founder locks and allowlist confirmed; prior curly-apostrophe defect fixed.

## Validation and PR/check evidence

### Local validation

- Commands run: focused MET-SHARE tests; `npm run lint`; `npm run typecheck`; `npm test` (203 pass); `npm run build`; `git diff --check`
- Result: pass

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/35
- Base: `restart-retentionos-mvp`
- Head SHA: (updated after freeze commit)

### Checks

- `gh pr checks --watch`: pass (CI validate + Vercel)
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
