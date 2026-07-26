# RetentionOS — Shopify field and capability contract

**Sprint:** 5W-A  
**Status:** Source-of-truth for future Shopify **API** semantics (5W-B fixture adapter, 6D production connection)  
**Research date:** 2026-07-26  
**Gate 2 revision:** 2026-07-26 — founder locks on edited orders, guest identity, tax-inclusive fail-closed, financial-status buckets, R7–R12  
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

**Applicability gate:** The §3.1 mapping applies only to orders that are **trusted-eligible** under §5 (including `edited == false`, `taxesIncluded == false`, and an included financial status). It is **not** edit-aware: `originalTotalSet` reflects creation-time line totals and must not be treated as post-edit merchandise truth.

### 3.1 Recommended mapping (API) — unedited, tax-exclusive, trusted-eligible orders

| RetentionOS field | Shopify construction (GraphQL `2026-07`) | Rule |
|-------------------|------------------------------------------|------|
| `Order.grossRevenue` | Σ `LineItem.originalTotalSet.shopMoney.amount` over non–gift-card line items (`LineItem.isGiftCard == false`) | Product sales basis = **pre-discount merchandise at order creation**; excludes shipping. **Not valid when `Order.edited == true`** |
| `Order.discounts` | `Order.totalDiscountsSet.shopMoney.amount` (order + line discounts before returns) | Allocated discounts as Shopify reports on the order; positive dollars-off |
| `Order.refunds` | Σ over `Order.refunds[].refundLineItems[].subtotalSet.shopMoney.amount` | **Merchandise refunds/returns only**; exclude shipping/tax/duty refund components |
| Net (engine) | `max(0, grossRevenue - discounts - refunds)` | Matches [`netOrderRevenue`](../lib/metrics/utils.ts) |

### 3.2 Explicit component decisions

| Component | Decision |
|-----------|----------|
| **Product sales basis** | Pre-discount merchandise line totals (`originalTotalSet.shopMoney`) for **unedited** orders only; gift cards excluded |
| **Allocated discounts** | Full order `totalDiscountsSet.shopMoney` (line + order-level) as RetentionOS `discounts` |
| **Refunds and returns** | Merchandise via `RefundLineItem.subtotalSet` only. Do **not** map `Order.totalRefundedSet` into `Order.refunds` (includes shipping/tax/other) |
| **Refund effective-date** | **Order-centric:** refund dollars revise the **original order’s** `refunds` / net. Cohort and period anchors stay `Order.createdAt`. Refund month does **not** create a separate negative order. Late refunds appear after incremental refresh |
| **Shipping** | **Excluded** from gross/discounts/refunds/net. Do not add `totalShippingPriceSet` / `currentShippingPriceSet` into merchandise revenue |
| **Tax** | Target net is **tax-exclusive merchandise**. For 5W-B / until pre-6D normalisation exists: `taxesIncluded == true` → order/dataset path **unsupported / blocked** (fail closed). Do **not** claim tax is excluded while tax-inclusive treatment remains unverified. Tax-inclusive normalisation is a **required pre-6D blocker** |
| **Duties** | **Excluded** (`currentTotalDutiesSet` / refund duties not in merchandise net) |
| **Order edits** | Persist `Order.edited` ([Order.edited](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order)). When `edited == true`, **fail closed** for 5W-B as **unsupported / limited** — do **not** trust §3.1 `originalTotalSet` construction. **`updatedAt` + GID replacement alone does not reconcile financial order edits.** Edit-aware revenue construction is a **required pre-6D blocker** |
| **Late refunds / non-edit updates** | Detect via `Order.updatedAt` / refund `createdAt`/`processedAt`; idempotent replace by GID is valid for **refund and non-edit field refresh** on unedited trusted-eligible orders only. Placement month unchanged |
| **Cancellations** | Orders with `cancelledAt != null` are **excluded** |
| **Test records** | Orders with `test == true` are **excluded** |
| **Draft records** | `DraftOrder` is out of metric scope; only `Order` objects enter the dataset |
| **Financial / payment status** | Locked eligibility on `displayFinancialStatus` — see §5. Persist status + provisional/excluded counts in provenance/completeness |
| **Shop vs presentment** | **Shop currency only** (`shopMoney`). Record `Order.currencyCode` as dataset shop currency |
| **Multi-currency** | Presentment variance ignored. If shop currency cannot be determined, or mixed shop currencies appear across orders without a single shop currency, dataset is **unsupported / blocked** for API activation (CSV single-currency assumption remains for CSV path) |

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
| Customer (authenticated) | `shopify:customer:{Customer.id}` GID | **Identifiable customer.** Do not store name/email/phone for MVP connect (see §7) |
| Guest / null customer | **No customer id** — not an identifiable customer | When `Order.customer` is null ([Order.customer](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order)): do **not** invent `shopify:guest:{orderGid}` as a customer. Order remains eligible for **order-level** revenue, AOV, and product-sales analysis. Guest revenue that needs acquisition/customer identity goes to an explicit **Unidentified** bucket |
| Line item | `shopify:line_item:{LineItem.id}` | |
| Product | `shopify:product:{Product.id}` | Prefer product GID from `LineItem.product`; fallback `shopify:variant:{ProductVariant.id}` only if product missing |
| Variant | Store on line item as `variantId = ProductVariant.id` GID | SKU is label, not primary key |

**Guest orders — include in:** order-level net revenue totals, AOV (order-based), product/line sales and concentration that do not require customer identity.

**Guest orders — exclude from:** customer retention matrices, first-to-second conversion, identifiable customer LTV, identifiable new/returning **customer** counts. Cohort / acquisition analyses that require customer identity must attribute guest revenue to **Unidentified**, not a synthetic customer.

**Identity coverage:** metrics that depend on identifiable customers must expose **customer-identity coverage** in completeness (share of trusted revenue / orders with `Customer.id` vs Unidentified / provisional / excluded).

**Level-2 email:** do **not** request Level-2 email solely to merge guest orders (§7).

**First valid order (identifiable customers only):** earliest trusted-eligible order by `createdAt` ascending, then GID ascending tie-break, for each `shopify:customer:` id.

**Customer identity change:** if Shopify merges customers, 6D must treat surviving GID as canonical and remap; until then, missing/changed identity → limitation, do not invent merges.

### 4.2 CSV fallback hierarchy (documentation only — **no adapter code change in 5W-A**)

Current **implemented** behaviour ([`shopify-orders-helpers.ts`](../lib/import/shopify/shopify-orders-helpers.ts)):

1. Order id: non-blank `Id`, else `Name` with leading `#` stripped  
2. Customer id: lowercased `Email`  
3. Product id: non-blank `Lineitem SKU`, else normalised `Lineitem name`

CSV contract prose historically preferred `Name` when both present — that prose **does not change runtime**. Convergence requirement for a later sprint: document API GID vs CSV Id/Name/email/SKU mapping tables in 5W-B fixtures without silently changing production CSV behaviour.

---

## 5. Valid order / customer rules (proposed for API path)

### 5.1 Structural gates (all orders)

Must be a GraphQL `Order` (not `DraftOrder`); `test == false`; `cancelledAt == null`; shop-currency money resolvable; passes currency policy (§3.2).

### 5.2 Financial status eligibility (`displayFinancialStatus`)

| Bucket | Statuses | Treatment |
|--------|----------|-----------|
| **Included (trusted-eligible candidates)** | `PAID`, `PARTIALLY_PAID`, `PARTIALLY_REFUNDED`, `REFUNDED` | Eligible for trusted merchandise-net construction if other gates pass |
| **Provisional** | `AUTHORIZED`, `PENDING` | **Excluded from trusted metrics** until settled; counts remain visible in provenance/completeness |
| **Excluded** | `VOIDED`, `EXPIRED` | Excluded from trusted metrics; counts visible in provenance/completeness |
| **Also excluded** | Cancelled, test, `DraftOrder` | Same as §3.2 / §5.1 |

### 5.3 Fail-closed gates (5W-B)

| Gate | When | Result |
|------|------|--------|
| Edited order | `Order.edited == true` | **Unsupported / limited** — not trusted revenue; fail closed (R7) |
| Tax-inclusive | `taxesIncluded == true` | **Unsupported / blocked** until verified tax-exclusive construction exists (R9; pre-6D blocker) |
| Guest / null customer | `Order.customer == null` | Order may contribute to **order-level** trusted revenue if otherwise trusted-eligible; **not** an identifiable customer (R8) |

### 5.4 Trusted-eligible order (for §3.1 construction)

All of: §5.1 structural gates; financial status in **Included**; `edited == false`; `taxesIncluded == false`; merchandise gross ≥ 0 after gift-card exclusion.

### 5.5 Identifiable customer

A **valid identifiable customer** is a `shopify:customer:{GID}` with ≥1 trusted-eligible order. Guest/null-customer orders do **not** create customers.

**Unknown / Unidentified / provisional / excluded:** never silently drop from honesty surfaces; expose explicit buckets and coverage counts (§10–§11).

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
| `Order.edited` | GQL 2026-07 | `read_orders` | provenance + fail-closed gate | Whether any edits applied | R | `true` → unsupported/limited (5W-B); pre-6D edit-aware revenue required |
| `Order.currencyCode` | GQL 2026-07 | `read_orders` | dataset meta shop currency | Shop currency at placement | R | Mixed currencies → block/degrade |
| `Order.taxesIncluded` | GQL 2026-07 | `read_orders` | fail-closed gate | Whether prices include tax | R | `true` → **blocked** for 5W-B; pre-6D tax-exclusive normalisation required |
| `Order.displayFinancialStatus` | GQL 2026-07 | `read_orders` | eligibility + provenance | Admin financial display | R | §5.2 buckets; provisional/excluded counts visible |
| `Order.customer` | GQL 2026-07 | `read_orders` + protected customer data | identifiable customer mapping | Null on guest checkout | R | Null → Unidentified bucket; no synthetic customer id |
| `Order.lineItems` | GQL 2026-07 | `read_orders` | `Order.lineItems` | Merchandise lines | R | Empty → limitation |
| `Order.refunds` | GQL 2026-07 | `read_orders` | build `Order.refunds` | Refund records | R | Empty → `refunds = 0` |
| `Order.totalDiscountsSet.shopMoney` | GQL 2026-07 | `read_orders` | `Order.discounts` | Total discounts before returns | R | Null → `0` |
| `Order.shippingAddress.countryCodeV2` | GQL 2026-07 | `read_orders` + PCD | optional geo on order/meta | ISO country | O | Null → `unknown` country; do not exclude |
| `Order.billingAddress.countryCodeV2` | GQL 2026-07 | `read_orders` + PCD | provenance fallback only | Billing country | O | Not primary geo |
| `Order.totalShippingPriceSet` | GQL 2026-07 | `read_orders` | **excluded** from net | Shipping | O | Never fold into net |
| `Order.totalTaxSet` / `currentTotalTaxSet` | GQL 2026-07 | `read_orders` | **excluded** from net; future normalisation input only | Tax | O | Not used to “strip” in 5W-B; `taxesIncluded == true` is **blocked** until pre-6D verified tax-exclusive construction |
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
| `LineItem.taxLines` | GQL 2026-07 | `read_orders` | future tax-exclusive normalisation input only | Tax on line | O | Not applied in 5W-B; tax-inclusive orders remain blocked |

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
| `Customer.id` | GQL 2026-07 | `read_orders` or `read_customers` + PCD L1 | `Customer.id` → `shopify:customer:{GID}` | Stable identifiable customer GID | R when present | Null/`Order.customer` missing → **no customer id**; Unidentified bucket (not a synthetic guest id) |
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
| **Why Level 2 email is avoided** | CSV path uses email as session customer key; API path uses Customer GID only and places guest revenue in **Unidentified**. **Do not request Level-2 email solely to merge guest orders** |

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
- Late refunds revise original order (unedited trusted-eligible only under §3.1)  
- Cancelled/test/voided/expired toggles update exclusion buckets on refresh  
- `edited == true` remains unsupported/limited until edit-aware revenue ships  
- `taxesIncluded == true` remains blocked until tax-exclusive normalisation ships  
- Reconnect/resync = full bulk backfill + activate  
- Dataset activation ownership remains RetentionOS lifecycle rules ([`DATASET_LIFECYCLE.md`](DATASET_LIFECYCLE.md)); production persistence is 6D+  

---

## 10. Approved-analysis feasibility matrix

Classifications: **Shopify-native** · **Shopify + merchant assumption** · **partial** · **unavailable until later**

Trusted order-level revenue uses §5.4 trusted-eligible orders. Identifiable-customer analyses require `shopify:customer:` coverage; guest revenue is **Unidentified**, not a synthetic customer. Edited / tax-inclusive orders fail closed per §5.3 until pre-6D blockers clear.

| # | Analysis | Feasibility | Required fields | Unsupported / gaps | Confidence | 5W-B fixture requirement |
|---|----------|-------------|-----------------|--------------------|------------|--------------------------|
| 1 | Revenue contribution by acquisition cohort | **partial** (with history) | trusted nets, identifiable customer id, `createdAt`; Unidentified bucket | Guest → Unidentified; needs `read_all_orders`; identity coverage in completeness | Med-High | Multi-cohort + Unidentified; coverage visible |
| 2 | New vs returning customers & revenue | **partial** | identifiable customers only + first valid order | Engine absent; guests excluded from identifiable customer counts; guest revenue Unidentified | Med | Identifiable new/returning; guest → Unidentified |
| 3 | Customer retention matrix | **Shopify-native** (identifiable + history) | identifiable customer, trusted orders by month | Guests excluded; 60-day only → partial; edited/tax-inclusive out | High | Repeat identifiable purchasers; guest excluded |
| 4 | Revenue retention matrix | **partial** / native for identifiable | cohort nets by month; order-centric refunds | Unidentified revenue handling; distinct from cumulative LTV | High | Month0/MonthN; >100%; late refund; Unidentified policy |
| 5 | First-to-second conversion & timing | **Shopify-native** (identifiable) | ≥2 trusted orders / identifiable customer | Guests **excluded** from F2S | High | Repeat customer; guest order-metrics only (not F2S) |
| 6 | Customers × frequency × AOV | **partial** | order nets + counts; identifiable customer count separate | AOV = trusted net / trusted order count (guests may contribute); customer count identifiable-only; engine absent | Med | AOV with guest orders; customer count without guests |
| 7 | Cohort revenue LTV & contribution LTV | **Shopify + assumption** (identifiable) | identifiable nets; margin assumption | Guest excluded from identifiable LTV; no Shopify COGS | High | Margin on/off; refunded LTV; identity coverage |
| 8 | CAC, LTV/CAC, payback | **Shopify + merchant assumption** | identifiable acquisition denominators + manual spend | Unidentified must not silently enter new-customer CAC denominator | High | Spend months + identity coverage |
| 9 | First-product / product quality | **partial** / native for identifiable | line product/variant; first identifiable order | Guest first orders not in identifiable quality cohorts; may remain in order-level product sales | High | Multi-product first identifiable order; guest product-sales only |
| 10 | Product / brand / category concentration | **partial** | product GID; vendor; taxonomy | Order-level OK with guests; taxonomy often missing; engine absent | Med | Vendor present/absent; taxonomy missing |
| 11 | Compact deterministic RAG signals | **partial** | metrics above + coverage | Must not over-claim when identity coverage low | Med | Signals respect coverage / Unidentified |

---

## 11. Filter feasibility matrix

Command-centre spine today has **no** trusted FilterBar; classifications are for **future** 6A/6B honesty.

Identity-sensitive filters must expose **customer-identity coverage** and never treat Unidentified/guest revenue as an identifiable customer segment.

| Filter | Date | Country | New/returning | Brand/vendor | Product/SKU |
|--------|------|---------|---------------|--------------|-------------|
| **Cohorts / revenue contribution** | **safe** (order `createdAt` / cohort month) | **conditional** (`shippingAddress.countryCodeV2`; unknowns labelled; acquisition country = first **identifiable** valid order shipping country) | **conditional** — identifiable customers only; Unidentified bucket separate; unsafe if guests counted as customers | **conditional** (`Product.vendor` / line vendor; unknown bucket) | **conditional** (product GID/SKU; unknown/deleted bucket) |
| **Retention matrices** | **safe** | **conditional** (same) | **unsafe** as population filter on retention matrix without redesign; guests never in retention population | **conditional** | **conditional** |
| **LTV** | **safe** | **conditional** | **conditional** (identifiable only) | **conditional** | **conditional** |
| **Acquisition / CAC** | **safe** | **unsupported** for channel geo | **unsupported** for CAC split; identity coverage required | **unsupported** | **unsupported** |
| **Products / quality** | **safe** | **conditional** | **conditional** (identifiable first-product cohorts) | **conditional** | **safe** for first identifiable product GID; order-level product sales may include guests |
| **Insights** | inherits | inherits | inherits + coverage | inherits | inherits |

**Rules:**

- **safe** — unambiguous population  
- **conditional** — allowed only with explicit `unknown` / Unidentified / provisional / excluded counts; no silent drop  
- **unsafe** — ambiguous populations  
- **unsupported** — do not offer  

Billing country is **not** recommended for acquisition geography. Shopify Markets are **unsupported** as MVP filter keys (extra scope/`read_markets`; not required for approved analyses).

---

## 12. Canonical schema delta proposal (not implemented)

Proposed additions for a **later** approved schema sprint:

| Area | Proposed delta |
|------|----------------|
| **Customer** | Opaque `id` only for identifiable `shopify:customer:{GID}`. Optional `sourceCustomerGid`. **No** email/name/phone; **no** synthetic guest customer rows |
| **Order** | Optional `sourceOrderGid`, `displayName`, `currencyCode`, `taxesIncluded`, `cancelledAt`, `test`, **`edited`**, `displayFinancialStatus`, `shippingCountryCode`, `sourceUpdatedAt`; optional trust bucket enum (`trusted` \| `provisional` \| `excluded` \| `unsupported_edited` \| `blocked_tax_inclusive` \| `unidentified_customer`) |
| **Line item** | Prefer product/variant GIDs; keep `sku`/`title`; optional `vendor` |
| **Product** | Optional `vendor`, `productType`, `taxonomyCategoryId`, `taxonomyCategoryName`, `status`, `isDeletedOrMissing` |
| **Marketing spend** | Unchanged — manual aggregate assumption / optional CSV |
| **Dataset metadata** | Connected Shopify source type (future); `shopifyApiVersion`; `orderHistoryMode`; `shopCurrency`; PCD level; **customer-identity coverage**; counts for provisional / excluded / edited-unsupported / tax-blocked / Unidentified revenue |
| **Provenance** | Per-field redaction/limitation codes; financial-status and edit flags |

**Do not implement in 5W-A.**

---

## 13. CSV vs API divergence and convergence

| Topic | CSV (authoritative today) | API (this SoT) | Convergence requirement |
|-------|---------------------------|----------------|-------------------------|
| Identity order key | `Id` else `Name` (code) | GraphQL GID + display `name` | 5W-B fixtures map both; no silent CSV behaviour change |
| Customer key | Email | Identifiable Customer GID only; guests → Unidentified (no synthetic id) | Document dual paths; API avoids email and guest-as-customer |
| Product key | SKU else name | Product GID | Adapter maps; deleted product cases |
| Financial status | Ignored | §5.2 include / provisional / exclude buckets | API stricter; CSV limitation until later sprint |
| Edited orders | Not in CSV contract | `edited == true` unsupported/limited | 5W-B fail closed; pre-6D edit-aware revenue |
| Tax-inclusive | Ignored / assumed exclusive | `taxesIncluded == true` blocked | 5W-B blocked; pre-6D normalisation |
| Cancel/test | Not in CSV contract | Excluded | CSV may still include cancelled unless column used — **limitation** until CSV sprint |
| Currency | Ignored; single-currency assumed | Shop money; mixed → block | API stricter |
| Refunds | Order `Refunded Amount` | Merchandise refund line sum | 5W-B R1–R12 |
| Blank discount/refund | Coerced to `0` in code | Same numeric default after parse | Policy documented; no 5W-A code change |
| Geography | Not in CSV spine | `countryCodeV2` optional | CSV remains without country unless later sprint |

The CSV contract is **not** superseded. This SoT governs **future API** semantics for 5W-B/6D.

---

## 14. 5W-B fixture acceptance contract

Minimum representative Shopify **API-shaped** fixture cases (JSONL/GraphQL-like fixtures — built in 5W-B, not here). Unless noted, baseline trusted fixtures use `edited == false`, `taxesIncluded == false`, and an **Included** financial status (`PAID` / `PARTIALLY_PAID` / `PARTIALLY_REFUNDED` / `REFUNDED`).

| Case ID | Scenario | Must assert |
|---------|----------|-------------|
| F01 | Repeat identifiable customer (2+ trusted orders) | Same `shopify:customer:` id; first-to-second timing |
| F02 | Guest order (`customer: null`) | **No** synthetic guest customer id; order-level revenue/AOV/product-sales eligible; excluded from retention/F2S/identifiable LTV/new-returning customer counts; revenue in **Unidentified**; identity coverage limitation |
| F03 | Refund after original order | `Order.refunds` merchandise-only; net declines; `createdAt` unchanged |
| F04 | Cancelled order | Excluded |
| F05 | Test order | Excluded |
| F06 | Multi-product first identifiable order | First-product rule deterministic for identifiable customer |
| F07 | Variant + SKU | `variantId` + `sku` preserved |
| F08 | Vendor present | Vendor concentration input |
| F09 | Missing taxonomy category | Category filter unsupported/unknown — no silent drop |
| F10 | Multi-currency presentment | Metrics use `shopMoney` only |
| F11 | Deleted product reference | Line title/SKU retained; product marked missing |
| F12 | Missing customer identity | Same as F02 (Unidentified; no synthetic customer) |
| F13 | Late refund refresh (`updatedAt`, `edited == false`) | Idempotent replace; nets revise; **not** claimed to reconcile financial edits |
| F14 | `taxesIncluded: true` | **Blocked** / unsupported result (not tax-stripped) |
| F15 | Shipping + tax + duty refunded | Merchandise `Order.refunds` ≠ `totalRefundedSet` |
| F16 | `edited: true` | **Unsupported / limited** fail-closed; not trusted §3.1 net |
| F17 | `VOIDED` | Excluded; count visible in provenance |
| F18 | `PENDING` or `AUTHORIZED` | Provisional; excluded from trusted metrics; count visible |
| F19 | Fully refunded discounted order | Deterministic merchandise-net (R12) |

### 14.1 Worked reconciliation cases (normative for 5W-B)

**R1 — Simple merchandise order** (unedited, tax-exclusive, `PAID`)

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
- → order excluded from trusted population

**R5 — Gift card line excluded**

- Gift card line 50 + merchandise 80  
- → `grossRevenue=80` (gift card excluded)

**R6 — Late refund after refresh** (`edited == false`)

- After F03 apply, re-import same GID with higher refund  
- → single order row; net matches latest; no duplicate  
- Does **not** prove edit-aware revenue

**R7 — Edited order**

- `edited == true`, otherwise PAID / tax-exclusive  
- → **unsupported / limited**; fail closed; not trusted §3.1 net

**R8 — Guest order**

- `customer == null`, otherwise trusted-eligible  
- → contributes to order-level revenue / AOV / product-sales; **no** identifiable customer; Unidentified for acquisition-identity analyses; identity coverage limitation

**R9 — Tax-inclusive**

- `taxesIncluded == true`  
- → **blocked** / unsupported until pre-6D tax-exclusive normalisation

**R10 — Voided**

- `displayFinancialStatus == VOIDED`  
- → excluded; provenance count visible

**R11 — Pending / authorized**

- `PENDING` or `AUTHORIZED`  
- → provisional; excluded from trusted metrics; provenance count visible

**R12 — Fully refunded discounted order**

- `grossRevenue=100`, `discounts=10`, merchandise refunds summing to 90 (or residual net floored)  
- → deterministic `netOrderRevenue = max(0, 100 − 10 − refunds)`; `REFUNDED` remains Included status bucket; engine floor applies if refunds exceed (gross − discounts)

---

## 15. Roadmap implications

| Sprint | Implication from this contract |
|--------|--------------------------------|
| **5W-B** | Fixture adapter → `RetentionOSDataset` parity for §14 including R7–R12; fail closed on edited + tax-inclusive; Unidentified guest handling; no production OAuth |
| **5X-B** | Reconciliation harness should use R1–R12 + CSV/API divergence table |
| **6A** | Shared filters only **safe/conditional**; Unidentified + identity coverage mandatory where relevant |
| **6B** | Page upgrades consume view models; do not re-derive Shopify money in React |
| **Pre-6D blockers (required)** | (1) **Edit-aware revenue construction** for `Order.edited == true`; (2) **Tax-inclusive → tax-exclusive merchandise normalisation** verified; (3) encrypt tokens/dataset at rest; (4) `read_all_orders` approval path |
| **6D** | GraphQL `2026-07` (revalidate), scopes, PCD Level 1, compliance webhooks, bulk backfill, incremental sync, dataset activation — only after pre-6D blockers cleared or explicitly deferred with honest limited mode |
| **Later** | Markets; channel quality; historical COGS; Level-2 email **not** justified solely for guest merge |

---

## 16. Founder decisions and risks

### 16.1 Decisions locked by this sprint (within approved clarifications + Gate 2 revision locks)

1. API target = GraphQL Admin **2026-07** (REST 2023-10 quarantine only)  
2. Revenue construction = §3.1 shop-money merchandise net for **unedited, tax-exclusive, trusted-eligible** orders only  
3. Identity = identifiable Customer GID + source prefix; order name display-only; **no** synthetic guest customers; Unidentified bucket  
4. Privacy = Level 1 + country code only; exclude name/email/phone/street; **no Level-2 email solely to merge guests**  
5. Cost = current `unitCost` ≠ historical profitability  
6. `read_all_orders` = critical viability dependency  
7. CSV contract remains authoritative for CSV path  
8. Financial status buckets per §5.2 (include / provisional / exclude)  
9. `edited == true` → fail closed (5W-B); edit-aware revenue = pre-6D blocker  
10. `taxesIncluded == true` → blocked (5W-B); tax-exclusive normalisation = pre-6D blocker  

### 16.2 Remaining founder escalations (material)

| ID | Topic | Why it matters |
|----|-------|----------------|
| D1 | API activation policy when `read_all_orders` denied: allow 60-day limited mode vs block vs CSV-only | MVP scope / honesty |
| D2 | *(Locked)* Tax-inclusive = blocked until verified normalisation — reopen only to approve a concrete tax-exclusive method | Metric correctness |
| D3 | *(Locked)* No synthetic guest customers; no Level-2 email solely for guest merge — reopen only if product accepts Level-2 for another stated purpose | Privacy vs retention |
| D4 | Encrypt-at-rest design for tokens/dataset in 6D (blocker acknowledged) | Security |
| D5 | Exact edit-aware money-field construction when unblocking `Order.edited` (pre-6D) | Metric correctness |

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

- [x] Contractual Shopify fields cite official GraphQL/`shopify.dev` URLs (including `Order.edited`)  
- [x] API vs CSV lanes not conflated  
- [x] Repository scaffolding not described as production-ready  
- [x] Schema deltas labelled proposals only  
- [x] 5W-A delivers documentation only  
- [x] `originalTotalSet` not claimed edit-aware; edited fail-closed for 5W-B  
- [x] Tax exclusion not claimed while tax-inclusive blocked  
- [x] Guest not treated as identifiable customer  
- [x] Financial-status buckets locked; provisional/excluded counts required
