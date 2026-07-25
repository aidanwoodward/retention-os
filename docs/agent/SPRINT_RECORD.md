# Sprint record template

Copy to `docs/agent/sprints/<sprint-id>.md` (e.g. `ops-01.md`, `5ub.md`).

Canonical workflow: [OPS_01.md](./OPS_01.md).

Repository records freeze at `AWAITING_FOUNDER_MERGE_APPROVAL`. Do **not** commit Gate 2 approval text or status `DONE` into this file after PR freeze — those live in GitHub PR comment / merge metadata.

---

```markdown
# Sprint <ID> — <Name>

## Status

`PLANNING` | `AWAITING_FOUNDER_PLAN_APPROVAL` | `IMPLEMENTING` | `AWAITING_FOUNDER_MERGE_APPROVAL` | `BLOCKED`

Final committed value when merge-ready: `AWAITING_FOUNDER_MERGE_APPROVAL`.

## Final plan and scope

### Objective

### Commercial reason

### In scope

-

### Out of scope

-

### Acceptance criteria

- [ ]

### Files expected to change

-

### Stop conditions

-

## Plan-review verdict

- verdict: `APPROVE` | `REQUEST_CHANGES`
- reviewer_mode: `fresh_task` | `new_chat`
- builder_context_used: false
- automation_sla_met: true | false
- notes:

(Process evidence / traceability only — not proof of independence.)

## Founder plan approval

- Recorded after: `Approve the plan and execute it.`
- Date/time:
- Base SHA:

## Approved-plan identity

- Plan section hash:
- Base branch: `restart-retentionos-mvp`
- Base SHA:

## Implementation summary

-

## Implementation-review verdict

- verdict: `APPROVE` | `REQUEST_CHANGES`
- reviewer_mode: `fresh_task` | `new_chat`
- builder_context_used: false
- automation_sla_met: true | false
- notes:

## Validation and PR/check evidence

### Local validation

- Commands run:
- Result:

### PR

- URL:
- Base: `restart-retentionos-mvp`
- Head SHA:

### Checks

- `gh pr checks --watch`: pass | fail
- CI validate:
- Vercel:

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
```
