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

Gate 1 cycle 1: founder **REVISE BEFORE APPROVAL**. Cycle 2: founder **APPROVE WITH LOCKED CLARIFICATIONS**. Gate 2 cycle 1: founder **REQUEST_CHANGES BEFORE MERGE** — cells with `targetPeriodStart >= asOfDate` must be `unavailable` with nulls, not `partial` with zeros. Corrected without changing analysis-context or maxOffset policy.

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

Cell maturity: if target period UTC start `>= asOfDate` → `unavailable` with null numerics; else complete/partial via `getMonthlyCohortMaturityStatus`. A period is partial only when some observation time exists between target-period start and exclusive asOfDate.

`reportingPeriod` / `reportingOrders` are never read.

### Contract

- MetricId: `cohort_revenue_retention`
- `viewModelBuilders: []`, `uiRoutes: []`
- Maturity: `complete` | `partial` | `unavailable`
- Future matrix presentation (docs only): complete → value; partial → observed + subtle styling; unavailable → `—`; completed zero → `0%`

### Acceptance criteria

- [x] Period N/0; >100% allowed; ≠ LTV
- [x] asOf exclusive observation; integrity RangeErrors; reporting-period non-interference
- [x] `targetPeriodStart >= asOf` → unavailable nulls (not partial zeros)
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

## Plan-review verdict

- verdict: `APPROVE` (after founder revise cycle)
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true

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
- Contracted MetricId `cohort_revenue_retention` (19); empty VM/route wiring
- Gate 2 correction: `resolveRevenueRetentionMaturityStatus` forces `unavailable`+nulls when `targetPeriodStart >= asOfDate`
- Golden Jan M+4 at asOf May 1 locked as unavailable nulls
- No analysis-context, existing retention/LTV/matrix, VM, or page changes

## Implementation-review verdict

- Initial: `APPROVE` (`fresh_task`, `builder_context_used: false`, `automation_sla_met: true`)
- Gate 2 REQUEST_CHANGES re-review: `APPROVE` (`fresh_task`, `builder_context_used: false`, `automation_sla_met: true`)
- notes: Exclusive asOf maturity override, tests, golden, contracts, allowlist confirmed.

## Validation and PR/check evidence

### Local validation

- Commands run: focused MET-REV-RETENTION tests; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`
- Result: pass (post Gate 2 correction)

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/36
- Base: `restart-retentionos-mvp`
- Head SHA: `02ec3ebd77e5b9158ee3adeb08bad92c414b99f8` (Gate 2 correction tip; freeze evidence commit may follow)

### Checks

- `gh pr checks --watch`: pass on correction tip (CI validate + Vercel)
- CI validate: pass
- Vercel: pass
## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
