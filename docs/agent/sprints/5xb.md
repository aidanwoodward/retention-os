# Sprint 5X-B — Product reconciliation and implementation backlog

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Reconcile the founder-approved RetentionOS product definition (5X-A), repository crosswalk (5X-A), Shopify field/capability contract (5W-A), and proven GraphQL fixture adapter parity (5W-B) into a durable, prioritised implementation backlog for 6A / 6B / 6C and later pre-6D / 6D work.

### Commercial reason

Without a durable post-5W-B reconciliation source of truth, later sprints risk rebuilding the wrong analyses, reopening locked definitions, or treating chat-only 5X-A locks as lost.

### In scope

- Create `docs/PRODUCT_RECONCILIATION_BACKLOG.md` as durable execution SoT
- Create `docs/agent/sprints/5xb.md` (this record)
- Thin cross-links within approved docs allowlist
- §15 re-scope: prior reconciliation-harness obligation → `PRE6D-HARNESS` (must retain R1–R12 + CSV/API divergence)
- Persist locked multi-product first-order attribution target rule (no implementation)
- Full 11-analysis engine/UI crosswalk; 6A/6B/6C inventories; sequenced backlog

### Out of scope

- Runtime, metrics, filters, UI implementation
- Shopify production integration, persistence
- Legacy deletion
- Changing interim first-line `firstProductId` behaviour
- Removing `recommendedAction` fields

### Locked clarifications (founder Gate 1)

1. Durable docs SoT + sprint record + thin cross-links only
2. §15 harness → `PRE6D-HARNESS` with R1–R12 + CSV/API divergence retained
3. Multi-product target rule: single_product / multi_product / unknown — **reject** highest-NMV; preserve first-line until `MET-FIRST-PRODUCT-RULE`
4. Analysis 9 = interim first-line metric + targeted attribution change + presentation/provenance
5. Sequencing: 5X-B → 6A-NAV → 6A-ANALYSIS-CONTEXT → MET foundations → 6A-SIGNAL/MATRIX/PROVENANCE → 6B → 6C → PRE6D-HARNESS → 6D
6. Isolated MET work items: SHARE, REV-RETENTION, NEW-RETURN, AOV-FREQ, CONCENTRATION, FIRST-PRODUCT-RULE
7. Date contract: reporting period ≠ acquisition cohort period ≠ maturity horizon
8. Signal contract: severity, trigger, current/comparison, population, sufficiency, destination anchor, optional caveat; prescription optional
9. Do not remove legacy `recommendedAction` in 5X-B/6A; consolidate in 6C after replacement
10. Shopify REST/Supabase scaffolding: quarantine / investigate / delete only when proven / defer to 6D — not blanket deletion

### Acceptance criteria

- [x] SoT fully reconciles all 11 analyses
- [x] Locked multi-product decision recorded; highest-NMV rejected
- [x] Metric dependencies before UI dependencies
- [x] Reporting / cohort / maturity distinguished
- [x] Conditional filters capability-gated
- [x] Honest unavailable/coverage states preserved in backlog requirements
- [x] No runtime or legacy deletion in this sprint
- [x] Sequenced work items with acceptance criteria and required tests
- [x] Docs-only diff; independent final-diff APPROVE
- [x] PR targets `restart-retentionos-mvp`

### Files expected to change

- `docs/PRODUCT_RECONCILIATION_BACKLOG.md` (new)
- `docs/agent/sprints/5xb.md` (this record)
- `docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md` (thin §15 re-scope + 6C + pointer)
- `docs/METRIC_CONTRACTS.md` (pointer only)
- `docs/RETENTIONOS_ARCHITECTURE.md` (pointer only)
- `docs/IMPORT_TRUST.md` and/or `docs/RETENTIONOS_SHOPIFY_CSV_CONTRACT.md` (pointer only if needed)

### Stop conditions

- Any `lib/`, `app/`, `supabase/`, package change
- Implementing metrics/UI/Shopify production/deletion
- Changing first-line runtime behaviour

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Cycle 1 REQUEST_CHANGES then cycle 2 APPROVE prior to founder Gate 1; founder locks 1–10 applied at execution.

## Founder plan approval

- Recorded after: `Approve the Sprint 5X-B Gate 1 plan and execute it as a documentation-only sprint with the following founder locks.`
- Date/time: 2026-07-27
- Base SHA: `48a08948079bf404ae1fd15d93864ed4dedacd4c`

## Approved-plan identity

- Plan section hash: founder-approved Gate 1 plan + locks (multi-product single/multi/unknown; sequencing; date/filter/signal contracts; 6C Shopify quarantine policy)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `48a08948079bf404ae1fd15d93864ed4dedacd4c`

## Implementation summary

Documentation-only. Authored `docs/PRODUCT_RECONCILIATION_BACKLOG.md` as durable SoT; recorded 5X-A appendix; multi-product target rule; 11-analysis crosswalk; 6A/6B/6C inventories; sequenced backlog with isolated MET items; thin §15 re-scope to `PRE6D-HARNESS`; pointers from companion docs. No runtime changes.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Docs-only allowlist verified; founder locks 1–9 present in SoT; §15 re-scope and PRE6D-HARNESS correct; no runtime claims contradicted.

## Validation and PR/check evidence

### Local validation

- Commands run: `git diff --stat` / `git diff --name-only` (docs-only scope check)
- Result: pass — only allowlisted docs files

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/32
- Base: `restart-retentionos-mvp`
- Head SHA: `86997c88253177c70debaba8b43a777452462949` (`86997c8`)

### Checks

- `gh pr checks --watch`: pass (CI validate + Vercel)
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
