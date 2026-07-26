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

Documentation-only research sprint. Authored `docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md` as API SoT (GraphQL Admin `2026-07`): field contract, deterministic revenue construction, identity/privacy/historical-access rules, feasibility matrices, schema delta proposals, 5W-B fixture acceptance with worked reconciliation cases, roadmap and founder escalations. Cross-linked `IMPORT_TRUST.md` and CSV contract without superseding CSV authority or changing runtime behaviour.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Fresh Task final-diff review. Docs-only under `docs/`. Spot-checked official Shopify citations (60-day/`read_all_orders`, guest customer null, shopMoney, unitCost + View product costs, PCD levels, compliance webhooks, bulk limits). CSV lane preserved; scaffolding and schema deltas non-production; locked clarifications present.

## Validation and PR/check evidence

### Local validation

- Commands run: `git diff --stat` / `git diff --name-only` (docs-only scope check)
- Result: pass — only `docs/IMPORT_TRUST.md`, `docs/RETENTIONOS_SHOPIFY_CSV_CONTRACT.md`, `docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`, `docs/agent/sprints/5wa.md`

### PR

- URL: pending
- Base: `restart-retentionos-mvp`
- Head SHA: pending

### Checks

- `gh pr checks --watch`: pending
- CI validate: pending
- Vercel: pending

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
