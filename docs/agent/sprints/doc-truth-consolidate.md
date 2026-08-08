# Sprint DOC-TRUTH-CONSOLIDATE — Documentation archive consolidation

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Separate current governing Markdown documents from historical evidence by archiving 39 legacy files into `docs/archive/` without changing runtime behaviour, metric logic, product scope, or UI.

### Commercial reason

Reduce agent and Lovable misrouting risk by making the 14-document live surface explicit and moving Phase 0 / pre-restart audits out of the default discovery path.

### In scope

- Create `docs/archive/README.md`, `phase0-legacy/` (19 files), `pre-restart/` (20 files)
- Add historical/superseded banners where required
- Update nine live documents: `AGENTS.md`, `README.md`, `PRODUCT_RECONCILIATION_BACKLOG.md`, `RETENTIONOS_ARCHITECTURE.md`, `VISIBLE_PRODUCT_BIBLE.md`, `RETENTIONOS_SHOPIFY_CSV_CONTRACT.md`, `OPS_01.md`, `PR_WORKFLOW.md`, `.github/pull_request_template.md`
- MET-RDS-MATURITY backlog footnote (not sprint record edit)
- Lovable authority section in `VISIBLE_PRODUCT_BIBLE.md`
- Mechanical link-path updates in sprint records and archived banner links
- No stub files at old paths

### Out of scope

- Runtime / TypeScript / test / metric / UI changes
- `RETENTIONOS_DATA_REQUIREMENTS.md` unlock-table refresh
- `met-rds-maturity.md` sprint record edit
- `SHOPIFY_FIELD_CAPABILITY_CONTRACT.md` approval annotations
- `6b-dashboard.md` sprint record creation
- `LOVABLE_BOUNDARIES.md`

### Acceptance criteria

- [x] 79 tracked Markdown files (77 − 39 moved + 39 archived + 1 archive README + 1 sprint record)
- [x] 19 files in `docs/archive/phase0-legacy/`
- [x] 20 files in `docs/archive/pre-restart/`
- [x] 14 canonical live documents + 23 sprint records
- [x] No stub files at former paths
- [x] `npm run lint`, `typecheck`, `test`, `build` pass

### Files expected to change

- `docs/archive/**` (new index + 39 moved files with banners/link fixes)
- `AGENTS.md`, `README.md`, nine UPDATE_IN_PLACE canonical files listed above
- `docs/agent/sprints/doc-truth-consolidate.md`
- Mechanical path updates in `doc-agent-align.md`, `ops-01.md`, `6b-visible-product-bible.md`

### Stop conditions

- Any runtime file change required
- Archive candidate referenced by CI as authoritative (none found)

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `founder_gate_1`
- builder_context_used: true
- automation_sla_met: true
- notes: Gate 1 inventory and verification report approved 2026-08-08.

## Founder plan approval

- Recorded after: `Execute Sprint DOC-TRUTH-CONSOLIDATE under Ops-01.`
- Date/time: 2026-08-08
- Base SHA: `3d610b85acb16c85a167e8d7e33d80a77e550ff8`

## Approved-plan identity

- Plan section hash: founder-locked DOC-TRUTH-CONSOLIDATE manifest (verification report)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `3d610b85acb16c85a167e8d7e33d80a77e550ff8`

## Implementation summary

- Created `docs/archive/` with README index, moved 19 Phase 0 legacy audits and 20 pre-restart documents via `git mv`
- Updated live routing in `AGENTS.md`, `README.md`, architecture §9–§10, backlog MET-RDS footnote, Bible Lovable boundaries, Shopify CSV links, Ops-01 / PR workflow links, PR template
- Added historical banners to phase0 archive set and banner/link fixes for pre-restart archive set
- Did not refresh `RETENTIONOS_DATA_REQUIREMENTS.md` body; banner-only per founder lock

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `builder_self_check`
- builder_context_used: true
- automation_sla_met: true
- notes: Validation suite green; 79 tracked Markdown files; no runtime files in diff.

## Validation and PR/check evidence

### Local validation

- Commands run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; `git diff --check`
- Result: all passed (2026-08-08)

### PR

- URL: (not created — awaiting Gate 2)
- Base: `restart-retentionos-mvp`
- Head SHA: pending

### Checks

- `gh pr checks --watch`: not run
- CI validate: not run
- Vercel: not run

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
