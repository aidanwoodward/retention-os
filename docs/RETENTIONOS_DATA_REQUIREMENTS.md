# RetentionOS — Data Requirements, Metric Unlock & Integration Strategy

**Purpose:** Define how data layers, CSV contracts, integrations, and validation gates unlock (or withhold) customer-economics and revenue-durability metrics—**before** margin assumptions, marketing spend, CAC/payback, product/channel quality, and scenario modules land in product.

**Audience:** Product, engineering, and design partners aligning on onboarding honesty.

**Companion:** `RETENTIONOS_UPLOADED_DATA_MVP_CHECKPOINT.md` (current session-upload MVP), `docs/RETENTIONOS_MVP_DEMO_SCRIPT.md` (demo narrative).

---

## Core product principle (import / onboarding)

Every ingest path—CSV today, connectors tomorrow—must follow the same gate:

1. **RetentionOS suggests** (detected shape, proposed column mappings, inferred row model).
2. **User confirms** (mappings, row model, margin/spend assumptions where applicable).
3. **Validation checks** (schema, cross-row consistency, financial sanity, coverage rules).
4. **Only then metrics run** (view models, insights, exports).

**Rules:**

- Auto-detection must **not** silently bind ambiguous financial columns.
- Assumptions must be **explicit**, **labelled by source** (e.g. “user margin assumption v1”, “imported order field”), and **never silently invented** for fields that change economic meaning.

---

## 1. Data maturity layers

Layers are cumulative in intent: higher layers depend on lower layers being trustworthy. A layer can be *partially* present (e.g. revenue without contribution).

### Layer 1 — Revenue + orders

| Aspect | Detail |
|--------|--------|
| **Data required** | Stable `customer_id`, `order_id`, `ordered_at`, order-level or allocatable **net/gross revenue** after discounts/refunds (definition must be consistent), at least one row per order or per line with reconcilable totals. |
| **RetentionOS can unlock** | New customers (by first order), order counts, **net revenue** (per contract), AOV, orders per customer, repeat purchase rate, first-to-second rate, time to second order, cohort assignment, cohort retention curves, revenue LTV staircases, cohort matrix / triangle (revenue lens), rule-based **revenue durability posture** (non-composite). |
| **Remains locked** | Contribution LTV, true margin quality, CAC, payback, LTV:CAC, channel *economics* (not just labels), formal durability **score**, benchmarks. |
| **Typical sources** | Shopify, WooCommerce, BigCommerce exports; warehouse fact tables; finance-approved revenue dumps. |
| **Caveats** | Tax/shipping/rounding and “total” field naming vary; timezone and refund timing skew cohort borders; duplicated customers across systems break cohort identity. |

### Layer 2 — Product / line-item detail

| Aspect | Detail |
|--------|--------|
| **Data required** | Line-level `product_id`, `product_name`, `quantity`, `unit_price`, `line_total`; optional `sku`; order ↔ line linkage. |
| **RetentionOS can unlock** | Basket composition, product mix by cohort, **product-level revenue quality** (concentration, attach, category rollups)—once specs exist. |
| **Remains locked** | Product **margin** quality, true incrementality by SKU, channel economics. |
| **Typical sources** | Line-item order exports; OMS; Shopify line items. |
| **Caveats** | Bundles, refunds at line vs order level, gift cards, exchanges; SKU churn and ID aliasing. |

### Layer 3 — Contribution margin

| Aspect | Detail |
|--------|--------|
| **Data required** | Per-order or per-line **contribution dollars** *or* auditable **assumptions** (e.g. margin %, COGS rules) applied under user confirmation—not unknown “defaults.” |
| **RetentionOS can unlock** | Contribution LTV, contribution cohort matrix cells, cash-oriented narratives alongside revenue LTV. |
| **Remains locked** | True CAC payback unless Layer 4 exists; channel ROAS ≠ payback. |
| **Typical sources** | Finance models; ERP COGS; user-declared assumptions; rare perfect order-level contribution in ERP. |
| **Caveats** | Variable vs fully loaded costs; shipping allocation; returns lag; promotional subsidies. |

### Layer 4 — Marketing spend / CAC

| Aspect | Detail |
|--------|--------|
| **Data required** | Time-bucketed **spend** (e.g. month + optional week), **channel** (or platform), currency; join strategy to **acquisition cohort** or new-customer counts (not only to “orders”). |
| **RetentionOS can unlock** | CAC (definition-specific), LTV:CAC, MER-style rollups, **payback** horizons *when* LTV and spend calendars align. |
| **Remains locked** | Incrementality proof, offline uplift, benchmarked “good” CAC without Layer 7. |
| **Typical sources** | Meta / Google / TikTok Ads exports; invoice-based spend sheets; finance allocations. |
| **Caveats** | Attribution windows vs cohort months; cross-device; organic/missed attribution; coupon/discount leakage. |

### Layer 5 — Channel attribution

| Aspect | Detail |
|--------|--------|
| **Data required** | Per **first order** (or per customer) **acquisition channel** *or* probabilistic weights—labelled as modelled vs observed; optional UTMs; ad platform entity IDs. |
| **RetentionOS can unlock** | **Channel-level acquisition quality** (dispersion of cohort LTV by declared channel), spend efficiency narratives *when joined* to Layer 4. |
| **Remains locked** | Ground-truth incrementality without experiments or MMM. |
| **Typical sources** | Shopify channel; UTMs; ad platform naming; CDP rules. |
| **Caveats** | “Source” often means order source, not acquisition source; last-click bias; reseller/marketplace mapping. |

### Layer 6 — Scenario modelling / durability scoring

| Aspect | Detail |
|--------|--------|
| **Data required** | Layers 1–3 minimum for economic scenarios; Layer 4–5 for spend/channel scenarios; explicit **scenario inputs** (sliders/CSV) stored with version labels. |
| **RetentionOS can unlock** | Stress-tests on LTV ladders, payback under spend shocks, channel mix shifts **as what-if maths**, not predictions. |
| **Remains locked** | Forecast accuracy guarantees; ML “best channel.” |
| **Typical sources** | User parameters layered on imported truth. |
| **Caveats** | Scenario output is only as honest as upstream margin and attribution labelling. |

### Layer 7 — Benchmarks / integrations

| Aspect | Detail |
|--------|--------|
| **Data required** | Curated benchmark tables, vertical segmentation, consent for comparative use, statistical hygiene (cohort definitions must match). |
| **RetentionOS can unlock** | Relative percentile bands, “you vs peer shape” **when** methodology is publishable and legal-reviewed. |
| **Remains locked** | Everything until data governance + methodology exist. |
| **Typical sources** | Optional data network; third-party index providers. |
| **Caveats** | Selection bias; SME vs enterprise mix; survivorship. |

---

## 2. Current MVP CSV template

The **strict** onboarding contract today is the **combined order + line-item** CSV (`lib/import/csv-schema.ts`).

### Required columns

| Column |
|--------|
| `order_id` |
| `customer_id` |
| `ordered_at` |
| `gross_revenue` |
| `discounts` |
| `refunds` |
| `product_id` |
| `product_name` |
| `quantity` |
| `unit_price` |
| `line_total` |

### Optional columns

| Column |
|--------|
| `contribution_margin` |
| `channel` |
| `sku` |

### Semantics

- **One row per line item** — duplicate order-level fields (`order_id`, `customer_id`, `ordered_at`, `gross_revenue`, `discounts`, `refunds`, optional `contribution_margin`, optional `channel`) repeat on each line; they must be **internally consistent** for a given `order_id` or import **fails** (fail-closed).
- **Current behaviour:** Headers are **strict** (canonical names; case-insensitive match in parser). No synonym mapping in production yet.
- **Why this MVP shape:** Matches Shopify-style line exports, preserves **Layer 1 + 2** in one file, and feeds the existing metric engine without a separate orders join step.

### Sample CSV fixtures (`docs/`)

| File | Role |
|------|------|
| `sample-retentionos-orders.csv` | Default **combined order + line-item** sample: small cohort-friendly dataset with optional `contribution_margin` populated on most rows. |
| `sample-retentionos-orders-no-margin.csv` | Same row shape as the order sample; **`contribution_margin` left blank** on every line so Sprint **4A** margin-assumption and contribution-LTV paths can be exercised without imported dollars. |
| `sample-retentionos-marketing-spend.csv` | Larger **Layer 4** spend sheet (~tens of kUSD over three months) for stress-testing imports and previews alongside the small order fixture. |
| `sample-retentionos-marketing-spend-small.csv` | **Paired acquisition smoke** spend for the tiny order sample: ~**$335** total over **2024-01** and **2024-02** only, 3 channels in January and 2 in February, channel labels loosely aligned with order rows (e.g. `meta_paid`, `google_paid`). Totals are sized so **blended CAC** lands in a sensible band (total spend ÷ four customers in that snapshot). **January and February** are the only months with positive spend so calendar overlap matches **first-order cohort months** in `sample-retentionos-orders.csv` (that fixture has no March **first** orders); use the larger marketing spend file if you need a full **Q1** spend grid without extra acquisition UI notes. |

---

## 3. Metric unlock matrix

Legend for **status:** **Built** (in command-centre path today), **Partial** (exists with caveats or demo-only assumptions), **Future** (not productised on spine).

“**RetOS CSV**” = current combined template. “**Order-only**” = hypothetical one-row-per-order file without lines (not the current strict template).

| Metric / module | Required fields | Optional fields | Status | RetOS CSV? | Order-only CSV? | Shopify / Woo? | Meta / Google / TikTok? | Needs margin? | Needs spend? | Needs channel attr.? | Caveats |
|-----------------|----------------|-----------------|--------|------------|-----------------|----------------|---------------------------|---------------|--------------|---------------------|---------|
| New customers | `customer_id`, `ordered_at` | — | Built | Yes | Yes | Yes | No | No | No | No | First-order definition = cohort anchor (UTC policy). |
| Orders | `order_id`, `ordered_at` | — | Built | Yes | Yes | Yes | No | No | No | No | Refund/cancel handling must match contract. |
| Net revenue | Revenue components per contract | discounts, refunds | Built | Yes | Yes | Yes | No | No | No | No | “Gross” in template ≠ Shopify “subtotal” without doc alignment. |
| AOV | order totals, `order_id` | — | Built | Yes | Yes | Yes | No | No | No | No | Uses engine definitions from line or order rows. |
| Orders per customer | `customer_id`, `order_id` | — | Built | Yes | Yes | Yes | No | No | No | No | — |
| Repeat purchase rate | `customer_id`, `ordered_at`, `order_id` | — | Built | Yes | Yes | Yes | No | No | No | No | Single-order customers vs repeat definition. |
| First-to-second purchase rate | same + second order timing | — | Built | Yes | Yes | Yes | No | No | No | No | 90-day window is engine-defined. |
| Time to second order | same | — | Built | Yes | Yes | Yes | No | No | No | No | Median/mean distinction in UI. |
| Cohort retention | `customer_id`, `ordered_at` | Month+N definitions | Built | Yes | Yes | Yes | No | No | No | No | Calendar month strips are UTC in current engine. |
| Cohort matrix / triangle | same + revenue (and contrib if contrib cells) | — | Built (revenue); contrib cells Partial/Future | Yes | Partial | Yes | No | For contrib cells | No | For channel slice | Full **triangle “v2”** (quarterly/yearly) future. |
| Revenue LTV | same + allocatable revenue | — | Built | Yes | Yes | Yes | No | No | No | No | Terminal ladder definition must be documented. |
| Contribution LTV | revenue + **per-order contribution** or assumption | `contribution_margin` | Partial | Yes if col present | If order-level contrib | Rare native | No | **Yes** | No | No | Current CSV: optional column; demo uses fixture assumptions. |
| Product-level customer quality | **line items** | `sku` | Future | Yes | No | Partial (needs lines) | No | Margin helps | No | Helps | Needs product-quality spec. |
| Channel-level acquisition quality | `channel` or attribution | spend | Future | Partial (label only) | Partial | Partial | Partial | No | For efficiency | **Yes** | Channel must mean *acquisition*, not fulfilment. |
| CAC | new customers + **spend series** | channel | Future | No | No | No | **Yes** (spend side) | No | **Yes** | Helps | Join key: cohort month vs ad account timezone. |
| LTV/CAC | LTV + CAC | — | Future | Partial | Partial | Partial | Partial | Contrib LTV variant needs margin | **Yes** | Helps | Ratio is meaningless if denominators differ. |
| Payback | contrib or revenue + spend + time | — | Future | Partial | Partial | Partial | Partial | Strongly prefer contrib | **Yes** | Helps | Define payback on revenue vs contrib explicitly. |
| Scenario modelling | layers 1–3 + user params | 4–5 for spend/channel | Future | N/A | N/A | N/A | N/A | For economic scenarios | For spend scenarios | For mix scenarios | Not predictive. |
| Revenue Durability Score | published methodology + inputs TBD | — | Future | N/A | N/A | N/A | N/A | TBD | TBD | TBD | Today: **posture labels**, not composite index. |
| Benchmarks | merchant metrics + peer dataset | — | Future | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Legal + methodology first. |

---

## 4. Integration unlock map

RetentionOS stays centred on **customer economics and revenue durability**. Integrations **reduce upload friction**; they do not replace honest gating (**suggest → confirm → validate → metrics**).

### A. Shopify / WooCommerce / sales platform

**Likely unlocks (when mapped & validated):** orders, customers, timestamps, list-price and discount/refund fields (platform-specific), products, line items, SKUs, quantities, **revenue LTV**, cohort retention, **product-level revenue quality**, cohort matrices (revenue cells).

**Usually does not fully unlock:** true contribution margin (without finance/assumptions), CAC, marketing spend, payback, benchmark comparisons, **correct acquisition channel semantics** without extra rules.

### B. Meta Ads / Google Ads / TikTok Ads

**Likely unlocks:** spend, campaign/adset totals, optional impressions/clicks, **inputs** for CAC and channel efficiency, spend trends, **payback when joined** to cohort LTV and a shared calendar.

**Usually does not fully unlock:** customer-level retention alone, **revenue** LTV without commerce data join, contribution margin, full product quality story.

### C. Klaviyo / email / retention platform

**Likely unlocks:** lifecycle / campaign context, owned-channel engagement, **retention journey** overlays, repeat behaviour tied to messaging (when joined on `customer_id` / email hash).

**Usually does not fully unlock:** full order economics in isolation, CAC, contribution margin without commerce join.

### D. Finance / manual assumptions

**Likely unlocks:** gross margin / contribution rules, COGS and fulfilment assumptions, **contribution LTV**, improved payback **when** spend data exists.

**Caveats:** Explicit versioning; never silent—user confirms assumption sets.

### E. Benchmarks

**Future only:** vertical norms, cohort percentiles, CAC/payback bands, LTV quality bands—only with consent, methodology, and statistical transparency.

---

## 5. CSV column recognition strategy

**Internal contract stays strict** (`RetentionOSDataset` / metric engine types). **User-facing CSV headers stay flexible** over time.

Planned wizard flow:

1. Parse raw headers + sample rows (types, null rates).
2. **RetentionOS suggests** mappings from synonyms + heuristics (never auto-bind competing money columns without user pick).
3. **User confirms** each canonical field; ambiguous money fields require explicit choice.
4. **Validation runs** on the *mapped* logical model (consistency, totals, money sanity, cohort coverage).
5. **Metrics run only** after validation passes.

**Explicit guard:** Auto-detection **must not** silently select ambiguous financial columns (e.g. “Total” vs “Subtotal” vs “Total including tax”).

---

## 6. Column mapping confidence

| Level | Meaning | Operator action |
|-------|---------|------------------|
| **High confidence** | Header + sample values strongly match one canonical field; low collision risk. | Review optional. |
| **Medium confidence** | Plausible match but naming/semantics vary; or PII/hash transforms needed. | **User must confirm.** |
| **Low confidence** | Field overloaded (“Source”, “Tags”, generic “Amount”) or inconsistent samples. | **User must map explicitly**; may block export. |

**Examples:**

| Candidate | Typical confidence | Note |
|-----------|-------------------|------|
| “Order Number” → `order_id` | High | Watch leading # vs numeric ID. |
| “Created At” → `ordered_at` | High | Confirm timezone. |
| “Discount Amount” → `discounts` | High | Sign convention must be validated. |
| “Total” → `gross_revenue` | **Medium** | May include tax/shipping; definitions differ. |
| Email → `customer_id` | **Medium** | Hashing/PII policy; stable ID preferred. |
| “Source” → `channel` | **Low / medium** | Could be acquisition, POS, fulfilment, or app. |

---

## 7. Header synonym examples

Illustrative only—production synonym tables should be versioned and locale-aware.

| Canonical field | Example synonyms (CSV / exports) |
|----------------|----------------------------------|
| `order_id` | Order Number, Order ID, Order name, order_name, # Order |
| `customer_id` | Customer ID, client_id, email, Email, Shopper ID |
| `ordered_at` | Created At, Processed At, Order Date, ISO date |
| `gross_revenue` | Subtotal, Line Subtotal (order), Total (careful), Order subtotal |
| `discounts` | Discount Amount, Total Discounts, Total Discount |
| `refunds` | Refunded, Refund total, Returns amount |
| `contribution_margin` | Contribution, Gross profit (order), CM, Order contribution |
| `channel` | Sales channel, Source, Referring site, UTM source |
| `product_id` | Product ID, Variant ID, SKU (if used as ID—careful) |
| `product_name` | Product, Title, Lineitem name |
| `sku` | SKU, Variant SKU, Barcode |
| `quantity` | Qty, Quantity, Item quantity |
| `unit_price` | Price, Item price, Rate |
| `line_total` | Line Total, Line price, Extended price |

---

## 8. Row model strategy

| Model | Shape | Unlocks best for |
|-------|--------|------------------|
| **One row per order** | Single revenue cell per order | Fast Layer 1 portfolio KPIs; weaker Layer 2. |
| **One row per line item** | Repeated `order_id` across lines | Layer 1 + 2; reconciles to order totals; matches OMS exports. |

**Repeated `order_id`** is the join key that proves lines belong to the same checkout—enables consistency checks (sum of lines vs declared order revenue).

**Why MVP chose line-item format:** Aligns with common ecommerce exports and the existing **combined** parser without maintaining two parallel importers.

**Future wizard prompt:** *“Is this file one row per order, one row per line item, or should RetentionOS inspect it?”* — inspection uses `order_id` cardinality vs line patterns and user confirmation.

---

## 9. Revenue-only upload behaviour

**From basic order history (Layer 1–2, revenue only, validated):**

**Can show:** cohorts, retention / Month+N style constructs, repeat rate, first-to-second metrics, **revenue** LTV, cohort matrix / triangle (**revenue** cells), **rule-based revenue durability posture** (threshold narrative—not a formal composite score).

**Stays locked:** contribution LTV, meaningful **CAC / LTV:CAC / payback**, channel **economics** (unless spend joins land), product **margin** quality, benchmarked durability score.

---

## 10. Margin behaviour

| Mode | Description |
|------|-------------|
| **Per-order `contribution_margin`** | Imported dollars on order (repeated per line in current template). Strongest when finance trusts the field. |
| **`contribution_margin_pct` assumption** | User-confirmed portfolio or cohort-level % applied under **documented rules**—never silent defaults. |
| **Future product-level COGS/margin** | Line-level or SKU-level cost tables + mapping version. |

All assumption sets must be: **explicit**, **source-labelled**, **versioned**, and **visible on Data / provenance surfaces**.

---

## 11. Marketing spend requirements

### Minimum CSV (proposed contract)

| Field | Example |
|-------|---------|
| `month` | `2025-01-01` or `2025-01` (policy TBD) |
| `channel` | meta / google / tiktok / other |
| `spend` | numeric, single currency per file |

### Optional future fields

`platform`, `campaign`, `country`, `objective`, `ad_account`.

### Unlocks (when joined to commerce truth)

CAC (definition-specific), MER-style ratios, **LTV:CAC**, **payback**, channel acquisition efficiency narratives.

**Caveats:** spend calendar vs cohort month; multi-touch vs last-click; currency FX.

---

## 12. Cohort matrix requirements

**Eventual triangle views:**

- **Monthly** cohort matrix (baseline today).
- **Quarterly** cohort matrix (aggregate first-order quarter).
- **Yearly** cohort matrix (long-horizon; sparse tails).

**Per-cell metrics (selectable):**

- Retention % (calendar definition explicit)
- Active customers
- Repeat customers
- Revenue LTV (cumulative average or cohort total—**label clearly**)
- Contribution LTV (only if margin path exists)
- Orders per customer

**Required truth:** `customer_id`, `ordered_at`, `order_id`, revenue fields; contribution fields **only** if contribution cells are enabled.

---

## 13. Recommended build sequence

1. **Margin assumptions** — explicit user-confirmed contribution path for uploads + demo parity.
2. **Cohort matrix v2** — quarterly/yearly grains + cell metric picker.
3. **Marketing spend CSV contract** — month/channel/spend + validation + join keys.
4. **CAC / payback engine** — deterministic definitions; no fantasy attribution.
5. **Acquisition page** — spine route when channel + spend justify it.
6. **Product-level customer quality engine** — line-item + rules/spec.
7. **Products page** — operational lens tied to quality metrics.
8. **Scenario model** — stress LTV/payback under explicit knobs.
9. **Revenue Durability Score v0** — only if inputs/weights are publishable; otherwise stay heuristic posture.
10. **Flexible CSV mapping UI** — suggest → confirm → validate → metrics.
11. **Shopify / WooCommerce connector preset** — opinionated field mapping with review step.
12. **Ads platform connector presets** — spend ingest with calendar + channel normalisation.

---

## Document control

- **Honesty:** This map avoids implying Shopify or ad platforms “fully power” durability economics without finance and join discipline.
- **Focus:** Customer economics and revenue durability—not media mix modelling or black-box ML recommendations.
- **Code:** This file does not change runtime behaviour; product implementation must still follow the four-step onboard gate.
