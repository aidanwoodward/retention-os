# Sprint Ops-01 — Automated Planning and Implementation Review Gates (Lite)

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Ship Ops-01 Lite: a minimal repository-native sprint operating workflow with two founder gates, one sprint record, and `gh`-driven PR/check/merge automation — without hooks, gate scripts, or contract overbuild.

### Commercial reason

Accelerates every RetentionOS sprint by automating GitHub repetition while keeping founder judgment on plan and merge. Internal operating workflow, not a product feature.

### In scope

- Create `docs/agent/OPS_01.md` (canonical Lite workflow)
- Create `docs/agent/SPRINT_RECORD.md` (reusable template)
- Create `docs/agent/sprints/` convention + this record
- Short `AGENTS.md` Ops-01 pointer
- Light retargets of `SPRINT_RUNBOOK.md`, `PR_WORKFLOW.md`, `SPRINT_TEMPLATE.md` only where they conflict with Ops-01

### Out of scope

- Cursor hooks, custom gate scripts, contracts folder, new dependencies
- Product / runtime / metrics / UI changes
- Sprint 5U-B
- Any work on `main`
- Post-merge closure-only commits

### Acceptance criteria

- [x] Canonical Ops-01 Lite document exists and defines six persisted states + two founder gates
- [x] Sprint record template + `sprints/` convention exist
- [x] AGENTS.md points agents at Ops-01
- [x] Runbook/PR/template no longer contradict Ops-01 (`gh` path, Gate 2 before merge, no DONE flip in repo)
- [x] This sprint record ships inside the PR frozen at Gate 2 readiness
- [x] Docs-only scope verified via `git diff --stat`
- [x] Independent final-diff review APPROVE
- [ ] CI + Vercel green via `gh pr checks --watch` (evidence in Gate 2 packet)
- [ ] Founder Gate 2 before merge

### Files expected to change

- `docs/agent/OPS_01.md` (create)
- `docs/agent/SPRINT_RECORD.md` (create)
- `docs/agent/sprints/ops-01.md` (create)
- `AGENTS.md` (modify)
- `docs/archive/pre-restart/SPRINT_RUNBOOK.md` (modify lightly)
- `docs/agent/PR_WORKFLOW.md` (modify lightly)
- `docs/archive/pre-restart/SPRINT_TEMPLATE.md` (modify lightly)

### Stop conditions

- Scope expands into product code, hooks, or scripts
- PR would target `main`
- Independent reviewer unavailable after one retry without founder-authorized manual review
- Validation/CI fails after two fix attempts

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `new_chat`
- builder_context_used: false
- automation_sla_met: false
- notes: Founder-authorized manual fallback after Task API limits. Lite footprint, Gate 2 lifecycle, and founder gates confirmed decision-ready.

(Process evidence / traceability only — not proof of independence.)

## Founder plan approval

- Recorded after: `Approve the plan and execute it.`
- Date/time: 2026-07-25 (implementation start after Gate 1)
- Base SHA: `4b496da6de1a23afec044cc1d1d8d2b2dd6fcf71`

## Approved-plan identity

- Plan section hash: `e5bd55c1fde216ea8320f85ba9d90583730ca09c7565f64d8d2895b5e9e63d1b`
- Base branch: `restart-retentionos-mvp`
- Base SHA: `4b496da6de1a23afec044cc1d1d8d2b2dd6fcf71`

## Implementation summary

- Added `docs/agent/OPS_01.md` as the sole canonical Ops-01 Lite operating document (states, founder commands, checks, automation boundary, reviewer-unavailability, Gate 2/DONE evidence model).
- Added `docs/agent/SPRINT_RECORD.md` template and `docs/agent/sprints/ops-01.md` for this sprint.
- Added short Ops-01 section to `AGENTS.md`.
- Retargeted `SPRINT_RUNBOOK.md`, `PR_WORKFLOW.md`, and `SPRINT_TEMPLATE.md` so Ops-01/`gh` is the primary path; removed optional-gh and post-merge BUILD_LOG closure as the primary closeout.
- No hooks, scripts, contracts, dependencies, or product/runtime changes.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `new_chat`
- builder_context_used: false
- automation_sla_met: false
- notes: Founder-authorized independent manual implementation review after Task API limits. Safe to commit/push/PR under Ops-01.

(Process evidence / traceability only — not proof of independence.)

## Validation and PR/check evidence

### Local validation

- Commands run: `git status`, `git diff --stat`
- Result: pass — docs/ops only (`AGENTS.md`, `docs/agent/*`); no app/lib/package changes

### PR

- URL: _(set in Gate 2 packet after `gh pr create`; record frozen before push to avoid head churn)_
- Base: `restart-retentionos-mvp`
- Head SHA: _(set in Gate 2 packet)_

### Checks

- `gh pr checks --watch`: _(reported in Gate 2 packet)_
- CI validate: _(Gate 2 packet)_
- Vercel: _(Gate 2 packet)_

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze. Durable Gate 2/DONE evidence lives in GitHub PR comment + merge metadata.
