# Sprint settings-cleanup — Settings + visible product cleanup

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Shrink `/settings` to honest, working controls and close orphan `/settings/*` sub-routes before the whole-spine readiness audit.

### Commercial reason

The live product linked a prototype admin console (fake teams, billing, RLS, API keys) from primary navigation. That undermines trust in the customer-economics MVP story.

### In scope

- Minimal `/settings` page: session identity, sign out, Demo Mode toggle
- Redirect `/settings/integrations` and `/settings/feedback` → `/settings`
- Wire `NavUser` logout to `POST /auth/signout`
- Slim `GET /api/settings/user` to identity-only; fix cache header
- Honest feedback UI (mailto draft; no false success)
- Focused `demo-surface-guard` containment tests
- This sprint record

### Out of scope

- Route file deletion (connect, sync, integrations, settings subpages)
- Shopify OAuth/sync handler changes
- `MVP_NAV` / spine page composition changes
- `/data` CSV workflow changes
- New feedback backend, billing, teams, permissions, notifications
- Legacy sidebar / orphan dashboard cleanup

### Acceptance criteria

- [x] `/settings` shows session + sign out + Demo Mode only
- [x] No FilterDemo, summary cards, or fake admin tabs on `/settings`
- [x] `/settings/integrations` and `/settings/feedback` redirect to `/settings`
- [x] `NavUser` Log out calls `POST /auth/signout`
- [x] `GET /api/settings/user` left unchanged; session identity via Supabase client on Settings page
- [x] Feedback modal does not claim in-app submission succeeded
- [x] `demo-surface-guard` tests cover settings sub-route redirects
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass

### Files expected to change

- `app/(protected)/settings/page.tsx`
- `lib/mvp/demo-surface-guard.ts`
- `lib/mvp/demo-surface-guard.test.ts` (new)
- `components/nav-user.tsx`
- `app/api/settings/user/route.ts`
- `components/ui/feedback-tool.tsx`
- `package.json` (test registration)
- `tsconfig.test.json`
- `docs/agent/sprints/settings-cleanup.md` (this record)

### Stop conditions

- Expanding Settings into account/admin console features
- Deleting legacy route files
- Modifying Shopify scaffolding or MVP spine routes

## Plan-review verdict

- verdict: `APPROVE_WITH_LOCKS`
- reviewer_mode: founder Gate 1 plan
- builder_context_used: true
- automation_sla_met: n/a
- notes: Locks: minimal settings only; redirect/hide orphan sub-routes; no Shopify handler changes; no spine/MVP_NAV changes; DemoModeProvider behavior unchanged except copy; feedback honesty only.

## Founder plan approval

- Recorded after: founder message authorising implementation of attached Gate 1 plan
- Date/time: 2026-08-24
- Base SHA: `272ba46188038bfde31b4d5b4738de56bd4f9028`

## Approved-plan identity

- Plan section hash: settings-cleanup Gate 1 plan (attached)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `272ba46188038bfde31b4d5b4738de56bd4f9028`

## Implementation summary

- Replaced `app/(protected)/settings/page.tsx` prototype with session identity, sign out, and Demo Mode toggle
- Updated `lib/mvp/demo-surface-guard.ts` to allow only `/settings` and redirect all `/settings/*` subpaths to `/settings`
- Wired `components/nav-user.tsx` logout and session email hydration
- Replaced simulated feedback submit with honest mailto draft in `components/ui/feedback-tool.tsx`
- Session identity on Settings uses `supabase.auth.getUser()` client-side; `app/api/settings/user/route.ts` left unchanged per sprint lock
- Added `lib/mvp/demo-surface-guard.test.ts` and registered in test harness

## Implementation-review verdict

- verdict: pending
- reviewer_mode: pending
- builder_context_used: false
- automation_sla_met: false
- notes:

## Validation and PR/check evidence

### Local validation

- Commands run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- Result: pass (629 tests, 0 fail)

### PR

- URL: pending
- Base: `restart-retentionos-mvp`
- Head SHA: pending

### Checks

- pending

## Notes

Gate 2 approval and DONE are not written here after PR freeze.
