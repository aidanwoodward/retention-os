# RetentionOS Agent Sprint Runbook

## Purpose

RetentionOS uses AI-assisted engineering sprints to ship customer-economics features safely and quickly.

**Canonical sprint lifecycle:** [OPS_01.md](./OPS_01.md) (Ops-01 Lite). Use founder commands and gates defined there. This runbook keeps branch prep, validation, recovery playbooks, and architecture hard rules.

Use this document when:
- Preparing a branch or recovering from git/PR mistakes
- Looking up validation commands by sprint type
- Needing architecture hard rules alongside Ops-01

Related docs:
- [OPS_01.md](./OPS_01.md) — canonical Ops-01 Lite operating system (plan/execute/merge gates)
- [SPRINT_RECORD.md](./SPRINT_RECORD.md) — per-sprint record template
- [RETENTIONOS_ARCHITECTURE.md](../RETENTIONOS_ARCHITECTURE.md) — canonical architecture, route/API inventory, and legacy dispositions
- [PR_WORKFLOW.md](./PR_WORKFLOW.md) — PR creation, merge, and recovery via `gh`

---

## Canonical branch and hard rules

| Rule | Detail |
|------|--------|
| **Canonical integration branch** | `restart-retentionos-mvp` |
| **Never work directly on `main`** | All sprint work happens on scoped feature branches |
| **PR target** | Always open PRs **into `restart-retentionos-mvp`**, not `main` |
| **No `npm audit fix --force`** | Use targeted version pins + `npm audit fix` only |
| **No out-of-scope agent edits** | Migrations, dependencies, and CI require explicit sprint approval |

---

## Canonical architecture rules

Read [RETENTIONOS_ARCHITECTURE.md](../RETENTIONOS_ARCHITECTURE.md) before any route, metric, data-source, integration, or dependency sprint.

- The retained metric path is `RetentionOSDataset → lib/metrics → view models → UI`.
- No new features may target routes, APIs, pipelines, or components classified **quarantine**.
- CSV is a supported session-based ingestion, QA, and fallback path. It is frozen against feature expansion until a later approved sprint.
- Shopify is the intended future primary commercial connection, but it must enter through canonical normalization and metric-parity contracts.
- Use **Revenue Durability Posture**, not a numeric durability score.
- Cohorts use the UTC calendar month of first order; Month+N is a calendar-month offset.
- Architecture classifications require current repository evidence. Earlier audits are historical leads, not current proof.

---

## Standard sprint lifecycle

Follow [OPS_01.md](./OPS_01.md). Condensed:

```
restart-retentionos-mvp → scoped branch
        │
        ▼ Plan Sprint X using Ops-01 (independent plan review)
   Founder Gate 1 — Approve the plan and execute it.
        │
        ▼ implement + validate + independent final-diff review
   commit → push → gh pr create → gh pr checks --watch
        │
        ▼ Founder Gate 2 — Approve the merge and close the sprint.
   gh pr comment → gh pr merge --squash --delete-branch → sync base
```

Do not merge without Gate 2. Do not commit Gate 2 / `DONE` into the sprint record after PR freeze.

---

## Phase 1 — Prepare branch

```powershell
cd C:\code\retention-os

# Confirm you are not on main
git branch --show-current

# Switch to canonical branch and update
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
```

**Branch naming conventions:**

| Sprint type | Example branch name |
|-------------|---------------------|
| Feature / metric | `agent/sprint-5a-acquisition-tests` |
| Bug fix | `fix/typecheck-dashboard` |
| Docs / ops | `ops/sprint-workflow-runbook` |
| Security / deps | `chore/security-framework-patch` |

```powershell
# Create scoped branch (replace with your sprint name)
git checkout -b agent/sprint-5a-acquisition-tests
```

**Stop if:** `git branch --show-current` returns `main`. Do not create a sprint branch from `main`.

---

## Phase 2 — Run Cursor Agent (Ops-01)

1. Open Cursor in the repo root (`C:\code\retention-os`).
2. Use `Plan Sprint X using Ops-01.` / `Approve the plan and execute it.` per [OPS_01.md](./OPS_01.md).
3. Keep the sprint record under `docs/agent/sprints/<sprint-id>.md` ([SPRINT_RECORD.md](./SPRINT_RECORD.md)).
4. Hard rules still apply: no unapproved migrations/dependencies; no scope expansion; no work on `main`.

**Stop if:**
- Agent asks to add dependencies without approval
- Agent proposes Supabase migration changes without approval
- Agent scope expands beyond the approved plan
- Agent says validation passed but you have not verified locally
- Agent attempts merge without Founder Gate 2

---

## Phase 3 — Review agent output

Do not commit until you have reviewed the diff yourself.

```powershell
git status
git diff --stat

# Optional: inspect specific areas
git diff -- lib/metrics/
git diff --stat -- package.json package-lock.json
git diff --stat -- supabase/
```

### Red flags — stop and fix before commit

| Signal | Action |
|--------|--------|
| 50+ commits on branch | Rebase or recreate branch; see recovery below |
| Huge file count vs sprint scope | Reject agent changes; re-run with tighter packet |
| `supabase/migrations/` changed | Revert unless migration sprint |
| `package.json` / `package-lock.json` changed | Revert unless dependency sprint |
| App code changed during docs-only sprint | Revert app changes |
| Agent ran `npm audit fix --force` | Revert lockfile; use targeted pins instead |

---

## Phase 4 — Validate

### Code sprints (default)

```powershell
npm run lint
npm run typecheck
npm run build
```

All three must pass before commit.

### Metric-engine sprints

When changing `/lib/metrics` or adding tests, run **`npm test`** as well:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Add new test files to `tsconfig.test.json` `include` until a broader pattern exists.

### Docs-only sprints

Skip lint/typecheck/build **unless non-doc files were modified**.

```powershell
git status
git diff --stat
# Confirm only docs/agent/ (or declared doc paths) changed
```

---

## Phase 5 — Commit and push

```powershell
git status
git add <files>   # stage only sprint-scoped files
git commit -m "Short imperative summary of why this change exists."

git push -u origin HEAD
```

**Commit message style:** one or two sentences focused on *why*, not a file list.

---

## Phase 6 — Open PR and merge (Ops-01)

See [PR_WORKFLOW.md](./PR_WORKFLOW.md) and [OPS_01.md](./OPS_01.md).

Quick checklist:
- Base: **`restart-retentionos-mvp`**
- `gh pr create` after independent final-diff review APPROVE
- `gh pr checks --watch` green (CI + Vercel)
- Sprint record frozen at `AWAITING_FOUNDER_MERGE_APPROVAL`
- Founder Gate 2: `Approve the merge and close the sprint.`
- Required `gh pr comment` for Gate 2 trail
- `gh pr merge --squash --delete-branch`
- Local sync of `restart-retentionos-mvp` — **no** post-merge sprint-record / BUILD_LOG commit solely to close the sprint

---

## Phase 7 — Post-merge local sync

```powershell
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp

# Re-validate unless docs-only
npm test          # when metric logic or tests changed
npm run lint
npm run typecheck
npm run build
```

Ops-01 DONE evidence is the merged PR + GitHub metadata + chat completion report — not a new repo commit.

---

## Stop conditions

Stop the sprint and report (do not merge) if:

- Validation fails after **two** fix attempts
- Agent changed files outside sprint scope
- Metric formulas appear inconsistent with `/lib/metrics` conventions
- Build requires new dependencies not approved in the sprint packet
- PR would target `main` or contain 50+ commits
- Residual audit findings require `npm audit fix --force`
- Agent modified Supabase auth, RLS, or migrations without explicit approval

---

## Recovery playbooks

### Cursor edited too many files

```powershell
# See what changed
git status
git diff --stat

# Discard all uncommitted changes (destructive — confirm first)
git checkout -- .
git clean -fd   # only if agent created unwanted new files

# Or discard specific paths
git checkout -- app/ components/ lib/
```

Re-run Cursor with a **tighter sprint packet** listing exact allowed paths.

### Validation fails

1. Read the error output fully.
2. Ask Cursor to fix **only the failing area** — do not widen scope.
3. Re-run validation.
4. If still failing after two attempts: stop, commit nothing, report blocker.

```powershell
npm run typecheck 2>&1 | Select-Object -Last 30
npm run lint 2>&1 | Select-Object -Last 30
npm run build 2>&1 | Select-Object -Last 50
```

### Branch accidentally based on `main`

```powershell
# Confirm merge-base
git merge-base HEAD restart-retentionos-mvp
git log --oneline restart-retentionos-mvp..HEAD

# Recreate branch from canonical base
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
git checkout -b agent/sprint-5a-acquisition-tests-v2

# Cherry-pick your sprint commits (replace SHAs)
git cherry-pick <commit-sha-1> <commit-sha-2>

git push -u origin HEAD
```

Or: create a fresh branch and re-run the agent sprint if changes were not yet committed.

### PR accidentally targeted to `main`

See [PR_WORKFLOW.md](./PR_WORKFLOW.md) — **Recovery: wrong base PR**.

Do **not** merge. Close or retarget the PR to `restart-retentionos-mvp`.

---

## Sprint types — scope and validation

| Type | Typical paths | Do not touch | Validation |
|------|---------------|--------------|------------|
| **Docs-only** | `docs/agent/`, `AGENTS.md` | App code, packages, migrations | `git status`, `git diff --stat` |
| **Metric-engine** | `lib/metrics/`, `lib/types/`, tests | UI, migrations, dependencies | **test** + lint + typecheck + build |
| **UI** | `components/`, `app/` | Metric logic in components, migrations | lint + typecheck + build |
| **Dependency / security** | `package.json`, `package-lock.json` only | App code, migrations | lint + typecheck + build + `npm audit` |
| **Migration** | `supabase/migrations/` (explicit approval only) | Unrelated app code | lint + typecheck + build + migration review |

**Dependency sprint rules:**
- Use targeted `npm install package@version` — not blanket upgrades
- Run `npm audit fix` without `--force`
- Never upgrade Next to 16.x or React to 19.2.x unless a future sprint explicitly approves it

**Migration sprint rules:**
- Only when the sprint packet explicitly requests schema changes
- Never let an agent touch migrations as a side effect of another sprint type

---

## Current architecture program

| Sprint | Scope |
|--------|-------|
| **5U-A** | Documentation-only canonical architecture and legacy inventory |
| **5U-B** | Source-to-screen contracts for retained metrics |
| **5U-C** | Hand-calculated golden dataset and reconciliation tests |

Do not schedule route/API deletion, dependency removal, migration work, or legacy feature development inside 5U-A–C. Those changes require separately approved sprints after metric truth is documented and reconciled.

---

## Definition of done

A sprint is **done** when all of the following are true (see [OPS_01.md](./OPS_01.md)):

- [ ] Branch was created from latest `restart-retentionos-mvp`
- [ ] Founder Gate 1 approved before implementation
- [ ] Changes match approved sprint scope (verified via `git diff --stat`)
- [ ] Validation passed (or docs-only exception documented)
- [ ] Independent final-diff review APPROVE
- [ ] Commit pushed; PR opened with base **`restart-retentionos-mvp`**
- [ ] CI and Vercel checks green (`gh pr checks --watch`)
- [ ] Sprint record in PR frozen at `AWAITING_FOUNDER_MERGE_APPROVAL`
- [ ] Founder Gate 2 approved; required `gh pr comment`; squash-merged
- [ ] Local `restart-retentionos-mvp` pulled
- [ ] No out-of-scope files changed (migrations, deps, CI) unless sprint approved them
- [ ] No closure-only post-merge commit

---

## Quick reference — Ops-01 command sequence

```powershell
cd C:\code\retention-os

git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
git checkout -b agent/my-sprint-name

# In Cursor: Plan Sprint X using Ops-01. → Gate 1 → Approve the plan and execute it.

git status
git diff --stat
# Validate per sprint type (docs-only may skip npm)
npm test          # lib/metrics changes only
npm run lint
npm run typecheck
npm run build

git add <scoped-files>
git commit -m "Why this change exists."
git push -u origin HEAD
gh pr create --base restart-retentionos-mvp --title "..." --body "..."
gh pr checks --watch

# Gate 2 → Approve the merge and close the sprint.
gh pr comment --body "Founder Gate 2 approved. Proceeding to squash merge."
gh pr merge --squash --delete-branch
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
```
