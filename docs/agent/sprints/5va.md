# Sprint 5V-A ? Import trust hardening

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Establish a source-agnostic import trust framework and apply it minimally to currently supported CSV paths so unsafe data cannot become the active dataset, while valid incomplete / loss-making / over-refunded data remains usable with honest limitation communication.

### Commercial reason

Merchants must trust that RetentionOS either refuses bad imports with actionable fixes or shows only analysis the data can honestly support ? without silent row loss, silent estimation, or rejecting genuine loss-making economics.

### In scope

- Source-agnostic fatal / limitation / notice classification
- Readiness: blocked / accepted_with_limitations / ready (no universal sample-size gate)
- Prevent fatal order data from becoming the active session dataset
- No silent row loss for orders or marketing-spend (spend fail-closed)
- Canonical integrity: line_total ? qty?price beyond epsilon ? fatal
- Negative absolute contribution_margin ? limitation (accept; explain engine floor; contribution metrics limited/unavailable via existing completeness; no engine rewrite)
- Calculated net < 0 ? limitation (accept; no formula rewrite)
- Metric sufficiency from existing verified metric logic (e.g. product-quality MIN_CUSTOMERS_FOR_SIGNAL)
- Estimated only via existing user-authorised session margin/spend assumptions
- Actionable review messages; light panel wiring; targeted tests; compact trust SoT
- Branch agent/sprint-5va-import-trust-hardening from restart-retentionos-mvp @ dc295632aa570069b27689c00136c174db848a99
- Sprint record docs/agent/sprints/5va.md

### Locked defaults

1. Trust severity + readiness model; remove global 5-customer / 10-order ready rule.
2. Orders fail-closed; fatal blocks save / active dataset.
3. Marketing spend fail-closed on any spend-row validation error.
4. LINE_TOTAL_VS_QTY_PRICE beyond epsilon ? fatal.
5. Negative absolute contribution_margin ? limitation (accept). Explain engine floors negative order contribution to 0, which can overstate contribution LTV / LTV:CAC / payback. Readiness = accepted_with_limitations. Contribution metrics limited/unavailable per existing completeness model. No engine rewrite.
6. Malformed / non-finite contribution_margin ? fatal.
7. contributionMarginPct assumptions keep existing [0,1] (and multiplier) validation ? unchanged.
8. Calculated net < 0 (gross < discounts + refunds) ? limitation (accept; engine floor explained; no formula rewrite; 5W-A for hard refund-basis validation).
9. Keep fatal: negative signed G/D/R/qty/price/line inputs; malformed money/dates; missing required fields; order conflicts; unsupported schema.
10. Incomplete-but-valid (no spend / no margin / metric-specific sample insufficiency) ? limitation.
11. Estimated only via existing session margin/spend assumptions.
12. No Shopify Id/Name, Currency, Financial Status, blank-to-zero coercion, or refund-basis semantic changes; no broad UI redesign; preserve 5U-B / 5U-C.
13. Notices alone do not prevent ready; metric-preview directional <5/<10 warnings must not become a universal readiness gate.

### Out of scope

- 5W-A Shopify discovery (Id vs Name, Financial Status, cancellations/payment, multi-currency/FX, refund basis, CSV/API field parity, blank-to-zero coercion)
- Metric-engine rewrite; persistence; Shopify OAuth/API; new formats; broad UI redesign; migrations; new dependencies; later roadmap sprints

### Acceptance criteria

- [ ] fatal / limitation / notice drive blocked / accepted_with_limitations / ready
- [ ] No global ?5 customers / ?10 orders rule for dataset ready
- [ ] Notices alone do not prevent ready
- [ ] Fatal order imports cannot become the active uploaded dataset
- [ ] No silent row loss on orders or marketing-spend
- [ ] Negative absolute CM: saveable; limitation (not notice); not ready; explains engine flooring; contribution metrics limited/unavailable via existing completeness model; no engine rewrite
- [ ] Malformed CM fatal; contributionMarginPct range unchanged
- [ ] Calculated net < 0: saveable + limitation; engine flooring preserved
- [ ] Metric-specific sufficiency uses verified existing logic (e.g. product-quality MIN_CUSTOMERS_FOR_SIGNAL)
- [ ] Incomplete datasets usable with available / limited / estimated / unavailable communication
- [ ] Estimated only for authorised session assumptions
- [ ] Targeted tests cover unsafe-fail, incomplete-usable, negative-CM limitation (not ready), negative-net limitation
- [ ] No Shopify semantic changes; 5U-B/5U-C green; lint/typecheck/build/test pass; PR ? restart-retentionos-mvp

### Files expected to change

- lib/import/import-types.ts and/or small trust/readiness helper under lib/import/
- lib/import/normalise-orders.ts
- lib/import/normalise-marketing-spend.ts
- lib/import/import-review-view-model.ts
- components/data/ImportedDatasetReviewPanel.tsx
- components/data/MarketingSpendCsvPreview.tsx (fail-closed UX if needed)
- Import trust tests; package.json / tsconfig.test.json if new entry
- Compact trust SoT under docs/
- docs/agent/sprints/5va.md

### Stop conditions

- Scope expands beyond locked defaults (especially Shopify semantics or engine rewrite)
- PR would target main
- Universal sample-size readiness gate reintroduced
- Independent reviewer unavailable after one retry without founder-authorized manual review
- Validation/CI fails after two fix attempts

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Final Gate 1 cycle APPROVE after locking negative CM as limitation (not notice) and removing global 5/10 ready gate. Prior cycles incorporated source-agnostic scope reduction and CM/net severity corrections.

(Process evidence / traceability only ? not proof of independence.)

## Founder plan approval

- Recorded after: `Approve the Sprint 5V-A plan and execute it under the canonical Ops-01 workflow.`
- Date/time: 2026-07-26 (implementation start after Gate 1)
- Base SHA: `dc295632aa570069b27689c00136c174db848a99`

## Approved-plan identity

- Plan section hash: `78aaeec73c9c6e7d6b0c663e1ea026f6ceb79179c2fb3ab92a821caf9a1e8c10`
- Base branch: `restart-retentionos-mvp`
- Base SHA: `dc295632aa570069b27689c00136c174db848a99`
- Plan match confirmation: Final plan and scope matches Founder Gate 1-approved plan (final narrow corrections locked).

## Implementation summary

- Added source-agnostic trust helpers (`lib/import/import-trust.ts`) and extended issue severity with `limitation` / `notice`.
- Orders normaliser: `LINE_TOTAL_VS_QTY_PRICE` fatal; negative absolute `contribution_margin` and calculated net < 0 emit limitations (dataset still materialises); malformed CM remains fatal.
- Marketing spend import fail-closed on any row error (no silent partial keep); spend preview copy/save gate updated.
- Import review VM: readiness `blocked` / `accepted_with_limitations` / `ready` without global 5/10 sample gate; metric limitations from existing completeness; negative-CM contribution detail explains engine flooring; Estimated labels for session assumptions.
- Light `/data` panel wiring for limitations vs notices; compact SoT `docs/IMPORT_TRUST.md`; targeted `import-trust.test.ts`.
- No Shopify semantic changes; no metric-engine formula rewrite.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Locked decisions respected; residual risks only (Estimated badge remains Partial; parseMarketingSpendCsvText still holds per-row validatedRows internally before fail-closed import).

(Process evidence / traceability only ? not proof of independence.)

## Validation and PR/check evidence

### Local validation

- Commands run: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
- Result: pass (100 tests)

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/28
- Base: `restart-retentionos-mvp`
- Head SHA: `0d5f1e3b96339832be6c18e7b5d8ae63224e3abc`

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
