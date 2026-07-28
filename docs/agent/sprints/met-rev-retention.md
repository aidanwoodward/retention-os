# Sprint MET-REV-RETENTION — Period-based cohort revenue retention

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Implement deterministic period-based revenue retention by acquisition cohort:

`revenueRetention(C, N) = periodRevenue(C, N) / periodRevenue(C, 0)`

over canonical full customer history, with `asOfDate` as an exclusive observation boundary and maturity-aware cells.

### Commercial reason

Brands need Month+N cohort revenue retention distinct from cumulative revenue LTV and from customer activity retention (PRODUCT_RECONCILIATION_BACKLOG §6.4).

### Revision history

Gate 1 cycle 1: founder **REVISE BEFORE APPROVAL** (asOf observation boundary; orphan integrity; pre-firstOrderAt integrity). Cycle 2 plan incorporated those locks; founder then **APPROVE WITH LOCKED CLARIFICATIONS** (integrity before acquisition filter; canonical UTC instant comparisons; automatic maxOffset month-boundary rule; future matrix presentation notes).

### In scope

- Pure metric `calculateCohortRevenueRetention(selection: AnalysisSelection)`
- MetricId `cohort_revenue_retention` + contracts (empty VM/route wiring)
- Focused unit tests + golden expectation
- Sprint record

### Out of scope

- UI / VM / routes / React matrices
- analysis-context semantic changes
- Existing retention / LTV / cohorts / cohort-matrix formula edits
- MET-NEW-RETURN, 6A-MATRIX, signals, RDS, Shopify, persistence

### Authoritative formula

For eligible customers with `firstOrderAt < asOfDate`:

1. Integrity-scan every identified order with `orderedAt < asOfDate` (resolve customer → validate `firstOrderAt` → reject `orderedAt < firstOrderAt`) **before** acquisition filtering and before any `empty` return.
2. Attribute eligible observed orders with `netOrderRevenue` to calendar month offsets from canonical cohort month.
3. `revenueRetention(C,N) = periodRevenue(C,N) / periodRevenue(C,0)` when Month+0 > 0 and cell is complete|partial.

`reportingPeriod` / `reportingOrders` are never read.

### Contract

- MetricId: `cohort_revenue_retention`
- `viewModelBuilders: []`, `uiRoutes: []`
- Maturity: `complete` | `partial` | `unavailable` via `getMonthlyCohortMaturityStatus`
- Future matrix presentation (docs only): complete → value; partial → observed + subtle styling; unavailable → `—`; completed zero → `0%`
- Horizon set → `maxOffset = maturityHorizonMonths`; else latest month with instant before exclusive asOf (month-start asOf → prior month)

### Acceptance criteria

- [x] Period N/0; >100% allowed; ≠ LTV
- [x] asOf exclusive observation; integrity RangeErrors; reporting-period non-interference
- [x] Contracted MetricId with empty wiring; golden locked
- [x] Validation + PR + Gate 2 packet

### Files expected to change

- `lib/metrics/cohort-revenue-retention.ts`
- `lib/metrics/cohort-revenue-retention.test.ts`
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
- `docs/agent/sprints/met-rev-retention.md`

### Stop conditions

- UI/VM/page wiring; analysis-context edits; existing metric formula edits outside allowlist; MET-NEW-RETURN / 6A-MATRIX

### Test matrix

Commercial (1–7); population/scope (8–12); integrity (13–19); asOf boundary (20–25); maturity/zeros (26–35); stability/contracts (36–42) — as locked in founder Gate 1 clarifications.

## Plan-review verdict

- verdict: `APPROVE` (after founder revise cycle)
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Founder locks satisfied; APPROVE WITH LOCKED CLARIFICATIONS required no extra plan-review cycle.

## Founder plan approval

- Recorded after: `Approve Sprint MET-REV-RETENTION for execution with the revised Gate 1 plan and the following final founder clarifications.`
- Verdict: `APPROVE WITH LOCKED CLARIFICATIONS`
- Date/time: 2026-07-28
- Base SHA: `a21861a93b349860023115ba66c0daefe54df733`

## Approved-plan identity

- Plan section hash: founder-locked-clarifications-met-rev-retention-2026-07-28
- Base branch: `restart-retentionos-mvp`
- Base SHA: `a21861a93b349860023115ba66c0daefe54df733`

## Implementation summary

- Added `calculateCohortRevenueRetention` over `AnalysisSelection.fullDataset` with exclusive asOf observation, integrity-before-eligibility RangeErrors, and maturity-aware cells
- Contracted MetricId `cohort_revenue_retention` (19); empty VM/route wiring; METRIC_CONTRACTS section + future matrix presentation notes
- Focused unit matrix (42) + golden asOf 2025-05-01 hand expectation
- No analysis-context, existing retention/LTV/matrix, VM, or page changes

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Integrity-before-filter, canonical UTC comparisons, maxOffset month-boundary, contracts, and allowlist confirmed; nits only.

## Validation and PR/check evidence

### Local validation

- Commands run: focused MET-REV-RETENTION tests; `npm run lint`; `npm run typecheck`; `npm test` (245 pass); `npm run build`; `git diff --check`
- Result: pass

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/36
- Base: `restart-retentionos-mvp`
- Head SHA: `d77398743ae79df83d3486514db6368092447679` (Gate 2 freeze tip)

### Checks

- `gh pr checks --watch`: pass (CI validate + Vercel)
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
