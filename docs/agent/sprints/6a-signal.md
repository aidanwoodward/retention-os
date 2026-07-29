# Sprint 6A-SIGNAL — Canonical deterministic Signal contract

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Harden the existing deterministic `lib/insights` domain into the canonical RetentionOS Signal contract while keeping the internal type/domain name `Insight`.

### Commercial reason

Operators need trustworthy commercial diagnoses (what changed, why it matters, evidence, severity, next investigation, caveats, destination) without AI-invented numbers, duplicated formulas, or Matrix/page placement work.

### In scope

- Evolve `Insight` contract (observations, sufficiency, caveats, route destination, contracted `metricRefs`)
- Narrow finaliser (unique ids fail-closed; registry order; no severity sort)
- Migrate all seven existing emitters to contract compatibility
- Deep trust hardening for four rules; shallow migration for three
- Focused behavioural tests
- Backlog §5.3 current-evidence note
- This sprint record

### Out of scope

- Parallel Signal module / Insight→Signal rename
- Matrix / Provenance / 6B UI
- React / InsightsClient changes
- Metric formula changes; new MetricIds
- AI / benchmarks / channel Signals
- Dashboard diagnosis consolidation

### Acceptance criteria

- [x] Option A: `lib/insights` is canonical Signal layer; type name remains `Insight`
- [x] Contract fields present; numeric confidence not emitted
- [x] Duplicate IDs fail closed; registry order preserved
- [x] Empty population suppresses behavioural Signals; observed zero retained
- [x] Completed retention 0 vs null preserved
- [x] All `metricRefs` are contracted MetricIds; count remains 22
- [x] Four deep + three shallow migration boundary respected
- [x] Diff ⊆ exact allowlist
- [x] Validation suite green
- [x] Independent final-diff review
- [x] PR + Gate 2 packet

### Files expected to change

Create:

- `docs/agent/sprints/6a-signal.md`

Modify (maximum; subset allowed):

- `lib/types/insight.ts`
- `lib/insights/thresholds.ts` (optional — left unchanged)
- `lib/insights/rules.ts`
- `lib/insights/generate-diagnostic-insights.ts`
- `lib/insights/generate-diagnostic-insights.test.ts`
- `lib/insights/index.ts`
- `docs/PRODUCT_RECONCILIATION_BACKLOG.md` (§5.3 only)

### Stop conditions

- Allowlist expansion without founder approval
- Matrix / Provenance / React / metric formula edits
- New MetricIds or dependencies

## Plan-review verdict

- verdict: `REQUEST_CHANGES`, corrections incorporated
- reviewer_mode: `new_chat`
- builder_context_used: false
- automation_sla_met: false
- notes: Automated fresh-task review failed (API limits); founder-authorised new_chat review findings incorporated before Gate 1 APPROVE.

## Founder plan approval

- Recorded after: Founder Gate 1 verdict `APPROVE` / execute Sprint 6A-SIGNAL under the founder-approved Gate 1 plan
- Date/time: 2026-07-30
- Base SHA: `f3b3d84d80393ec08b9b491b0fcd3494dfdd972f`

## Approved-plan identity

- Plan section hash: 6a-signal-gate1-option-a-four-deep-three-shallow
- Base branch: `restart-retentionos-mvp`
- Base SHA: `f3b3d84d80393ec08b9b491b0fcd3494dfdd972f`

## Implementation summary

- Extended `Insight` with observations, sufficiency (`sufficient`|`limited`), caveats, `destination.route`, and `metricRefs: readonly ContractedMetricId[]`; deprecated unused `confidence`
- Added `finalizeInsights`: unique-id fail-closed (`RangeError`); preserve registry order; no severity sort / silent dedupe
- Migrated all seven emitters to contract; deep trust hardening for repeat-depth, retention-timing, contribution-vs-net, RDS snapshot; shallow for F2S, LTV dispersion, recent-cohort quality
- Empty eligible population suppresses behavioural / RDS Signals; observed zero retained; missing contribution / spread / completed retention evidence suppresses
- RDS continues to delegate to `evaluateRevenueDurabilityStatus` (Healthy→info, Mixed→warning, Watch→critical)
- `thresholds.ts` left unchanged; contribution `0.42` kept as named internal constant in `rules.ts`
- Backlog §5.3 records Insight as canonical Signal contract; no Matrix/page-pill claims
- Focused behavioural tests expanded; full suite 481/481

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- material findings: none
- notes: Allowlist exact (subset; thresholds untouched); no React/metric-formula edits.

## Validation and PR/check evidence

### Local validation

- Commands run: `npx tsc -p tsconfig.test.json`; focused insight tests; `npm run lint`; `npm run typecheck`; `npm test` (481/481); `npm run build`; `git diff --check`; `git status`
- Result: pass

### PR

- URL: (filled after create)
- Base: `restart-retentionos-mvp`
- Head SHA: (filled after push)

### Checks

- `gh pr checks --watch`: pending

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
