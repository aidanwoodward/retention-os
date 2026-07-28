# Sprint 6A-ANALYSIS-CONTEXT — Shared analysis context foundation

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Define and implement the smallest deterministic analysis-context foundation required for RetentionOS customer-economics metrics: distinct reporting period, acquisition cohort period, maturity horizon, and explicit as-of date — pure helpers only.

### Commercial reason

Later MET and page work (share %, new/returning, matrix depth) must not overload a single dateRange. Honest period semantics keep growth diagnostics comparable and trustworthy.

### In scope

- `lib/analysis-context` types + pure selection/period/maturity helpers
- Arbitrary UTC half-open `reportingPeriod` (week / MTD / half-month / campaign)
- Month-aligned `acquisitionPeriod` for MVP cohort bucketing
- `MaturityStatus` (`complete` | `partial` | `unavailable`) + `isCompletedMaturityOffsetAvailable`
- Mandatory explicit `asOfDate` (never inferred by `buildAnalysisSelection`)
- Optional `inferConservativeAsOfDateFromDataset` (not auto-used)
- Acquisition scope `"all" | "bounded"`; spend aligned to acquisition month keys only
- `reportingOrdersForEligibleCustomers` intersection field
- Focused unit tests + test registration + this sprint record

### Out of scope

- Visible filter bar / React provider / URL state / page redesign
- `capability.ts` / static capability constants
- Country/vendor/product filters
- MET-* implementations; metric formula/signature changes
- Weekly cohort bucketing; D7/D14/D28
- Wiring maturity into existing `maxOffset` metric paths
- Shopify, persistence, legacy filter deletion

### Founder-locked corrections (Gate 1)

1. Maturity: `getMonthlyCohortMaturityStatus` + completed-month helper; partial ≠ missing; complete = first instant of Month+(N+1) ≤ asOfDate
2. `asOfDate` mandatory; no silent default; reporting end must not exceed asOf
3. Canonical UTC ISO instants only; acquisition month-aligned; no merchant TZ
4. Unbounded acquisition = scope `"all"` (all customers + all valid spend)
5. `reportingOrdersForEligibleCustomers` intersection; guests stay in `reportingOrders`
6. No `capability.ts`
7. Extended test matrix including exact UTC maturity boundaries
8. File allowlist as approved

### Acceptance criteria

- [x] Reporting vs acquisition vs maturity vs asOf distinct
- [x] Half-open reporting; month-aligned acquisition; RangeError on invalid inputs
- [x] Maturity status complete/partial/unavailable at UTC boundaries
- [x] Full-history dataset preserved; firstOrderAt not rewritten
- [x] Guests in reporting, excluded from identifiable/eligible
- [x] Spend selection acquisition-month only; no silent fill
- [x] Focused tests pass; lint/typecheck/test/build/`git diff --check` pass
- [x] PR targets `restart-retentionos-mvp`

### Files expected to change

- `lib/analysis-context/types.ts`
- `lib/analysis-context/period.ts`
- `lib/analysis-context/select.ts`
- `lib/analysis-context/maturity.ts`
- `lib/analysis-context/index.ts`
- `lib/analysis-context/analysis-context.test.ts`
- `package.json` (test registration only)
- `tsconfig.test.json` (compile inclusion only)
- `docs/agent/sprints/6a-analysis-context.md`

### Stop conditions

- Metric formula/signature changes
- Page/view-model wiring; React providers; filter UI
- Adding `capability.ts` without escalation
- Weekly cohorts / D7 metrics

## Plan-review verdict

- verdict: `APPROVE` (cycle 2 after REQUEST_CHANGES; founder Gate 1 approval with locked corrections)
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Founder locked maturity status, mandatory asOf, UTC contract, unbounded acquisition, intersection field, no capability.ts.

## Founder plan approval

- Recorded after: `Approve the plan and execute it.` (with founder-locked corrections)
- Date/time: 2026-07-28
- Base SHA: `56f81f2945f031629c705c15146996a28193cc4a`

## Approved-plan identity

- Plan section hash: founder-locked-corrections-2026-07-28
- Base branch: `restart-retentionos-mvp`
- Base SHA: `56f81f2945f031629c705c15146996a28193cc4a`

## Implementation summary

- Added `lib/analysis-context` pure module: types, UTC period validators, selection, maturity status helpers
- `buildAnalysisSelection` preserves `fullDataset`; selects reporting orders (incl. guests), eligible customers, spend by acquisition month keys, and reporting∩eligible identified orders
- Maturity: `getMonthlyCohortMaturityStatus` + `isCompletedMaturityOffsetAvailable`; metrics untouched
- 27 focused tests registered in `package.json` / `tsconfig.test.json`

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Allowlist OK; metrics untouched; infer helper does not coerce non-canonical timestamps.

## Validation and PR/check evidence

### Local validation

- Commands run: focused analysis-context tests (27 pass); `npm run lint`; `npm run typecheck`; `npm test` (183 pass); `npm run build`; `git diff --check`
- Result: pass

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/34
- Base: `restart-retentionos-mvp`
- Head SHA: `dcb68792bef4b614f1d761c66ae3cb9d6b54f81c` (Gate 2 frozen PR tip)

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
UTC is the explicit MVP calendar basis; store-local timezone deferred.
