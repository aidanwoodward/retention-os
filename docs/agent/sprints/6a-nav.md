# Sprint 6A-NAV — Single navigation source of truth

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Eliminate navigation-definition drift by making the live RetentionOS `AppSidebar` Core links consume canonical `MVP_NAV` as the sole analytical navigation source of truth.

### Commercial reason

Duplicate Core link lists let labels, routes, or ordering diverge from the approved MVP command-centre spine. One SoT keeps the operator chrome honest to the product contract.

### In scope

- `AppSidebar` Core items derived from `MVP_NAV` via local presentation mapping (`label`/`href` → `title`/`url`)
- Settings remains a shell-level Account item at `/settings` (not in `MVP_NAV`)
- Focused pure `node:test` locking the eight-item `MVP_NAV` contract
- Test registration in `package.json` / `tsconfig.test.json` as required
- This sprint record

### Out of scope

- Sidebar redesign
- `buildAppSidebarCoreItems` or any sidebar mapper in `lib/mvp/cohesion.ts`
- Unused sidebar components (`CleanSidebar`, hierarchical, sidebar-layout)
- `nav-main.tsx` unless compilation-required
- Protected layout breadcrumbs
- `DataPageRouteCoverage`
- New/deleted routes; Scenarios in nav
- Filters, analysis context, metrics, Shopify, auth
- Broad navigation refactors

### Acceptance criteria

- [x] No hardcoded duplicate Core title/url list in `AppSidebar`
- [x] Core links consume `MVP_NAV` for id/href/label/order truth
- [x] Settings still under Account at `/settings`; not in `MVP_NAV` / `MvpRouteId`
- [x] Scenarios absent from `MVP_NAV` and visible sidebar
- [x] Visual structure/behaviour preserved
- [x] Focused `mvp-nav` test registered and passing
- [x] `lib/mvp` remains free of React/Lucide/sidebar-specific types
- [x] PR targets `restart-retentionos-mvp`

### Files expected to change

- `components/app-sidebar.tsx`
- `lib/mvp/mvp-nav.test.ts` (new)
- `package.json` (test registration only)
- `tsconfig.test.json` (only if required for compile)
- `docs/agent/sprints/6a-nav.md` (this record)
- `lib/mvp/cohesion.ts` only if a minimal type/export adjustment is genuinely required (prefer none)

### Stop conditions

- Expanding into unused-sidebar cleanup or breadcrumb dedupe
- Adding Settings/Scenarios to `MVP_NAV`
- Adding a cohesion-side sidebar mapper
- New dependencies or React rendering tests

### Locked corrections (founder Gate 1)

1. Consume `MVP_NAV` directly in `AppSidebar` with local `.map`; do **not** add `buildAppSidebarCoreItems` to `cohesion.ts`
2. Settings shell-level only; Scenarios not in nav
3. Test contracts `MVP_NAV` only — no mapper test, no React tests
4. Prefer no `cohesion.ts` change if direct consumption already works

## Plan-review verdict

- verdict: `APPROVE_WITH_CHANGES`
- reviewer_mode: `manual_external_review`
- builder_context_used: false
- automation_sla_met: false
- exception_reason: automated fresh-task reviewer unavailable due to API usage limits
- founder_exception_authorised: true
- notes: Founder authorised manual independent-review exception and locked corrections (direct `MVP_NAV` consumption; no cohesion mapper; Settings/Scenarios policy; focused `MVP_NAV` test only). Do not represent the automated reviewer SLA as met.

## Founder plan approval

- Recorded after: founder message authorising manual review exception and approving Sprint 6A-NAV for execution with locked corrections
- Date/time: 2026-07-27
- Base SHA: `1c2c10e13c9ff0dac82ea41855bfdb0bf36ad5e2`

## Approved-plan identity

- Plan section hash: founder-locked 6A-NAV corrections (direct MVP_NAV map in AppSidebar; no cohesion mapper; Settings shell-level; Scenarios excluded; MVP_NAV-only test contract)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `1c2c10e13c9ff0dac82ea41855bfdb0bf36ad5e2`

## Implementation summary

Implemented on `agent/sprint-6a-nav` from base `1c2c10e`:

- `components/app-sidebar.tsx`: Core items from `MVP_NAV.map(({ label, href }) => ({ title: label, url: href }))`; Settings remains shell-level Account item; no Scenarios
- `lib/mvp/mvp-nav.test.ts`: focused eight-item spine contract (unique ids/hrefs; Settings/Scenarios absent)
- `package.json` + `tsconfig.test.json`: register `mvp-nav` test only
- `lib/mvp/cohesion.ts`: unchanged

Local validation completed (lint, typecheck, npm test 156 pass, build, `git diff --check`). Manual external final-diff review APPROVE; proceeding to commit/push/PR under Ops-01.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `manual_external_review`
- builder_context_used: false
- automation_sla_met: false
- exception_reason: automated implementation reviewer unavailable after two attempts due to API usage limits
- founder_exception_authorised: true
- manual_diff_review_completed: true
- notes: Application and test implementation approved without code changes. AppSidebar consumes `MVP_NAV` via local mapping; Settings shell-level; Scenarios absent; `cohesion.ts` unchanged; allowlist-only diff; validation green.

## Validation and PR/check evidence

### Local validation

- Commands run: focused `mvp-nav` test (5 pass); `npm run lint`; `npm run typecheck`; `npm test` (156 pass); `npm run build`; `git diff --check`; `git status`
- Result: pass

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/33
- Base: `restart-retentionos-mvp`
- Head SHA: `b33f88f18445a3d02d841926eaf2b7b7ef50bb17` (Gate 2 frozen PR tip)

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass (https://github.com/aidanwoodward/retention-os/actions/runs/30309360568/job/90121133915)
- Vercel: pass (https://vercel.com/aidan-woodwards-projects/retention-os/FmMjZgekv7XKqQJok4hpgZpKA1P7)

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.