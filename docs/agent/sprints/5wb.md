# Sprint 5W-B — Shopify GraphQL fixture adapter and parity

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Build the smallest deterministic Shopify GraphQL fixture adapter that proves the locked 5W-A Shopify contract can produce canonical entities / `RetentionOSDataset` and feed the existing metric engine correctly.

Pipeline: Shopify API-shaped fixture → pure adapter → entities → (test meta wrap) `RetentionOSDataset` → existing `lib/metrics` → reconciliation and parity tests.

### Commercial reason

Without a fixture adapter locked to the 5W-A contract, production Shopify connect (6D) cannot prove revenue, identity, eligibility, or metric honesty before network integration.

### In scope

- Pure TypeScript GraphQL fixture adapter under `lib/import/shopify/graphql/`
- F01–F19 fixtures; R1–R12 reconciliation; metric parity via existing engines
- `Order.customerId: CustomerId | null` + shared `isIdentifiedOrder`
- Product `vendor` / `isDeletedOrMissing`
- Adapter-local `ShopifyGraphqlImportIssue` + completeness provenance
- Sprint record

### Out of scope

- OAuth, production API, bulk ops, webhooks, Supabase, tokens, PCD workflow
- UI, filters, new 5X-A metrics
- Tax-inclusive normalisation, edited-order support, product profitability
- CSV semantic changes, browser-session / lifecycle / sourceType enum changes
- Legacy deletion

### Locked clarifications (founder Gate 1)

1. `customerId: CustomerId | null` (not optional); shared `isIdentifiedOrder`; portfolio nets include null
2. Any `taxesIncluded == true` → whole-fixture `blocked` / entities null
3. No `browser-session.ts` changes
4. Adapter does not hardcode demo provenance; test-only meta wrap / caller-supplied meta
5. Adapter-local `ShopifyGraphqlImportIssue` (not public `CsvImportIssue`)
6. Preserve CSV/canonical first-product rule: chronological first order (`orderedAt` ASC, `id` ASC), `firstProductId = lineItems[0].productId`
7. Completeness exposes trusted / identifiable / unidentified counts + nets, coverage by order and revenue, provisional / excluded / edited / tax-blocked, currency state
8. Updated file allowlist (no browser-session, no lifecycle/sourceType expansion)

### Acceptance criteria

- [x] F01–F19 covered
- [x] R1–R12 asserted (F14/R9 whole-fixture tax block)
- [x] Metric parity via existing engines
- [x] lint / typecheck / test / build / `git diff --check`
- [x] Independent final-diff review APPROVE
- [x] PR targets `restart-retentionos-mvp`

### Files expected to change

- `docs/agent/sprints/5wb.md`
- `lib/import/shopify/graphql/**`
- `lib/types/order.ts`, `lib/types/product.ts`, `lib/types/index.ts`
- Metric files requiring `isIdentifiedOrder`
- `lib/import/shopify/index.ts`, `package.json`
- Narrow type fixes in `normalise-orders.ts` / `demo-dataset.ts` for `CustomerId | null` (no CSV semantic change)

### Stop conditions

- Browser-session / lifecycle / CSV semantic / OAuth scope expansion
- Inventing a new first-product rule
- Silently omitting tax-inclusive orders while computing remaining trusted data

### First-product rule (preserved)

Documented from `lib/import/normalise-orders.ts` + `deriveFirstProductIdForCustomer`:

1. Sort customer orders by `orderedAt` ASC, then order `id` ASC
2. `firstProductId = firstOrder.lineItems[0].productId`

CSV builds `lineItems` in spreadsheet row order; GraphQL fixtures preserve edge order as `lineItems` array order. Recorded as potential 5X-B product-definition gap if commercially weak (not changed here).

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Gate 1 plan approved with locked clarifications 1–8.

## Founder plan approval

- Recorded after: `Approve the Sprint 5W-B Gate 1 plan and execute it with these locked clarifications.`
- Date/time: 2026-07-26
- Base SHA: `14716683a15c168b702c718458a57c8f5fe3e18a`

## Approved-plan identity

- Plan section hash: founder-approved Gate 1 plan + locked clarifications 1–8 (Sprint 5W-B)
- Base branch: `restart-retentionos-mvp`
- Base SHA: `14716683a15c168b702c718458a57c8f5fe3e18a`

## Implementation summary

- Added pure GraphQL fixture adapter `adaptShopifyGraphqlOrdersFixture` under `lib/import/shopify/graphql/`
- Trusted-eligible §3.1 revenue construction; dispositions + `ShopifyGraphqlCompleteness`
- Whole-fixture block for `taxesIncluded` and mixed/unknown shop currency; edited orders fail closed per-order
- `Order.customerId: CustomerId | null` + shared `isIdentifiedOrder` wired through customer-linked metrics
- F01–F19 fixtures; R1–R12 reconciliation tests; metric parity tests
- Test-only `buildFixtureRetentionOSDataset` with caller-supplied meta (adapter does not invent provenance)
- No browser-session, lifecycle, CSV semantic, OAuth, or sourceType enum changes

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `fresh_task`
- builder_context_used: false
- automation_sla_met: true
- notes: Locked clarifications verified; residual risks = browser-session still string-checks customerId (intentional quarantine); F03/F12 covered via pack/alias rather than dedicated named its.

## Validation and PR/check evidence

### Local validation

- Commands run: targeted GraphQL tests; `npm run lint`; `npm run typecheck`; `npm test` (151 pass); `npm run build`; `git diff --check`
- Result: pass

### PR

- URL: https://github.com/aidanwoodward/retention-os/pull/31
- Base: `restart-retentionos-mvp`
- Head SHA: ``de3e4396c5d8ba7ce40ad55452569c3ce9454674` (`de3e439`)`

### Checks

- `gh pr checks --watch`: pass (CI validate + Vercel)
- CI validate: pass
- Vercel: pass

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
