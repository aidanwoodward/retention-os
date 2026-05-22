# RetentionOS PR Workflow

## Purpose

This document defines how to create, review, merge, and recover from mistakes when opening pull requests for RetentionOS agent sprints.

**Golden rule:** PRs merge **into `restart-retentionos-mvp`**, never directly into `main`.

Related: [SPRINT_RUNBOOK.md](./SPRINT_RUNBOOK.md)

---

## Correct PR base and compare

| Field | Value |
|-------|-------|
| **Base (target)** | `restart-retentionos-mvp` |
| **Compare (source)** | Your scoped sprint branch (e.g. `agent/sprint-5a-acquisition-tests`) |

```
your-branch  ──PR──►  restart-retentionos-mvp  ──(later)──►  main
```

`main` is not the sprint integration branch. Targeting `main` by accident is one of the most common and dangerous mistakes.

---

## Creating a PR manually in GitHub

1. Push your branch:
   ```powershell
   git push -u origin HEAD
   ```
2. Open the repo on GitHub.
3. Click **Compare & pull request** (or **Pull requests → New pull request**).
4. Set **base** to `restart-retentionos-mvp`.
5. Set **compare** to your branch.
6. Confirm the commit count and file list look reasonable.
7. Fill in title and body (template below).
8. Create the PR.
9. Wait for CI and Vercel checks.
10. Merge when green.

---

## Red flags — do not create (or do not merge) the PR

Stop and investigate if any of these are true:

| Red flag | Why it matters | Action |
|----------|----------------|--------|
| **Base is `main`** | Bypasses canonical integration branch; risks merging unreviewed MVP work | Change base to `restart-retentionos-mvp` or close and recreate |
| **50+ commits** | Usually means branch was based on wrong ancestor or includes unrelated history | Rebase, cherry-pick, or recreate branch |
| **Huge file count** | Agent scope creep or wrong branch base | Review `git diff --stat`; revert out-of-scope files |
| **App code changed during docs sprint** | Violates sprint scope | Revert app changes before PR |
| **`package.json` / lockfile changed during metric sprint** | Dependency changes need their own sprint | Revert package files |
| **`supabase/migrations/` changed without migration sprint** | Schema changes need explicit approval | Revert migrations |
| **Agent ran `npm audit fix --force`** | Can introduce breaking downgrades | Revert lockfile; use targeted pins |

Quick pre-PR check in PowerShell:

```powershell
git log --oneline restart-retentionos-mvp..HEAD | Measure-Object -Line
git diff --stat restart-retentionos-mvp...HEAD
git diff --stat -- package.json package-lock.json supabase/
```

---

## PR title conventions

Use a short, scannable title. Prefer imperative mood.

| Sprint type | Title pattern | Example |
|-------------|---------------|---------|
| Feature | `Add <feature> for <metric/area>` | `Add cohort payback view model` |
| Fix | `Fix <problem> in <area>` | `Fix typecheck error on dashboard route` |
| Docs / ops | `docs: <topic>` or `ops: <topic>` | `ops: add agent sprint runbook` |
| Security / deps | `chore: patch <packages>` | `chore: patch Next and React to D0 audit versions` |
| Metric engine | `metrics: <what changed>` | `metrics: add contribution LTV helper` |

Avoid:
- Vague titles: `Updates`, `Fix stuff`, `WIP`
- Sprint-internal codenames without context: `Sprint 5a` (add the actual change)

---

## Standard PR body template

Copy into the GitHub PR description:

```markdown
## Summary
- [1–3 bullets: what changed and why]

## Sprint
- **Sprint:** [e.g. Sprint 5A — Acquisition tests]
- **Branch:** [e.g. agent/sprint-5a-acquisition-tests]
- **Scope type:** [docs-only | metric-engine | UI | dependency | migration]

## Test plan
- [ ] `npm test` passes locally (required when `/lib/metrics` or test files change)
- [ ] `npm run lint` passes locally
- [ ] `npm run typecheck` passes locally
- [ ] `npm run build` passes locally
- [ ] [Manual check specific to this sprint]

## Files changed
- [Key paths or "see diff"]

## Risks / caveats
- [Anything reviewers should know]

## Out of scope (confirmed)
- [ ] No Supabase migration changes
- [ ] No unapproved dependency changes
- [ ] No changes outside sprint scope
```

For **docs-only** sprints, replace the npm checklist with:

```markdown
## Test plan
- [ ] Only `docs/agent/` files changed (verified via `git diff --stat`)
```

---

## CI requirements

Do not merge until required checks pass:

| Check | Requirement |
|-------|-------------|
| GitHub Actions CI | Green — **lint, typecheck, test, build** (see `.github/workflows/ci.yml`) |
| Vercel preview | Deploy succeeds; spot-check affected routes if UI sprint |
| PR review | At least one human review when team policy requires it |

If CI fails, see **Recovery: failed CI** below.

---

## Merge checklist

Before clicking merge:

- [ ] Base branch is **`restart-retentionos-mvp`** (not `main`)
- [ ] Commit count is reasonable (not 50+)
- [ ] File diff matches sprint scope
- [ ] CI green (includes `npm test` when metric files changed)
- [ ] Vercel preview acceptable (if applicable)
- [ ] PR title and body accurately describe the change
- [ ] No unintended migration or dependency changes

After merge:

```powershell
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp

# Re-validate (skip for docs-only; add npm test when metrics changed)
npm test
npm run lint
npm run typecheck
npm run build
```

Update [BUILD_LOG.md](./BUILD_LOG.md) if not already done.

---

## Recovery playbooks

### Wrong base PR (targeted `main` instead of `restart-retentionos-mvp`)

**If not yet merged:**
1. Do **not** merge.
2. On GitHub: **Edit** the PR and change base to `restart-retentionos-mvp`.
3. Review the new diff — it may change significantly.
4. If the diff looks wrong, close the PR and open a fresh one from a correctly based branch.

**If already merged to `main` by accident:**
1. Stop further merges immediately.
2. Identify the merge commit on `main`.
3. Coordinate with the team before reverting on `main`:
   ```powershell
   git checkout main
   git pull origin main
   git log --oneline -5
   # Revert the merge commit (prefer revert over force-push on shared branches)
   git revert -m 1 <merge-commit-sha>
   git push origin main
   ```
4. Re-open the change as a PR into `restart-retentionos-mvp` from a clean branch.

### Accidental merge into `main`

Treat as incident:
1. Revert on `main` (see above) — do not force-push `main` without team agreement.
2. Confirm the change lands on `restart-retentionos-mvp` via a correct PR.
3. Document what happened in BUILD_LOG.md.

### Failed CI

1. Open the failed check log on GitHub.
2. Reproduce locally:
   ```powershell
   npm test
   npm run lint
   npm run typecheck
   npm run build
   ```
3. Fix on the same branch; push again.
4. CI re-runs automatically.
5. If failure is environmental (not code), note it in the PR and retry.

Do not merge with failing required checks unless a repo admin explicitly overrides with documented reason.

### Stale branch (behind `restart-retentionos-mvp`)

```powershell
git checkout your-branch
git fetch origin
git rebase origin/restart-retentionos-mvp

# If conflicts: resolve, then
git add .
git rebase --continue

git push --force-with-lease origin HEAD
```

Prefer `--force-with-lease` over `--force` when updating a PR branch after rebase.

If rebase is too messy (>50 commits or many conflicts), recreate the branch:

```powershell
git checkout restart-retentionos-mvp
git pull origin restart-retentionos-mvp
git checkout -b your-branch-v2
git cherry-pick <your-commit-shas>
git push -u origin your-branch-v2
```

Close the old PR; open a new one from `-v2`.

---

## Future / optional — GitHub CLI shortcut

GitHub CLI (`gh`) is **not required** today. When installed and authenticated, it can replace manual GitHub UI steps.

### Example: create PR (future / optional)

```powershell
# Requires: gh auth login (one-time setup)
git push -u origin HEAD

gh pr create `
  --base restart-retentionos-mvp `
  --title "ops: add agent sprint runbook" `
  --body "$( @'
## Summary
- Add sprint runbook and PR workflow docs under docs/agent/

## Sprint
- **Sprint:** OPS-1 — Sprint workflow runbook
- **Scope type:** docs-only

## Test plan
- [x] Only docs/agent/ files changed

## Out of scope (confirmed)
- [x] No Supabase migration changes
- [x] No unapproved dependency changes
'@ )"
```

### Example: check PR status (future / optional)

```powershell
gh pr status
gh pr checks
gh pr view --web
```

### Example: merge (future / optional)

```powershell
gh pr merge --merge --delete-branch
```

Until `gh` is adopted team-wide, use the GitHub web UI for all PR operations.

---

## Quick reference

| Step | Correct action |
|------|----------------|
| PR base | `restart-retentionos-mvp` |
| Never | Target or merge sprint PRs directly to `main` |
| Pre-PR | Check commit count, file scope, package/migration diffs |
| Merge gate | CI green + scope verified |
| Post-merge | Pull canonical branch + re-validate |
| Audit deps | Targeted installs + `npm audit fix` — **never `--force`** |
