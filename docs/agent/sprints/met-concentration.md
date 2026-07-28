# Sprint MET-CONCENTRATION — Selected-period revenue concentration

## Status

`IMPLEMENTING`

## Final plan and scope

### Objective

Implement deterministic selected-period revenue concentration:

`calculateRevenueConcentration(selection: AnalysisSelection): RevenueConcentrationResult`

with proportional allocated product revenue, conditional vendor concentration, and category always unavailable.

### Commercial reason

Brands need to know how dependent selected-period trusted net revenue is on leading products (and vendors when metadata supports it) — PRODUCT_RECONCILIATION_BACKLOG §6.10.

### In scope

- Pure `allocateTrustedNetByProduct` + `calculateRevenueConcentration`
- MetricId `revenue_concentration` (contracted 21→22); empty VM/route wiring
- Focused unit tests + Jan 2025 golden expectation (no golden-dataset change)
- Sprint record

### Out of scope

- UI / VM / routes / React
- analysis-context, types, import, Shopify adapter edits
- HHI / Gini / scores / signals / RDS
- MET-FIRST-PRODUCT-RULE; sibling metric formula edits
- golden-dataset.ts extension

### Founder-locked Gate 1 clarifications

1. Trusted order net; product revenue is proportionally allocated (not exact line net)
2. Malformed (negative/non-finite) lineTotal → entire positive-net order unattributed
3. Duplicate Product.id → RangeError; deterministic lex-min labels
4. Variant fallback (productId === variantId, no Product) → unattributed
5. Vendor from current Product.vendor + historical-restatement caveat
6. Category always unavailable
7. Composite MetricId `revenue_concentration`

### Acceptance criteria

- [x] Formula matches locked commercial definitions
- [x] Allocation honesty + malformed-line fail-closed
- [x] Product/vendor/category breakdowns + coverage semantics
- [x] Acquisition ignored; reportingPeriod required
- [x] Contracted MetricId with empty VM/route linkage
- [x] Golden Jan 2025 locked (prod_a 360 / prod_b 50 of 410)
- [ ] Validation + PR + Gate 2 packet

### Files expected to change

- `lib/metrics/allocate-trusted-net-by-product.ts`
- `lib/metrics/revenue-concentration.ts`
- `lib/metrics/revenue-concentration.test.ts`
- `lib/metrics/index.ts`
- `lib/metrics/metric-definitions.ts`
- `lib/metrics/metric-contract-index.ts`
- `lib/metrics/metric-contract-index.test.ts`
- `docs/METRIC_CONTRACTS.md`
- `lib/metrics/golden/GOLDEN_EXPECTED_RESULTS.md`
- `lib/metrics/golden/golden-expected.ts`
- `lib/metrics/golden-reconciliation.test.ts`
- `package.json`
- `tsconfig.test.json`
- `docs/agent/sprints/met-concentration.md`

### Stop conditions

- UI/VM/page wiring
- analysis-context, types, import, adapter, golden-dataset edits
- sibling metric formula edits outside allowlist

## Plan-review verdict

- verdict: `REQUEST_CHANGES`, corrections incorporated in revised packet
- reviewer_mode: `new_chat`
- builder_context_used: false
- automation_sla_met: false
- notes: Founder-authorised manual review after automated fresh-task API failures; five material findings resolved before Gate 1 APPROVE.

## Founder plan approval

- Recorded after: `Approve Sprint MET-CONCENTRATION for execution under the revised Gate 1 plan.` / Gate 1 verdict `APPROVE`
- Date/time: 2026-07-28
- Base SHA: `f8616169ce80f084090506a08eaa07926fcaab43`

## Approved-plan identity

- Plan section hash: Revised Gate 1 plan + founder locks (allocation honesty; malformed lines; deterministic metadata; variant-fallback; vendor caveat)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `f8616169ce80f084090506a08eaa07926fcaab43`

## Implementation summary

- Added `allocateTrustedNetByProduct` (proportional lineTotal weights; malformed-line fail-closed)
- Added `calculateRevenueConcentration` with product/vendor/category breakdowns
- Registered MetricId `revenue_concentration` (contracted 22); empty VM/routes
- Unit matrix + Jan 2025 golden hand expectation (prod_a 360 / prod_b 50 of 410)
- Category always unavailable; vendor conditional on current Product.vendor

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: First Task attempt failed (API limit); retry APPROVE with no material findings. All seven Gate 1 locks verified.

## Validation and PR/check evidence

### Local validation

- Commands run: focused concentration/contract/golden tests; `npm test` (380 pass); `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`
- Result: pass

### PR

- URL:
- Base: `restart-retentionos-mvp`
- Head SHA:

### Checks

- `gh pr checks --watch`:
- CI validate:
- Vercel:

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
