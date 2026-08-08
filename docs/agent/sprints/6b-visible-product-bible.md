# Sprint 6B-VISIBLE-PRODUCT-BIBLE — Visible Product Bible

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Create one canonical Visible Product Bible that governs RetentionOS 6B presentation composition for the eight-route MVP spine, with thin canonical pointers and minimal backlog §10 status/sequence sync.

### Commercial reason

Operators and agents need a single presentation-composition authority before page UI sprints so each surface leads with an honest commercial answer, keeps distinct concepts separate, and exposes trust without inventing metrics, Signals, or execution IDs.

### In scope

- Author `docs/VISIBLE_PRODUCT_BIBLE.md` (principles, skeleton, checklist, ownership, page composition, Signal/trust UX, formatting, colour roles, stack, build-order mapping, deferrals, anti-patterns)
- Sprint record
- Thin pointers: `AGENTS.md`, architecture, backlog §8/§8.8/§10, historical banner on revenue-cohorts UI template
- Mark 6A-SIGNAL / MATRIX / PROVENANCE shipped; insert Bible + `6B-DATA`; apply approved 6B UI order

### Out of scope

- Runtime / UI / component implementation
- Metric formula, Signal, Matrix, Provenance code changes
- DOC-POST-6A-TRUTH cleanup
- Parallel `6B-1`…`6B-9` execution taxonomy
- Storybook, new dependencies, legacy deletion, 6C
- Purchase Path Explorer implementation

### Acceptance criteria

- [x] Bible path `docs/VISIBLE_PRODUCT_BIBLE.md` with required structure §§1–15
- [x] Bible owns presentation composition; backlog remains sole execution/status SoT
- [x] Architecture remains route/system authority; no formula duplication
- [x] §8 pointers + §8.8 Data stub; `6B-DATA` should item; approved 6B order
- [x] 6A-SIGNAL / MATRIX / PROVENANCE no longer listed as upcoming remaining work
- [x] Legacy UI template bannered historical
- [x] Diff ⊆ exact six-path allowlist
- [x] Independent final-diff review APPROVE
- [x] PR + Gate 2 packet

### Files expected to change

Create:

- `docs/VISIBLE_PRODUCT_BIBLE.md`
- `docs/agent/sprints/6b-visible-product-bible.md`

Modify:

- `AGENTS.md`
- `docs/PRODUCT_RECONCILIATION_BACKLOG.md`
- `docs/RETENTIONOS_ARCHITECTURE.md`
- `docs/archive/pre-restart/revenue-cohorts-ui-consistency-template.md`

### Stop conditions

- Allowlist expansion without founder approval
- Runtime / metric / Signal / Matrix / Provenance edits
- Dual execution SoT or dual composition SoT
- DOC-POST cleanup leakage
- Claiming page UI or Purchase Path Explorer implemented

## Plan-review verdict

- verdict: `APPROVE_WITH_LOCKS`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Round 1 REQUEST_CHANGES (parallel taxonomy / Data invent / ownership contradiction) corrected; Round 2 APPROVE_WITH_LOCKS. Locks: Bible sequence subordinate to §10; §8 pointers prevent dual composition SoT; `6B-DATA` minimal; §10 edits limited to approved list.

## Founder plan approval

- Recorded after: Founder Gate 1 approval for Sprint 6B-VISIBLE-PRODUCT-BIBLE (APPROVE_WITH_LOCKS)
- Date/time: 2026-08-01
- Base SHA: `3a03aae8a2e0aef7ff20ef812b7b81a532f5e070`

## Approved-plan identity

- Plan section hash: 6b-visible-product-bible-gate1-approve-with-locks
- Base branch: `restart-retentionos-mvp`
- Base SHA: `3a03aae8a2e0aef7ff20ef812b7b81a532f5e070`

## Implementation summary

- Created `docs/VISIBLE_PRODUCT_BIBLE.md` as presentation-composition SoT (principles, skeleton, checklist, eight-route ownership, page composition, Signal/trust UX, formatting, colour roles, stack, §10-mapped build order, deferrals)
- Added AGENTS.md + architecture routing pointers
- Backlog §8 composition pointers + §8.8 Data stub; §10 marks 6A-SIGNAL/MATRIX/PROVENANCE shipped; inserts `6B-VISIBLE-PRODUCT-BIBLE` and `6B-DATA` (should); applies approved 6B UI order
- Bannered `revenue-cohorts-ui-consistency-template.md` historical; body preserved
- Deleted abandoned empty local branch `agent/sprint-doc-post-6a-truth` during hygiene (DOC-POST remains deferred)
- Exact six-path allowlist; no runtime

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- material findings: none blocking
- required_corrections: none
- notes: Non-blocking — sprint record freeze fields filled for Gate 2; AGENTS prohibition example still names 6A as “later work” (stale wording, out of allowlist expansion); §8 inventory phrasing may diverge slightly from Bible ownership lines (pointers make Bible composition SoT).

## Validation and PR/check evidence

### Local validation

- Commands run: `git diff --check`; `git status`; `git diff --name-status 3a03aae8a2e0aef7ff20ef812b7b81a532f5e070`; manual allowlist + ownership checks; independent final-diff review
- Result: pass (exactly 6 paths)

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/46
- Base: `restart-retentionos-mvp` @ `3a03aae8a2e0aef7ff20ef812b7b81a532f5e070`
- Head SHA: (frozen after Gate 2 readiness commit; see Gate 2 packet)

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass (3m19s)
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
