# Sprint 5U-C — Golden dataset and reconciliation tests

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Create one small hand-calculated RetentionOSDataset golden fixture with documented expected values; prove the canonical metric engine reconciles for core customer-economics metrics.

### Commercial reason

Founders need proof that contracted KPI formulas produce known-true numbers on a human-auditable fixture before trusting demo/CSV/dashboard output.

### In scope

- One primary golden RetentionOSDataset (6 customers, 10 orders, 2 products, cohorts `2024-12` + `2025-01` UTC year boundary) plus three in-test mutations (strip marginAssumptions; strip marketingSpend; strip lineItems)
- Human-readable expected worksheets + typed hard-coded expected constants (manually derived; never from engine)
- Engine reconciliation for: order G/D/R/net, cohort_size, repeat_purchase_rate, first_to_second_conversion (90d), cohort_retention staircases, revenue_ltv / contribution_ltv staircases, cac / blended_cac, revenue_ltv_cac / contribution_ltv_cac, payback, product_quality segment rates/drag
- CSV preview parity for locked ImportedCsvMetricPreview subset (including contribution unavailable asymmetry)
- Single VM check: buildAcquisitionPageViewModelFromDataset → summary.blendedCac === 55
- Thin metric-contract-index existingTests pointer updates
- Sprint record docs/agent/sprints/5uc.md
- Branch agent/sprint-5uc-golden-reconciliation from restart-retentionos-mvp @ b5e3a8a3f65ff083aa952f2ca7a72cf4f9fceaf5

### Locked defaults

1. Contribution path: MarginAssumptions `{ contributionMarginPct: 0.4, netRevenueMultiplier: 1 }`; orders do NOT set contributionMargin
2. Spend path: actual MarketingSpend rows 2024-12 = 150, 2025-01 = 180
3. Retention 2024-12 offsets 0..4: `[1, 1/3, 0, 0, 1/3]`; 2025-01 offsets 0..3: `[1, 1/3, 0, 0]`
4. Revenue LTV 2024-12: `[340/3, 140, 140, 140, 470/3]`; 2025-01: `[110, 370/3, 370/3, 370/3]`; contribution = 0.4 × revenue at each point
5. CAC Dec=50, Jan=60; blended=55; payback Dec=1, Jan=null; portfolio repeat=4/6, F2S90=3/6
6. CSV preview fields: customerCount, orderCount, productCount, cohortCount, firstCohort, lastCohort, totalRepeatPurchaseRate, firstToSecondWithin90DaysRate, averageMonth1ActiveRate, averageMonth2ActiveRate, averageMonth3ActiveRate, latestAverageNetRevenueLTV; contributionLTVAvailable===false; latestAverageContributionLTV===null
7. Product quality: assert rates/drag; expect insufficient_data (n<5); do not expand fixture for strong/weak
8. Expected values: MD worksheets SoT; TS transcribed from MD; never regenerate from production calculators
9. Discrepancy protocol: classify contract / engine / presentation / fixture; no silent expected edits; no broad rewrite
10. Freeze rule: sprint record ends at AWAITING_FOUNDER_MERGE_APPROVAL; no repo DONE / Gate 2 text

### Out of scope

- UI redesign or chart work
- Shopify OAuth or production integrations
- Persistence architecture
- Broad calculator refactoring / helper deduplication
- New metrics
- Production Revenue Durability Score methodology
- Scenario modelling
- revenue_durability_posture as golden oracle
- marketing_spend_assumption % synthesis as golden oracle
- Executive hero/spine composites as oracles
- Large synthetic-data frameworks
- 5V-A or later roadmap work

### Acceptance criteria

- [ ] One auditable golden fixture ≤6–10 customers with year-boundary UTC cohorts
- [ ] Expected values manually derived and hard-coded; documented human table
- [ ] Engine reconciles for all included metrics / locked matrix
- [ ] Missing margin/spend/line-item paths assert unavailable/null (no silent zero CAC)
- [ ] CSV preview subset + contribution asymmetry locked
- [ ] Acquisition VM raw blendedCac === 55
- [ ] No React metric math; no demo oracle; no engine-generated expected values
- [ ] npm test, lint, typecheck, build pass
- [ ] Sprint record + PR to restart-retentionos-mvp only

### Files expected to change

- lib/metrics/golden/golden-dataset.ts
- lib/metrics/golden/golden-expected.ts
- lib/metrics/golden/GOLDEN_EXPECTED_RESULTS.md
- lib/metrics/golden-reconciliation.test.ts
- lib/metrics/metric-contract-index.ts (existingTests pointers only)
- lib/metrics/metric-contract-index.test.ts (only if needed)
- package.json
- tsconfig.test.json
- docs/agent/sprints/5uc.md

### Stop conditions

- Scope expands beyond locked defaults
- PR would target main
- Expected values regenerated from engine
- Broad calculator rewrite without founder re-approval
- Independent reviewer unavailable after one retry without founder-authorized manual review
- Validation/CI fails after two fix attempts

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Cycle 1 REQUEST_CHANGES (CSV fields, VM target, offset matrix, G/D/R, Ops-01 locks) incorporated; cycle 2 APPROVE.

(Process evidence / traceability only — not proof of independence.)

## Founder plan approval

- Recorded after: `Approve the Sprint 5U-C plan and execute it under the canonical Ops-01 workflow.`
- Date/time: 2026-07-25 (implementation start after Gate 1)
- Base SHA: `b5e3a8a3f65ff083aa952f2ca7a72cf4f9fceaf5`

## Approved-plan identity

- Plan section hash: `53f9218e9ef114e07a8fb56fc44b061cc6f2b7c9e4347c0becc5c7b3f1455b06`
- Base branch: `restart-retentionos-mvp`
- Base SHA: `b5e3a8a3f65ff083aa952f2ca7a72cf4f9fceaf5`
- Plan match confirmation: Final plan and scope matches Founder Gate 1-approved plan (cycle-2 APPROVE locks).

## Implementation summary

- Added hand-auditable golden `RetentionOSDataset` (6 customers, 10 orders, 2 products, UTC year-boundary cohorts) under `lib/metrics/golden/`.
- Documented manual arithmetic in `GOLDEN_EXPECTED_RESULTS.md`; transcribed hard-coded expected constants (not engine-derived).
- Added `golden-reconciliation.test.ts` covering order nets, cohort/repeat/F2S, retention and LTV staircases, CAC/LTV:CAC/payback, product quality rates, CSV preview asymmetry, acquisition VM `blendedCac`, and missing margin/spend/line-item mutations.
- Wired test into `package.json` / `tsconfig.test.json`; appended golden test pointers on contracted MetricIds in `metric-contract-index.ts`.
- No calculator formula changes, UI work, or new metrics. Engine matched manual expected values with no discrepancy escalation.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Allowlist intact; expected constants hand-coded; full reconciliation coverage; 92/92 tests pass.

(Process evidence / traceability only — not proof of independence.)

## Validation and PR/check evidence

### Local validation

- Commands run: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
- Result: pass — 92 tests (incl. 11 golden reconciliation); lint/typecheck/build clean

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/26
- Base: `restart-retentionos-mvp`
- Head SHA: `e052929093bbde820564c971c8aa54b0359e6bc2`

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
