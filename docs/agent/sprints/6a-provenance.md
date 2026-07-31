# Sprint 6A-PROVENANCE — Deterministic trust-metadata composition

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Add the smallest deterministic Provenance layer under `lib/provenance` that answers what a metric or Signal is based on — source, reporting scope/asOf, pass-through population/assumption/maturity facts, and canonical methodology references — without UI, recalculation, or lineage infrastructure.

### Commercial reason

Operators need inspectable trust metadata so future progressive-disclosure UI can explain metric and Signal bases without inventing lineage platforms, duplicating formulas, or reopening Signal/Matrix contracts.

### In scope

- Narrow `lib/provenance` types + pure builders (`buildMetricProvenance`, `buildSignalProvenance`)
- Composition-only Signal provenance around existing Insight identity (`id` + `metricRefs`)
- Focused behavioural tests + test registration
- Backlog §5.3 + §10.3 Provenance meaning
- This sprint record

### Out of scope

- React / page / banner / tooltip UI (6B)
- Generic `ProvenanceAvailability` vocabulary
- Insight / Matrix / Signal trigger changes
- Metric formula or registry membership changes
- Methodology presentation helpers
- Shopify reconciliation enum / production Shopify source type
- AI / lineage DAGs / confidence scores
- Backlog §7.1 rewrite (explicitly out of allowlist)

### Acceptance criteria

- [x] Option B: Provenance lives under `lib/provenance`
- [x] MetricProvenance answers the five approved trust questions only
- [x] No `ProvenanceAvailability` type
- [x] SignalProvenance does not duplicate Insight observations/sufficiency/caveats/evidence/destination/severity
- [x] Population/assumptions/maturity are pass-through only
- [x] Methodology references contract index + definitions; no formula duplication
- [x] Contracted MetricId count remains 22
- [x] Diff ⊆ exact 8-path allowlist
- [x] Validation suite green
- [x] Independent final-diff review
- [x] PR + Gate 2 packet

### Files expected to change

Create:

- `lib/provenance/types.ts`
- `lib/provenance/build.ts`
- `lib/provenance/index.ts`
- `lib/provenance/provenance.test.ts`
- `docs/agent/sprints/6a-provenance.md`

Modify:

- `package.json`
- `tsconfig.test.json`
- `docs/PRODUCT_RECONCILIATION_BACKLOG.md` (§5.3 + §10.3 6A-PROVENANCE only)

### Stop conditions

- Allowlist expansion without founder approval
- Insight / Matrix / metric formula / React edits
- Generic availability model or Shopify equivalence claims

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Founder APPROVE WITH LOCKED CORRECTIONS incorporated before execute; automated fresh-task plan review APPROVE with no required corrections.

## Founder plan approval

- Recorded after: Founder Gate 1 verdict `APPROVE` / execute Sprint 6A-PROVENANCE under the founder-approved Gate 1 plan with locked corrections
- Date/time: 2026-07-31
- Base SHA: `6d8780385b2e06259a0db404b9ca09781d815e4c`

## Approved-plan identity

- Plan section hash: 6a-provenance-gate1-option-b-no-availability-composition-only
- Base branch: `restart-retentionos-mvp`
- Base SHA: `6d8780385b2e06259a0db404b9ca09781d815e4c`

## Implementation summary

- Added `lib/provenance`: types + pure `buildMetricProvenance` / `buildSignalProvenance`
- MetricProvenance: metricId, methodology (docAnchor + definition meaning/basis/caveat), source, reportingScope, optional population/assumptions/maturity, methodology caveats
- SignalProvenance: signalId + composed metrics + source + reportingScope only (no Insight evidence duplication)
- No `ProvenanceAvailability`; missing optionals omitted; assumptions/population pass-through without zero-fill or defaults
- Source reuses `demo` | `uploaded_csv` (+ uploadFormat); no Shopify equivalence fields
- Non-contracted metric ids fail closed (`RangeError`)
- Focused behavioural tests 25/25; registered in `package.json` + `tsconfig.test.json`
- Backlog §5.3 + §10.3 updated to composition-only meaning; §7.1 untouched (residual UI wording non-blocking / out of allowlist, MATRIX precedent)

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- material findings: none blocking
- required_corrections: none
- notes: Initial REQUEST_CHANGES asked for §7.1 UI-wording fix; re-verdict APPROVE after confirm §7.1 is founder-forbidden this sprint (non-blocking residual, MATRIX-style). Composition code and exact 8-path allowlist clean.

## Validation and PR/check evidence

### Local validation

- Commands run: `npx tsc -p tsconfig.test.json`; `node --test .test-dist/lib/provenance/provenance.test.js` (25/25); `npm test` (522/522); `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`; `git status`
- Result: pass

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/45
- Base: `restart-retentionos-mvp` @ `6d8780385b2e06259a0db404b9ca09781d815e4c`
- Head SHA: frozen in Gate 2 packet / PR `headRefOid` (tip of `agent/6a-provenance`)

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass (3m21s)
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
