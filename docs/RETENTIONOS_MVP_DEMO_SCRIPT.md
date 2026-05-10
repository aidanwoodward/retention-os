# RetentionOS — MVP Founder Demo Script

Audience: founders, growth leads, CFOs, and operators evaluating whether customer economics merit more capital.

Companion app: **`restart-retentionos-mvp` spine** — `/dashboard`, `/cohorts`, `/retention`, `/ltv`, `/insights`, `/data`.

---

## A. One-line positioning

**RetentionOS helps e‑commerce operators understand whether growth is real, repeatable, and economically durable by diagnosing customer economics across cohort quality, retention depth, cumulative net revenue and contribution LTV, and plain‑English revenue durability posture — before they scale spend.**

---

## B. 30-second intro script

“In the next few minutes we’ll walk RetentionOS’s Revenue Durability Command Centre. Everything you see feeds from **one deterministic demo dataset** and a shared **metric engine** — same numbers on every route. The Dashboard gives you posture and KPIs at a glance; Cohorts and Retention unpack where quality and timing diverge; LTV ladders separate **net revenue story** from **contribution story**; Insights surfaces **prioritized moves** using explicit rules — not AI; and Data documents exactly what’s live versus roadmap. Later we plug in uploads and live ingestion, but the MVP proves the analytic spine.”

---

## C. Route-by-route demo script (≈ 3–5 minutes)

Suggested flow matches how an operator diagnoses: headline → dispersion → pacing → ladders → decisions → trust.

### 1) `/dashboard` (~60–90s)

- Open with the **dark demo banner**: sets expectations — demo dataset, `getDemoDataset()` → `/lib/metrics`, no live Shopify on this spine.
- **Hero — revenue durability posture:** Call out the **posture label** (Healthy / Mixed / Watch) and the **illustrative disc** — it is **not a scored index**; it reflects threshold-based rules you can read in copy.
- **Deterministic signals & recommended moves:** These pull from the same **insight engine** as `/insights` — say it once: “rules, evidence, metric references.”
- **KPI tiers:** Walk the four **primaries**: repeat depth, **first-to-second within 90 days**, **avg terminal net revenue LTV**, **avg terminal contribution LTV**. Then skim **portfolio fundamentals** and **calendar breadth** (Month +N) as context.
- **“What we see in this demo”:** Use as narrative glue — deterministic bullets grounded in fixture math.
- **Close:** “This is where I’d sanity-check posture before digging into dispersion.” **→ Cohorts**

### 2) `/cohorts` (~30–45s)

- Frame: acquisition-month cohorts answer **where net revenue LTV dispersion starts** across **first‑order calendar months**.
- Point to KPI strip, then scroll the **economics table** — net revenue, contribution, staircase LTV averages, Month +N active.
- Voiceover: “If newer months look materially weaker than older ones, raise **acquisition-quality variance risk**.” **→ Retention**

### 3) `/retention` (~30–45s)

- “Same orders, tighter lens.” Contrast **journey pacing** (**first‑to‑second in 90 days**, days between first and second) with **calendar Month + strips** (**Month +N active rate** — any qualifying order in that cohort calendar month offset, UTC).
- Call out **why Month +1 can look thin while ninety‑day reordering holds** — classic misread avoidance.
- **→ LTV**

### 4) `/ltv` (~30–45s)

- Explain **two rows of cards**: staircase tails vs portfolio context — intentional layout.
- “Each column stacks **average cumulative net revenue per customer** by cohort‑age offset; counterpart **contribution** columns apply our **fixture margin assumptions**.”
- Emphasise: underwriting and payout discipline need **both** revenue LTV **and** contribution LTV visible.
- **→ Insights**

### 5) `/insights` (~45–60s)

- Restate honesty up front from the banner: demo dataset, deterministic engine, **not live telemetry** on MVP routes.
- “These are **operator decision cards** — severity, evidence, **recommended operator move**, metric reference IDs you can reconcile in tabs, qualitative rule coverage confidence — explicitly **not a statistical CI**.”
- Pick one warning and one info card briefly; defer deep debate to stakeholder Q&A.
- **→ Data**

### 6) `/data` (~30–45s)

- **Trust ledger:** mode = demo, **simulation window end date**, engine path, “Shopify / Supabase off for this spine,” **CSV upload coming next**.
- Surface **fixture counts** and **canonical objects**; end on **Not live yet** so nobody mistakes placeholder UI for production connectivity.
- Close the tour: “If someone asks ‘is this real?’ — this is the page you share first.”

---

## D. Key talking points per route

| Route | What they’re looking at | Why it matters commercially | Decisions it supports | Live demo line you can use |
|-------|-------------------------|-----------------------------|------------------------|----------------------------|
| **Dashboard** | Portfolio KPIs, posture hero, insight-driven risks/moves, demo narrative | Leadership needs one honest read before budget and hiring | Where to focus this week; what to verify before scaling | “Posture + four primaries tell me if I’m underwriting growth or hope.” |
| **Cohorts** | First-order month tables: revenue, contribution, LTV, Month +N | Spend quality varies by acquisition month — tails must be comparable | Pause/press spend; channel mix reviews; creative calendar | “I’m looking for months that don’t reproduce mature ladder shape.” |
| **Retention** | Repeat rate, 90‑day path to second order, calendar strip active rates | Churn panic vs replenishment reality; CRM and ops cadence | Nurture design, expectations on Month +N | “Journey vs calendar — both or you mis-diagnose softness.” |
| **LTV** | Cumulative averages by cohort age; net revenue vs contribution | Cash and margin underwriting, not Shopify top-line vibes | Liquidity plans, payout policy, GM conversation | “Revenue ladder is not cash ladder — contribution has to ride alongside.” |
| **Insights** | Rule-based cards ranked by severity | Bridges metrics to prioritized commercial moves | Agenda for growth standup | “Evidence + action + refs — auditors can trace everything.” |
| **Data** | Counts, window, lineage, roadmap gaps | Prevents credibility loss when demo vs live | Procurement, stakeholder trust | “No fake integrations — roadmap is explicit.” |

---

## E. Demo data disclaimer

- This MVP showcases **canonical demo data** (fixture brand scenario: **Lumin & River**) built for transparent customer-economics demonstrations.
- The **six MVP routes** consume **`getDemoDataset()`** outputs through **`/lib/metrics`**. Shopify, CSV upload, warehouse exports, Supabase KPI materialisations, or other live ingestion paths are **not active on this spine** in the current MVP checkpoint — the UI tells you so.
- Insight cards are **`/lib/insights`** rules running on metric outputs — not live store telemetry and not probabilistic attribution models.

---

## F. Current product truth

**Real today (in this codebase path):**

- **Demo routing guard:** Requests outside the six spine routes (except **Settings** and auth flows) **redirect to `/dashboard`**, legacy analytics URLs map back onto the command centre, and **dummy-data POST APIs return 403 in production** so demos do not surface destructive dev tools.
- Canonical **demo dataset** and deterministic **metric engine** (`/lib/metrics`).
- **Cohort economics**, **retention / repeat mechanics**, **LTV ladders** (net revenue and contribution surfaces where margin assumptions apply).
- **Diagnostic insight engine** — explicit thresholds, deterministic cards, qualitative confidence tied to rule coverage (`/lib/insights`).
- **Transparency surfaces** (“Data”) listing counts, lineage, gaps.

**Not real yet on this MVP spine (explicitly roadmap or out-of-scope)**

- Live **Shopify** (and similar) ingestion into these surfaces.
- Full **CAC / payback engine** stitched to cohort outcomes.
- **Product-level customer quality engine** tying SKU mix to cohort durability.
- **Scenario modelling** workspace.
- **AI-generated recommendations** — none; insight copy is rule-based narration.

---

## G. Objection handling

**“Is this live data?”**  
“Not on these six MVP routes — it’s deterministic demo data wired through the metric engine so we can demo the analytic spine honestly. Uploads and live connectors are roadmap; the Data route lists what exists today.”

**“How is this different from Shopify analytics?”**  
“Shopify is excellent for storefront operations and aggregates. RetentionOS is built for **cohort-level economics**: first-order calendar alignment, repeatable purchase depth with explicit definitions (90-day reorder vs Month + strips), staircase LTV averages, modeled contribution ladders, and a durability posture you can reconcile across tabs.”

**“How is this different from Triple Whale / Northbeam?”**  
“Those stacks centre **media attribution and channel efficiency**. RetentionOS centres **whether customer revenue is durable** — cohort dispersion, reorder timing, staircase economics, and deterministic insight cards tied to merchant metrics — orthogonal questions, complementary tools.”

**“Where do the insights come from?”**  
“Transparent rules in **`/lib/insights`** evaluating metric outputs — severity, supporting evidence strings, metric reference IDs that map back to constructs you see on Dashboard, Cohort, Retention, and LTV. No chat model, no black box.”

**“What happens when I upload my data?”**  
“Roadmap: normalize into the same canonical order/customer/product shapes the engine consumes, then these routes hydrate from your truth instead of fixtures. MVP proves definitions and narration first.”

**“Can this show CAC / payback?”**  
“Not in this MVP — we expose repeat, journey conversion, ladders, dispersion, posture. Acquisition economics modules are next wave once ingestion and finance hooks land.”

**“Is this AI?”**  
“No AI recommendations in this MVP. Cards are synthesized from predetermined rules thresholding deterministic metrics.”

---

## H. Next product modules (roadmap framing)

When closing with investors or design partners:

1. **CSV upload / onboarding** — land tenant truth in canonical models without implying fake connectivity.
2. **CAC & payback** — tie cohort outcomes to acquisition spend timelines (once spend truth is ingestible).
3. **Product-level customer quality** — how SKU / bundle arcs influence ladder durability vs acquisition mix shifts.
4. **Acquisition / channel quality** — bridge creative and channel payloads to dispersion patterns responsibly.
5. **Scenario modelling** — stress ladders and posture assumptions under spend and elasticity scenarios.
6. **Revenue Durability Score methodology** — optional future composite with published inputs/weights once legal and FP&A standards warrant a formal score (today posture is heuristic label without composite index).

---

## I. Demo close

Most brands **know yesterday’s revenue**. RetentionOS tells them whether that revenue is **repeatable**, **economically coherent under contribution assumptions**, **stable across cohorts**, and **backed by deterministic math you can inspect** — and when it isn’t honest to imply live data, **we say so on the tin**.

**Closer line:**

> **“Most brands know revenue. RetentionOS tells them whether that revenue is durable.”**
