# Sprint MET-NEW-RETURN — Selected-period new vs returning mix

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Implement deterministic selected-period new-versus-returning customer and revenue mix:

`calculateNewReturningMix(selection: AnalysisSelection): NewReturningMixResult`

with classified-revenue mix denominators, guest/unresolved coverage residuals, and reporting-active integrity scope.

### Commercial reason

Brands need to know how much of selected-period activity and revenue is from newly acquired versus returning customers — locked in PRODUCT_RECONCILIATION_BACKLOG §2.3 / §6.2.

### In scope

- Pure metric `calculateNewReturningMix`
- MetricId `new_returning_mix` + contracts (empty VM/route wiring)
- Focused unit tests + Jan 2025 golden expectation
- Sprint record

### Out of scope

- UI / VM / routes / React
- analysis-context semantic changes
- Existing contribution / retention / LTV / repeat-purchase formula edits
- MET-AOV-FREQ, concentration, signals, RDS, Shopify, persistence

### Founder-locked Gate 1 clarifications

1. Mix shares over `classifiedRevenue` with explicit field names `newRevenueShareOfClassifiedRevenue` / `returningRevenueShareOfClassifiedRevenue`
2. Coverage = classified / total; residuals lower coverage without distorting mix
3. Integrity only for reporting-active resolved customers; history scan `orderedAt < asOfDate`
4. Require `reportingPeriod` (RangeError if absent)
5. Ignore `acquisitionPeriod` / `eligibleCustomerIds`
6. Guest → unidentified; missing customer → unresolved (no throw)
7. History-gap → returning revenue only; stable orderedAt + id first-order tie-break
8. Product presentation: new/returning primary; residuals trust-only; future UI may hide zero residuals

### Acceptance criteria

- [x] Formula matches locked commercial definitions
- [x] Classified mix + coverage reconciliations
- [x] Residuals explicit; acquisition ignored
- [x] Contracted MetricId with empty VM/route linkage
- [x] Golden Jan 2025 locked
- [x] Validation + PR + Gate 2 packet

### Files expected to change

- `lib/metrics/new-returning.ts`
- `lib/metrics/new-returning.test.ts`
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
- `docs/agent/sprints/met-new-return.md`

### Stop conditions

- UI/VM/page wiring
- analysis-context or existing metric formula edits outside allowlist

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Founder cycle-1 REVISE incorporated; cycle-2 independent review APPROVE with no material findings.

## Founder plan approval

- Recorded after: Gate 1 verdict `APPROVE` / execute under revised Gate 1 plan
- Date/time: 2026-07-28
- Base SHA: `1c0b8f956901e8693f681ab916fa370142483f22`

## Approved-plan identity

- Plan section hash: revised Gate 1 cycle 2 (classified-revenue denominators + reporting-active integrity)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `1c0b8f956901e8693f681ab916fa370142483f22`

## Implementation summary

- Added `lib/metrics/new-returning.ts` with `calculateNewReturningMix`
- Full unit matrix in `new-returning.test.ts`
- Registered MetricId `new_returning_mix` (contracted 20), empty VM/routes
- METRIC_CONTRACTS + golden Jan 2025 hand expectation + reconciliation
- Registered tests in package.json / tsconfig.test.json

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: No material findings. Non-material: golden worksheet orderedAt clarity (fixed); test numbering skip 37.

## Validation and PR/check evidence

### Local validation

- Commands run: focused new-returning + golden + contract tests; `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`
- Result: pass

### PR

- URL: (filled after create)
- Base: `restart-retentionos-mvp`
- Head SHA: (filled after push)

### Checks

- `gh pr checks --watch`: (filled after watch)
- CI validate:
- Vercel:

## Notes

Product presentation contract (docs only this sprint): new/returning are primary commercial output; unidentified/unresolved are trust residuals; future UI may hide residual detail when both are zero and surface coverage only when meaningfully below 100%.
