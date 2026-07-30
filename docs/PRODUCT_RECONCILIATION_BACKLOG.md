# RetentionOS — Product reconciliation and implementation backlog

**Sprint:** 5X-B  
**Status:** Durable execution source of truth for 6A / 6B / 6C and later pre-6D / 6D work  
**Mode:** Documentation only (no runtime, metrics, UI, Shopify production, persistence, or deletion)  
**Base verified:** `restart-retentionos-mvp` @ `48a08948079bf404ae1fd15d93864ed4dedacd4c`  
**Companions:** [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md) · [`SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`](SHOPIFY_FIELD_CAPABILITY_CONTRACT.md) · [`RETENTIONOS_SHOPIFY_CSV_CONTRACT.md`](RETENTIONOS_SHOPIFY_CSV_CONTRACT.md) · [`IMPORT_TRUST.md`](IMPORT_TRUST.md) · [`RETENTIONOS_ARCHITECTURE.md`](RETENTIONOS_ARCHITECTURE.md) · Ops-01 record [`agent/sprints/5xb.md`](agent/sprints/5xb.md)

---

## 0. How to read this document

| Lane | Authority |
|------|-----------|
| **Product definition + sequenced backlog** | This document |
| **Metric commercial formulas (contracted KPIs)** | [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md) |
| **Shopify API semantics** | [`SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`](SHOPIFY_FIELD_CAPABILITY_CONTRACT.md) |
| **Shopify CSV path (implemented)** | [`RETENTIONOS_SHOPIFY_CSV_CONTRACT.md`](RETENTIONOS_SHOPIFY_CSV_CONTRACT.md) |
| **Import readiness** | [`IMPORT_TRUST.md`](IMPORT_TRUST.md) |

**Scope of 5X-B:** reconcile 5X-A product locks, 5X-A repository crosswalk, 5W-A Shopify contract, and 5W-B fixture adapter parity into an honest implementation backlog. **Do not implement** metrics, filters, UI, Shopify production connect, persistence, or legacy deletion here.

**§15 re-scope (founder-approved):** Shopify contract §15 previously named 5X-B as a reconciliation harness. That harness obligation is deferred to backlog item **`PRE6D-HARNESS`** and must still use R1–R12 plus the CSV/API divergence table. This document is the product-reconciliation SoT.

---

## 1. Verified starting capability (evidence at base)

Do not claim additional functionality without source evidence.

| Capability | Evidence |
|------------|----------|
| Deterministic core metrics | `lib/metrics/*` — retention, F2S, cohort revenue/contribution LTV, CAC, LTV:CAC, payback, first-product quality |
| Trusted CSV import + lifecycle | `lib/import/*`, `lib/data-source/*` |
| Shopify GraphQL fixture adapter → `RetentionOSDataset` | `lib/import/shopify/graphql/` |
| Unidentified customers (`customerId: null`) | `lib/types/order.ts` `isIdentifiedOrder`; GraphQL adapter completeness |
| Provisional / excluded / edited / tax-blocked / currency-blocked | GraphQL dispositions + completeness; F14/R9 whole-fixture tax block |
| F01–F19 + R1–R12 | Fixture + reconciliation + metric-parity tests |
| Command-centre route spine | `MVP_NAV` — `/dashboard` `/cohorts` `/retention` `/ltv` `/acquisition` `/products` `/insights` `/data` |

---

## 2. Appendix — Sprint 5X-A founder locks

**Source:** founder chat closure, transcript `7f99e7ca-446b-494d-8cea-d42fb1def80c` (5X-A was intentionally chat-only; no repo sprint record — see Shopify contract §0.1).  
**Do not invent locks** beyond what is recorded here and in the Gate 1 approval for 5X-B.

### 2.1 Product framing

**Primary current product-boundary source.** RetentionOS remains a customer-economics decision-support product, not generic BI, marketing analytics, CRM, attribution, SEO/CRO, FP&A, or a diligence platform. Architecture and agent routing link here; they do not independently redefine this boundary.

### 2.2 Approved visible MVP analyses

1. Revenue contribution by acquisition cohort  
2. New-versus-returning customer and revenue mix  
3. Customer retention matrix  
4. Revenue retention matrix  
5. First-to-second conversion and timing  
6. Customer count × order frequency × AOV decomposition  
7. Cohort revenue LTV and contribution LTV  
8. CAC, LTV/CAC and payback using manual aggregate marketing spend  
9. First-product and product customer-quality scorecards  
10. Product, vendor/brand and category concentration where fields are reliable  
11. Compact deterministic RAG signals linked to supporting evidence  

### 2.3 Locked commercial definitions

| Topic | Locked definition |
|-------|-------------------|
| Cohort revenue contribution | Each acquisition cohort’s **share of selected-period net revenue**, summing to 100%; absolute revenue as supporting evidence |
| Revenue retention | Cohort net revenue Month N ÷ Month 0; **period-based, non-cumulative**, distinct from revenue LTV; expansion may exceed 100% |
| New/returning revenue | First valid order revenue vs subsequent-order revenue |
| New/returning customer counts | New customers acquired in the selected period vs active customers acquired before the period |
| AOV | Trusted net order revenue ÷ valid order count (no dedicated AOV field) |
| Concentration | **Product-level baseline**; brand/vendor and category unlock only when reliable fields exist |
| Aggregate marketing spend | Keep manually entered aggregate assumptions; spend CSV not MVP-required |
| Deterministic signals | Compact RAG records with supporting values, sufficiency state, and destination anchors; **prescriptive action optional** (not required for page-level signal pills) |

### 2.4 5X-A corrections carried forward

- New-versus-returning gaps = metric + presentation + shared-system + **identity/data-quality** (no explicit source flag required when stable order history exists).  
- Country, brand/vendor, category remain **conditional** MVP dimensions pending coverage evidence (now updated by 5W-A/5W-B below).  
- AOV is derived; 5W-A verified revenue semantics (merchandise net), not a dedicated Shopify AOV field.

---

## 3. Multi-product first-order attribution

### 3.1 Canonical engine rule (shipped — `MET-FIRST-PRODUCT-RULE`)

`deriveFirstProductAttribution` is the canonical engine rule. States: `single_product` | `multi_product` | `unknown`.

Concise behaviour:

1. Exactly one distinct non-gift-card canonical product on the earliest valid order → `single_product` with that `firstProductId`.
2. Multiple quantities or variants of the **same** canonical product remain `single_product`.
3. More than one distinct canonical product → `multi_product` (`firstProductId = null`).
4. No reliable product identity → `unknown` (`firstProductId = null`).
5. Do **not** select first line, highest value, highest quantity, or inferred primary line for multi-product baskets.
6. **Rejected:** highest-net-merchandise-value attribution.

Product-quality rows include only `single_product` attribution. Multi-product and unknown customers remain separate reconciling residuals. Imported `Customer.firstProductId` is denormalised and **not** the engine source of truth.

Formula detail: [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md) (`product_quality`) and `lib/metrics/first-product-attribution.ts`.

### 3.2 Status

| State | Rule | Status |
|-------|------|--------|
| **Shipped** | Three-state `deriveFirstProductAttribution` | `MET-FIRST-PRODUCT-RULE` merged; first-line helper removed |
| **Historical interim (retired)** | Earliest valid order → `lineItems[0].productId` | Replaced; do not reinstate |

GraphQL adapter excludes gift-card lines from `lineItems` (`isGiftCard === true` skipped). CSV gift-card signalling may still differ — honesty via contracts / provenance.

### 3.3 Future Products experience requirements

When 6B Products ships presentation work, expose:

- single-product entry coverage  
- multi-product entry share  
- unknown entry share  
- product-quality metrics based on **attributable single-product entries only**  
- a separate **multi-product-entry** segment  

### 3.4 Analysis 9 reclassification

Analysis 9 is:

- a **shipped** three-state attribution metric (`MET-FIRST-PRODUCT-RULE`);
- **presentation and provenance** work remaining (coverage shares + multi-product segment on 6B Products).

---

## 4. Date / filter / analysis-context contract

### 4.1 Three distinct time concepts (never one ambiguous generic date range)

| Concept | Meaning | Typical use |
|---------|---------|-------------|
| **Reporting period** | Window over which portfolio outcomes are measured (selected-period revenue, new/returning mix, contribution shares) | Dashboard, Cohorts contribution, new/returning |
| **Acquisition cohort period** | First-order (acquisition) month/key that assigns a customer to a cohort | Cohort tables, retention/LTV matrices by acquisition month |
| **Maturity horizon** | Maximum Month +N / age offset rendered or used for ladder/payback | Retention matrix depth, LTV staircase, payback search |

`6A-ANALYSIS-CONTEXT` must model these as separate fields in shared analysis context — not a single `dateRange` overloaded for all three.

### 4.2 Filter capability matrix

For each filter: availability, coverage, unknown handling, compatible analyses/pages, upstream dependencies.

| Filter | Available / unavailable / partial | Coverage | Unknown handling | Compatible analyses / pages | Upstream support |
|--------|-----------------------------------|----------|------------------|-----------------------------|------------------|
| **Date (foundational)** | **Available** as three explicit concepts above | Must expose which cohorts/orders fall inside reporting period vs truncated by maturity | Never silently drop; show truncated / incomplete maturity | All spine pages | `6A-ANALYSIS-CONTEXT`; no new schema for UTC month keys |
| **New / returning** | **Unavailable** until `MET-NEW-RETURN` | Identifiable customers only; Unidentified separate | Unidentified never counted as identifiable new/returning | Dashboard, Retention, Cohorts (conditional) | Metric module + identity coverage |
| **Product / SKU** | **Partial** — contextual on Products; conditional elsewhere | Line/product GID coverage | Unknown / deleted / missing product buckets | Products (safe for first-product GID); Cohorts/Retention conditional | Existing line items; provenance |
| **Country** | **Conditional** — must not appear without canonical coverage | `shippingAddress.countryCodeV2` on API path; **absent** on CSV spine / canonical `Order` today | Label `unknown`; do not exclude silently | Only when schema + coverage exist | Schema/6D + PCD; not MVP-default |
| **Vendor / brand** | **Conditional** | `Product.vendor` on GraphQL path; CSV Vendor ignored today | `unknown` vendor bucket | Products / concentration when coverage sufficient | GraphQL vendor present; CSV needs later path if claimed |
| **Category** | **Conditional / often unavailable** | Taxonomy frequently missing (F09) | Unsupported/unknown; do not fake hierarchy | Concentration only when reliable | Do not unlock without coverage |

**Rules:** Date is foundational. New/returning requires metric support before UI. Product is contextual. Country, vendor, and category **must not appear** in MVP UI without sufficient canonical coverage and honesty states.

### 4.3 Honest unavailable / coverage states

Every analysis and page must preserve:

- Locked / unavailable when inputs missing (not silent zero)  
- Partial when coverage incomplete  
- Explicit Unidentified / provisional / excluded / edited / tax-blocked / currency-blocked where relevant  
- Customer-identity coverage for identifiable-customer metrics  

---

## 5. Signal contract (compact target)

### 5.1 Required fields

| Field | Required |
|-------|----------|
| Severity | Yes |
| Trigger metric | Yes |
| Current value | Yes |
| Comparison value | Yes |
| Affected population | Yes |
| Sufficiency / coverage | Yes |
| Destination page + section anchor | Yes |
| Caveat | Where needed |
| Prescriptive action | **Optional** — not required for page-level signal pills |

### 5.2 Legacy `recommendedAction`

Existing `Insight.recommendedAction` and insight-rule prescriptions **remain** in 5X-B. Do **not** remove them in 5X-B or automatically require removal in 6A. Consolidation happens in **6C** after replacement signal coverage exists.

### 5.3 Current evidence

- Product quality signals: `strong` \| `watch` \| `weak` \| `insufficient_data` (`lib/metrics/product-quality.ts`)
- Durability posture: `Healthy` \| `Mixed` \| `Watch` (not numeric RAG)
- Canonical deterministic Signal contract: existing `Insight` domain in `lib/types/insight.ts` + `lib/insights` (structured observations, contracted `metricRefs`, sufficiency, caveats, route destination; numeric `confidence` no longer emitted)
- Insights rules: `lib/insights/rules.ts` with optional `recommendedAction`
- Matrix placement policy: `lib/insights/matrix.ts` — analytical surface identity, explicit Signal eligibility, and explicit deterministic order only (no caps, no sufficiency filtering, no severity ranking; `/insights` inbox bypasses Matrix; not wired to page UI)
- Duplicated `QualitySignalBadge` in dashboard spine and products panel (page pills / chrome remain 6B — not claimed here)


---

## 6. Engine / UI crosswalk — eleven approved analyses

Shopify feasibility cites [`SHOPIFY_FIELD_CAPABILITY_CONTRACT.md`](SHOPIFY_FIELD_CAPABILITY_CONTRACT.md) §10 (not re-litigated). Classifications are post-5W-B engine/UI status.

### 6.1 Revenue contribution by acquisition cohort

| Field | Content |
|-------|---------|
| **Classification** | Requires deterministic metric work (+ presentation) |
| **Commercial definition** | Each acquisition cohort’s share of **reporting-period** net revenue, summing to 100%; absolute $ supporting |
| **Current** | `calculateCohorts` → absolute `netRevenue` / `contribution`; no portfolio share %; `/cohorts`, dashboard spine |
| **Tests** | Golden / cohort-related metric tests |
| **Shopify** | §10 partial (Unidentified bucket; identity coverage) |
| **Identity** | Identifiable cohorts; guest revenue → Unidentified, not synthetic customers |
| **Filters** | Reporting period + acquisition cohort period; country/vendor conditional |
| **Visual** | Share bars / table with % + absolute $ |
| **Signals** | Recent-cohort share shift; Unidentified share caveat |
| **Likely files** | `lib/metrics/cohorts.ts`, cohort/dashboard VMs, `/cohorts`, `/dashboard` |
| **Primary sprint** | `MET-SHARE` → 6B Cohorts/Dashboard |
| **Acceptance** | Shares sum to 100% over included cohorts; Unidentified explicit; Locked when period empty |

### 6.2 New-versus-returning customer and revenue mix

| Field | Content |
|-------|---------|
| **Classification** | Requires deterministic metric work + presentation + shared-system + identity/data-quality |
| **Commercial definition** | Revenue: first valid order vs subsequent. Customers: acquired in reporting period vs active acquired before period |
| **Current** | No `lib/metrics` calculator; legacy filter config only (`lib/filters`) |
| **Shopify** | §10 partial; identifiable only; guests excluded from identifiable customer counts |
| **Identity** | Requires stable order history; Unidentified separate |
| **Filters** | Reporting period foundational; new/returning segment after MET |
| **Visual** | Mix chart / KPI pair (customers + revenue) |
| **Signals** | Returning revenue share drop; identity-coverage insufficient |
| **Likely files** | New `lib/metrics/new-returning.ts` (name TBD), dashboard/retention VMs |
| **Primary sprint** | `MET-NEW-RETURN` → `6A-ANALYSIS-CONTEXT` → 6B |
| **Acceptance** | Definitions match §2.3; guests not in identifiable counts; coverage surfaced |

### 6.3 Customer retention matrix

| Field | Content |
|-------|---------|
| **Classification** | Already sufficient (6B polish) |
| **Commercial definition** | Month +N active rate: share of acquisition cohort with ≥1 trusted order in calendar month M+N |
| **Current** | `calculateRetentionByCohort`; `buildCohortMatrixFromDataset` `retention_rate`; `/retention`, `/cohorts` |
| **Shopify** | §10 Shopify-native (identifiable + history) |
| **Identity** | Identifiable only |
| **Filters** | Acquisition cohort period + maturity horizon; new/returning **unsafe** as population filter without redesign |
| **Visual** | Cohort × Month +N heatmap (existing matrix) |
| **Signals** | Month+1 softness vs F2S timing |
| **Likely files** | `retention.ts`, `cohort-matrix.ts`, retention/cohorts pages |
| **Primary sprint** | 6B Retention/Cohorts |
| **Acceptance** | Existing golden/parity preserved; maturity horizon explicit in context |

### 6.4 Revenue retention matrix

| Field | Content |
|-------|---------|
| **Classification** | Requires deterministic metric work (+ presentation) |
| **Commercial definition** | Cohort net revenue in Month N ÷ cohort net revenue in Month 0; period-based; non-cumulative; **distinct from revenue LTV**; may exceed 100% |
| **Current** | `revenueInPeriod` on retention points; **no** MonthN/Month0 rate matrix kind; not contracted MetricId |
| **Shopify** | §10 partial/native for identifiable; Unidentified policy required |
| **Identity** | Identifiable cohort revenue; Unidentified policy explicit |
| **Filters** | Acquisition cohort period + maturity horizon |
| **Visual** | Revenue-retention heatmap (new matrix metric) |
| **Signals** | Month+1 revenue retention collapse |
| **Likely files** | `retention.ts`, `cohort-matrix.ts`, METRIC_CONTRACTS, retention/cohorts UI |
| **Primary sprint** | `MET-REV-RETENTION` → 6B |
| **Acceptance** | Rate = N/0; >100% allowed; not confused with cumulative LTV; tests include expansion case |

### 6.5 First-to-second conversion and timing

| Field | Content |
|-------|---------|
| **Classification** | Already sufficient (6B presentation) |
| **Commercial definition** | Unwindowed + within-N-days (default 90) second-order conversion; avg/median days |
| **Current** | `calculateFirstToSecondOrderConversion`, repeat helpers; `/retention`, dashboard, insights |
| **Shopify** | §10 native (identifiable); guests excluded from F2S |
| **Identity** | Identifiable only |
| **Filters** | Reporting/maturity as page context; not guest-inclusive |
| **Visual** | KPI + timing distribution/support table |
| **Signals** | F2S90 weak vs repeat-all-time |
| **Likely files** | `repeat-purchase.ts`, retention/dashboard/insights VMs |
| **Primary sprint** | 6B Retention / Dashboard / Insights |
| **Acceptance** | Existing contracts + golden preserved |

### 6.6 Customer count × order frequency × AOV

| Field | Content |
|-------|---------|
| **Classification** | Requires deterministic metric work |
| **Commercial definition** | Decomposition of revenue ≈ customers × orders/customer × AOV; AOV = trusted net ÷ valid order count |
| **Current** | AOV in `metric-definitions.ts` only (not contracted); `orders_per_customer` matrix kind exists; no decomposition analysis |
| **Shopify** | §10 partial — AOV may include guest orders; customer count identifiable-only |
| **Identity** | Split guest-eligible AOV vs identifiable customer count |
| **Filters** | Reporting period foundational |
| **Visual** | Decomposition cards / waterfall |
| **Signals** | AOV down with frequency flat; identity caveat |
| **Likely files** | New AOV/decomposition metric module; dashboard VM; METRIC_CONTRACTS |
| **Primary sprint** | `MET-AOV-FREQ` → 6B Dashboard |
| **Acceptance** | AOV formula locked; guest policy explicit; no silent zero when unavailable |

### 6.7 Cohort revenue LTV and contribution LTV

| Field | Content |
|-------|---------|
| **Classification** | Already sufficient (6B presentation) |
| **Commercial definition** | Cumulative avg net revenue / contribution per customer by months since first order |
| **Current** | `calculateLTVByCohort`; matrix kinds `revenue_ltv` / `contribution_ltv`; `/ltv`, `/cohorts` |
| **Shopify** | §10 + merchant margin assumption; guests excluded from identifiable LTV |
| **Identity** | Identifiable; contribution needs margin path |
| **Filters** | Acquisition cohort period + maturity horizon |
| **Visual** | LTV ladders / matrix (existing) |
| **Signals** | Terminal LTV spread; contribution vs net gap |
| **Likely files** | `ltv.ts`, ltv/cohort VMs |
| **Primary sprint** | 6B LTV / Cohorts |
| **Acceptance** | Existing contracts preserved; Locked without contribution path |

### 6.8 CAC, LTV/CAC and payback (manual aggregate spend)

| Field | Content |
|-------|---------|
| **Classification** | Already sufficient (6B presentation) |
| **Commercial definition** | CAC from aggregate spend assumptions/CSV; revenue & contribution LTV:CAC; contribution payback |
| **Current** | `acquisition.ts` + spend session/assumption resolvers; `/acquisition`, dashboard spine |
| **Shopify** | §10 + merchant assumption; Unidentified must not enter new-customer CAC denominator silently |
| **Identity** | Identifiable acquisition denominators + coverage |
| **Filters** | Date safe; country/new-returning/brand/product **unsupported** for CAC splits (per §11) |
| **Visual** | CAC / ratios / payback panel (existing) |
| **Signals** | Payback pressure; estimated-spend caveat |
| **Likely files** | `acquisition.ts`, acquisition/dashboard VMs, `/data` spend unlock |
| **Primary sprint** | 6B Acquisition / Dashboard |
| **Acceptance** | Manual aggregate spend remains; Locked without spend; estimated vs actual honesty |

### 6.9 First-product / product customer-quality scorecards

| Field | Content |
|-------|---------|
| **Classification** | Engine attribution **shipped** (three-state); presentation/provenance remaining for 6B |
| **Commercial definition** | Which **attributable single-product** entries create durable customers; multi-product and unknown are separate residuals (§3) |
| **Current** | `deriveFirstProductAttribution` + `calculateFirstProductCustomerQuality` (single_product rows only); `/products`; dashboard entry-product signal; caveat copy |
| **Shopify** | §10 partial; F06 multi_product parity; vendor present on GraphQL `Product`; category often missing |
| **Identity** | Identifiable first orders; guests not in identifiable quality cohorts |
| **Filters** | Product contextual; vendor/category conditional on coverage |
| **Visual** | Quality table + coverage strip (single/multi/unknown shares — 6B) |
| **Signals** | Strong/watch/weak/insufficient_data; multi-product share material |
| **Likely files** | `first-product-attribution.ts`, `product-quality.ts`, products VM/panel, contracts |
| **Primary sprint** | `MET-FIRST-PRODUCT-RULE` **shipped** → 6B Products for presentation |
| **Acceptance** | Engine: §3 three-state; quality on single_product only. Remaining: UI coverage shares + multi-product segment |

### 6.10 Product / vendor / category concentration

| Field | Content |
|-------|---------|
| **Classification** | Requires deterministic metric work; product baseline; vendor/category **conditional** |
| **Commercial definition** | Product-level concentration baseline; brand/vendor and category only when fields reliable |
| **Current** | No `lib/metrics` concentration calculator; legacy UI `product-economics/concentration` (not spine) |
| **Shopify** | §10 partial — product GID; vendor; taxonomy often missing |
| **Identity** | Order-level concentration may include guests; customer-quality concentration does not |
| **Filters** | Product contextual; vendor/category gated on coverage |
| **Visual** | Concentration table/bars with coverage gates |
| **Signals** | Top-SKU over-concentration; vendor unknown-heavy |
| **Likely files** | New concentration metric; Products page; avoid wiring legacy concentration page as-is |
| **Primary sprint** | `MET-CONCENTRATION` → 6B Products |
| **Acceptance** | Product baseline ships first; vendor/category hidden unless coverage sufficient |

### 6.11 Compact deterministic RAG signals

| Field | Content |
|-------|---------|
| **Classification** | Metric-complete-ish / presentation + shared-system incomplete |
| **Commercial definition** | Compact signals per §5; optional prescription; evidence + anchors required |
| **Current** | Insights rules + durability posture + product quality signals; `recommendedAction` often present; no unified pill contract; duplicate badges |
| **Shopify** | §10 partial — must respect coverage / Unidentified |
| **Identity** | Signals must not over-claim under low identity coverage |
| **Filters** | Inherit analysis context |
| **Visual** | Page-level signal pills + Insights cards; scroll to anchors |
| **Signals** | ≤4 candidates per page (see §8) |
| **Likely files** | New shared signal types/helpers under `lib/` (later sprint); insights VM; page chrome |
| **Primary sprint** | `6A-SIGNAL` → 6B pages; legacy prescription consolidation in **6C** |
| **Acceptance** | Target contract fields present; pills work without prescription; Insights may keep optional action until 6C |

---

## 7. Shared system backlog — 6A

Smallest reusable decision system — **not** a generic BI framework.

### 7.1 Work items

| ID | Outcome | Priority | Notes |
|----|---------|----------|-------|
| **6A-NAV** | Single navigation SoT | must | `MVP_NAV` in `lib/mvp/cohesion.ts` is canonical; `AppSidebar` must consume it (today duplicates links). Unused `CleanSidebar` → 6C inventory |
| **6A-ANALYSIS-CONTEXT** | Shared analysis context | must | Distinct **reporting period**, **acquisition cohort period**, **maturity horizon**; filtered canonical dataset helpers; unknown/Unidentified handling hooks; capability-gated filter descriptors per §4 |
| **6A-SIGNAL** | Compact signal contract + helpers | must | §5 fields; page pills; destination anchors; do **not** force-remove `recommendedAction` |
| **6A-MATRIX** | Shared cohort matrix / chart patterns | must | Reuse `buildCohortMatrixFromDataset` patterns; add revenue-retention kind when MET ready |
| **6A-PROVENANCE** | Provenance, coverage, unavailable UI states | must | Banners/panels consistent with import trust + GraphQL completeness honesty |

**Dependency rule:** `6A-NAV` and `6A-ANALYSIS-CONTEXT` before MET-dependent UI. `6A-SIGNAL` / `MATRIX` / `PROVENANCE` after MET foundations (see §10 sequencing).

### 7.2 Explicit non-goals for 6A

- Generic query builder / arbitrary dimensions  
- Channel attribution UI  
- Shipping country filters without schema coverage  
- Rewriting metric formulas inside React  

---

## 8. Page backlog — 6B

Preserve: `CommandCentrePageFrame`, `useCommandCentreDatasetSelection`, dataset view-models, cohort matrix UI patterns, `MetricSourceBanner`, unavailable panels, `FirstProductQualityPanel` (evolve, don’t replace blindly).

Avoid: `PremiumDashboard`, `REDHomePage`, `DashboardClient` (unused by live `/dashboard`); legacy `retention-ltv/*` mock/dummy paths; React-side money re-derivation; wiring `lib/filters` CRM filters onto spine without redesign.

### 8.1 Dashboard

| Field | Content |
|-------|---------|
| Executive question | Is growth durable and underwritable right now? |
| Primary visual | Hero posture + KPI strip + spine panels |
| Supporting | Contribution share, new/returning mix, AOV decomposition (as MET lands) |
| Metric work | Consumes MET-SHARE, MET-NEW-RETURN, MET-AOV-FREQ outputs via VMs |
| Filters | Analysis context (reporting period + maturity); conditional dims gated |
| ≤4 signals | Repeat quality; F2S90; payback pressure; entry-product / multi-product share caveat |
| Sufficiency | Locked acquisition without spend; Locked contribution without margin; identity coverage |
| Preserve | `DashboardExecutive`, hero, spine panels |
| Avoid | Alternate unused dashboards |

### 8.2 Cohorts

| Field | Content |
|-------|---------|
| Executive question | Which acquisition months drive durable revenue share and LTV? |
| Primary visual | Cohort table + matrix (retention / revenue LTV / contribution LTV / **revenue retention** when ready) |
| Supporting | Contribution share % |
| Metric work | MET-SHARE, MET-REV-RETENTION |
| Filters | Acquisition cohort period + maturity + reporting period for shares |
| ≤4 signals | Share shift; Month+1 active soft; LTV spread; Unidentified share |
| Sufficiency | Identity coverage; truncated maturity |
| Preserve | Matrix toggle pattern on `/cohorts` |
| Avoid | Legacy revenue-cohorts mock pages as source of truth |

### 8.3 Retention

| Field | Content |
|-------|---------|
| Executive question | Are customers returning, and is period revenue retaining? |
| Primary visual | Customer retention matrix + F2S KPIs; revenue retention matrix when ready |
| Supporting | New/returning mix |
| Metric work | MET-REV-RETENTION, MET-NEW-RETURN |
| Filters | Cohort period + maturity; new/returning only after MET |
| ≤4 signals | Month+1 active; F2S90; revenue retention Month+1; timing vs calendar mismatch |
| Sufficiency | Identifiable-only honesty |
| Preserve | `RetentionClient` + VM |
| Avoid | `retention/curve`, `churn`, `reactivation` legacy as MVP spine |

### 8.4 LTV

| Field | Content |
|-------|---------|
| Executive question | How does cumulative value build by cohort age? |
| Primary visual | Net + contribution LTV ladders |
| Supporting | Payback linkage to Acquisition |
| Metric work | None foundational (already sufficient) |
| Filters | Cohort period + maturity |
| ≤4 signals | Terminal spread; contribution gap; immature cohort caveat; margin Locked |
| Sufficiency | Contribution Locked without assumptions |
| Preserve | LTV page VM/ladders |
| Avoid | Confusing revenue retention with LTV |

### 8.5 Acquisition

| Field | Content |
|-------|---------|
| Executive question | Can we scale spend with payback and LTV:CAC discipline? |
| Primary visual | CAC / LTV:CAC / payback panel |
| Supporting | Spend unlock on `/data` |
| Metric work | None foundational |
| Filters | Date only; no geo/product CAC splits in MVP |
| ≤4 signals | Payback pressure; estimated spend; identity coverage on denominators; contribution ratio Locked |
| Sufficiency | Locked without spend |
| Preserve | Acquisition VM + spend banners |
| Avoid | Channel-quality invention |

### 8.6 Products

| Field | Content |
|-------|---------|
| Executive question | Which entry products create valuable customers — and how large is multi-product entry? |
| Primary visual | First-product quality table + entry-type coverage strip (after MET-FIRST-PRODUCT-RULE) |
| Supporting | Product concentration; vendor/category conditional |
| Metric work | MET-FIRST-PRODUCT-RULE, MET-CONCENTRATION |
| Filters | Product contextual; vendor/category capability-gated |
| ≤4 signals | Strong/weak entry; multi-product share; unknown entry; concentration risk |
| Sufficiency | Line-item coverage; single-product attributable denominator |
| Preserve | `FirstProductQualityPanel` + attribution caveat (update after MET) |
| Avoid | Legacy product-economics pages as SoT; highest-NMV attribution |

### 8.7 Insights

| Field | Content |
|-------|---------|
| Executive question | What compact evidence-backed signals deserve attention? |
| Primary visual | Diagnostic cards linked to anchors |
| Supporting | Durability posture |
| Metric work | Consumes MET outputs; signal contract from 6A-SIGNAL |
| Filters | Inherit analysis context |
| ≤4 signals | Prefer portfolio-level: repeat, F2S, LTV spread, contribution gap (refresh copy to contract) |
| Sufficiency | Do not over-claim under low coverage |
| Preserve | Rules engine structure + `metricRefs` |
| Avoid | Mandatory prescription; chatty AI |

---

## 9. Legacy inventory — 6C

**6C = legacy deletion and consolidation** after 6A/6B replacements exist. **No deletes in 5X-B.**

### 9.1 Classification key

| Class | Meaning |
|-------|---------|
| retain | Remains part of MVP spine |
| quarantine until replacement | Keep code; do not extend; replace then delete |
| investigate | Proof gap — reusable concepts possible |
| delete during 6C | Only when non-use **and** replacement proven |
| defer to 6D | Production-specific cleanup with Shopify connect |

### 9.2 Inventory (evidence-backed)

| Item | Evidence | Classification |
|------|----------|----------------|
| `MVP_NAV` | `lib/mvp/cohesion.ts` | **retain** (SoT) |
| `AppSidebar` hardcoded Core links | `components/app-sidebar.tsx` | **quarantine until replacement** by 6A-NAV |
| `CleanSidebar` | unused by protected layout | **investigate** → likely **delete during 6C** if still unused |
| `DashboardExecutive` path | live `/dashboard` | **retain** |
| `PremiumDashboard`, `REDHomePage`, `DashboardClient` | present; not imported by `dashboard/page.tsx` | **quarantine until replacement**; **delete during 6C** when proven unused |
| Duplicate `QualitySignalBadge` | dashboard spine + products panel | **quarantine** → consolidate after 6A-SIGNAL; **delete duplicate during 6C** |
| `lib/filters` + EnhancedFilters / FilterBar | used by legacy retention/product pages; **not** MVP spine | **quarantine until replacement**; do not delete until 6A context covers needed cases |
| `app/(protected)/retention-ltv/*` | parallel ecosystem; dummy fallback on repeat-rates | **quarantine until replacement**; delete routes in 6C when spine covers |
| Other non-spine protected routes (customers, product-economics, executive, financials, etc.) | many `page.tsx` files | **investigate** per route; most **quarantine**; delete only with proven non-use |
| Mock KPI API branch | `app/api/metrics/kpis` mockData path | **investigate** / quarantine |
| Insight `recommendedAction` fields | `lib/types/insight.ts`, `lib/insights/rules.ts` | **retain until 6C** after signal replacement coverage |
| Shopify REST client + OAuth/sync → Supabase | `lib/shopifyClient.ts`, `app/api/shopify/*`, `app/api/sync/shopify` | **quarantine until replacement**; **investigate** for reusable OAuth/connect concepts; **do not auto-delete**; production-specific cleanup **defer to 6D** where appropriate |
| Supabase auth / RLS / migrations | auth gate, settings | **retain** auth as needed; **do not** delete scaffolding casually; 6D owns connect persistence |
| GraphQL fixture adapter | `lib/import/shopify/graphql/` | **retain** |
| CSV Shopify import | `lib/import/shopify/` (non-graphql) | **retain** |

---

## 10. Sequenced implementation backlog

**Authority:** This section owns current execution sequence and shipped/deferred status. Agent routing and architecture link here; they do not copy the full sequence.

### 10.1 Current sequence

```text
DOC-AGENT-ALIGN
  → 6A-SIGNAL
  → 6A-MATRIX
  → 6A-PROVENANCE
  → 6B visible analytical pages
  → later 6C consolidation
  → later PRE6D / 6D production readiness and Shopify ingestion
```

### 10.2 Shipped foundation (do not reopen without founder approval)

**METRIC_FOUNDATION_CLOSED.**

| ID | Status |
|----|--------|
| **5XB-DOC** | Shipped |
| **6A-NAV** | Shipped |
| **6A-ANALYSIS-CONTEXT** | Shipped |
| **MET-SHARE** | Shipped |
| **MET-REV-RETENTION** | Shipped |
| **MET-NEW-RETURN** | Shipped |
| **MET-AOV-FREQ** | Shipped |
| **MET-CONCENTRATION** | Shipped |
| **MET-FIRST-PRODUCT-RULE** | Shipped |
| **MET-RDS-MATURITY** | Shipped (completed-only Month+N aggregates; PR #41) |

Metric foundations were isolated work items — do not combine reopened formula work into a broad UI sprint without founder approval.

### 10.3 Remaining work items

| ID | Commercial outcome | Analysis / page | Dependency | Likely files | Class | Acceptance | Tests | Sprint | Priority |
|----|--------------------|-----------------|------------|--------------|-------|------------|-------|--------|----------|
| **DOC-AGENT-ALIGN** | Docs/agent routing aligned to current SoTs | Docs | METRIC_FOUNDATION_CLOSED | `AGENTS.md`, backlog, architecture, golden narrative, historical banners | docs | Canonical ownership explicit; no runtime change | Scope check | DOC-AGENT-ALIGN | must |
| **6A-SIGNAL** | Compact signal pills/cards | #11 | MET outputs useful | Shared signal types; page chrome | shared-system | §5 fields; prescription optional | Unit for contract mapping | 6A | must |
| **6A-MATRIX** | Deterministic Signal placement policy (eligibility + order per analytical surface) | #11 | 6A-SIGNAL | `lib/insights/matrix.ts` | shared-system | Surfaces place approved Signal IDs only; `/insights` bypasses Matrix; no UI wiring | Matrix unit tests | 6A | must |
| **6A-PROVENANCE** | Coverage / unavailable honesty | All | Completeness meta | Banners/panels | shared-system / UI | No silent zeros | VM tests | 6A | must |
| **6B-DASHBOARD** | Executive composition | Dashboard | MET + 6A signal/provenance | dashboard VMs/components | UI | §8.1 | VM tests + visual check | 6B | must |
| **6B-COHORTS** | Share + matrices | Cohorts | MET-SHARE, MET-REV-RETENTION, 6A-MATRIX | cohorts page | UI | §8.2 | VM + visual | 6B | must |
| **6B-RETENTION** | Customer + revenue retention + F2S | Retention | MET-REV-RETENTION, MET-NEW-RETURN | retention client | UI | §8.3 | VM + visual | 6B | must |
| **6B-LTV** | Ladders clarity | LTV | 6A context | ltv page | UI | §8.4 | VM + visual | 6B | should |
| **6B-ACQUISITION** | CAC honesty | Acquisition | 6A provenance | acquisition page | UI | §8.5 | VM + visual | 6B | should |
| **6B-PRODUCTS** | Entry types + quality + concentration | Products | MET-FIRST-PRODUCT-RULE, MET-CONCENTRATION | products panel | UI | §8.6 + §3.3 | VM + visual | 6B | must |
| **6B-INSIGHTS** | Signal cards to contract | Insights | 6A-SIGNAL | insights rules/VM | UI | §8.7; optional action ok | Rule tests | 6B | should |
| **6C-NAV-DEDUP** | Remove duplicate nav | Chrome | 6A-NAV done | app-sidebar leftovers, CleanSidebar | delete/consolidate | Single SoT remains | Route smoke | 6C | must |
| **6C-DASHBOARD-DEAD** | Remove unused dashboards | Dashboard | 6B-DASHBOARD | Premium/RED/DashboardClient | delete when proven unused | No imports; spine intact | Build | 6C | should |
| **6C-RETENTION-LTV** | Quarantine/delete legacy retention-ltv | Legacy | 6B retention/LTV/cohorts | `retention-ltv/*` | delete when replaced | Spine covers analyses | Build | 6C | should |
| **6C-SIGNAL-CONSOLIDATE** | Dedupe badges; optional prescription cleanup | #11 | 6A-SIGNAL + 6B coverage | badge components; insight types | consolidate | One badge; prescription policy explicit | Typecheck | 6C | should |
| **6C-FILTERS-LEGACY** | Retire unused filter systems | Filters | 6A-ANALYSIS-CONTEXT | `lib/filters`, EnhancedFilters | delete when unused | No spine dependency | Grep + build | 6C | later |
| **6C-SHOPIFY-SCAFFOLD** | REST/Supabase scaffold disposition | Shopify | Investigation complete | `shopifyClient`, OAuth/sync routes | quarantine / investigate / delete only if proven; else **defer to 6D** | Classification recorded; no blind delete | Review | 6C / 6D | must (classify) |
| **PRE6D-HARNESS** | Reconciliation harness | Trust | 5W-B fixtures + §13 divergence | tests/docs harness | docs/tests | Uses **R1–R12** + CSV/API divergence table | Harness tests | pre-6D | must |
| **PRE6D-TAX** | Tax-inclusive normalisation | Revenue | Contract §3.2 | adapter + contracts | schema/metric | Verified tax-exclusive merchandise | R9 successor | pre-6D | must |
| **PRE6D-EDIT** | Edit-aware revenue | Revenue | Contract §3.2 | adapter | schema/metric | Edited orders trusted only with edit-aware construction | R7 successor | pre-6D | must |
| **PRE6D-TOKENS** | Encrypt tokens/dataset at rest | Security | 6D design | supabase/connect | security | No plaintext token storage | Security review | pre-6D | must |
| **PRE6D-READ-ALL** | `read_all_orders` viability path | History | Shopify app review | connect docs | ops | Policy for 60-day limited vs block vs CSV-only (D1) | — | pre-6D | must |
| **6D-CONNECT** | Production GraphQL connect | Shopify | All PRE6D blockers cleared or explicitly deferred with limited mode | OAuth, bulk, sync, dataset activation | integration | Revalidate API `2026-07`; PCD Level 1; no REST as production SoT | Integration fixtures | 6D | later |

---

## 11. Acceptance checklist for this SoT (5X-B)

- [x] Fully reconciles all 11 approved analyses  
- [x] Includes locked multi-product decision (§3); highest-NMV rejected  
- [x] Metric dependencies sequenced before UI dependencies  
- [x] Distinguishes reporting period, acquisition cohort period, maturity horizon  
- [x] Capability-gates conditional filters (country/vendor/category)  
- [x] Preserves honest unavailable and coverage states  
- [x] Keeps runtime and legacy deletion out of 5X-B  
- [x] Sequenced work items with acceptance criteria and required tests  
- [x] Defines 6C Shopify scaffolding as quarantine/investigate/conditional delete/defer-6D — not blanket deletion  
- [x] Defers reconciliation harness to `PRE6D-HARNESS` with R1–R12 + CSV/API divergence  

---

## 12. Maintenance

When a 6A/6B/6C or later sprint ships, update the matching work-item status here and cross-link the sprint record. Do not silently change locked commercial definitions or reopen closed metric foundations without founder approval.
