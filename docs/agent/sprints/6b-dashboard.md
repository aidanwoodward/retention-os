# Sprint 6B-DASHBOARD — Executive Dashboard composition

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Build the first complete visible expression of RetentionOS on `/dashboard`: integrated Matrix-powered executive hero, availability-driven proof metrics, compressed cross-domain evidence, and on-demand Provenance.

### Commercial reason

Operators need a single executive surface that answers “Is growth durable, and what needs attention?” without a KPI wall, without duplicating Insights, and with honest trust metadata.

### In scope

- `lib/mvp/dashboard-presentation-view-model.ts` — thin composition (metric VM + Signals + Matrix + Provenance)
- Integrated `DashboardCommandCentreHero` (Dashboard-specific)
- Shared: `SignalDisclosure`, `EvidenceMetric`, `ProvenanceDisclosure`
- `hideContextCard` on `CommandCentrePageFrame` (Dashboard only)
- Dashboard H1/subtitle via `cohesion.ts`
- `MetricSourceBanner` reporting meta
- Compressed `DashboardSpinePanels`

### Out of scope

- `lib/metrics/dashboard-view-model.ts` changes
- Insights page
- Signal/Matrix/Provenance contract changes
- New metrics, Signal IDs, charts, packages
- 6B-INSIGHTS

### Acceptance criteria

- [x] Page order: H1 → subtitle → source/freshness → integrated hero → 2–4 proof metrics → compressed evidence → Insights footer link
- [x] Matrix `revenue-durability-snapshot` via `selectSignalsForSurface("dashboard")`
- [x] Signal collapsed by default; keyboard-accessible expand
- [x] Context card suppressed on Dashboard only
- [x] No Locked KPI cards in proof metrics; acquisition lock once in supporting evidence
- [x] Diff ⊆ exact allowlist
- [x] `npm run lint`, `typecheck`, `test`, `build` green
- [x] Independent final-diff review APPROVE
- [ ] PR against `restart-retentionos-mvp`; Gate 2 packet

### Files expected to change

Create:

- `docs/agent/sprints/6b-dashboard.md`
- `lib/mvp/dashboard-presentation-view-model.ts`
- `lib/mvp/dashboard-presentation-view-model.test.ts`
- `components/analytical/SignalDisclosure.tsx`
- `components/analytical/EvidenceMetric.tsx`
- `components/analytical/ProvenanceDisclosure.tsx`

Modify:

- `app/(protected)/dashboard/DashboardExecutive.tsx`
- `components/dashboard/DashboardCommandCentreHero.tsx`
- `components/dashboard/DashboardSpinePanels.tsx`
- `components/mvp/MetricSourceBanner.tsx`
- `components/mvp/CommandCentrePageFrame.tsx`
- `lib/mvp/cohesion.ts`

### Stop conditions

- Allowlist expansion without founder approval
- Metric VM / Signal rule / Matrix / Provenance contract edits
- Insights implementation
- New dependencies

## Plan-review verdict

- verdict: `APPROVE_WITH_LOCKS`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: L1–L13 locks per Gate 1 final revision

## Founder plan approval

- Recorded after: Founder Gate 1 approval for Sprint 6B-DASHBOARD
- Date/time: 2026-08-02
- Base SHA: `3d610b85acb16c85a167e8d7e33d80a77e550ff8`
- Branch: `agent/6b-dashboard`

## Approved-plan identity

- Base branch: `restart-retentionos-mvp`
- Base SHA: `3d610b85acb16c85a167e8d7e33d80a77e550ff8`

## Implementation summary

- Added `buildDashboardPresentationViewModelFromDataset` composing metric VM, `generateDiagnosticInsights`, `selectSignalsForSurface("dashboard")`, and `buildSignalProvenance`
- Integrated hero: posture (emerald/amber/rose) + Matrix Signal severity + Collapsible `SignalDisclosure`/`ProvenanceDisclosure` (default closed)
- Dashboard page: `hideContextCard`, reporting meta banner, 2–4 `EvidenceMetric` proof row, compressed supporting evidence, quiet Insights footer link
- `CommandCentrePageFrame`: optional `hideContextCard` (default false)
- `cohesion.ts`: dashboard title “Revenue durability”, hook commercial question
- `lib/metrics/dashboard-view-model.ts` untouched

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task` (Bugbot)
- builder_context_used: false
- automation_sla_met: true
- material findings: none blocking
- notes: Presentation VM test authored; `tsconfig.test.json` / `package.json` not on allowlist — test not wired to `npm test` in this sprint

## Validation and PR/check evidence

### Local validation

- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`
- Result: pass (522 existing tests; presentation VM test file present but not in test runner allowlist)

### PR

- URL: *(pending push)*
- Base: `restart-retentionos-mvp` @ `3d610b85acb16c85a167e8d7e33d80a77e550ff8`
- Head SHA: *(frozen after push)*

### Checks

- *(pending `gh pr checks --watch`)*
