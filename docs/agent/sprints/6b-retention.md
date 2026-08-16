# Sprint 6B-RETENTION — Retention production ↔ Golden presentation migration

## Status

`IMPLEMENTING` (uncommitted closeout — independent review approved; micro-fixes applied)

## Final plan and scope

### Objective

Upgrade production `/retention` toward the approved Golden Reference hierarchy using only canonical customer-repeat and cohort-retention metrics already in the Retention engine.

### Commercial reason

Operators should see more clearly whether customers return, how quickly converters return, and how calendar-month retention develops across cohorts — without inventing eligibility-gated journey metrics or copying Golden fixture values.

### In scope

- Four essential `MetricStat` tiles (F2S 90d, all-time repeat, median days among converters, completed Month +1 active)
- Compact population / window / maturity disclosure
- VM pass-through of `customersWithSecondOrder` from `calculateFirstToSecondOrderConversion`
- Cohort table maturity presentation via `getMonthlyCohortMaturityStatus` (numeric rates unchanged)
- Retention cohesion hook as a neutral question (no commercial conclusion)
- `DiagnosisContinueSection` destinations: Cohorts, LTV, Insights
- This sprint record

### Out of scope

- `cohort_revenue_retention` / `buildAnalysisSelection` / second table
- `lib/metrics/retention-presentation.ts`
- Eligibility-gated F2S, progression, trajectory, timing histogram, stage loss
- DiagnosisHero, LockedAnalysisCard, NavigationCard, Golden runtime imports
- Metric formula, `METRIC_CONTRACTS.md`, or new metric files

### Acceptance criteria

- [x] Canonical F2S / repeat / timing / Month+N rate formulas unchanged
- [x] Four executive stats only
- [x] Median tile states converter population `n = customersWithSecondOrder`
- [x] Cohort partial cells keep observed rates; unavailable renders `—` from VM status
- [x] No Golden fixture literals
- [x] Validation suite: lint, typecheck, npm test, build, `git diff --check`
- [x] Independent closeout review: APPROVE FOR CLOSURE (micro-fixes applied)

### Files expected to change

Modify:

- `app/(protected)/retention/RetentionClient.tsx`
- `lib/metrics/retention-view-model.ts`
- `lib/metrics/retention-view-model.test.ts`
- `lib/mvp/cohesion.ts`

Create:

- `docs/agent/sprints/6b-retention.md`

### Stop conditions

- New metric files or eligibility gating
- Revenue-retention wiring
- Golden runtime imports
- Allowlist expansion without founder approval

## Plan-review verdict

- verdict: `APPROVE_WITH_LOCKS`
- reviewer_mode: `founder_gate_1`
- builder_context_used: true
- automation_sla_met: true
- notes: Founder Gate 1 approved with scope reduction (no revenue retention, no presentation mapper).

## Founder plan approval

- Recorded after: Founder Gate 1 APPROVED WITH SCOPE REDUCTION; EXECUTION MODE Sprint 3
- Date/time: 2026-08-16
- Base SHA: `469889a654509e119a5a2dd47811c0386a80b8b7`

## Approved-plan identity

- Plan section hash: 6b-retention-sprint-3-reduced
- Base branch: `restart-retentionos-mvp`
- Base SHA: `469889a654509e119a5a2dd47811c0386a80b8b7`

## Implementation summary

- Feature branch `sprint-6b-retention` from `restart-retentionos-mvp`
- VM exposes `customersWithSecondOrder` and per-offset `MaturityStatus | null`
- Retention page: four tiles, disclosure, maturity-aware cohort table, next investigation includes Cohorts
- Cohesion hook: neutral question — “Are customers returning, and how does retention differ across cohorts?” (closeout replaced interim “weakening” wording)
- Closeout: partial cells use dotted underline + title/aria-label only; day-120 F2S discriminator test added

## Implementation-review verdict

- verdict: `APPROVE FOR CLOSURE`
- reviewer_mode: `independent_closeout`
- builder_context_used: false
- automation_sla_met: true
- notes: Three micro-fixes applied post-review (neutral hook, quieter partial cells, day-120 test). No commit in this pass.

## Validation and PR/check evidence

### Local validation

- Commands run: `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`; `git status`
- Result: pass (536 tests; 73 app routes compiled)

### PR

Not applicable yet — uncommitted closeout.

- URL: (none)
- Base: `restart-retentionos-mvp`
- Head SHA: (none — not committed)

### Checks

Not applicable — no PR.

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
