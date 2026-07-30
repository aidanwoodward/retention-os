# Sprint 6A-MATRIX — Deterministic Signal placement policy

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Add the smallest deterministic Matrix layer under `lib/insights` that decides which finalised canonical Signals are eligible for which analytical surfaces and in what explicit order.

### Commercial reason

Operators need Signals placed on their natural analytical pages without inventing diagnoses, changing trigger semantics, or wiring UI chrome yet. Matrix is placement policy only — not diagnosis.

### In scope

- Analytical surface identity (six surfaces; `/insights` excluded)
- Explicit Signal eligibility by surface
- Explicit deterministic order per surface
- Focused behavioural tests + test registration
- Backlog §5.3 + §10.3 Matrix meaning
- This sprint record

### Out of scope

- `/insights` as a Matrix surface
- Page caps / maxCount
- Sufficiency filtering (`excludeLimited`)
- Severity ranking / weighted scores / roles / slots / anchors
- Second canonical Signal-ID registry
- Signal contract / rules / finaliser changes
- React / view-model wiring / dashboard migration
- Provenance / 6B / 6C / AI / metric formulas

### Acceptance criteria

- [x] Option A: Matrix lives under `lib/insights`
- [x] Surfaces: dashboard, cohorts, retention, ltv, acquisition, products only
- [x] Placement table matches approved seven Signal IDs
- [x] Empty acquisition/products/cohorts intentional
- [x] No caps; no sufficiency filter; no severity sort
- [x] `/insights` bypasses Matrix
- [x] Diff ⊆ exact 7-path allowlist
- [x] Validation suite green
- [x] Independent final-diff review
- [x] PR + Gate 2 packet

### Files expected to change

Create:

- `lib/insights/matrix.ts`
- `lib/insights/matrix.test.ts`
- `docs/agent/sprints/6a-matrix.md`

Modify:

- `lib/insights/index.ts`
- `docs/PRODUCT_RECONCILIATION_BACKLOG.md` (§5.3 + §10.3 6A-MATRIX only)
- `package.json`
- `tsconfig.test.json`

### Stop conditions

- Allowlist expansion without founder approval
- Signal-contract / metrics / React / Provenance / 6B edits
- Caps, sufficiency filtering, second Signal-ID registry

## Plan-review verdict

- verdict: `APPROVE` (founder fallback)
- reviewer_mode: `waived` (manual_new_chat_review waived)
- builder_context_used: false
- automation_sla_met: false
- notes: Automated fresh-task review failed twice (API limits). plan_review_status: FOUNDER_FALLBACK_APPROVED. Founder performed Gate 1 architecture/scope review and locked corrections.

## Founder plan approval

- Recorded after: Founder Gate 1 verdict `APPROVE` with locked corrections
- Date/time: 2026-07-30
- Base SHA: `c3abb00dfe64be143bfd9b69305a4b25a100b795`

## Approved-plan identity

- Plan section hash: 6a-matrix-gate1-option-a-no-caps-no-insights-surface
- Base branch: `restart-retentionos-mvp`
- Base SHA: `c3abb00dfe64be143bfd9b69305a4b25a100b795`

## Implementation summary

- First uncommitted MATRIX implementation on `agent/6a-matrix` was lost before publication (workspace transition; no stash/checkpoint recovery). Recreated under the same founder-approved Gate 1 scope.
- Added `lib/insights/matrix.ts`: `MATRIX_SURFACES` (six analytical surfaces; `/insights` excluded), explicit `MATRIX_PLACEMENT`, pure `selectSignalsForSurface`
- Placement: dashboard=[RDS]; retention=[3]; ltv=[3]; acquisition/products/cohorts=[]
- No caps, no sufficiency filtering, no severity sort, no second Signal-ID registry
- Exported from `lib/insights/index.ts`; registered focused test in `package.json` + `tsconfig.test.json`
- Backlog §5.3 + §10.3 Matrix meaning updated; §7.1 untouched
- Focused matrix tests 16/16; full suite 497/497; lint/typecheck/build green

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- material findings: none
- notes: Exact seven-path allowlist; Matrix placement/order/bypass match locked contract; no Signal/metric/React changes. Non-blocking: backlog §7.1 still has legacy MATRIX wording (out of allowlist).

## Validation and PR/check evidence

### Local validation

- Commands run: `npx tsc -p tsconfig.test.json`; `node --test .test-dist/lib/insights/matrix.test.js` (16/16); `npm test` (497/497); `npm run lint`; `npm run typecheck`; `npm run build` (with ephemeral Supabase env placeholders for local prerender); `git diff --check`; `git status`
- Result: pass

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/44
- Base: `restart-retentionos-mvp` @ `c3abb00dfe64be143bfd9b69305a4b25a100b795`
- Head SHA: frozen in Gate 2 packet / PR `headRefOid` (tip of `agent/6a-matrix`)

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass (3m14s)
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
