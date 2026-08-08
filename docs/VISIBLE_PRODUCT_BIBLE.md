# RetentionOS Visible Product Bible

**Status:** Canonical presentation-composition source of truth for the eight-route MVP spine  
**Phase governed:** 6B Visible Analytical Product  
**Mode:** Product and presentation authority (not execution backlog, not metric contracts, not architecture inventory)  
**Companions:** [`PRODUCT_RECONCILIATION_BACKLOG.md`](PRODUCT_RECONCILIATION_BACKLOG.md) · [`RETENTIONOS_ARCHITECTURE.md`](RETENTIONOS_ARCHITECTURE.md) · [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md) · Ops-01 [`agent/OPS_01.md`](agent/OPS_01.md)

---

## 1. Purpose and authority

This Bible governs how RetentionOS presents already-contracted customer-economics analysis on the MVP spine:

`/dashboard` · `/insights` · `/retention` · `/cohorts` · `/ltv` · `/products` · `/acquisition` · `/data`

It answers, for product decisions and future Cursor agents:

- what each page owns;
- what users should see first;
- how conclusions, Signals, and evidence are presented;
- which analyses and visualisations belong on each page;
- how users investigate detail;
- how trust and methodology are exposed;
- how numbers, comparisons, maturity, and unavailable states are formatted;
- which technical foundations should be used;
- what must be deferred;
- how 6B presentation work maps to backlog execution IDs.

**Depth target:** approximately 80–90% locked at product-composition level. Page sprints retain flexibility for detailed layout, component extraction, and visual calibration.

This document is **not**:

- an execution backlog or work-item registry;
- a replacement for metric formulas;
- a route/Keep-Quarantine architecture inventory;
- a detailed component API specification;
- a pixel-level mock-up;
- a speculative chart catalogue.

---

## 2. Relationship to other canonical documents

| Subject | Canonical owner |
|---------|-----------------|
| MVP presentation composition, page ownership phrasing, Signal/trust UX principles, formatting, visualisation roles, presentation deferrals | **This Bible** |
| Product boundary, analysis inventory, execution sequence, work-item IDs, shipped/current/deferred status | [`PRODUCT_RECONCILIATION_BACKLOG.md`](PRODUCT_RECONCILIATION_BACKLOG.md) |
| Routes, Keep/Quarantine, system boundaries, technical architecture | [`RETENTIONOS_ARCHITECTURE.md`](RETENTIONOS_ARCHITECTURE.md) |
| Metric formulas, units, contract-level display semantics | [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md) + `lib/metrics/metric-definitions.ts` / `metric-contract-index.ts` |
| Import honesty | [`IMPORT_TRUST.md`](IMPORT_TRUST.md) |
| Operating gates | [`agent/OPS_01.md`](agent/OPS_01.md) |

**Conflict rule:** formulas → metric contracts; sequencing/status → backlog §10; routes/system → architecture; presentation composition → this Bible.

Do not duplicate formulas into this Bible. Do not invent parallel work-item IDs here; cite backlog §10.3 IDs only.

Historical UI pattern notes for quarantined Revenue Cohorts live in [`archive/pre-restart/revenue-cohorts-ui-consistency-template.md`](archive/pre-restart/revenue-cohorts-ui-consistency-template.md) and are **not** active presentation authority.

---

## 2a. Lovable and external design tools — authority boundaries

**Lovable** (and similar visual exploration tools) may govern **visual exploration and interaction design** only: layout rhythm, component styling, motion, and non-contractual UX polish on the eight-route spine.

**Verified production contracts govern** metrics, formulas, calculations, data availability, Signal logic, backend behaviour, and causal claims. Sources: [`METRIC_CONTRACTS.md`](METRIC_CONTRACTS.md), metric registries, [`PRODUCT_RECONCILIATION_BACKLOG.md`](PRODUCT_RECONCILIATION_BACKLOG.md) §2–§5, [`IMPORT_TRUST.md`](IMPORT_TRUST.md), Shopify contracts, and [`RETENTIONOS_ARCHITECTURE.md`](RETENTIONOS_ARCHITECTURE.md).

**Rule:** Lovable output must **not** override those contracts. When design exploration conflicts with contracted behaviour, contracts win — adjust presentation, not formulas, data paths, or Signal semantics.

---

## 3. Six global analytical principles

1. **Lead with the strongest honest answer.** Open with the owned commercial conclusion the page can defend.
2. **Prove it with minimal, complementary evidence.** Prefer two to four essential proof metrics over a KPI wall.
3. **Keep commercially distinct concepts separate.** Do not collapse customer retention with revenue retention, net LTV with contribution LTV, or share with cumulative value.
4. **Make comparison basis and maturity explicit.** Every movement states its comparison basis; mature, partial, and unavailable states remain visible.
5. **Use visuals for patterns and tables for investigation.** Charts reveal shape; tables support exact inspection.
6. **Turn analysis into a trustworthy next investigation without overstating causality.** Link to the natural next page or drill-down; do not invent prescriptions or AI causality.

---

## 4. Flexible analytical-page skeleton

Use as a hierarchy of meaning, not a mandatory ten-card layout:

1. Page title and owned commercial question  
2. Executive conclusion  
3. Source, reporting period, and freshness  
4. Current posture / what needs attention  
5. Two to four essential evidence metrics  
6. Primary analytical view  
7. Complementary driver analysis  
8. Investigation table or drill-down  
9. Methodology, assumptions, and caveats on demand  
10. Clear next investigation  

Not every page needs equal visual weight for every layer. Collapse secondary layers when they do not improve the five-second read.

### 4.1 Insights adaptation

Insights is a complete Signal inbox, not a full analytical chart page. Adapt to: owned question → inbox of diagnoses → compact observation + implication → investigation destination → provenance on demand. No AI chat. No mandatory chart wall.

### 4.2 Data adaptation

Data is trust and source control, not a major analytical chart surface. Adapt to: active source → freshness → coverage/completeness → unlocked/locked analysis → assumptions → import/sync state. Methodology disclosure remains available; primary analytical views belong on other pages.

---

## 5. Eight-question page-decision checklist

Every page or proposed module must answer:

1. What commercial question and decision does the page own?  
2. What must the user understand within five seconds?  
3. What minimum evidence supports the conclusion?  
4. What is the strongest primary analytical view?  
5. What breakdown explains the drivers?  
6. What detail can the user investigate, and where should they go next?  
7. What source, assumptions, maturity, or methodology must be disclosed?  
8. What does not belong here, and what makes the page uniquely RetentionOS?

---

## 6. Eight-route page ownership map

| Route | Owned commercial question |
|-------|---------------------------|
| `/dashboard` | Is growth durable, and what needs attention? |
| `/retention` | Are customers returning, and where are they being lost? |
| `/cohorts` | Are newer customer vintages becoming better or worse, and which cohorts support current revenue? |
| `/ltv` | Are customers becoming more valuable and profitable? |
| `/products` | Which entry products create valuable, repeat customers? |
| `/acquisition` | Are we acquiring economically valuable customers efficiently and recovering spend quickly enough? |
| `/insights` | Which deterministic diagnoses deserve attention? |
| `/data` | Is the analysis current, complete, and trustworthy? |

Presentation ownership phrasing for these questions lives here. Backlog §8 may retain short executive inventory fields; it is not a second full composition SoT.

---

## 7. Page composition guidance

Each subsection locks analytical role and module hierarchy. Exact pixel layout, component APIs, and chart implementation details remain for page sprints.

### 7.1 Dashboard

**Owns:** executive synthesis of durable growth and attention priorities.

**Five-second read:** Revenue Durability Posture plus the highest-priority Signals that need attention.

**Composition:**

1. Title + owned question  
2. Executive conclusion (durability posture)  
3. Source / period / freshness  
4. Highest-priority Signals (Matrix-eligible surface placement)  
5. Minimal proof metrics (not an eight-card wall)  
6. Compact links into deeper analytical pages  
7. Trust / locked states where spend, margin, or coverage block claims  
8. Next investigation destinations

**Include:** Revenue Durability Posture; highest-priority Signals; minimal complementary proof; deep-page links.

**Exclude:** chart wall; duplicated navigation grid; alternate unused dashboards; inventing new Signal IDs to fill space.

### 7.2 Insights

**Owns:** complete canonical Signal inbox.

**Five-second read:** which deterministic diagnoses deserve attention now.

**Composition:**

1. Title + owned question  
2. Inbox ordered by the Signal contract (not a Matrix surface)  
3. Per Signal collapsed card: severity/status, conclusion-led title, compact observation, investigation link  
4. Expanded: why it matters, evidence, eligible population, caveat/sufficiency, methodology/provenance on demand  
5. Caveat where material; commercial implication  
6. No AI chat; prescription optional and never mandatory

**Exclude:** chatty AI; duplicating full analytical charts from other pages; inventing Signals merely to populate the inbox.

### 7.3 Retention

**Owns:** customer returning behaviour and where customers are being lost.

**Five-second read:** whether customers return, with customer retention and revenue retention kept separate.

**Composition:**

1. Title + owned question  
2. Executive conclusion on return quality / loss points  
3. Source / period / freshness + maturity visibility  
4. Essential evidence: first-to-second and repeat depth  
5. Primary view: customer retention analysis  
6. Complementary: revenue retention as a distinct analysis  
7. Cohort-age investigation table/matrix with mature/partial/unavailable honesty  
8. Next investigation → Cohorts / LTV / Insights as appropriate

**Exclude:** eight-card KPI wall; collapsing customer vs revenue retention; treating legacy `/retention/*` prototypes as spine SoT.

### 7.4 Cohorts

**Owns:** vintage quality direction and which cohorts support current revenue.

**Five-second read:** whether newer vintages improve or worsen, and which cohorts currently fund revenue.

**Composition:**

1. Title + owned question  
2. Executive conclusion on vintage direction / contribution concentration  
3. Source / period / freshness + maturity  
4. Primary: cohort revenue contribution graph  
5. Exact cohort contribution table  
6. Distinct complementary analysis: comparable cohort-age matrix  
7. Investigation into strongest/weakest supporting cohorts  
8. Next investigation → Retention / LTV without duplicating those pages wholesale

**Agreed analyses (detail owned by Cohorts sprint):** contribution graph + exact contribution table; comparable cohort-age matrix as a separate analysis.

**Exclude:** full Retention page duplication; full LTV ladder duplication; legacy revenue-cohorts mock pages as SoT.

### 7.5 LTV

**Owns:** whether customers become more valuable and profitable.

**Five-second read:** cumulative value build, with net revenue LTV and contribution LTV kept distinct.

**Composition:**

1. Title + owned question  
2. Executive conclusion on value build / profitability path  
3. Source / period / freshness + margin assumption disclosure  
4. Primary: cumulative value build (net LTV)  
5. Complementary: contribution LTV when unlocked; Locked when assumptions absent  
6. Equivalent-age cohort comparison  
7. Strongest / weakest cohort investigation  
8. Next investigation → Acquisition (payback) / Cohorts

**Exclude:** confusing revenue retention with LTV; hiding margin assumption dependence.

### 7.6 Products

**Owns:** which entry products create valuable, repeat customers.

**MVP owns:**

- first-product customer quality;
- strongest and weakest entry products;
- downstream repeat / value;
- attribution and sample-size honesty;
- concentration as a supporting lens.

**Composition:**

1. Title + owned question  
2. Executive conclusion on entry quality  
3. Source / period / freshness + attribution coverage honesty  
4. Primary: first-product customer quality table  
5. Strongest / weakest entry products  
6. Downstream repeat / value evidence  
7. Concentration as supporting lens (not the hero claim)  
8. Sample-size and multi/unknown entry honesty  
9. Next investigation → Retention / LTV / Dashboard

**Purchase Path Explorer:** later analytical extension only. Not implemented in 6B MVP. Requires a separate deterministic analytical/metric contract before any presentation claim. Do not imply it ships with Products MVP.

**Exclude:** channel inventiveness; highest-NMV attribution revival; treating concentration as the sole product story.

### 7.7 Acquisition

**Owns:** efficient acquisition of economically valuable customers and spend recovery speed.

**Composition:**

1. Title + owned question  
2. Executive conclusion on CAC discipline / payback pressure  
3. Source / period / freshness + spend and margin assumption honesty  
4. Primary: CAC, LTV:CAC, payback  
5. Connection from cost to customer quality / value (links, not invented channel splits)  
6. Locked states without spend or contribution path  
7. Next investigation → Data (spend unlock) / LTV / Dashboard

**Exclude:** channel attribution without trustworthy source data; geo/product CAC splits in MVP; inventing quality scores from absent channel data.

### 7.8 Data

**Owns:** whether analysis is current, complete, and trustworthy.

**Composition:**

1. Title + owned question  
2. Active source  
3. Last refresh / upload  
4. Coverage and completeness  
5. Unlocked / locked analysis summary  
6. Assumptions  
7. Import / sync state honesty  
8. Methodology / trust detail on demand  

**Exclude:** requirement for a major analytical chart; pretending production Shopify ingestion is live; silent mock fallback.

---

## 8. Signal collapsed / expanded interaction

Signals are deterministic diagnoses from the canonical Signal contract (`lib/insights`; type name remains `Insight`). Presentation rules:

### 8.1 Collapsed state (concise)

- severity / status;
- conclusion-led title;
- observation in the same sentence or directly below;
- investigation link.

### 8.2 Expanded state

May reveal:

- why it matters;
- evidence;
- eligible population;
- caveat / sufficiency;
- methodology and provenance.

### 8.3 Interaction rules

- Click / expand is the primary interaction.
- Do not rely on hover for essential information.
- Do not duplicate Insight observations, sufficiency, or caveats inside Provenance surfaces.
- Dashboard and analytical pages place Matrix-eligible Signals; `/insights` is the complete inbox and bypasses Matrix.
- Do not invent new Signal IDs merely to fill pages.

---

## 9. Trust and Provenance progressive disclosure

### 9.1 Always visible where relevant

- source;
- reporting period;
- last successful update;
- locked / incomplete state.

### 9.2 Progressive disclosure (on demand)

- metric definition;
- eligible population;
- assumptions;
- maturity / completeness;
- caveats;
- methodology reference.

### 9.3 Explicit non-goals for trust UI

- no lineage graph;
- no confidence score;
- no Shopify-equivalence claim;
- no inventing trust metadata outside existing Provenance composition and import honesty.

Use sufficiency, maturity, observed/assumed, partial, unavailable, and locked states already supported by the product. Do not create a separate confidence UI.

---

## 10. Number, comparison, and maturity formatting

Precision must reflect decision usefulness, not raw calculator precision. Prefer **one decimal place** by default where commercially useful.

| Kind | Canonical presentation rule |
|------|-----------------------------|
| Percentages | One decimal when useful (e.g. `34.2%`); completed genuine zero → `0%` (not a dash) |
| Currency | Locale-appropriate money formatting; null / unavailable → `—` |
| Thousands / millions | Compact when it aids scan (e.g. `$1.2M`) without hiding material precision needed for the decision |
| Ratios | One decimal when useful (e.g. `3.2x`); Locked when path unavailable |
| Counts | Integers; no false percent rounding |
| Days / months | Whole days or Month+N labels; null → `—` |
| Completed zero | Show `0` / `0%` when the period completed with true zero |
| Unavailable | Em dash `—`; do not invent synthetic zero |
| Locked | Explicit Locked label / treatment when inputs (spend, margin, coverage) block the claim |
| Comparison wording | Every movement states its comparison basis (prior period, equivalent cohort age, selected reporting period, etc.) |
| Equivalent cohort-age | Compare cohorts only on an explicit equivalent-age basis; never imply age-mismatched fairness |
| Mature / partial / unavailable | Keep states visible; partial may show observed value with subdued styling + disclosure; unavailable/future → `—` |

Engine contracts remain authoritative for null vs zero semantics. UI must not re-derive money or invent availability.

---

## 11. Colour-role separation

Keep these roles separate:

| Role | Meaning |
|------|---------|
| Brand / interaction | Navigation, links, focus, primary controls |
| Semantic status | Favourable / watch / adverse commercial status |
| Chart / data-series | Series identity in visualisations |
| Neutral / unavailable | Disabled, locked, incomplete, non-evaluative chrome |

**Green means favourable commercial status**, not merely numerical increase. A rising CAC can be adverse even if the number went up.

Do not define exact brand RGB values in this Bible unless already canonically agreed elsewhere. Page sprints may refine tokens within these role separations.

---

## 12. Approved technical presentation stack

### Foundation

- existing Tailwind CSS;
- existing shadcn/ui primitives;
- Radix through shadcn;
- Lucide icons.

### Charts

- Recharts as default where suitable;
- purpose-built HTML/CSS for cohort matrices and heatmaps;
- no additional chart library without a proven, founder-approved requirement.

### Tables

- existing semantic tables by default;
- TanStack Table only where sorting / filtering / pagination adds clear investigation value.

### Components

- build representative page experiences first;
- extract shared components only after real reuse is demonstrated.

### Storybook

- deferred until approximately 5–8 stable reusable analytical components/states exist.

### References only (not dependencies)

- Shopify Polaris;
- Financial Times Visual Vocabulary;
- Tremor.

Do not add D3, ECharts, Sankey, or Storybook-first design-system programmes in 6B MVP.

---

## 13. Recommended presentation build order (mapped to backlog IDs)

**Execution authority remains** [`PRODUCT_RECONCILIATION_BACKLOG.md`](PRODUCT_RECONCILIATION_BACKLOG.md) §10. This section is presentation guidance only and uses §10.3 IDs exclusively.

```text
6B-VISIBLE-PRODUCT-BIBLE   ← this document
  → 6B-DASHBOARD           (shared presentation primitives extracted after real reuse)
  → 6B-INSIGHTS
  → 6B-RETENTION
  → 6B-LTV
  → 6B-COHORTS
  → 6B-PRODUCTS
  → 6B-ACQUISITION
  → 6B-DATA                (Data honesty + whole-product calibration)
```

Each page UI sprint must design/spec implementation details in its own sprint record before coding. This Bible already holds composition depth; it does not replace sprint-level implementation planning.

Do not invent alternate IDs such as `6B-1`…`6B-9` as execution authority.

---

## 14. Explicit deferrals

Do **not** include in 6B MVP:

- production Shopify ingestion;
- Supabase persistence redesign;
- scheduled Shopify sync;
- new metric invention;
- new Signal IDs merely to fill pages;
- Purchase Path Explorer implementation;
- AI chat or recommendations;
- benchmarking;
- channel attribution;
- lineage UI;
- Storybook-first design-system programme;
- D3 / ECharts / Sankey dependencies;
- legacy route deletion;
- 6C consolidation;
- DOC-POST-6A-TRUTH cleanup (deferred separately).

---

## 15. Non-goals and anti-patterns

**Non-goals**

- Replacing backlog §10 as sequencing SoT  
- Duplicating metric formulas  
- Claiming page UI is already upgraded by publishing this Bible  
- Confidence scores, lineage graphs, or Shopify-equivalence claims  
- Component-library extraction before demonstrated reuse  

**Anti-patterns**

- Chart walls and eight-card KPI strips that bury the conclusion  
- Hover-only essential information  
- Collapsing commercially distinct metrics into one ambiguous number  
- Age-mismatched cohort comparisons presented as fair  
- Synthetic zeros for unavailable cells  
- Green-for-up regardless of commercial meaning  
- Silent mock data on production-shaped paths  
- Treating quarantined legacy pages or the historical Revenue Cohorts UI template as spine presentation SoT  
- Filling pages with new Signals or metrics invented for visual completeness
