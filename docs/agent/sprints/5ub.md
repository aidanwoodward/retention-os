# Sprint 5U-B — Source-to-screen metric contracts

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Create one trusted source-to-screen contract for every core RetentionOS KPI on the canonical command-centre path.

### Commercial reason

Founders and agents need an auditable definition of each KPI so displayed values can be trusted and 5U-C can reconcile against a known truth.

### In scope

- Create docs/METRIC_CONTRACTS.md as the canonical source-to-screen contract ledger
- Create thin typed index lib/metrics/metric-contract-index.ts for contracted MetricIds
- Align lib/metrics/metric-definitions.ts tooltip copy only where contracts prove factual divergence
- Extend/add tests for contract index coverage of the contracted MetricId set
- Cross-link docs/RETENTIONOS_ARCHITECTURE.md; METRIC_CONTRACTS.md disposition Keep
- Sprint record docs/agent/sprints/5ub.md
- Branch agent/sprint-5ub-metric-contracts from restart-retentionos-mvp @ de7a064

### Contracted MetricId set (17)

gross_revenue, discounts, refunds, net_revenue, repeat_purchase_rate, first_to_second_conversion, cohort_retention, revenue_ltv, contribution_ltv, cac, blended_cac, revenue_ltv_cac, contribution_ltv_cac, payback, product_quality, revenue_durability_posture, marketing_spend_assumption

### Non-MetricId contract section

cohort_size — 13-field section; no new MetricId; not in index

### Appendices

A non-implemented deferred; B executive dashboard crosswalk; C known hazards

### Out of scope

5U-C golden fixtures; major UI redesign; Shopify OAuth/production integration; persistence; scenario modelling; production RDS methodology; helper dedupe; legacy deletion; migrations; new dependencies; inventing unimplemented metrics; calculator formula changes

### Acceptance criteria

- [x] Every contracted MetricId + cohort_size has complete 13-field contract
- [x] Appendices A-C present; dashboard is crosswalk only
- [x] Index covers contracted MetricId set exactly (not ALL_METRIC_IDS; excludes aov)
- [x] No React metric calculation; no calculator formula changes; no helper dedupe; no 5U-C fixtures
- [x] Tooltip edits are factual alignments only
- [x] Architecture doc points to METRIC_CONTRACTS.md as Keep
- [x] Sprint record in PR; base restart-retentionos-mvp
- [x] npm test, lint, typecheck, build pass; diff stays on allowlist

### Files expected to change

- docs/METRIC_CONTRACTS.md
- lib/metrics/metric-contract-index.ts
- lib/metrics/metric-contract-index.test.ts
- lib/metrics/metric-definitions.ts
- lib/metrics/metric-definitions.test.ts
- lib/metrics/index.ts
- package.json
- tsconfig.test.json
- docs/RETENTIONOS_ARCHITECTURE.md
- docs/agent/sprints/5ub.md

### Locked defaults

- Markdown SoT; TS index linkage only
- No safeDivide / formula / helper changes
- Channel quality appendix only
- cohort_size section without MetricId
- Dashboard mapping Appendix B crosswalk only

### Stop conditions

- Scope expands beyond approved plan
- PR would target main
- Independent reviewer unavailable after one retry without founder-authorized manual review
- Validation/CI fails after two fix attempts

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Cycle 1 REQUEST_CHANGES (dashboard as KPI contract; index set vs ALL_METRIC_IDS; cohort_size ambiguity) incorporated; cycle 2 APPROVE.

(Process evidence / traceability only — not proof of independence.)

## Founder plan approval

- Recorded after: `Approve the plan and execute it.` / `Approve the Sprint 5U-B plan and begin isolated implementation under Ops-01.`
- Date/time: 2026-07-25 (implementation start after Gate 1)
- Base SHA: `de7a064c1b5ac3634052e2c407d0ab154a47b36c`

## Approved-plan identity

- Plan section hash: `aaf8075610efd5f4e8ce8c4bee0ce7e604904c3498af6dd269af77ae9efc430a`
- Base branch: `restart-retentionos-mvp`
- Base SHA: `de7a064c1b5ac3634052e2c407d0ab154a47b36c`
- Plan match confirmation: Recorded Final plan and scope matches the Founder Gate 1-approved plan (corrected after plan-review cycle 1; APPROVE cycle 2). Contracted MetricId set, cohort_size non-MetricId section, appendices A–C, locked defaults, and out-of-scope list are identical.

## Implementation summary

- Created `docs/METRIC_CONTRACTS.md` with 13-field contracts for all 17 contracted MetricIds plus non-MetricId `cohort_size`, and appendices A (deferred), B (dashboard crosswalk), C (engine/presentation hazards).
- Added `lib/metrics/metric-contract-index.ts` and tests asserting the contracted set exactly (excludes `aov`); wired into `tsconfig.test.json` and `package.json` test script.
- Factual tooltip align on `revenue_ltv` caveat for `cumulativeAvgGrossRevenue` naming hazard.
- Cross-linked architecture doc; disposition Keep for METRIC_CONTRACTS.md.
- No calculator formula changes, helper dedupe, 5U-C fixtures, UI redesign, or new metrics.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Cycle 1 REQUEST_CHANGES (tsconfig.test.json omit caused silent skip of new tests) fixed; cycle 2 APPROVE — 81 tests pass including metric-contract-index suite; allowlist intact; no formula changes.

(Process evidence / traceability only — not proof of independence.)

## Validation and PR/check evidence

### Local validation

- Commands run: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
- Result: pass — 81 tests (incl. metric-contract-index); lint/typecheck/build clean

### PR

- URL: _(set after `gh pr create`)_
- Base: `restart-retentionos-mvp`
- Head SHA: _(set after push)_

### Checks

- `gh pr checks --watch`: _(Gate 2 packet)_
- CI validate: _(Gate 2 packet)_
- Vercel: _(Gate 2 packet)_

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze. Durable Gate 2/DONE evidence lives in GitHub PR comment + merge metadata.
