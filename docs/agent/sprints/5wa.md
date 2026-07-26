# Sprint 5W-A — Shopify field and capability contract

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Determine, with official Shopify GraphQL Admin API `2026-07` documentation and repository evidence, which Shopify data RetentionOS can access, how it maps into `RetentionOSDataset`, which founder-approved analyses and filters it can support honestly, and which capabilities require merchant assumptions or later integrations. Produce the source-of-truth contract for 5W-B fixture adapter work and 6D production Shopify connection.

### Commercial reason

Without an evidence-backed Shopify field/capability contract, fixture adapters and production connect risk incorrect revenue, identity, privacy over-collection, or dishonest filter/analysis claims.

### In scope

- Official Shopify developer documentation research (GraphQL Admin API `2026-07`)
- Repository inspection with citations (`lib/types`, `lib/data-source`, `lib/import`, `lib/metrics`, `lib/demo`, Shopify scaffolding, Supabase migrations, trust/lifecycle/metric docs)
- Deliverables: field contract; analysis and filter feasibility matrices; schema delta **proposals**; revenue/identity/catalogue rules; minimum-data/privacy contract; historical access and bulk-ops constraints; 5W-B fixture acceptance contract with worked reconciliation cases; roadmap implications; founder decisions/risks
- Thin cross-links in `IMPORT_TRUST.md` and CSV contract status (CSV remains authoritative for CSV path)
- Ops-01 sprint record

### Out of scope

- Implement Shopify OAuth, API sync, webhooks, adapters, routes, filters, metrics, or UI
- Modify runtime/application/Supabase source
- Migrations; new dependencies
- Begin 5W-B implementation
- Mark entire CSV contract superseded
- Change CSV adapter behaviour via documentation
- Design production worker/queue/webhook implementation
- Map entire Shopify schema

### Locked clarifications (founder Gate 1)

1. API target = GraphQL Admin `2026-07`; REST `2023-10` quarantine only; revalidate at 6D
2. 5X-A was chat-only zero-mutation; missing repo record expected — recorded once
3. CSV contract remains authoritative for CSV; new SoT for API; document divergences
4. Dedicated minimum-data/privacy contract required
5. One deterministic revenue construction + worked reconciliation cases
6. GID identity; display name separate; source-prefixed ids; CSV fallback hierarchy documented without code change
7. `unitCost` researched; not historical COGS; no profitability unlock
8. `read_all_orders` critical viability dependency
9. Bulk operations assessed; no worker design
10. Field scope limited to analyses/filters/revenue/identity/provenance/sync needs
11. Final-diff review must verify citations, lane separation, non-production scaffolding, proposal-only deltas, docs-only diff

### Acceptance criteria

- [x] `docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md` contains all required sections including privacy and revenue rules
- [x] Official Shopify citations for contractual API claims
- [x] CSV vs API lanes not conflated; CSV not wholly superseded
- [x] Schema deltas proposals only
- [x] Docs-only change set (no `lib/`, `app/`, `supabase/`, package changes)
- [x] Independent final-diff review APPROVE
- [x] PR targets `restart-retentionos-mvp`

### Files expected to change

- `docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md` (new)
- `docs/IMPORT_TRUST.md` (cross-link)
- `docs/RETENTIONOS_SHOPIFY_CSV_CONTRACT.md` (status/cross-link)
- `docs/agent/sprints/5wa.md` (this record)

### Stop conditions

- Any runtime/application/Supabase change
- Missing official citations for contractual Shopify claims
- Scope expansion into 5W-B implementation

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Gate 1 plan approved by founder with locked clarifications; independent plan review completed in planning chat prior to execution approval.

## Founder plan approval

- Recorded after: `Approve the Gate 1 plan and execute Sprint 5W-A — Shopify field and capability contract.` (with locked clarifications 1–11)
- Date/time: 2026-07-26
- Base SHA: `9e74a7d326a471908b7976fc38b534786cfb3502`

## Approved-plan identity

- Plan section hash: founder-approved Gate 1 plan + locked clarifications 1–11 (Sprint 5W-A)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `9e74a7d326a471908b7976fc38b534786cfb3502`

## Implementation summary

Documentation-only research sprint. Authored `docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md` as API SoT (GraphQL Admin `2026-07`).

**Gate 2 revision (founder reject of head `74e7ece`):** documentation-only locks applied — edited orders fail closed + `Order.edited` provenance (pre-6D edit-aware revenue); guest orders not synthetic customers (Unidentified bucket + identity coverage); tax-inclusive blocked (pre-6D normalisation); financial-status include/provisional/exclude buckets; R7–R12 + F16–F19; feasibility/filter/schema/roadmap/founder tables updated. CSV cross-links unchanged in authority.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Fresh Task after Gate 2 reject revision. Cleared residual §6.4 guest-id and tax-strip contradictions. Founder locks 1–6 verified; docs-only (`SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`, `5wa.md`).

## Validation and PR/check evidence

### Local validation

- Commands run: `git diff --stat` / `git diff --name-only` (docs-only scope check)
- Result: pass — only `docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`, `docs/agent/sprints/5wa.md`

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/30
- Base: `restart-retentionos-mvp`
- Head SHA: `f68458addcd8109c94c0f04c4e28bc0561e42ef6` (revision; freeze commit follows)

### Checks

- `gh pr checks --watch`: pass (on revision head)
- CI validate: pass
- Vercel: pass

## Notes

Founder rejected merge at `74e7ece` pending substantive contract locks above. Gate 2 approval and DONE are **not** written here after PR freeze.
