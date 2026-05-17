# RetentionOS — MVP Founder Demo Script

Audience: founders, growth leads, CFOs, and operators evaluating whether customer economics merit more capital.

Companion app: **`restart-retentionos-mvp` spine** — `/dashboard`, `/cohorts`, `/retention`, `/ltv`, `/insights`, `/data`.

---

## A. One-line positioning

**RetentionOS helps e‑commerce operators understand whether growth is real, repeatable, and economically durable by diagnosing customer economics across cohort quality, retention depth, cumulative net revenue and contribution LTV, and plain‑English revenue durability posture — before they scale spend.**

---

## B. 30-second intro script

“In the next few minutes we’ll walk RetentionOS’s Revenue Durability Command Centre. The KPI spine runs from **either** the **canonical demo dataset** **or** an **uploaded CSV snapshot you save for this browser session** — same **metric engine** (`/lib/metrics`) and **rules-based insights** (`/lib/insights`) either way, so numbers stay reconcilable across tabs. The Dashboard gives you posture and KPIs at a glance; Cohorts and Retention unpack where quality and timing diverge; LTV ladders separate **net revenue story** from **contribution story**; Insights surfaces **prioritized moves** using explicit rules — not AI; and **Data** is the **source control centre**: demo vs session CSV, validation preview, and honest limits. Uploads are **session-only** (**not** persisted to Supabase). **Live Shopify does not power this spine.** CAC/payback, product and channel quality modules, scenario modelling, and a formal scored Revenue Durability Index are still out of scope for this MVP checkpoint.”

---

## C. Route-by-route demo script (≈ 3–5 minutes)

Suggested flow matches how an operator diagnoses: headline → dispersion → pacing → ladders → decisions → trust.

### 1) `/dashboard` (~60–90s)

- Open with the **dark source banner**: **Active source** is either **Demo dataset** or **Uploaded CSV session dataset** — same layout either way; calculators unchanged (`resolveCommandCentreDatasetSource` → view models).
- **Hero — revenue durability posture:** Call out the **posture label** (Healthy / Mixed / Watch) and the **illustrative disc** — it is **not a scored index**; it reflects threshold-based rules you can read in copy.
- **Deterministic signals & recommended moves:** These pull from the same **insight engine** as `/insights` — say it once: “rules, evidence, metric references.”
- **KPI tiers:** Walk the four **primaries**: repeat depth, **first-to-second within 90 days**, **avg terminal net revenue LTV**, **avg terminal contribution LTV**. Then skim **portfolio fundamentals** and **calendar breadth** (Month +N) as context.
- **“What we see in this demo”:** When on **demo** source, use as narrative glue — deterministic bullets grounded in fixture math; when on **uploaded** source, same structure but backed by the session CSV.
- **Close:** “This is where I’d sanity-check posture before digging into dispersion.” **→ Cohorts**

### 2) `/cohorts` (~30–45s)

- Frame: acquisition-month cohorts answer **where net revenue LTV dispersion starts** across **first‑order calendar months**.
- Point to KPI strip, then scroll the **economics table** — net revenue, contribution, staircase LTV averages, Month +N active.
- Confirm the **banner** matches your intended source (demo vs upload).
- Voiceover: “If newer months look materially weaker than older ones, raise **acquisition-quality variance risk**.” **→ Retention**

### 3) `/retention` (~30–45s)

- “Same orders, tighter lens.” Contrast **journey pacing** (**first‑to‑second in 90 days**, days between first and second) with **calendar Month + strips** (**Month +N active rate** — any qualifying order in that cohort calendar month offset, UTC).
- Call out **why Month +1 can look thin while ninety‑day reordering holds** — classic misread avoidance.
- **→ LTV**

### 4) `/ltv` (~30–45s)

- Explain **two rows of cards**: staircase tails vs portfolio context — intentional layout.
- “Each column stacks **average cumulative net revenue per customer** by cohort‑age offset; counterpart **contribution** columns apply our **fixture margin assumptions** (demo or derived for uploads per existing engine rules).”
- Emphasise: underwriting and payout discipline need **both** revenue LTV **and** contribution LTV visible.
- **→ Insights**

### 5) `/insights` (~45–60s)

- **Banner** again: same **Active source** contract as other KPI routes.
- “These are **operator decision cards** — severity, evidence, **recommended operator move**, metric reference IDs you can reconcile in tabs, qualitative rule coverage confidence — explicitly **not a statistical CI.**”
- Pick one warning and one info card briefly; defer deep debate to stakeholder Q&A.
- **→ Data**

### 6) `/data` (~30–45s)

- **Control centre:** **Current active source** — canonical demo vs **Uploaded CSV session dataset**; chip shows **Demo fixture** vs **Session-scoped CSV**.
- **Route coverage:** Grid lists Dashboard, Cohorts, Retention, LTV, Insights, and Data — all KPI routes share the **same browser-tab session selection** as this page.
- **Fixture counts** below stay **demo-aligned** on purpose (audit trail); CSV workflow: validate, preview, **save to sessionStorage**, **Revert to demo dataset** clears upload for all KPI routes.
- **Transparency / Not live yet:** Supabase persistence for uploads, live Shopify spine, CAC/payback, product/channel quality, scenarios, formal Revenue Durability Score — still roadmap or explicit non-goals for this MVP.
- Close the tour: “If someone asks ‘is this real?’ — start here, then match banners on every route.”

---

## Uploaded CSV demo flow

Step-by-step for a live or async walkthrough:

1. **Start on `/data`.** Confirm **Data source control centre** and the **Current active source** line.
2. **Clear / revert to demo** if anything is loaded (e.g. **Revert to demo dataset**) so you begin from a known baseline.
3. **Show demo source:** Chip **Demo fixture**; **Route coverage** describes KPI routes using `getDemoDataset()` → `/lib/metrics`.
4. **Upload a valid sample CSV** in **CSV onboarding preview** (combined order + line contract per `/lib/import`).
5. **Review validation** and **save for browser session** (persists canonical-shaped dataset JSON to **sessionStorage** — not Supabase).
6. **Show `/dashboard`:** Dark banner reads **Uploaded CSV session dataset**; KPIs and on-page observations reflect the upload.
7. **Show `/cohorts`:** Table and KPIs from the same session selection.
8. **Show `/retention`:** Journey + Month +N constructs from the upload.
9. **Show `/ltv`:** Ladders from the upload.
10. **Show `/insights`:** Same rules engine; evidence tied to metrics from the uploaded slice.
11. **Return to `/data`:** Hero shows **Uploaded CSV session dataset**; route coverage matches; fixture-count section still documents **canonical demo** for audit.
12. **Revert** (clear uploaded dataset): All KPI routes fall back to **Demo dataset** on next navigation; banners align.

### Uploaded-data source-switch QA checklist (code-audited)

| Step | Expectation |
|------|-------------|
| No valid upload in `sessionStorage` | `resolveCommandCentreDatasetSource()` uses `buildDemoRetentionOSDataset()`; all five KPI routes show **Demo dataset** in `MetricSourceBanner`. |
| Save valid upload | `saveUploadedRetentionOSDataset` writes `retentionos:uploadedDataset:v1`; meta must be `uploaded_csv`, `isUploaded: true`, `errorCount` 0. |
| `/dashboard` … `/insights` | Each client page calls `resolveCommandCentreDatasetSource()` in `useLayoutEffect` and builds view models from `selection.dataset`; banner **Uploaded CSV session dataset**. |
| `/data` | `useDataPageSessionSummary` + hero/`DataPageRouteCoverageSection` reflect upload state; **Fixture counts** remain demo-derived server snapshot; CSV section explains session scope. |
| `clearUploadedRetentionOSDataset()` | Removes session key; revisiting KPI routes resolves demo again. |

---

## D. Key talking points per route

| Route | What they’re looking at | Why it matters commercially | Decisions it supports | Live demo line you can use |
|-------|-------------------------|-----------------------------|------------------------|----------------------------|
| **Dashboard** | Portfolio KPIs, posture hero, insight-driven risks/moves; source-aware banner | Leadership needs one honest read before budget and hiring | Where to focus this week; what to verify before scaling | “Posture + four primaries tell me if I’m underwriting growth or hope.” |
| **Cohorts** | First-order month tables: revenue, contribution, LTV, Month +N | Spend quality varies by acquisition month — tails must be comparable | Pause/press spend; channel mix reviews; creative calendar | “I’m looking for months that don’t reproduce mature ladder shape.” |
| **Retention** | Repeat rate, 90‑day path to second order, calendar strip active rates | Churn panic vs replenishment reality; CRM and ops cadence | Nurture design, expectations on Month +N | “Journey vs calendar — both or you mis-diagnose softness.” |
| **LTV** | Cumulative averages by cohort age; net revenue vs contribution | Cash and margin underwriting, not Shopify top-line vibes | Liquidity plans, payout policy, GM conversation | “Revenue ladder is not cash ladder — contribution has to ride alongside.” |
| **Insights** | Rule-based cards ranked by severity | Bridges metrics to prioritized commercial moves | Agenda for growth standup | “Evidence + action + refs — auditors can trace everything.” |
| **Data** | Demo fixture ledger, session CSV control, route coverage, import preview | Prevents credibility loss when demo vs upload vs future live | Procurement, stakeholder trust; operator self-serve CSV tryout | “This page names the active source and what still isn’t wired.” |

---

## E. Demo data disclaimer

- This MVP showcases **canonical demo data** (fixture brand scenario: **Lumin & River**) and optional **browser-session CSV** that normalises into the **same domain shapes** the engine consumes.
- With **no session upload**, the **six MVP KPI-related routes** consume **`getDemoDataset()`** outputs through **`/lib/metrics`** (and **`/lib/insights`** for diagnostics). With a **saved session upload**, those routes consume the **parsed `RetentionOSDataset`** from **sessionStorage** for **this tab only**.
- **Uploaded CSV is not persisted to Supabase** (or otherwise server-synced) in this product path.
- **Live Shopify ingestion does not power** the command-centre spine; warehouse materialisations and Supabase KPI paths are **inactive** on these surfaces.
- Insight cards are **`/lib/insights`** rules on metric outputs — **not** live store telemetry, **not** probabilistic attribution models, **not** LLM-generated recommendations.

---

## F. Current product truth

**Real today (in this codebase path):**

- **Demo routing guard:** Requests outside the six spine routes (except **Settings** and auth flows) **redirect to `/dashboard`**, legacy analytics URLs map back onto the command centre, and **dummy-data POST APIs return 403 in production** so demos do not surface destructive dev tools.
- **Canonical demo dataset** and deterministic **metric engine** (`/lib/metrics`).
- **CSV import contract, validation, and normalisation** (`/lib/import` and related paths) with **preview on `/data`**.
- **Uploaded dataset session storage** (`sessionStorage`, key `retentionos:uploadedDataset:v1`) — **browser tab session**; survives reload while the tab/session storage remains.
- **Selected-source command-centre pages:** `/dashboard`, `/cohorts`, `/retention`, `/ltv`, `/insights` resolve **`resolveCommandCentreDatasetSource()`** client-side and feed **`build*ViewModelFromDataset`**; **`/data`** is the **source control centre** (hero + route coverage + revert).
- **Deterministic insights from selected dataset** — same rules; inputs switch with the dataset.
- **Transparency surfaces (“Data”)** — demo fixture counts, lineage, explicit gaps.

**Not real yet on this MVP spine (explicitly roadmap or out-of-scope)**

- **Supabase (or server) persistence** for uploaded datasets and multi-tenant truth.
- **Live Shopify-powered** command-centre spine.
- **CAC / payback** engine tied to spend truth.
- **Product-level customer quality** tied to SKU/customer arcs.
- **Acquisition / channel quality** module on the spine.
- **Scenario modelling** workspace.
- **Formal scored Revenue Durability Score** (composite index with published methodology) — posture remains a **heuristic label**, not that composite.
- **AI-generated recommendations** — none; insight copy is rule-based narration.

---

## G. Objection handling

**“Is this live data?”**  
“Not live Shopify on these routes. You get either our deterministic demo fixture or **your own CSV** saved **in the browser session** — same engine, honest banners. Nothing is mirrored to our database for this MVP path.”

**“Does my upload persist?”**  
“It persists in **sessionStorage for this tab** until you clear it or revert on **Data**. It is **not** written to Supabase.”

**“How is this different from Shopify analytics?”**  
“Shopify is excellent for storefront operations and aggregates. RetentionOS is built for **cohort-level economics**: first-order calendar alignment, repeatable purchase depth with explicit definitions (90-day reorder vs Month + strips), staircase LTV averages, modeled contribution ladders, and a durability posture you can reconcile across tabs.”

**“How is this different from Triple Whale / Northbeam?”**  
“Those stacks centre **media attribution and channel efficiency**. RetentionOS centres **whether customer revenue is durable** — cohort dispersion, reorder timing, staircase economics, and deterministic insight cards tied to merchant metrics — orthogonal questions, complementary tools.”

**“Where do the insights come from?”**  
“Transparent rules in **`/lib/insights`** evaluating metric outputs — severity, supporting evidence strings, metric reference IDs that map back to constructs you see on Dashboard, Cohort, Retention, and LTV. No chat model, no black box.”

**“What happens when I upload my data?”**  
“Validate the CSV against the import contract on **`/data`**, save when it passes, and **Dashboard through Insights** recompute from that snapshot **for this browser session**. Revert anytime. Server persistence and connectors are the next wave.”

**“Can this show CAC / payback?”**  
“Not in this MVP — we expose repeat, journey conversion, ladders, dispersion, posture. Acquisition economics modules are next wave once spend truth is ingestible and trustworthy.”

**“Is this AI?”**  
“No AI recommendations in this MVP. Cards are synthesized from predetermined rules thresholding deterministic metrics.”

---

## H. Next product modules (roadmap framing)

When closing with investors or design partners:

1. **Tenant persistence & connectors** — server-side storage, isolation, and optional Shopify (or warehouse) ingestion **without** changing the honest MVP spine narrative.
2. **CAC & payback** — tie cohort outcomes to acquisition spend timelines (once spend truth is ingestible).
3. **Product-level customer quality** — how SKU / bundle arcs influence ladder durability vs acquisition mix shifts.
4. **Acquisition / channel quality** — bridge creative and channel payloads to dispersion patterns responsibly.
5. **Scenario modelling** — stress ladders and posture assumptions under spend and elasticity scenarios.
6. **Revenue Durability Score methodology** — optional future composite with published inputs/weights once legal and FP&A standards warrant a formal score (today posture is heuristic label without composite index).

---

## I. Demo close

Most brands **know yesterday’s revenue**. RetentionOS tells them whether that revenue is **repeatable**, **economically coherent under contribution assumptions**, **stable across cohorts**, and **backed by deterministic math you can inspect** — and when it isn’t honest to imply live data or cloud persistence, **we say so on the tin**.

**Closer line:**

> **“Most brands know revenue. RetentionOS tells them whether that revenue is durable.”**
