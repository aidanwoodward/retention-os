# Sprint MET-AOV-FREQ — Selected-period AOV and purchase frequency

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Implement deterministic selected-period customer-count × purchase-frequency × AOV:

`calculateAovFrequency(selection: AnalysisSelection): AovFrequencyResult`

with portfolio AOV, classified decomposition, guest/unresolved residuals, and identity coverage.

### Commercial reason

Brands need to know how active customers, order frequency, and AOV combine to produce selected-period revenue — PRODUCT_RECONCILIATION_BACKLOG §6.6.

### In scope

- Pure metric `calculateAovFrequency`
- MetricId `aov_frequency` + contracts (empty VM/route wiring)
- Appendix `aov` wording corrected to trusted-net portfolio AOV
- Focused unit tests + Jan 2025 golden expectation
- Sprint record

### Out of scope

- UI / VM / routes / React
- analysis-context semantic changes
- Existing contribution / retention / LTV / repeat-purchase / new-returning formula edits
- MET-CONCENTRATION, first-product, signals, RDS, Shopify, persistence

### Founder-locked Gate 1 clarifications

1. Portfolio AOV = trusted net / reporting order count (primary commercial AOV)
2. Classified AOV only for resolved-customer decomposition identity
3. `classifiedRevenue ≈ activeCustomerCount × ordersPerActiveCustomer × classifiedAverageOrderValue`
4. Guest/unresolved residuals explicit; no synthetic IDs; unresolved does not throw
5. Require `reportingPeriod` (RangeError if absent)
6. Ignore `acquisitionPeriod` / `eligibleCustomerIds` / `maturityHorizonMonths`
7. Do not call `calculateNewReturningMix`; no firstOrderAt validation
8. Contracted composite `aov_frequency` (20→21); keep appendix `aov` non-contracted
9. Duplicate policy: no silent dedupe; rely on upstream canonical construction

### Acceptance criteria

- [x] Formula matches locked commercial definitions
- [x] Portfolio vs classified AOV roles explicit
- [x] Residuals + coverage reconciliations
- [x] Acquisition ignored; reportingPeriod required
- [x] Contracted MetricId with empty VM/route linkage
- [x] Golden Jan 2025 locked (4 × 1.25 × 82 = 410)
- [x] Validation + PR + Gate 2 packet

### Files expected to change

- `lib/metrics/aov-frequency.ts`
- `lib/metrics/aov-frequency.test.ts`
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
- `docs/agent/sprints/met-aov-freq.md`

### Stop conditions

- UI/VM/page wiring
- analysis-context or existing metric formula edits outside allowlist

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Gate 1 independent plan review APPROVE; founder APPROVE WITH LOCKED CLARIFICATIONS.

## Founder plan approval

- Recorded after: Gate 1 verdict `APPROVE WITH LOCKED CLARIFICATIONS` / execute under submitted Gate 1 plan
- Date/time: 2026-07-28
- Base SHA: `f633d201e939a2970a0f7950a6c7c03a43b0cbf1`

## Approved-plan identity

- Plan section hash: Gate 1 plan + founder locked clarifications (portfolio vs classified AOV; no new-returning dependency)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `f633d201e939a2970a0f7950a6c7c03a43b0cbf1`

## Implementation summary

- Added `lib/metrics/aov-frequency.ts` with `calculateAovFrequency`
- Full unit matrix in `aov-frequency.test.ts` (portfolio, classified, residuals, scope, stability)
- Registered MetricId `aov_frequency` (contracted 21), empty VM/routes
- Corrected appendix `aov` to trusted-net portfolio AOV via `calculateAovFrequency.portfolioAverageOrderValue`
- Golden Jan 2025 hand expectation + reconciliation (410 / 5 / 82 / 4 / 1.25 / 102.5)

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: No material findings. All Gate 1 locks verified against uncommitted diff.

## Validation and PR/check evidence

### Local validation

- Commands run: focused aov-frequency + golden + contract tests; `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`
- Result: pass (339 tests)

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/38
- Base: `restart-retentionos-mvp` @ `f633d201e939a2970a0f7950a6c7c03a43b0cbf1`
- Head SHA: (updated after freeze commit)

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass (https://github.com/aidanwoodward/retention-os/actions/runs/30374610069/job/90326935648)
- Vercel: pass (https://vercel.com/aidan-woodwards-projects/retention-os/Cnb6ztCTryxeBEhHcgvjqUBPJeFR)
