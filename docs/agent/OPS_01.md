# Ops-01 Lite — RetentionOS Sprint Operating System

**Rule:** Automate high-value repetition, retain high-value judgment, and do not add controls whose maintenance cost exceeds the risk they reduce.

Canonical integration branch: `restart-retentionos-mvp`. Never work on `main`. PRs always target `restart-retentionos-mvp`.

Related: [SPRINT_RECORD.md](./SPRINT_RECORD.md) · [SPRINT_RUNBOOK.md](./SPRINT_RUNBOOK.md) · [PR_WORKFLOW.md](./PR_WORKFLOW.md) · [AGENTS.md](../../AGENTS.md)

---

## Founder commands

1. `Plan Sprint X using Ops-01.`
2. `Approve the plan and execute it.`
3. `Approve the merge and close the sprint.`

Founders use plain language only. Agents may record plan hashes and SHAs mechanically; founders do not type machine tokens.

---

## Persisted states

| State | Meaning |
|-------|---------|
| `PLANNING` | Draft plan; independent plan review and corrections happen **inside** this state |
| `AWAITING_FOUNDER_PLAN_APPROVAL` | **Founder Gate 1** — stop; present Gate 1 packet |
| `IMPLEMENTING` | Implement approved scope; validate; independent final-diff review; commit/push/PR/checks — loops **inside** this state |
| `AWAITING_FOUNDER_MERGE_APPROVAL` | **Founder Gate 2** — stop; present Gate 2 packet. **Final status written into the repository sprint record** |
| `DONE` | Process outcome only: squash-merged PR + GitHub merge metadata + chat completion report. **Not** written back into the repo sprint record |
| `BLOCKED` | Hard stop (including reviewer unavailable after one retry) |

Do not persist intermediate review/CI activity as separate states.

---

## Workflow

```
PLANNING
  → independent plan review (fresh Task preferred)
  → AWAITING_FOUNDER_PLAN_APPROVAL   ← Gate 1 stop
  → (founder: Approve the plan and execute it.)
IMPLEMENTING
  → validate + independent final-diff review
  → commit / push / gh pr create
  → gh pr checks --watch
  → AWAITING_FOUNDER_MERGE_APPROVAL  ← Gate 2 stop (repo record frozen here)
  → (founder: Approve the merge and close the sprint.)
  → gh pr comment (required Gate 2 trail)
  → gh pr merge --squash --delete-branch
  → sync restart-retentionos-mvp locally
  → report completion in chat → DONE (GitHub evidence)
```

**Forbidden:** silent plan, implement, expand scope, or merge without the relevant founder approval.  
**Forbidden:** repository commit solely to record Gate 2 or flip the sprint record to `DONE`.

---

## Execution discipline

Work to the smallest sufficient scope required to meet the approved sprint completion gate.

- Use canonical repository instructions and source-of-truth documents rather than restating them.
- Inspect files according to relevance and evidence. Broad repository exploration requires a stated reason.
- Do not introduce opportunistic refactors, visual polish, adjacent improvements or later-sprint work.
- Keep operational narration concise and record durable evidence in the sprint record.
- Avoid repeatedly reading unchanged material or rerunning checks whose relevant inputs have not changed.
- Run targeted checks during implementation and the complete required validation suite at the final checkpoint.
- Escalate ambiguity that could materially affect metric correctness, commercial meaning, architecture, approved scope or acceptance criteria.
- Resolve routine implementation details using the safest evidence-based decision within the approved plan.
- Stop immediately at every founder gate.
- Optimise for correctness, scope discipline and decisive execution, not exhaustive output or minimum token use.

---

## Sprint record

One file per sprint: `docs/agent/sprints/<sprint-id>.md` (copy from [SPRINT_RECORD.md](./SPRINT_RECORD.md)).

Repository content includes evidence **through** `AWAITING_FOUNDER_MERGE_APPROVAL` only:

1. Status (final committed value for a merge-ready sprint: `AWAITING_FOUNDER_MERGE_APPROVAL`)
2. Final plan and scope
3. Plan-review verdict
4. Founder plan approval (after Gate 1; included in the PR)
5. Approved-plan identity (hash + base SHA)
6. Implementation summary
7. Implementation-review verdict
8. Validation + PR/check evidence

**Not in the repo record after PR freeze:** Gate 2 approval text, or status `DONE`. Those live in a required GitHub PR comment and merge metadata.

Ship the sprint record inside the sprint PR before presenting Gate 2.

---

## Gate 2 / DONE evidence

1. Freeze the sprint record at `AWAITING_FOUNDER_MERGE_APPROVAL` with PR URL and green checks.
2. After founder approves merge, post a required `gh pr comment` recording Gate 2 (does not change PR head).
3. Merge:

```powershell
gh pr merge --squash --delete-branch
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
```

4. Durable proof of DONE = merged PR + GitHub merge metadata. Report merge, base sync, and branch cleanup in chat. No further sprint-record commit.

---

## Independent review

- **Preferred:** fresh Task/subagent (no builder history / no resume).
- **Retry once** on availability failure.
- If still unavailable → `BLOCKED` with reason `BLOCKED_REVIEWER_UNAVAILABLE`.
- **Manual fallback:** fresh Cursor chat only with explicit founder authorization. Record `reviewer_mode: new_chat` and `automation_sla_met: false`.
- Manual fallback does **not** meet the fully automated target experience.
- Fields like `builder_context_used: false` are **process evidence / traceability only**, not proof of independence.
- Builder must not review their own work in the same conversation that produced it.

Correction loops: up to two plan-review cycles and two implementation-review cycles, then escalate to `BLOCKED`. CI fix pushes: up to two, then `BLOCKED`.

---

## Mandatory checks (every sprint)

| Check | Notes |
|-------|-------|
| Repo/branch verification | `restart-retentionos-mvp` base; not `main`; known base SHA |
| Approved scope + acceptance criteria | In sprint record before Gate 1; stay inside |
| Independent plan review | Before Gate 1 |
| Relevant targeted tests | Per risk table; may be none for pure docs |
| Standard repo validation | See below |
| Independent final-diff review | Before commit/push when practical |
| GitHub CI + Vercel | `gh pr checks --watch` before Gate 2 |
| Founder Gate 1 + Gate 2 | Always |

### Standard validation

- **Code sprints:** `npm run lint`, `npm run typecheck`, `npm run build`
- **Metric-touching:** also `npm test`
- **Docs/ops only:** `git diff --stat` scope check; skip lint/typecheck/build/test unless non-doc files changed

### Conditional checks (by risk)

| Risk signal | Extra checks |
|-------------|--------------|
| `/lib/metrics` or metric formulas | `npm test` + formula/edge-case focus in reviews |
| Import / CSV / data-source | Compatibility / fixture or parse tests |
| Schema / Supabase migrations | Explicit sprint approval + migration review |
| Security / auth / secrets | Security-focused review |
| UI / visual | Rendering/visual verification of affected routes |
| Docs/ops only | No metric/UI/security theatre |

---

## Automation boundary

| Step | Mode |
|------|------|
| Draft plan + fill sprint record | Semi-auto |
| Independent plan review (fresh Task) | Preferred auto; retry once; else BLOCKED |
| Founder Gate 1 | **Manual** |
| Implement + validate | Semi-auto after Gate 1 |
| Independent final-diff review | Preferred auto; retry once; else BLOCKED |
| Commit, push, `gh pr create` | Automatic after impl review APPROVE |
| `gh pr checks --watch` | Automatic |
| Founder Gate 2 | **Manual** |
| `gh pr comment` (Gate 2 trail) | Automatic after founder approve |
| `gh pr merge --squash --delete-branch` + local sync | Automatic after Gate 2 |
| Chat completion report | Automatic |
| Repo commit for Gate 2 / DONE flip | **Forbidden** |

---

## Founder packets

### Gate 1

```markdown
# Gate 1 — <Sprint name>
Status: AWAITING_FOUNDER_PLAN_APPROVAL
Base: restart-retentionos-mvp @ <short-sha>

## Scope
- ...

## Out of scope
- ...

## Decisions
- ...

## Risks
- ...

## Files expected
- ...

## Validation
- ...

## Plan review
- Independent review: APPROVE (Task | blocked→manual)
- Automation SLA met: yes/no

## Execution discipline

Status: PASS | EXCEPTION

- Smallest sufficient scope: yes/no
- Evidence-led inspection: yes/no
- Opportunistic work excluded: yes/no
- Targeted then full validation: yes/no
- Founder stop condition respected: yes/no
- Exceptions: none | <details>

Approve with: Approve the plan and execute it.
Or: Reject the plan — <reason>
```

### Gate 2

```markdown
# Gate 2 — <Sprint name>
Status: AWAITING_FOUNDER_MERGE_APPROVAL
PR: <url> | Head: <short-sha> (frozen)

## Shipped
- ...

## Evidence
- Sprint record in PR: complete through AWAITING_FOUNDER_MERGE_APPROVAL
- Local validation: pass
- Impl review: APPROVE
- gh pr checks: pass (CI + Vercel)
- Plan identity unchanged: yes/no
- Automation SLA met: yes/no

## Execution discipline

Status: PASS | EXCEPTION

- Smallest sufficient scope: yes/no
- Evidence-led inspection: yes/no
- Opportunistic work excluded: yes/no
- Targeted then full validation: yes/no
- Founder stop condition respected: yes/no
- Exceptions: none | <details>

Approve with: Approve the merge and close the sprint.
Or: Reject the merge — <reason>
```

---

## Stop conditions

Stop and set `BLOCKED` (do not merge) if:

- Validation or CI fails after two fix attempts
- Independent reviewer unavailable after one retry (unless founder authorizes manual review)
- Scope expands beyond the approved plan without re-planning and re-approval
- PR would target `main`
- Unapproved migrations or dependencies appear
- Agent proposes silent merge or self-approval of its own work
