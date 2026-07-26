# RetentionOS — Shopify Orders CSV Ingestion Contract

**Sprint:** 4I-A (adapter implemented in later 4I work; this file remains the CSV-path contract)  
**Status:** **Authoritative for the currently implemented Shopify Orders CSV path.** Not superseded by Sprint 5W-A.  
**Audience:** Engineering and product partners implementing or maintaining the Shopify CSV → canonical pipeline.

**Related (API / future connect — separate lane):**

- [`SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`](SHOPIFY_FIELD_CAPABILITY_CONTRACT.md) — GraphQL Admin API `2026-07` field/capability SoT for 5W-B fixtures and 6D production. Documents CSV↔API divergences; does **not** change CSV runtime behaviour by documentation alone.

**Companions:**

- [`RETENTIONOS_DATA_REQUIREMENTS.md`](RETENTIONOS_DATA_REQUIREMENTS.md) — data layers, metric unlock, onboarding gate
- [`lib/import/csv-schema.ts`](../lib/import/csv-schema.ts) — RetentionOS canonical combined order + line-item contract
- [`sample-shopify-orders-export.csv`](sample-shopify-orders-export.csv) — small realistic Shopify Admin export fixture
- [`sample-retentionos-orders.csv`](sample-retentionos-orders.csv) — canonical target shape after adapter (reference)

---

## 1. Supported source

RetentionOS Sprint **4I** supports exactly one user-facing CSV source:

| Property | Value |
|----------|-------|
| **Source** | Shopify Admin → **Orders** → **Export** → **Orders** (not “Transaction histories”) |
| **Export type** | Native Shopify order CSV (default column set) |
| **File shape** | One row per **line item**; additional lines for the same checkout appear on subsequent rows |
| **Currency** | Single store base currency per file (see §8 unsupported cases) |

Third-party export apps (Matrixify, EZ Exporter, Better Reports, etc.) that **fill** order-level fields on every line are tolerated if they preserve the same column names and line-item row model, but the **reference fixture** models native Shopify blank continuation rows.

---

## 2. Supported row model

### One row per line item

Each spreadsheet row represents one **line item** (product/variant) on an order. Orders with multiple items produce multiple rows sharing the same order identity.

### Order-level forward-fill (continuation rows)

On native Shopify exports, the **first row** for an order carries order-level fields (`Name`, `Email`, `Created at`, `Discount Amount`, `Refunded Amount`, `Source`, etc.). **Continuation rows** for additional line items leave those order-level cells **blank**.

The future adapter **must**:

1. Detect order boundaries using `Name` or `Id` (whichever is present — see §4).
2. **Forward-fill** order-level fields from the first non-blank row of each order group onto every line row in that group before mapping to canonical fields.
3. Reject files where a continuation row appears without a preceding first row for the same order (adapter validation — future sprint).

This matches Shopify’s documented export behaviour: *“Many of the fields are left blank to indicate that multiple items were purchased on the same order.”* ([Shopify Help — Exporting orders](https://help.shopify.com/en/manual/orders/manage-orders/exporting-orders))

---

## 3. Required Shopify columns

These headers must be present (exact Shopify spelling; matching is case-insensitive in the adapter). All are **required for import** — missing any column blocks the adapter.

| Shopify column | Role |
|----------------|------|
| `Name` **or** `Id` | Order identity (at least one required; prefer `Name` when both present) |
| `Email` | Customer identity for browser-session import |
| `Created at` | Order timestamp (cohort anchor) |
| `Discount Amount` | Order-level discount dollars |
| `Refunded Amount` | Order-level refund dollars |
| `Lineitem quantity` | Line quantity |
| `Lineitem name` | Line product display name |
| `Lineitem price` | Line unit price |
| `Lineitem SKU` | Line SKU (may be blank on a row — see §6 product key) |

**Note:** `Refunded Amount` and `Discount Amount` may be `0` or blank when none apply; the adapter treats blank as `0` after forward-fill.

---

## 4. Optional Shopify columns

These may appear in exports and may be **ignored** by the v1 adapter unless noted.

| Shopify column | RetentionOS use (v1) |
|----------------|----------------------|
| `Source` | Maps to canonical optional `channel` (label only — not acquisition truth) |
| `Subtotal` | **Not used** for revenue (informational / reconciliation warning only) |
| `Total` | **Not used** for LTV (see §5) |
| `Shipping` | Ignored — no tax/shipping decomposition in v1 |
| `Taxes` | Ignored |
| `Financial Status` | Ignored at ingest (no paid/unpaid filter in v1) |
| `Currency` | Ignored — single-currency assumed |
| `Lineitem discount` | Ignored — order-level `Discount Amount` only |
| `Paid at`, `Fulfillment Status`, billing/shipping address columns, `Tags`, `Vendor`, etc. | Ignored |

If both `Name` and `Id` are present, **`Name`** is the primary human-facing order key; **`Id`** is stored as provenance metadata in a future sprint but does not replace `Name` for grouping in v1.

---

## 5. Mapping to RetentionOS canonical fields

Target contract: [`lib/import/csv-schema.ts`](../lib/import/csv-schema.ts) — combined order + line-item CSV consumed by [`normaliseCombinedOrderCsv()`](../lib/import/normalise-orders.ts).

After forward-fill, each logical line row maps as follows:

| RetentionOS canonical | Source (Shopify) | Transform |
|----------------------|------------------|-----------|
| `order_id` | `Name` or `Id` | Strip leading `#` from `Name`; use string as-is |
| `customer_id` | `Email` | Lowercase + trim (see §6) |
| `ordered_at` | `Created at` | Parse to ISO 8601 UTC |
| `gross_revenue` | Derived | **Sum** of `(Lineitem price × Lineitem quantity)` for all lines sharing the same order — **repeated on every line row** |
| `discounts` | `Discount Amount` | Order-level; positive dollars; blank → `0` |
| `refunds` | `Refunded Amount` | Order-level; positive dollars; blank → `0` |
| `channel` | `Source` | Optional; blank → omit |
| `product_id` | Derived | `Lineitem SKU` if non-blank after trim; else normalised `Lineitem name` (see §6) |
| `product_name` | `Lineitem name` | Trimmed display string |
| `sku` | `Lineitem SKU` | Optional; blank → omit |
| `quantity` | `Lineitem quantity` | Integer ≥ 0 |
| `unit_price` | `Lineitem price` | Unit price ≥ 0 |
| `line_total` | Derived | `Lineitem quantity × Lineitem price` |
| `contribution_margin` | — | **Not in Shopify export** — use margin assumptions on `/data` or leave unset |

The adapter output must satisfy the existing canonical normaliser: order-level fields **consistent** per `order_id`, one canonical row per Shopify line row.

---

## 6. Revenue definition

RetentionOS customer-economics metrics on the command-centre spine use **net merchandise revenue** derived from line items, not Shopify checkout totals.

### Formulas (per order, after forward-fill)

```
gross_revenue = Σ (Lineitem price × Lineitem quantity)   // all lines in the order
discounts     = Discount Amount                           // order-level, ≥ 0
refunds       = Refunded Amount                           // order-level, ≥ 0
net_revenue   = gross_revenue - discounts - refunds
```

- **`gross_revenue`** is **pre-discount, pre-refund** line merchandise sum. It excludes tax and shipping by construction.
- **`net_revenue`** is what the metric engine uses for revenue LTV, AOV, and cohort revenue cells (via existing order-level fields in the canonical model).
- Per-line **`line_total`** = `quantity × unit_price` (not net of line-level discounts).

### Explicit decision: do not use Shopify `Total` for LTV

Shopify **`Total`** includes tax, shipping, and other checkout adjustments. It is **not** mapped to `gross_revenue` or any LTV input.

**Rationale:**

- LTV and cohort revenue must stay comparable across merchants and align with the RetentionOS canonical contract (`gross_revenue` / discounts / refunds).
- Using `Total` would mix fulfilment and tax policy into customer-economics curves without explicit decomposition (out of scope for v1).

The adapter may emit a **warning** (future) when `|Subtotal - derived gross_revenue|` or `|Total - (derived net + tax + shipping)|` exceeds a tolerance, but must not silently switch definitions.

### Customer key

| Rule | Detail |
|------|--------|
| **v1 identity** | `Email` → canonical `customer_id` |
| **Normalisation** | Trim whitespace; lowercase for matching |
| **Scope** | Browser-session upload only — labelled as temporary identity |
| **Caveats** | Email changes, guest checkout without email, shared inboxes, and B2B contact ≠ buyer break cohort continuity |

Shopify **`Id`** (numeric order id) is **not** used as `customer_id`.

### Product key

| Priority | Source | Canonical field |
|----------|--------|-----------------|
| 1 | Non-blank `Lineitem SKU` | `product_id` (and optional `sku`) |
| 2 | Blank SKU | Normalised `Lineitem name` → `product_id` |

**Name normalisation (v1):** trim → lowercase → collapse internal whitespace to single spaces → replace non-alphanumeric runs with `_` (adapter implementation detail).

**Caveats:** Same product with and without SKU may split into two product ids; variant title changes rename the product key.

---

## 7. Discount and refund caveats

| Topic | Behaviour |
|-------|-----------|
| **Order vs line discounts** | Only **`Discount Amount`** (order-level) is used. **`Lineitem discount`** is ignored in v1 — line economics may not match Shopify admin sub-rows. |
| **Automatic discounts** | Included in `Discount Amount` when Shopify exports them at order level; if absent, discounts may be understated. |
| **Sign convention** | Shopify may export positive amounts; adapter coerces to **positive dollars-off** for canonical `discounts` / `refunds` (matches existing normaliser). |
| **Partial / line refunds** | Only **`Refunded Amount`** at order level — no line-level refund allocation in v1. |
| **Timing** | Refunds appear on the order row in export snapshot timing; cohort borders use **`Created at`**, not refund date — refunded orders stay in original acquisition cohort. |
| **Blank cells** | After forward-fill, blank `Discount Amount` / `Refunded Amount` → `0`. |

---

## 8. Unsupported cases (v1)

The adapter **must reject or refuse to claim support** for:

| Case | Reason |
|------|--------|
| **Order-only exports** (one row per order, no line items) | Cannot populate Layer 2 line fields or product quality |
| **Multi-file merge** | Single upload per session; no join across files |
| **Line-level refund allocation** | Contract uses order-level `Refunded Amount` only |
| **Product-level return-rate claims** | No reliable returns-at-SKU from this export |
| **Tax / shipping decomposition** | `Taxes`, `Shipping` ignored; no net-of-tax toggle |
| **Multi-currency** | One base currency per file; no FX normalisation |
| **Transaction history export** | Different schema — not the Orders export |
| **Shopify API sync** | Future sprint; same canonical target |

---

## 9. Metric unlock (after successful adapter + save)

Importing through this contract unlocks the same spine behaviour as a valid RetentionOS-formatted CSV (see [`RETENTIONOS_DATA_REQUIREMENTS.md`](RETENTIONOS_DATA_REQUIREMENTS.md) Layer 1–2):

| Unlocked (typical) | Locked without extra data |
|--------------------|---------------------------|
| Dashboard KPIs, cohorts, retention, **revenue LTV**, repeat metrics, insights (revenue lens) | Contribution LTV (no `contribution_margin` in Shopify export) |
| Line-item product quality when `product_id` coverage exists | CAC / payback (marketing spend not in this sprint) |
| Optional `Source` as channel **label** only | Channel economics, benchmarks, durability score |

Margin assumptions on `/data` remain the path to **partial** contribution LTV when Shopify export is used.

---

## 10. Validation expectations (future adapter)

Not implemented in 4I-A; specified here for the next sprint.

| Check | Severity |
|-------|----------|
| Missing required Shopify column | Error |
| Unparseable `Created at` | Error |
| Negative quantity or price | Error |
| Continuation row without prior order anchor | Error |
| Forward-filled order-level fields disagree within same `Name`/`Id` | Error |
| Derived `gross_revenue` ≠ sum of lines for order | Error |
| `Lineitem SKU` blank on some lines, present on others for same normalised name | Warning |
| `Email` blank on first row of order | Error |
| Shopify `Total` ≠ derived net + ignored tax/shipping | Warning (informational) |

Validated output feeds unchanged [`normaliseCombinedOrderCsv()`](../lib/import/normalise-orders.ts) → [`buildImportedRetentionOSDataset()`](../lib/data-source/imported-source.ts) → session storage → [`resolveCommandCentreDatasetSource()`](../lib/data-source/client-selected-source.ts).

---

## 11. Future path: Shopify API

Shopify Admin API sync (orders, line items, customers) is **explicitly deferred** but must converge on the **same canonical pipeline**:

```
Shopify API resources → same canonical Customer / Order / Product shapes → RetentionOSDataset
```

API sync can later supply stable **`customer_id`** (Shopify customer GID), **`product_id` / variant_id**, refund timelines, and incremental updates — without changing metric engine contracts. CSV upload remains the first commercial milestone.

---

## 12. Fixture reference

[`sample-shopify-orders-export.csv`](sample-shopify-orders-export.csv) contains:

- Four customers (`Email`)
- Eight orders (`Name` `#1001`–`#1008`)
- Multi-line orders `#1001`, `#1003`, `#1008` with **blank continuation rows**
- Non-zero `Discount Amount` and `Refunded Amount` where applicable
- `Source` labels aligned with the RetentionOS demo narrative
- Derived gross revenue matching [`sample-retentionos-orders.csv`](sample-retentionos-orders.csv) line math (adapter target parity)

---

## Document control

- **Honesty:** This contract does not imply Shopify exports provide contribution margin, true acquisition channel, or finance-grade net revenue without the definitions above.
- **Scope:** Documentation and fixture only in Sprint 4I-A — no changes to [`CsvImportPreview.tsx`](../components/data/CsvImportPreview.tsx) or [`lib/import/`](../lib/import/) runtime.
