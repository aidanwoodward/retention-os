# Sprint MET-RDS-MATURITY — Completed-only Month+N retention aggregates

## Status

`BLOCKED`

Reason: `BLOCKED_REVIEWER_UNAVAILABLE` — independent final-diff Task review failed twice (API usage limits). Implementation and local validation complete; PR opened for durability. Founder may authorize `new_chat` implementation review of the PR head, then approve merge.

## Final plan and scope

### Objective

Ensure every existing executive or diagnostic aggregate of cohort Month+N retention includes only fully completed cohort offsets, via one shared helper `averageCompletedCohortRetentionAtOffset`.

### Commercial reason

Incomplete Month+N observations must not move Revenue Durability posture, dashboard/retention summaries, diagnostic timing language, or CSV preview eligibility. Partial observation must not be read as deteriorating (or improving) customer quality.

### In scope

- Shared maturity-gated unweighted completed-offset helper + fail-closed invariants
- Replace four local point-presence averages (dashboard, insights, retention VM, metric preview)
- One conservative asOf per consumer via `inferConservativeAsOfDateFromDataset`
- Contract / definition / index updates for `revenue_durability_posture`
- Focused tests + registration
- Sprint record

### Out of scope

- AnalysisSelection migration; `retention.ts`; `maturity.ts`; golden dataset/expected edits
- RDS threshold/vote-mechanics changes; numerical RDS
- Signal / Matrix / Provenance / UI / routes
- New MetricId; weighted aggregation; `rules.ts` redesign

### Acceptance criteria

- [x] Shared helper enforces complete-only inclusion, completed zero, null when none
- [x] Fail-closed on duplicate cohorts/offsets and malformed completed rates
- [x] Dashboard / insights / retention / preview use shared helper; local averages removed
- [x] One asOf resolved per consumer invocation for M+1/M+2/M+3
- [x] RDS null omits Month+1 vote; thresholds unchanged
- [x] Golden numeric averages remain 1/3, 0, 0
- [x] Contracted MetricId count 22
- [ ] Independent impl review + founder merge approval

### Files expected to change

Create:

- `lib/metrics/completed-cohort-retention.ts`
- `lib/metrics/completed-cohort-retention.test.ts`
- `lib/insights/generate-diagnostic-insights.test.ts`
- `lib/metrics/retention-view-model.test.ts`
- `lib/import/metric-preview.test.ts`
- `docs/agent/sprints/met-rds-maturity.md`

Modify:

- `lib/metrics/dashboard-view-model.ts`
- `lib/metrics/dashboard-view-model.test.ts`
- `lib/insights/generate-diagnostic-insights.ts`
- `lib/metrics/retention-view-model.ts`
- `lib/import/metric-preview.ts`
- `lib/metrics/revenue-durability-status.ts`
- `lib/metrics/revenue-durability-status.test.ts`
- `lib/metrics/index.ts`
- `lib/metrics/metric-definitions.ts`
- `lib/metrics/metric-contract-index.ts`
- `docs/METRIC_CONTRACTS.md`
- `package.json`
- `tsconfig.test.json`

### Stop conditions

- Allowlist expansion without founder approval
- Analysis-context / retention engine / golden / rules.ts edits
- Threshold or numerical RDS changes

## Plan-review verdict

- verdict: `REQUEST_CHANGES`, corrections incorporated
- reviewer_mode: `new_chat`
- builder_context_used: false
- automation_sla_met: false
- notes: Automated fresh-task review failed twice (API limits). Manual new-chat review findings resolved before founder Gate 1 APPROVE.

## Founder plan approval

- Recorded after: `Approve the plan and execute it.`
- Date/time: 2026-07-28
- Base SHA: `9a40c886aa5609f1e3646e8dd7854d0f61e2d24d`

## Approved-plan identity

- Plan section hash: final revised Gate 1 packet (exact allowlist + golden hand-calc + helper invariants)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `9a40c886aa5609f1e3646e8dd7854d0f61e2d24d`

## Implementation summary

- Added `averageCompletedCohortRetentionAtOffset` with fail-closed offset/asOf/duplicate/rate invariants
- Replaced four local point-presence averages; one conservative asOf per consumer
- Wired dashboard, insights, retention VM, metric preview to completed-only M+1/M+2/M+3
- Updated RDS comments/tests; contracts; metric-definitions; contract-index entrypoints
- Golden files untouched; preview golden averages remain 1/3, 0, 0

## Implementation-review verdict

- verdict: not obtained (`BLOCKED_REVIEWER_UNAVAILABLE`)
- reviewer_mode: `fresh_task` attempted (2 failures)
- builder_context_used: n/a
- automation_sla_met: false
- notes: Task/subagent API usage limit on both attempts. Builder did not self-approve. Founder options: authorize `new_chat` review of PR head, or retry Task when capacity returns.

## Validation and PR/check evidence

### Local validation

- Commands run: `npx tsc -p tsconfig.test.json`; focused node tests; `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`
- Result: all passed locally

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/41
- Base: `restart-retentionos-mvp`
- Head SHA: `f03e45239e54aa9d378e594ff3db8e2ede56465e`

### Checks

- `gh pr checks --watch`: pending
- CI validate: pending
- Vercel: pending

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
