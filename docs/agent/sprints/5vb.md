# Sprint 5V-B — Dataset lifecycle and persistence decision

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Deliver the smallest trustworthy dataset lifecycle hardening plus a durable persistence decision so users always know which dataset is active, where it came from, what assumptions attach, that CSV payloads are session-scoped (re-upload required after session loss), and what restore / replace / refresh / delete do — without silently substituting demo metrics for lost merchant data.

### Commercial reason

Merchants must trust that RetentionOS never presents demo fixture economics as their uploaded data after a tab/session is lost, and that replace/delete cannot leak prior commercial assumptions into a new dataset.

### In scope

- Keep canonical uploaded `RetentionOSDataset` + assumption overlays in sessionStorage
- Lightweight durable control/provenance record in localStorage (non-sensitive metadata only)
- Statuses: `pending` | `demo` | `uploaded` | `lost_upload`
- Locked state-resolution precedence (including pre-control session compatibility)
- Central lifecycle coordinator for activate/replace/refresh/delete/use-demo
- Shared hydrate hook; no silent demo fallback for lost upload
- Replace/delete clear margin + spend CSV + spend %
- CSV refresh = validated replacement
- Decision SoT: thin Supabase envelope = likely future (deferred); no implementation
- Sprint record; targeted lifecycle tests; lint/typecheck/build/test
- Branch `agent/sprint-5vb-dataset-lifecycle` from `restart-retentionos-mvp` @ `b8933d96f18486bbb05a4cc247b3765535d7a3d3`

### Locked clarifications (Founder Gate 1)

#### Clarification 1 — state-resolution precedence

- Missing control + valid session dataset → resolve `uploaded` and backfill durable control
- Missing control + no session dataset → resolve `demo`
- Uploaded control + valid session dataset → resolve `uploaded`
- Uploaded control + missing or invalid session dataset → resolve `lost_upload`
- Incompatible or corrupt control + valid session dataset → resolve `uploaded` and regenerate control from verified dataset metadata
- Incompatible or corrupt control + no valid session dataset, where uploaded intent can safely be established → resolve `lost_upload`
- Demo control + orphan uploaded session state → explicit demo wins; ignore or clear orphan uploaded state

`lost_upload` only when uploaded intent exists but no valid uploaded payload is available.

#### Clarification 2 — central lifecycle coordinator

All activation, replace, refresh, delete and use-demo flows go through `lib/data-source/dataset-lifecycle.ts` (or equivalent). It manages session dataset, margin, spend CSV, spend %, durable control, and rollback/prior-state preservation on storage failure. Components must not independently duplicate storage-key clearing or active-source transitions.

### Locked defaults (approved decisions)

1. Canonical uploaded datasets and assumption overlays remain in sessionStorage
2. localStorage holds only lightweight, non-sensitive control/provenance metadata (`retentionos:activeSourceControl:v1`, `schemaVersion=1`)
3. Statuses are `pending`, `demo`, `uploaded`, `lost_upload`
4. No silent fallback from lost uploaded data to demo metrics
5. Replace and refresh are validated transitions; intentional delete / Use demo → explicit `demo`
6. Control write/clear: save/replace/refresh writes control `activeSource=uploaded`; delete/revert/use-demo resets control to `demo`
7. Thin Supabase-owned dataset snapshot/envelope is the likely future direction; not implemented this sprint
8. No IndexedDB, Supabase migrations, Shopify integration, new metrics, broad UI redesign, or new dependencies
9. No full canonical dataset in localStorage; no full relational warehouse
10. Single shared resolve path + `useCommandCentreDatasetSelection` hydrate hook

### Out of scope

- Full-dataset localStorage or IndexedDB persistence
- Supabase migrations / datasets table / server snapshot APIs
- Full relational Shopify warehouse
- Multi-dataset history, brand switching, version UI
- Shopify OAuth, API, webhooks, scheduled refresh
- Metric formula changes / new metrics
- Broad dashboard redesign
- New dependencies
- Auth middleware expansion
- Cross-device sync

### Acceptance criteria

- [ ] User sees active source, provenance, assumptions, and honest session-scoped limits
- [ ] Canonical dataset remains sessionStorage-only; durable store is control/provenance only
- [ ] Control written on save/replace/refresh; reset to demo on intentional delete (not `lost_upload`)
- [ ] Precedence matrix implemented and tested (including missing-control backfill)
- [ ] `lost_upload` never presents demo fixture metrics as merchant data
- [ ] `pending` does not flash demo as commercial truth
- [ ] Lifecycle coordinator owns activate/replace/refresh/delete/use-demo
- [ ] Replace clears margin + spend CSV + spend %; failures preserve prior valid state
- [ ] CSV refresh = validated replacement
- [ ] SoT documents future thin Supabase; rejected localStorage-full-blob and relational warehouse
- [ ] No migrations; no metric formula changes; no new dependencies; no IndexedDB
- [ ] Lifecycle tests + lint/typecheck/build/test pass

### Files expected to change

- `docs/agent/sprints/5vb.md`
- `docs/DATASET_LIFECYCLE.md`
- `lib/data-source/dataset-types.ts` / selection types
- `lib/data-source/active-source-control.ts` (new)
- `lib/data-source/dataset-lifecycle.ts` (new)
- `lib/data-source/browser-session.ts` (+ margin/spend clear cascades as needed)
- `lib/data-source/client-selected-source.ts`
- `lib/data-source/use-command-centre-dataset-selection.ts` (or under components)
- `components/mvp/MetricSourceBanner.tsx` + light `/data` / KPI consumption
- Lifecycle tests; `package.json` / `tsconfig.test.json`
- Architecture / demo script only if accuracy requires

### Stop conditions

- Scope expands to IndexedDB / Supabase migrations / full-dataset localStorage / metric changes
- PR would target `main`
- Independent reviewer unavailable after one retry without founder-authorized manual review
- Validation/CI fails after two fix attempts

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Gate 1 plan approved after revision away from full localStorage dataset blob; cycle-2 APPROVE on session payload + thin control record. Founder locked precedence + lifecycle coordinator clarifications at execute time (frozen into this record).

(Process evidence / traceability only — not proof of independence.)

## Founder plan approval

- Recorded after: `Approve the Sprint 5V-B plan and execute it under the canonical Ops-01 workflow, with the following locked clarifications incorporated into the frozen Founder-approved plan before implementation.`
- Date/time: 2026-07-26 (implementation start after Gate 1)
- Base SHA: `b8933d96f18486bbb05a4cc247b3765535d7a3d3`

## Approved-plan identity

- Plan section hash: `2591cb1d3212e522237cdb4c23e1ebe186997ec826c64da385e9dffb49b9ef5f`
- Base branch: `restart-retentionos-mvp`
- Base SHA: `b8933d96f18486bbb05a4cc247b3765535d7a3d3`
- Branch: `agent/sprint-5vb-dataset-lifecycle`
- Plan match confirmation: Final plan and scope matches Founder Gate 1-approved plan including locked clarifications 1–2.

## Implementation summary

- Added durable control record (`active-source-control.ts`, key `retentionos:activeSourceControl:v1`) and central lifecycle coordinator (`dataset-lifecycle.ts`) for activate/replace/refresh/delete/use-demo with full overlay clears (margin + spend CSV + spend %).
- Status-aware resolve with locked precedence matrix (`resolveCommandCentreSelectionFromState`); shared hydrate hook `useCommandCentreDatasetSelection` (starts `pending`); KPI + `/data` lost_upload honesty (no silent demo metrics).
- Decision SoT `docs/DATASET_LIFECYCLE.md` (session payload now; thin Supabase envelope future; full localStorage blob / relational warehouse rejected).
- Targeted `dataset-lifecycle.test.ts` (12 precedence/control cases); lint/typecheck/build/test green.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Cycle 1 REQUEST_CHANGES on `/data` hero lost_upload fixed; cycle 2 APPROVE ([Re-review](b1c792c8-e9b5-4f59-a32d-0a8d774ed20f)).

(Process evidence / traceability only — not proof of independence.)

## Validation and PR/check evidence

### Local validation

- Commands run: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
- Result: pass (112 tests)

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/29
- Base: `restart-retentionos-mvp`
- Head SHA: `918317c137579ef20e657f4cd2cc6397171bdb50`

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
