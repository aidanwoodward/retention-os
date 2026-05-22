# RetentionOS Agent Sprint Runbook

## Purpose

RetentionOS uses AI-assisted engineering sprints to ship customer-economics features safely and quickly. This runbook defines the **repeatable workflow** for running those sprints with Cursor Agent, PowerShell, and GitHub — without manual back-and-forth between ChatGPT, the terminal, and the PR UI.

Use this document when:
- Starting a new sprint
- Handing a sprint packet to Cursor Agent
- Reviewing agent output before commit
- Recovering from common git/PR mistakes

Related docs:
- [SPRINT_TEMPLATE.md](./SPRINT_TEMPLATE.md) — sprint packet structure
- [PR_WORKFLOW.md](./PR_WORKFLOW.md) — PR creation, merge, and recovery

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

## Standard sprint lifecycle

```
restart-retentionos-mvp
        │
        ▼ pull latest
   scoped branch
        │
        ▼ Cursor Agent + sprint packet
   review + validate
        │
        ▼ commit → push → PR
   CI / Vercel pass
        │
        ▼ merge → pull → re-validate
   sprint done
```

### Steps

1. **Start from `restart-retentionos-mvp`**
2. **Pull latest**
3. **Create scoped branch**
4. **Run Cursor Agent with a sprint packet** (use [SPRINT_TEMPLATE.md](./SPRINT_TEMPLATE.md))
5. **Review Cursor output** — read the final summary; do not trust it blindly
6. **Run `git status` and `git diff --stat`** — confirm scope matches the sprint
7. **Validate** — see [Phase 4](#phase-4--validate) (docs-only sprints skip lint/typecheck/build/test)
8. **Commit**
9. **Push**
10. **Open PR into `restart-retentionos-mvp`**
11. **Wait for CI / Vercel**
12. **Merge**
13. **Pull locally**
14. **Validate again** (unless docs-only)

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

## Phase 2 — Run Cursor Agent

1. Open Cursor in the repo root (`C:\code\retention-os`).
2. Paste a sprint packet based on [SPRINT_TEMPLATE.md](./SPRINT_TEMPLATE.md).
3. Include explicit **hard rules** in the packet:
   - Files allowed / forbidden
   - Whether migrations or dependencies are in scope
   - Validation commands required
4. Let the agent run to completion.

**Sprint packet must include:**
- Objective and commercial reason
- Scope (likely files + do-not-touch list)
- Acceptance criteria
- Stop conditions
- Required final output format

**Stop if:**
- Agent asks to add dependencies without approval
- Agent proposes Supabase migration changes without approval
- Agent scope expands beyond the packet
- Agent says validation passed but you have not verified locally

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

## Phase 6 — Open PR and merge

See [PR_WORKFLOW.md](./PR_WORKFLOW.md) for full PR rules.

Quick checklist:
- Base: **`restart-retentionos-mvp`**
- Compare: your scoped branch
- CI green
- Vercel preview acceptable (if applicable)
- Merge via GitHub UI (squash or merge per team preference)

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

## Current next sprint candidates

Prioritised backlog after Sprint D (pick one per sprint; do not batch unrelated work):

| Priority | Sprint candidate | Why |
|----------|------------------|-----|
| 1 | **Dashboard/insights parity test** | Assert `dashboard-view-model.ts` and `insights/rules.ts` pass the same inputs to `evaluateRevenueDurabilityStatus` |
| 2 | **Mock/demo fallback cleanup** | Quarantine silent dummy KPIs on `/api/dashboard/metrics` and mock production routes |
| 3 | **Acquisition / product quality MVP** | Wire `lib/metrics/acquisition.ts` and replace mock product/channel surfaces |
| 4 | **Tremor / React 19 peer review** | `@tremor/react` peer mismatch — monitor or plan chart-library migration |
| 5 | **Residual PostCSS tracking** | Next nested `postcss@8.4.31` moderate audit finding — track Next patch releases |

See [METRIC_ENGINE_INVENTORY.md](./METRIC_ENGINE_INVENTORY.md) for open metric-engine risks vs resolved restart work.

---

## Definition of done

A sprint is **done** when all of the following are true:

- [ ] Branch was created from latest `restart-retentionos-mvp`
- [ ] Changes match sprint scope (verified via `git diff --stat`)
- [ ] Validation passed (or docs-only exception documented)
- [ ] Commit pushed to origin
- [ ] PR opened with base **`restart-retentionos-mvp`**
- [ ] CI and Vercel checks green
- [ ] PR merged
- [ ] Local `restart-retentionos-mvp` pulled and re-validated
- [ ] [BUILD_LOG.md](./BUILD_LOG.md) updated with sprint entry
- [ ] No out-of-scope files changed (migrations, deps, CI) unless sprint approved them

---

## Quick reference — full sprint command sequence

```powershell
cd C:\code\retention-os

# 1–3: Branch setup
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
git checkout -b agent/my-sprint-name

# 4–5: Run Cursor Agent (in IDE), then review
git status
git diff --stat

# 6–7: Validate (add npm test for metric-engine sprints)
npm test          # lib/metrics changes only
npm run lint
npm run typecheck
npm run build

# 8–9: Commit and push
git add .
git commit -m "Why this change exists."
git push -u origin HEAD

# 10–12: Open PR in GitHub → wait for CI → merge
# See PR_WORKFLOW.md

# 13–14: Post-merge
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
npm run lint
npm run typecheck
npm run build
```
