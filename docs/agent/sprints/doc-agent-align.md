# Sprint DOC-AGENT-ALIGN — Documentation and agent routing alignment

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Align RetentionOS documentation and agent instructions with the current canonical product, architecture, metric-foundation, and execution state — without changing runtime behaviour.

### Commercial reason

Duplicated and stale documentation causes agents and operators to invent repo state, reopen closed metric work, or treat planned Shopify / RDS / channel-quality capabilities as live. One ownership model and honest historical labelling reduces implementation drift.

### In scope

- Rewrite `AGENTS.md` as sole agent-routing document
- Thin `.cursor/rules/retentionos.mdc` to Cursor enforcement + AGENTS pointer
- Update backlog §2.1 ownership, §3 first-product shipped status, §10 sequence + METRIC_FOUNDATION_CLOSED
- Thin architecture product-boundary / sequence pointers and current program state
- Correct golden M+3 completed-only narrative (docs only)
- Correct demo-script stale capability claims
- Historical banners on misleading docs
- This sprint record

### Out of scope

- Runtime, metrics TypeScript, tests, package.json, CI, migrations
- `docs/METRIC_CONTRACTS.md`
- Any prior sprint record (including `met-rds-maturity.md`)
- Nested AGENTS files
- 6A-SIGNAL / MATRIX / PROVENANCE / 6B
- Documentation portals, lint tooling, ADR systems

### Acceptance criteria

- [x] Exact 11-path allowlist only
- [x] AGENTS sole routing; Cursor asymmetric
- [x] Product boundary owned by backlog §2.1; sequence by §10
- [x] First-product three-state reflected; formulas not duplicated
- [x] Golden M+3 narrative: Dec included, Jan partial excluded, aggregate 0
- [x] Demo script does not deny CAC / LTV:CAC / payback / product quality
- [x] Historical banners only; bodies preserved
- [x] Validation suite green
- [x] Independent final-diff review
- [x] PR + Gate 2 packet

### Files expected to change

Create:

- `docs/agent/sprints/doc-agent-align.md`

Modify:

- `AGENTS.md`
- `.cursor/rules/retentionos.mdc`
- `docs/PRODUCT_RECONCILIATION_BACKLOG.md`
- `docs/RETENTIONOS_ARCHITECTURE.md`
- `lib/metrics/golden/GOLDEN_EXPECTED_RESULTS.md`
- `docs/RETENTIONOS_MVP_DEMO_SCRIPT.md`
- `docs/archive/pre-restart/roadmap-analysis.md`
- `docs/archive/pre-restart/RETENTIONOS_RESTART_AUDIT.md`
- `docs/archive/pre-restart/RETENTIONOS_UPLOADED_DATA_MVP_CHECKPOINT.md`
- `docs/archive/pre-restart/BUILD_LOG.md`

### Stop conditions

- Allowlist expansion without founder approval
- Frozen sprint record edits
- Runtime / test / METRIC_CONTRACTS edits
- Beginning later roadmap sprints

## Plan-review verdict

- verdict: `REQUEST_CHANGES`, corrections incorporated
- reviewer_mode: `new_chat`
- builder_context_used: false
- automation_sla_met: false
- notes: Automated fresh-task review failed (API limits); founder-authorised new-chat review findings resolved before Gate 1 APPROVE.

## Founder plan approval

- Recorded after: `Approve Sprint DOC-AGENT-ALIGN for execution under the revised Gate 1 plan.` / Founder Gate 1 verdict: `APPROVE`
- Date/time: 2026-07-29
- Base SHA: `a2b30f35ee5ce23f12c9d47c7289f7c7f8c837bb`

## Approved-plan identity

- Plan section hash: revised-gate1-doc-agent-align-exact-11-path-allowlist
- Base branch: `restart-retentionos-mvp`
- Base SHA: `a2b30f35ee5ce23f12c9d47c7289f7c7f8c837bb`

## Implementation summary

- Rewrote `AGENTS.md` as sole routing document (boundary pointer, source hierarchy, Ops-01, routing table, validation, prohibitions)
- Thinned `.cursor/rules/retentionos.mdc` to Cursor enforcement + AGENTS pointer (no parallel routing map)
- Backlog: §2.1 marked primary product-boundary SoT; §3 first-product three-state shipped; §10 current sequence + METRIC_FOUNDATION_CLOSED + shipped MET/6A rows + DOC-AGENT-ALIGN work item
- Architecture: links §2.1 / §10; replaced stale §10 follow-on with current program state
- Golden M+3 narrative corrected for completed-only eligibility at `2025-04-20T12:00:00.000Z`
- Demo script: CAC / LTV:CAC / payback / product quality on spine; six analytical + Insights + Data = eight-route spine distinction; deferred items remain honest
- Historical banners: roadmap-analysis, RESTART_AUDIT, checkpoint, BUILD_LOG
- No runtime, tests, METRIC_CONTRACTS, or prior sprint records touched

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `new_chat`
- builder_context_used: false
- automation_sla_met: false
- material findings: none
- notes: Founder-authorised new-chat final-diff review after Task API limits. Validation passed (lint, typecheck, build, 465/465 tests). Publication authorised. Next state: `AWAITING_FOUNDER_MERGE_APPROVAL`.

## Validation and PR/check evidence

### Local validation

- Commands run: `git diff --check`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`
- Result: all passed locally (`npm test`: 465 passed, 0 failed)
- Manual: contracted MetricId count 22; allowlist exactly 11 paths; AGENTS canonical links resolve; `METRIC_CONTRACTS.md` / `met-rds-maturity.md` / README unchanged

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/42
- Base: `restart-retentionos-mvp`
- Head SHA: `a99e19b7c4ebe04ecbdaf3238eb3f5b54f1dc51e` (implementation tip at CI/Vercel green; Gate 2 freeze evidence commit may follow)

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass (https://github.com/aidanwoodward/retention-os/actions/runs/30412954350/job/90453073062)
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
