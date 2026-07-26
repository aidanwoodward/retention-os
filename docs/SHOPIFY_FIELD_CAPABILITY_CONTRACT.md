# RetentionOS — Shopify field and capability contract

**Sprint:** 5W-A  
**Status:** Source-of-truth for future Shopify **API** semantics (5W-B fixture adapter, 6D production connection)  
**Research date:** 2026-07-26  
**Pinned API target:** Shopify **GraphQL Admin API version `2026-07`**  
**Base verified at planning:** `restart-retentionos-mvp` @ `9e74a7d326a471908b7976fc38b534786cfb3502`

**Companions (remain authoritative in their lanes):**

- [`RETENTIONOS_SHOPIFY_CSV_CONTRACT.md`](RETENTIONOS_SHOPIFY_CSV_CONTRACT.md) — authoritative for the **currently implemented** Shopify Orders CSV path (do not treat as superseded)
- [`IMPORT_TRUST.md`](IMPORT_TRUST.md) — source-agnostic import readiness
- [`DATASET_LIFECYCLE.md`](DATASET_LIFECYCLE.md) — session upload lifecycle; warehouse deferred
- [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md) — metric commercial meaning
- Canonical types: [`lib/types/order.ts`](../lib/types/order.ts), [`customer.ts`](../lib/types/customer.ts), [`product.ts`](../lib/types/product.ts)
- Engine floor: `netOrderRevenue` in [`lib/metrics/utils.ts`](../lib/metrics/utils.ts)

---

## 0. How to read this document

| Lane | Authority |
|------|-----------|
| **API / future connect** | This document (GraphQL Admin `2026-07`) |
| **CSV path (implemented today)** | [`RETENTIONOS_SHOPIFY_CSV_CONTRACT.md`](RETENTIONOS_SHOPIFY_CSV_CONTRACT.md) + [`lib/import/shopify/`](../lib/import/shopify/) |
| **Legacy REST scaffolding** | Quarantine evidence only — [`lib/shopifyClient.ts`](../lib/shopifyClient.ts) uses REST Admin `2023-10`; **not** the production contract; **not** wired to `RetentionOSDataset` |

**Version revalidation:** The pinned GraphQL version `2026-07` **must be revalidated when sprint 6D begins**. Do not treat this pin as permanent without that check.

**Scope control:** Field rows cover only data needed for founder-approved analyses, approved filters, revenue reconciliation, identity, provenance/completeness, and safe historical import / incremental sync. This is **not** a full Shopify schema map.

**Implementation status of this sprint:** documentation only. No runtime, adapter, migration, filter, metric, or UI changes.

### 0.1 Sprint 5X-A external closure (founder-approved)

Sprint **5X-A** was intentionally **read-only, chat-only, and zero-mutation**. Absence of a repository sprint record, branch, or commit for 5X-A is **expected**. This note records that founder-approved external closure context once; it is **not** an unresolved repository inconsistency.

---

## 1. Official documentation index (primary sources)

Contractual Shopify claims below cite these official pages (GraphQL Admin `2026-07` unless noted):

| Topic | Official URL |
|-------|----------------|
| Order | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order |
| LineItem | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/LineItem |
| Refund | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Refund |
| RefundLineItem | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/RefundLineItem |
| Customer | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Customer |
| Product | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Product |
| InventoryItem (`unitCost`) | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/InventoryItem |
| MailingAddress | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/MailingAddress |
| MoneyBag / MoneyV2 | https://shopify.dev/docs/api/admin-graphql/2026-07/objects/MoneyBag · https://shopify.dev/docs/api/admin-graphql/2026-07/objects/MoneyV2 |
| Access scopes | https://shopify.dev/docs/api/usage/access-scopes |
| Protected customer data | https://shopify.dev/docs/apps/launch/protected-customer-data |
| Privacy / compliance webhooks | https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance |
| Bulk operations | https://shopify.dev/docs/api/usage/bulk-operations/queries |
| `bulkOperationRunQuery` | https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/bulkOperationRunQuery |

---

## 2. Repository evidence (current RetentionOS)

| Fact | Evidence |
|------|----------|
| Active commercial Shopify path today | CSV → [`lib/import/shopify/`](../lib/import/shopify/) → `RetentionOSDataset` (`sourceType: "uploaded_csv"`, `uploadFormat: "shopify_orders"`) in [`lib/data-source/dataset-types.ts`](../lib/data-source/dataset-types.ts) |
| Canonical `Order` | `grossRevenue`, `discounts`, `refunds`, optional `contributionMargin`, `lineItems` — **no** currency, country, financial status, cancelled/test flags ([`lib/types/order.ts`](../lib/types/order.ts)) |
| Canonical `Customer` | `id`, `firstOrderAt`, optional `lastOrderAt`, `acquisitionChannel`, `firstProductId` ([`lib/types/customer.ts`](../lib/types/customer.ts)) |
| Canonical `Product` | `id`, optional `handle`/`sku`, `title` — **no** vendor/category ([`lib/types/product.ts`](../lib/types/product.ts)) |
| Net revenue engine | `netOrderRevenue = max(0, grossRevenue - discounts - refunds)` ([`lib/metrics/utils.ts`](../lib/metrics/utils.ts)) |
| CSV order id helper | Prefers numeric `Id`, else `Name` with `#` stripped ([`resolveShopifyOrderId`](../lib/import/shopify/shopify-orders-helpers.ts)) — **diverges** from CSV contract prose preferring `Name` |
| CSV product id | SKU else normalised lineitem name ([`resolveShopifyProductId`](../lib/import/shopify/shopify-orders-helpers.ts)) |
| CSV customer id | Lowercased email ([`normalizeShopifyCustomerEmail`](../lib/import/shopify/shopify-orders-helpers.ts)) |
| Live API scaffolding | REST `2023-10` client + OAuth/sync → Supabase; **not** mapped to `RetentionOSDataset` ([`lib/shopifyClient.ts`](../lib/shopifyClient.ts), `app/api/sync/shopify/route.ts`) |
| Token storage risk | `shopify_connections.access_token` plaintext in migration `001_create_shopify_connections.sql` — **future 6D blocker**, not fixed in 5W-A |
| Warehouse | Explicitly deferred until Shopify semantics reviewed ([`DATASET_LIFECYCLE.md`](DATASET_LIFECYCLE.md)) |

---

## 3. Deterministic Shopify → RetentionOS revenue construction (API)

**Commercial target:** merchandise **net order revenue** compatible with existing engine  
`netOrderRevenue = max(0, Order.grossRevenue - Order.discounts - Order.refunds)`.

All money fields use **`MoneyBag.shopMoney`** (shop currency). Presentment amounts are never used for RetentionOS metrics.

### 3.1 Recommended mapping (API)

| RetentionOS field | Shopify construction (GraphQL `2026-07`) | Rule |
|-------------------|------------------------------------------|------|
| `Order.grossRevenue` | Σ `LineItem.originalTotalSet.shopMoney.amount` over non–gift-card line items (`LineItem.isGiftCard == false`) | Product sales basis = **pre-discount merchandise** at order creation; excludes shipping |
| `Order.discounts` | `Order.totalDiscountsSet.shopMoney.amount` (order + line discounts before returns) | Allocated discounts as Shopify reports on the order; positive dollars-off |
| `Order.refunds` | Σ over `Order.refunds[].refundLineItems[].subtotalSet.shopMoney.amount` | **Merchandise refunds/returns only**; exclude shipping/tax/duty refund components |
| Net (engine) | `max(0, grossRevenue - discounts - refunds)` | Matches [`netOrderRevenue`](../lib/metrics/utils.ts) |

### 3.2 Explicit component decisions

| Component | Decision |
|-----------|----------|
| **Product sales basis** | Pre-discount merchandise line totals (`originalTotalSet.shopMoney`), gift cards excluded |
| **Allocated discounts** | Full order `totalDiscountsSet.shopMoney` (line + order-level) as RetentionOS `discounts` |
| **Refunds and returns** | Merchandise via `RefundLineItem.subtotalSet` only. Do **not** map `Order.totalRefundedSet` into `Order.refunds` (includes shipping/tax/other) |
| **Refund effective-date** | **Order-centric:** refund dollars revise the **original order’s** `refunds` / net. Cohort and period anchors stay `Order.createdAt`. Refund month does **not** create a separate negative order. Late refunds appear after incremental refresh |
| **Shipping** | **Excluded** from gross/discounts/refunds/net. Do not add `totalShippingPriceSet` / `currentShippingPriceSet` into merchandise revenue |
| **Tax** | **Excluded** from net merchandise revenue. Prefer stores with `taxesIncluded == false`. If `taxesIncluded == true`, strip tax using line `taxLines` before populating `grossRevenue`, or mark dataset **degraded** (limitation) — never silently mix tax-in and tax-out nets |
| **Duties** | **Excluded** (`currentTotalDutiesSet` / refund duties not in merchandise net) |
| **Order edits** | On sync, **replace** the order snapshot by GraphQL GID using **current** line items + recomputed gross/discounts + refund line items. Idempotent upsert |
| **Cancellations** | Orders with `cancelledAt != null` are **not valid orders** (excluded from customers/orders metrics population) |
| **Test records** | Orders with `test == true` are **not valid orders** |
| **Draft records** | `DraftOrder` is out of metric scope; only `Order` objects enter the dataset |
| **Financial / payment status** | **Do not** silently filter to paid-only (aligns with [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md)). Persist `displayFinancialStatus` as provenance only. Exclude cancelled/test as above |
| **Shop vs presentment** | **Shop currency only** (`shopMoney`). Record `Order.currencyCode` as dataset shop currency |
| **Multi-currency** | Presentment variance ignored. If shop currency cannot be determined, or mixed shop currencies appear across orders without a single shop currency, dataset is **unsupported / blocked** for API activation (CSV single-currency assumption remains for CSV path) |
| **Late historical adjustments** | Detect via `Order.updatedAt` / refund `createdAt`/`processedAt`; re-fetch and replace order. Revenue retention and LTV use revised nets; placement month unchanged |

### 3.3 Contribution

| State | Treatment |
|-------|-----------|
| Historical order-time COGS | **Unavailable** from Shopify for MVP (see §8) |
| Contribution | Merchant **`MarginAssumptions`** (or optional order-level `contributionMargin` if later supplied) — same as today |
| Product profitability | **Not unlocked** by `InventoryItem.unitCost` |

---

## 4. Identity rules (API + CSV fallback documentation)

### 4.1 API identity (recommended)

| Entity | Canonical RetentionOS id | Display / provenance |
|--------|--------------------------|----------------------|
| Order | `shopify:order:{Order.id}` where `Order.id` is GraphQL GID | `Order.name` (e.g. `#1001`) as **display only** — **never** sole API identity |
| Customer (authenticated) | `shopify:customer:{Customer.id}` GID | Do not store name/email/phone for MVP connect (see §7) |
| Customer (guest / null) | `shopify:guest:{Order.id}` **per guest order** when `Order.customer` is null | Guest checkouts return `customer: null` ([Order.customer](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order)). Repeat-guest merging **unavailable** without Level-2 email — record as limitation |
| Line item | `shopify:line_item:{LineItem.id}` | |
| Product | `shopify:product:{Product.id}` | Prefer product GID from `LineItem.product`; fallback `shopify:variant:{ProductVariant.id}` only if product missing |
| Variant | Store on line item as `variantId = ProductVariant.id` GID | SKU is label, not primary key |

**First valid order:** earliest valid order by `createdAt` ascending, then GID ascending tie-break, for each customer id.

**Customer identity change:** if Shopify merges customers, 6D must treat surviving GID as canonical and remap; until then, missing/changed identity → limitation, do not invent merges.

### 4.2 CSV fallback hierarchy (documentation only — **no adapter code change in 5W-A**)

Current **implemented** behaviour ([`shopify-orders-helpers.ts`](../lib/import/shopify/shopify-orders-helpers.ts)):

1. Order id: non-blank `Id`, else `Name` with leading `#` stripped  
2. Customer id: lowercased `Email`  
3. Product id: non-blank `Lineitem SKU`, else normalised `Lineitem name`

CSV contract prose historically preferred `Name` when both present — that prose **does not change runtime**. Convergence requirement for a later sprint: document API GID vs CSV Id/Name/email/SKU mapping tables in 5W-B fixtures without silently changing production CSV behaviour.

---

## 5. Valid order / customer rules (proposed for API path)

A **valid order** for RetentionOS metrics must satisfy all of:

1. Is a GraphQL `Order` (not `DraftOrder`)  
2. `test == false`  
3. `cancelledAt == null`  
4. Has shop-currency money fields resolvable  
5. Has ≥0 merchandise gross after gift-card exclusion  
6. Passes currency policy (§3.2)

A **valid customer** is any identity key that has ≥1 valid order.

**Unknown values:** never silently drop rows from filters; use explicit `unknown` / limitation counts (see §10).

---

## 6. Shopify field contract (required source fields)

**Legend — R/O:** Required / Optional for API→dataset.  
**Missing:** behaviour when field absent or redacted.

### 6.1 Order core

| Shopify object.field | API / version | Scope | Canonical target | Meaning | R/O | Trust risk / missing |
|----------------------|---------------|-------|------------------|---------|-----|----------------------|
| `Order.id` | GQL 2026-07 | `read_orders` (+ `read_all_orders` for >60d) | `Order.id` ← source-prefixed GID | Stable API identity | R | Fatal if missing |
| `Order.name` | GQL 2026-07 | `read_orders` | display / provenance only | Admin-facing name | R | Display fallback `#unknown` |
| `Order.createdAt` | GQL 2026-07 | `read_orders` | `Order.orderedAt`; cohort anchor | Checkout completion time; unchanged for life | R | Fatal if missing |
| `Order.updatedAt` | GQL 2026-07 | `read_orders` | sync cursor / incremental | Last modification | R | Required for incremental refresh |
| `Order.cancelledAt` | GQL 2026-07 | `read_orders` | validity gate | Cancel timestamp | R | Non-null → exclude order |
| `Order.cancelReason` | GQL 2026-07 | `read_orders` | provenance | Cancel reason enum | O | Ignore for metrics |
| `Order.test` | GQL 2026-07 | `read_orders` | validity gate | Bogus/test gateway | R | `true` → exclude |
| `Order.currencyCode` | GQL 2026-07 | `read_orders` | dataset meta shop currency | Shop currency at placement | R | Mixed currencies → block/degrade |
| `Order.taxesIncluded` | GQL 2026-07 | `read_orders` | tax strip / limitation | Whether prices include tax | R | `true` without strip → limitation/degraded |
| `Order.displayFinancialStatus` | GQL 2026-07 | `read_orders` | provenance only | Admin financial display | O | Not a paid-only filter |
| `Order.customer` | GQL 2026-07 | `read_orders` + protected customer data | customer id mapping | Null on guest checkout | R | Null → guest identity rule |
| `Order.lineItems` | GQL 2026-07 | `read_orders` | `Order.lineItems` | Merchandise lines | R | Empty → limitation |
| `Order.refunds` | GQL 2026-07 | `read_orders` | build `Order.refunds` | Refund records | R | Empty → `refunds = 0` |
| `Order.totalDiscountsSet.shopMoney` | GQL 2026-07 | `read_orders` | `Order.discounts` | Total discounts before returns | R | Null → `0` |
| `Order.shippingAddress.countryCodeV2` | GQL 2026-07 | `read_orders` + PCD | optional geo on order/meta | ISO country | O | Null → `unknown` country; do not exclude |
| `Order.billingAddress.countryCodeV2` | GQL 2026-07 | `read_orders` + PCD | provenance fallback only | Billing country | O | Not primary geo |
| `Order.totalShippingPriceSet` | GQL 2026-07 | `read_orders` | **excluded** from net | Shipping | O | Never fold into net |
| `Order.totalTaxSet` / `currentTotalTaxSet` | GQL 2026-07 | `read_orders` | **excluded** / tax strip aid | Tax | O | Strip when `taxesIncluded` |
| `Order.currentTotalDutiesSet` | GQL 2026-07 | `read_orders` | **excluded** | Duties | O | Never fold into net |
| `Order.totalRefundedSet` | GQL 2026-07 | `read_orders` | reconciliation only | All-in refunded amount | O | Do not map 1:1 to `Order.refunds` |

### 6.2 Line items

| Shopify object.field | API / version | Scope | Canonical target | Meaning | R/O | Missing |
|----------------------|---------------|-------|------------------|---------|-----|---------|
| `LineItem.id` | GQL 2026-07 | `read_orders` | `OrderLineItem.id` | Line identity | R | Fatal for that line |
| `LineItem.originalTotalSet.shopMoney` | GQL 2026-07 | `read_orders` | contributes to `grossRevenue` | Pre-discount line total | R | Skip gift cards; else limitation |
| `LineItem.totalDiscountSet.shopMoney` | GQL 2026-07 | `read_orders` | reconciliation vs order discounts | Line discounts (excl. order-level) | O | Prefer order `totalDiscountsSet` for `Order.discounts` |
| `LineItem.quantity` | GQL 2026-07 | `read_orders` | `quantity` | Ordered qty incl. refunded | R | |
| `LineItem.currentQuantity` | GQL 2026-07 | `read_orders` | provenance | Qty excl. refunded/removed | O | |
| `LineItem.sku` | GQL 2026-07 | `read_orders` | `OrderLineItem.sku` | SKU label | O | Blank OK |
| `LineItem.title` / `name` | GQL 2026-07 | `read_orders` | `title` | Title at order time | R | |
| `LineItem.vendor` | GQL 2026-07 | `read_orders` | proposed product vendor | Vendor at line | O | `unknown` vendor |
| `LineItem.product.id` | GQL 2026-07 | `read_orders` + `read_products` | `productId` | Product GID | R* | *If null (deleted product), use variant/SKU/title fallback; limitation |
| `LineItem.variant.id` | GQL 2026-07 | `read_orders` | `variantId` | Variant GID | O | |
| `LineItem.isGiftCard` | GQL 2026-07 | `read_orders` | exclude from merchandise | Gift card flag | R | Default false if absent |
| `LineItem.taxLines` | GQL 2026-07 | `read_orders` | tax strip when included | Tax on line | O | Needed if `taxesIncluded` |

### 6.3 Refunds

| Shopify object.field | API / version | Scope | Canonical target | Meaning | R/O | Missing |
|----------------------|---------------|-------|------------------|---------|-----|---------|
| `Refund.id` | GQL 2026-07 | `read_orders` | provenance | Refund GID | R | |
| `Refund.createdAt` / `processedAt` | GQL 2026-07 | `read_orders` | sync / audit | Refund timing | R | Effective-date policy is order-centric (§3.2) |
| `RefundLineItem.subtotalSet.shopMoney` | GQL 2026-07 | `read_orders` | sum → `Order.refunds` | Merchandise refunded | R | Empty → 0 |
| `Refund.totalRefundedSet` | GQL 2026-07 | `read_orders` | reconciliation only | Includes non-merchandise | O | Do not equal-map to `Order.refunds` |
| `OrderTransaction.status` (via refund) | GQL 2026-07 | `read_orders` | trust | Money may not have moved if not SUCCESS | O | Docs warn Refund ≠ funds returned; MVP still uses refund line merchandise amounts; notice if needed |

### 6.4 Customer (minimum)

| Shopify object.field | API / version | Scope / PCD | Canonical target | Meaning | R/O | Missing |
|----------------------|---------------|-------------|------------------|---------|-----|---------|
| `Customer.id` | GQL 2026-07 | `read_orders` or `read_customers` + PCD L1 | `Customer.id` | Stable customer GID | R when present | Guest → guest id |
| `Customer.email` | GQL 2026-07 | PCD **Level 2** | **excluded** MVP API | PII | — | Deliberately not ingested for API MVP |
| `Customer.firstName` / `lastName` / `phone` | GQL 2026-07 | PCD Level 2 | **excluded** | PII | — | Excluded |
| Address lines / zip / lat-long | GQL 2026-07 | PCD Level 2 | **excluded** | PII | — | Excluded |

### 6.5 Product catalogue

| Shopify object.field | API / version | Scope | Canonical target | Meaning | R/O | Missing |
|----------------------|---------------|-------|------------------|---------|-----|---------|
| `Product.id` | GQL 2026-07 | `read_products` | `Product.id` | Product GID | R | Deleted → keep order-time title/SKU; mark deleted |
| `Product.title` | GQL 2026-07 | `read_products` | `Product.title` | Current title | O | Prefer line-item title at order time for history |
| `Product.handle` | GQL 2026-07 | `read_products` | `handle` | Handle | O | |
| `Product.vendor` | GQL 2026-07 | `read_products` | proposed `vendor` | Brand/vendor | O | Blank → unknown; vendor filter conditional |
| `Product.productType` | GQL 2026-07 | `read_products` | proposed `productType` | Merchant type string | O | Uncontrolled vocabulary |
| `Product.category` (TaxonomyCategory) | GQL 2026-07 | `read_products` | proposed `taxonomyCategoryId` | Shopify taxonomy | O | Often missing → category filter unsupported/conditional |
| `Product.status` | GQL 2026-07 | `read_products` | provenance | active/archived/draft | O | Archived ≠ delete from history |
| `Product.tags` | GQL 2026-07 | `read_products` | **not** MVP filter key | Tags | O | Unsafe as category proxy |
| `ProductVariant.id` / `sku` | GQL 2026-07 | `read_products` | line `variantId` / `sku` | Variant identity | O | |
| `InventoryItem.unitCost` | GQL 2026-07 | `read_inventory` or `read_products`; staff “View product costs” | **not** historical COGS | **Current** unit cost only | O | See §8 — does not unlock profitability |

### 6.6 Dataset provenance / sync

| Field / concept | Source | Canonical | Notes |
|-----------------|--------|-----------|-------|
| Shop domain | OAuth session | dataset meta | |
| API version pin | app config | meta `shopifyApiVersion` (proposed) | Revalidate at 6D |
| Import/sync timestamps | app clock | `meta.importedAt` / sync watermark | |
| Order window completeness | scopes | completeness flags | 60-day vs `read_all_orders` |
| Warning/error counts | adapter | `meta.warningCount` / `errorCount` | Align import trust |

---

## 7. Minimum-data and privacy contract

### 7.1 Protected customer data level

| Recommendation | Detail |
|----------------|--------|
| **Minimum level** | **Level 1** protected customer data (orders/customers resources **excluding** name, address, phone, email fields) — required because Orders are protected customer data ([protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data)) |
| **Level 2 fields** | **Do not request** for MVP API: name, email, phone, address line 1/2, geolocation, zip |
| **Country without street PII** | Request/use **`shippingAddress.countryCodeV2` only** (ISO code). Official Level-2 address field list emphasises line1/line2/geolocation/zip — not country code. Do **not** query `address1`, `address2`, `zip`, `latitude`, `longitude`, names, or phone on addresses |
| **Why Level 2 email is avoided** | CSV path uses email as session customer key; API path should use Customer GID / guest-order synthetic ids to minimise PII. Trade-off: guest repeat merging limited |

### 7.2 Deliberately excluded fields (API MVP)

Names; email; phone; street address lines; zip; lat/long; client IP; full billing/shipping address objects beyond `countryCodeV2`; marketing consent payloads beyond need; payment instrument details.

### 7.3 Redacted / denied-field behaviour

Per Shopify: unapproved fields return `null` with GraphQL `errors` entries ([protected customer data — using](https://shopify.dev/docs/apps/launch/protected-customer-data#using-protected-customer-data)). RetentionOS must:

- Treat redacted identity fields as absent (not zero)  
- Fail closed if **required** non-PII fields are denied  
- Surface limitations when country is redacted/null  
- Never invent email from other fields  

### 7.4 Retention and deletion expectations (carry into 6D)

| Obligation | Source | Expectation |
|------------|--------|-------------|
| Customer data request | `customers/data_request` | Provide stored customer-linked data to merchant within **30 days** |
| Customer redact | `customers/redact` | Delete/redact customer-linked RetentionOS data for listed IDs within **30 days** (unless legal hold) |
| Shop redact | `shop/redact` | Erase shop data after uninstall webhook (**48h** after uninstall per Shopify) within **30 days** |
| Retention period | PCD Level 1 req #8 | Keep personal/order data only as long as needed for stated analytics purposes; document TTL in 6D |

### 7.5 Encryption requirements (6D)

PCD Level 1 requires **encryption at rest and in transit**. Current plaintext `access_token` in `shopify_connections` is a **production blocker for 6D**, not a 5W-A change.

### 7.6 Mandatory compliance webhooks (6D)

App Store distribution requires subscription to ([privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)):

1. `customers/data_request`  
2. `customers/redact`  
3. `shop/redact`  

Endpoints must accept JSON POST, verify HMAC, return **401** on invalid HMAC, **2xx** on success.

### 7.7 Scopes (minimum API MVP)

| Scope | Purpose |
|-------|---------|
| `read_orders` | Orders, line items, refunds |
| `read_all_orders` | **Critical** historical access (Partner Dashboard approval) — see §9 |
| `read_products` | Product/vendor/type/taxonomy + variants |
| `read_inventory` | Only if reading `unitCost` (not required for MVP analyses) |

Do **not** require `write_*` for read-only analytics MVP.

---

## 8. Product cost classification

| Class | Shopify evidence | RetentionOS treatment |
|-------|------------------|----------------------|
| **Current unit cost** | `InventoryItem.unitCost` (`MoneyV2`); requires inventory/products scope; staff **“View product costs”** permission ([InventoryItem](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/InventoryItem)) | Optional future estimate only; label **Current cost estimate** |
| **Historical order-time cost** | Not available as order-line COGS on Order/LineItem in this research | **Unavailable** |
| **Assumption-based contribution** | Merchant `MarginAssumptions` / optional order `contributionMargin` | **Supported today** |
| **Product-level profitability** | Would need historical COGS | **Unavailable** — do not unlock |

---

## 9. Historical access and sync requirements (design constraints — not implemented)

### 9.1 Default order window vs full history

| Mode | Capability |
|------|------------|
| **Default (`read_orders` only)** | Last **60 days** of orders ([Order](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order), [access scopes](https://shopify.dev/docs/api/usage/access-scopes)) |
| **Full history (`read_all_orders` + `read_orders`)** | All orders after Partner Dashboard approval + merchant re-auth |

**`read_all_orders` is a critical MVP/production viability dependency** for RetentionOS cohort, retention, and LTV analyses.

### 9.2 Minimum useful history

| Horizon | Usefulness |
|---------|------------|
| < 60 days | Weak: limited cohorts; first-to-second and retention matrices mostly insufficient |
| **12 months** | Minimum useful for MVP executive narrative |
| **24–36 months** | Preferred for durable cohort/LTV |

### 9.3 Degraded UX if approval absent

1. Activate API dataset only with explicit **60-day limitation** banner; lock long-horizon retention/LTV claims; **or**  
2. Fall back to **Shopify Orders CSV** upload (existing path) for historical depth; **or**  
3. Block API activation until `read_all_orders` granted  

Recommendation: **(1) + CSV fallback (2)**; do not pretend 60-day data is full-history.

### 9.4 Approval process

Partner Dashboard → App → API access → Request **Read all orders** access; after approval add scope and re-authorise merchant ([access scopes — orders permissions](https://shopify.dev/docs/api/usage/access-scopes#orders-permissions)).

### 9.5 Bulk operations (likely historical backfill)

Assess as **likely** backfill mechanism ([bulk operations guide](https://shopify.dev/docs/api/usage/bulk-operations/queries)):

| Limit / caveat | Official statement |
|----------------|-------------------|
| Concurrency (2026-01+) | Up to **five** bulk query operations per shop per app |
| Runtime | Must complete within **10 days** or fail |
| Results TTL | Download URL available **seven days** |
| Query shape | ≥1 connection; ≤5 connections; max nesting depth 2 |
| API surface | GraphQL Admin only |
| Completion signal | Prefer `bulk_operations/finish` webhook over polling |

**Out of scope for 5W-A:** production worker, queue, webhook implementation design.

### 9.6 Incremental sync requirements (contractual — not built)

- Watermark on `updatedAt` / refund processed time  
- Idempotent upsert by GraphQL GID  
- Late refunds revise original order  
- Cancelled/test toggles remove from valid set on refresh  
- Reconnect/resync = full bulk backfill + activate  
- Dataset activation ownership remains RetentionOS lifecycle rules ([`DATASET_LIFECYCLE.md`](DATASET_LIFECYCLE.md)); production persistence is 6D+  

---

## 10. Approved-analysis feasibility matrix

Classifications: **Shopify-native** · **Shopify + merchant assumption** · **partial** · **unavailable until later**

| # | Analysis | Feasibility | Required fields | Unsupported / gaps | Confidence | 5W-B fixture requirement |
|---|----------|-------------|-----------------|--------------------|------------|--------------------------|
| 1 | Revenue contribution by acquisition cohort | **Shopify-native** (with history) | valid orders, customer id, `createdAt`, net revenue | Needs `read_all_orders` for real cohorts | High | Multi-cohort months; contribution sums to 100% |
| 2 | New vs returning customers & revenue | **partial** → native after engine | same + first valid order | Engine not in `lib/metrics` today; data sufficient | Med | New-only, returning, first-order revenue split cases |
| 3 | Customer retention matrix | **Shopify-native** (with history) | customer, orders by month | 60-day only → partial | High | Repeat purchasers across months |
| 4 | Revenue retention matrix | **Shopify-native** (with history) | cohort nets by month; refunds order-centric | Distinct from cumulative LTV | High | Month0/MonthN revenue; >100% case; late refund revise |
| 5 | First-to-second conversion & timing | **Shopify-native** | ≥2 orders / customer | Guests rarely convert under guest-id policy | High | Repeat customer; guest non-merge case |
| 6 | Customers × frequency × AOV | **partial** | nets + order counts | AOV = net/valid orders (no Shopify AOV field); engine absent | Med | Multi-order AOV reconciliation |
| 7 | Cohort revenue LTV & contribution LTV | **Shopify + assumption** (contribution) | nets; margin assumption | Contribution not from Shopify COGS | High | Margin on/off; refunded LTV |
| 8 | CAC, LTV/CAC, payback | **Shopify + merchant assumption** | nets + **manual aggregate marketing spend** | No Ads/Meta/GA4; channel CAC later | High | Spend assumption months aligned to cohorts |
| 9 | First-product / product quality | **Shopify-native** (product GID) | line product/variant/title; first order | Deleted product refs | High | Multi-product first order; deleted product |
| 10 | Product / brand / category concentration | **partial** | product GID; `vendor`; taxonomy | Taxonomy often missing; brand=vendor conditional; engine absent | Med | Vendor present/absent; taxonomy missing |
| 11 | Compact deterministic RAG signals | **partial** | metrics above | Insights rules exist; not classic RAG | Med | Signal links to supporting analysis ids |

---

## 11. Filter feasibility matrix

Command-centre spine today has **no** trusted FilterBar; classifications are for **future** 6A/6B honesty.

| Filter | Date | Country | New/returning | Brand/vendor | Product/SKU |
|--------|------|---------|---------------|--------------|-------------|
| **Cohorts / revenue contribution** | **safe** (order `createdAt` / cohort month) | **conditional** (`shippingAddress.countryCodeV2`; unknowns labelled; acquisition country = first valid order shipping country) | **safe** once engine exists (definitions in brief) | **conditional** (`Product.vendor` / line vendor; unknown bucket) | **conditional** (product GID/SKU; unknown/deleted bucket) |
| **Retention matrices** | **safe** | **conditional** (same) | **unsafe** as population filter on retention matrix without explicit redesign | **conditional** | **conditional** |
| **LTV** | **safe** | **conditional** | **conditional** | **conditional** | **conditional** |
| **Acquisition / CAC** | **safe** | **unsupported** for channel geo | **unsupported** for CAC split | **unsupported** | **unsupported** |
| **Products / quality** | **safe** | **conditional** | **conditional** | **conditional** | **safe** (first product GID) |
| **Insights** | inherits | inherits | inherits | inherits | inherits |

**Rules:**

- **safe** — unambiguous population  
- **conditional** — allowed only with explicit `unknown`/excluded counts; no silent drop  
- **unsafe** — ambiguous populations  
- **unsupported** — do not offer  

Billing country is **not** recommended for acquisition geography. Shopify Markets are **unsupported** as MVP filter keys (extra scope/`read_markets`; not required for approved analyses).

---

## 12. Canonical schema delta proposal (not implemented)

Proposed additions for a **later** approved schema sprint:

| Area | Proposed delta |
|------|----------------|
| **Customer** | Keep opaque `id` (source-prefixed). Optional `sourceCustomerGid`. **No** email/name/phone for API MVP |
| **Order** | Optional `sourceOrderGid`, `displayName`, `currencyCode`, `taxesIncluded`, `cancelledAt`, `test`, `displayFinancialStatus`, `shippingCountryCode`, `sourceUpdatedAt` |
| **Line item** | Prefer product/variant GIDs; keep `sku`/`title`; optional `vendor` |
| **Product** | Optional `vendor`, `productType`, `taxonomyCategoryId`, `taxonomyCategoryName`, `status`, `isDeletedOrMissing` |
| **Marketing spend** | Unchanged — manual aggregate assumption / optional CSV |
| **Dataset metadata** | `sourceType` value for connected Shopify (future); `shopifyApiVersion`; `orderHistoryMode: "rolling_60d" \| "full"`; `shopCurrency`; completeness flags; PCD level |
| **Provenance** | Per-field redaction/limitation codes |

**Do not implement in 5W-A.**

---

## 13. CSV vs API divergence and convergence

| Topic | CSV (authoritative today) | API (this SoT) | Convergence requirement |
|-------|---------------------------|----------------|-------------------------|
| Identity order key | `Id` else `Name` (code) | GraphQL GID + display `name` | 5W-B fixtures map both; no silent CSV behaviour change |
| Customer key | Email | Customer GID / guest order id | Document dual paths; API avoids email |
| Product key | SKU else name | Product GID | Adapter maps; deleted product cases |
| Financial status | Ignored | Provenance only; still not paid filter | Aligned |
| Cancel/test | Not in CSV contract | Excluded from valid set | CSV may still include cancelled unless column used — **limitation** until CSV sprint |
| Currency | Ignored; single-currency assumed | Shop money; mixed → block | API stricter |
| Refunds | Order `Refunded Amount` | Merchandise refund line sum | 5W-B reconciliation cases |
| Blank discount/refund | Coerced to `0` in code | Same numeric default after parse | Policy documented; no 5W-A code change |
| Geography | Not in CSV spine | `countryCodeV2` optional | CSV remains without country unless later sprint |

The CSV contract is **not** superseded. This SoT governs **future API** semantics for 5W-B/6D.

---

## 14. 5W-B fixture acceptance contract

Minimum representative Shopify **API-shaped** fixture cases (JSONL/GraphQL-like fixtures — built in 5W-B, not here):

| Case ID | Scenario | Must assert |
|---------|----------|-------------|
| F01 | Repeat customer (2+ valid orders) | Same `shopify:customer:` id; first-to-second timing |
| F02 | Guest customer (`customer: null`) | `shopify:guest:{orderGid}`; no cross-order merge |
| F03 | Refund after original order | `Order.refunds` merchandise-only; net declines; `createdAt` unchanged |
| F04 | Cancelled order | Excluded from valid set |
| F05 | Test order | Excluded |
| F06 | Multi-product first order | First-product rule deterministic |
| F07 | Variant + SKU | `variantId` + `sku` preserved |
| F08 | Vendor present | Vendor concentration input |
| F09 | Missing taxonomy category | Category filter unsupported/unknown — no silent drop |
| F10 | Multi-currency presentment | Metrics use `shopMoney` only |
| F11 | Deleted product reference | Line title/SKU retained; product marked missing |
| F12 | Missing customer identity | Guest path |
| F13 | Late-updated order (`updatedAt`) | Idempotent replace; nets revise |
| F14 | `taxesIncluded: true` | Tax strip or degraded limitation explicit |
| F15 | Shipping + tax + duty refunded | Merchandise `Order.refunds` ≠ `totalRefundedSet` |

### 14.1 Worked reconciliation cases (normative for 5W-B)

**R1 — Simple merchandise order**

- Line A `originalTotalSet.shopMoney` = 100  
- `totalDiscountsSet.shopMoney` = 10  
- No refunds  
- → `grossRevenue=100`, `discounts=10`, `refunds=0`, `netOrderRevenue=90`

**R2 — Partial merchandise refund (order-centric)**

- Same as R1, then refund line subtotal 20  
- → `refunds=20`, `netOrderRevenue=70`  
- Placement month unchanged; refund month does not add a -20 order

**R3 — Shipping refund must not inflate `Order.refunds`**

- Merchandise refund subtotal 0; shipping refunded 15; `totalRefundedSet=15`  
- → RetentionOS `Order.refunds=0`, net unchanged; reconciliation note vs Shopify total refunded

**R4 — Cancelled**

- `cancelledAt` set, totals non-zero  
- → order omitted from valid population

**R5 — Gift card line excluded**

- Gift card line 50 + merchandise 80  
- → `grossRevenue=80` (gift card excluded)

**R6 — Late refund after refresh**

- After F03 apply, re-import same GID with higher refund  
- → single order row; net matches latest; no duplicate

---

## 15. Roadmap implications

| Sprint | Implication from this contract |
|--------|--------------------------------|
| **5W-B** | Build fixture adapter → `RetentionOSDataset` parity tests from §14; no production OAuth |
| **5X-B** | Reconciliation harness should use R1–R6 + CSV/API divergence table |
| **6A** | Shared filter system only exposes **safe/conditional** filters; unknown buckets mandatory |
| **6B** | Page upgrades consume view models; do not re-derive Shopify money in React |
| **6D** | GraphQL `2026-07` (revalidate), scopes, PCD Level 1, compliance webhooks, encrypt tokens, bulk backfill, incremental sync, dataset activation |
| **Later** | Level-2 email only if guest merging essential; Markets; channel quality; historical COGS integrations |

---

## 16. Founder decisions and risks

### 16.1 Decisions locked by this sprint (within approved clarifications)

1. API target = GraphQL Admin **2026-07** (REST 2023-10 quarantine only)  
2. Revenue construction = §3 deterministic shop-money merchandise net  
3. Identity = GID + source prefix; order name display-only  
4. Privacy = Level 1 + country code only; exclude name/email/phone/street  
5. Cost = current `unitCost` ≠ historical profitability  
6. `read_all_orders` = critical viability dependency  
7. CSV contract remains authoritative for CSV path  

### 16.2 Remaining founder escalations (material)

| ID | Topic | Why it matters |
|----|-------|----------------|
| D1 | API activation policy when `read_all_orders` denied: allow 60-day limited mode vs block vs CSV-only | MVP scope / honesty |
| D2 | Whether tax-inclusive shops are supported via tax strip in 5W-B or marked unsupported | Metric correctness |
| D3 | Whether guest-per-order identity is acceptable long-term vs requesting Level-2 email | Privacy vs retention accuracy |
| D4 | Encrypt-at-rest design for tokens/dataset in 6D (blocker acknowledged) | Security |

### 16.3 Risks

| Risk | Mitigation |
|------|------------|
| Shopify doc drift | Revalidate at 6D |
| Conflating CSV and API | Dual-lane authority (§0, §13) |
| Treating quarantine REST sync as production | Explicit non-spine (§0, §2) |
| Over-mapping schema | Scope control (§0) |
| Silent paid-order filters | Forbidden (§3.2) |
| COGS misuse | §8 classifications |

---

## 17. Citation checklist for reviewers

- [x] Contractual Shopify fields cite official GraphQL/`shopify.dev` URLs  
- [x] API vs CSV lanes not conflated  
- [x] Repository scaffolding not described as production-ready  
- [x] Schema deltas labelled proposals only  
- [x] 5W-A delivers documentation only
