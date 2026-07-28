# Sprint MET-FIRST-PRODUCT-RULE — Canonical first-product attribution

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Implement deterministic three-state first-product attribution:

`deriveFirstProductAttribution(customer, orders, options?: { asOfDate? }) → single_product | multi_product | unknown`

and rewire product-quality to consume the full union (no new MetricId; contracted count remains 22).

### Commercial reason

Trustworthy first-product customer quality requires proving a single canonical entry product — not inventing one from `lineItems[0]` on multi-product or unresolved baskets.

### In scope

- `lib/metrics/first-product-attribution.ts` + focused tests
- Rewire `product-quality.ts` (rows = single_product only; residual counts)
- Remove `deriveFirstProductIdForCustomer`
- Contract / definition / index updates
- Honesty-copy only (caveat + panel)
- F06 parity expectation → multi_product
- Sprint record
- Necessary validation fix: `import-review-view-model.test.ts` chronology fixture (firstOrderAt aligned to earliest order)

### Out of scope

- Import/adapter/golden-dataset/types/analysis-context edits
- Concentration / AOV / new-returning / repeat-purchase formula edits
- UI restructuring, new KPIs, charts, routes, signals, RDS
- New MetricId / coverage ratio / shared chronology extraction

### Acceptance criteria

- [x] Three-state helper with MET-NEW-RETURN chronology parity (no edit to new-returning)
- [x] No value-based materiality; every unresolved line → unknown
- [x] Variant-fallback fail-closed (equal-id, encoded, `shopify:variant:`)
- [x] product-quality consumes full union; `unassigned = multi + unknown`
- [x] Old first-line API removed
- [x] F06 multi_product; Cream denorm drift documented
- [x] Golden product-quality numbers unchanged
- [x] Contracted MetricId count 22
- [x] Validation + independent impl review + PR

### Files expected to change

Create:

- `lib/metrics/first-product-attribution.ts`
- `lib/metrics/first-product-attribution.test.ts`
- `docs/agent/sprints/met-first-product-rule.md`

Modify:

- `lib/metrics/product-quality.ts`
- `lib/metrics/product-quality.test.ts`
- `lib/metrics/product-quality-view-model.ts`
- `components/products/FirstProductQualityPanel.tsx`
- `lib/metrics/index.ts`
- `lib/metrics/metric-definitions.ts`
- `lib/metrics/metric-contract-index.ts`
- `docs/METRIC_CONTRACTS.md`
- `lib/import/shopify/graphql/shopify-graphql-metric-parity.test.ts`
- `package.json`
- `tsconfig.test.json`
- `lib/import/import-review-view-model.test.ts` (necessary chronology fixture realignment)

### Stop conditions

- Silent allowlist expansion beyond documented necessary test fixture
- Import/adapter/golden-dataset production edits
- Sibling metric formula edits
- New visible residual KPIs / UI structure

## Plan-review verdict

- verdict: `APPROVE` (revised packet cycle 2; cycle 1 REQUEST_CHANGES)
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Founder Gate 1 APPROVE after REVISE BEFORE APPROVAL corrections (no value-materiality; no products[] on helper; full-union product-quality; remove old API).

## Founder plan approval

- Recorded after: `Approve Sprint MET-FIRST-PRODUCT-RULE for execution under the revised Gate 1 plan.` / Gate 1 verdict `APPROVE`
- Date/time: 2026-07-28
- Base SHA: `d2f73137536d7d626df8e8b4c6277a0704eec33f`

## Approved-plan identity

- Plan section hash: Revised Gate 1 plan (no value-materiality; helper without products[]; three-state PQ residuals; remove deriveFirstProductIdForCustomer; F06 multi_product)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `d2f73137536d7d626df8e8b4c6277a0704eec33f`

## Implementation summary

- Added `deriveFirstProductAttribution` with MET-NEW-RETURN chronology parity, fail-closed variant fallback, and no value-based materiality.
- Rewired `calculateFirstProductCustomerQuality` to consume the full three-state union; product rows are `single_product` only; `unassignedCustomerCount = multiProductCustomerCount + unknownFirstProductCustomerCount`.
- Removed `deriveFirstProductIdForCustomer`.
- Updated contracts, definitions, index entrypoints, honesty copy, F06 parity expectation, and test registration.
- Realigned import-review readiness fixture chronology so `firstOrderAt` matches earliest orders under the new rule.

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: No material findings. import-review-view-model.test.ts chronology fixture accepted as necessary expansion.

## Validation and PR/check evidence

### Local validation

- Commands run: targeted tsc + focused node tests; `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`
- Result: all pass (429/429 tests)

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/40
- Base: `restart-retentionos-mvp`
- Head SHA: `950c9f09e4686f516a5e3b541e6dc401b4d55f00`

### Checks

- `gh pr checks --watch`: pass
- CI validate: pass (3m10s)
- Vercel: pass

## Notes

- Imported `Customer.firstProductId` remains denormalised interim drift (adapter comment may still mention first-line parity).
- Product-quality observation is all-time (helper called without asOfDate).
