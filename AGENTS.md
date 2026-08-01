# RetentionOS Agent Instructions

RetentionOS is a customer-economics operating system for ecommerce brands. It helps operators judge whether growth is durable, profitable, and repeatable — not a CRM, attribution platform, generic BI suite, or marketing automation tool.

**Product boundary (canonical):** [docs/PRODUCT_RECONCILIATION_BACKLOG.md](docs/PRODUCT_RECONCILIATION_BACKLOG.md) §2.1.

## Source hierarchy

When documents disagree, prefer evidence in this order:

1. Current terminal / repository state
2. Current source files
3. Machine-readable metric registries (`lib/metrics/metric-definitions.ts`, `metric-contract-index.ts`)
4. Canonical current documentation (table below)
5. Explicit founder-approved roadmap (backlog §10)
6. Frozen historical sprint records
7. Assumptions (label them; do not invent repo state)

## Planning and Ops-01

- Plan before implementing. Do not expand scope without founder approval.
- Canonical sprint operating system: [docs/agent/OPS_01.md](docs/agent/OPS_01.md).
- Two founder gates are hard stops: no implementation before plan approval; no merge before merge approval.
- Work on scoped feature branches. Never work directly on `main`.
- Integration / PR target branch: **`restart-retentionos-mvp`**.
- One sprint record per sprint under `docs/agent/sprints/` (template: [docs/agent/SPRINT_RECORD.md](docs/agent/SPRINT_RECORD.md)).
- Do not invent Gate 2 / `DONE` by editing a frozen sprint record after PR freeze.

## Canonical document routing

| Subject | Canonical source |
|---------|------------------|
| Product boundary / MVP wedge | [docs/PRODUCT_RECONCILIATION_BACKLOG.md](docs/PRODUCT_RECONCILIATION_BACKLOG.md) §2.1 |
| Execution sequence / shipped vs deferred | [docs/PRODUCT_RECONCILIATION_BACKLOG.md](docs/PRODUCT_RECONCILIATION_BACKLOG.md) §10 |
| MVP page presentation / composition | [docs/VISIBLE_PRODUCT_BIBLE.md](docs/VISIBLE_PRODUCT_BIBLE.md) |
| Architecture / routes / canonical vs legacy | [docs/RETENTIONOS_ARCHITECTURE.md](docs/RETENTIONOS_ARCHITECTURE.md) |
| Metric formulas and semantics | [docs/METRIC_CONTRACTS.md](docs/METRIC_CONTRACTS.md) |
| Metric registries | `lib/metrics/metric-definitions.ts`, `lib/metrics/metric-contract-index.ts` |
| Shopify API semantics (future) | [docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md](docs/SHOPIFY_FIELD_CAPABILITY_CONTRACT.md) |
| Shopify CSV path (implemented) | [docs/RETENTIONOS_SHOPIFY_CSV_CONTRACT.md](docs/RETENTIONOS_SHOPIFY_CSV_CONTRACT.md) |
| Import honesty | [docs/IMPORT_TRUST.md](docs/IMPORT_TRUST.md) |
| Operating gates | [docs/agent/OPS_01.md](docs/agent/OPS_01.md) |
| Frozen sprint evidence | [docs/agent/sprints/](docs/agent/sprints/) |

Do not duplicate formulas, Shopify field semantics, or the full roadmap into this file. Follow the links.

## Validation

After meaningful code or docs-affecting changes, run what the sprint requires. Standard suite:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Do not claim completion unless validation passes or you clearly explain the blocker.

## Prohibitions

- Do not invent repository state, merge status, or metric counts.
- Do not duplicate metric formulas into agent instructions or UI.
- Do not present planned production Shopify connectivity as live; demo/CSV and fixture adapter parity are not production ingestion.
- Do not begin unauthorised later roadmap work (e.g. 6A-SIGNAL / MATRIX / PROVENANCE / 6B) without founder approval.
- Do not silently fall back to mock data on production-shaped paths.
- Do not add dependencies, migrations, or broad refactors unless explicitly approved.
