# RetentionOS — Import trust framework (Sprint 5V-A)

Source-agnostic rules for CSV import honesty. Applies to currently supported orders and marketing-spend CSV paths without changing Shopify-specific semantics at ingest time.

Shopify API field semantics, revenue construction, privacy minimisation, and CSV/API divergence are defined in [`SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`](SHOPIFY_FIELD_CAPABILITY_CONTRACT.md) (Sprint 5W-A). That document does **not** change current CSV adapter behaviour.

Approved-analysis sequencing and honesty requirements for later shared filters / provenance: [`PRODUCT_RECONCILIATION_BACKLOG.md`](PRODUCT_RECONCILIATION_BACKLOG.md) (Sprint 5X-B).

## Severities

| Severity | Meaning | Save / activate |
|----------|---------|-----------------|
| **fatal** (`error`) | Source integrity unsafe | Block — empty model; cannot become active dataset |
| **limitation** | Structurally valid; analysis constrained | Allow |
| **notice** | Informational only | Allow |

## Dataset readiness

| State | Rule |
|-------|------|
| `blocked` | Any fatal source-integrity issue |
| `accepted_with_limitations` | Structurally valid with ≥1 limitation (missing inputs, metric-specific insufficiency, or known engine treatment) |
| `ready` | Structurally valid with **no** source or metric limitations |

**Notices alone do not prevent `ready`.** There is **no** universal customer-count or order-count gate for dataset readiness. Metric sufficiency uses existing verified metric logic (e.g. product-quality `MIN_CUSTOMERS_FOR_SIGNAL`).

## Field semantics (canonical)

| Field | Unit | Notes |
|-------|------|-------|
| `contribution_margin` | Optional order-level **dollars** | Negative values are valid loss-making data → **limitation** (engine floors to 0 via `orderContribution`) |
| `contributionMarginPct` | Assumption rate in **[0, 1]** | Separate from CSV dollars; existing session validation |
| `gross_revenue`, `discounts`, `refunds` | Order-level money; D/R positive dollars-off | Negative signed inputs → fatal. Calculated net &lt; 0 → **limitation** (engine floors via `netOrderRevenue`) |

## Fail-closed

- Orders: any fatal error empties customers/orders/products.
- Marketing spend: any row validation error empties spend rows (no silent partial keep).

## Estimated outputs

Only from existing user-authorised session margin or marketing-spend assumptions — labelled **Estimated** on review.

## Shopify semantics (resolved for planning in 5W-A)

Topics formerly deferred here (Id vs Name, Financial Status, cancellations/payment, multi-currency/FX, refund basis, CSV/API field parity, blank discount/refund coercion) are specified for the **future API path** in [`SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`](SHOPIFY_FIELD_CAPABILITY_CONTRACT.md).

**Still out of scope for this trust framework file:** changing CSV runtime behaviour, implementing Shopify OAuth/sync, or altering metric formulas.
