# RetentionOS Restart Audit V2

> **Historical restart comparison.** This document accurately records its six-route, pre-session-upload checkpoint but is no longer the current architecture source. Acquisition and Products are now on the retained eight-route spine, and session CSV ingestion is implemented. Use [`RETENTIONOS_ARCHITECTURE.md`](../../RETENTIONOS_ARCHITECTURE.md) for current architecture and [`RETENTIONOS_UPLOADED_DATA_MVP_CHECKPOINT.md`](RETENTIONOS_UPLOADED_DATA_MVP_CHECKPOINT.md) for the upload milestone.

**For the post-upload-data MVP state, see RETENTIONOS_UPLOADED_DATA_MVP_CHECKPOINT.md.**

**Purpose:** Re-baseline progress after the restart sprints (post-`804ef25` audit). This document compares the **original** restart audit snapshot to the **current** codebase as of the latest accountability checkpoint. It is founder/operator-facing: honest about what is real, what is demo, and what still carries risk.

**Companion documents:** `RETENTIONOS_RESTART_AUDIT.md` (historical baseline — do not treat as current truth), `docs/RETENTIONOS_MVP_DEMO_SCRIPT.md` (demo narrative for the six-route spine).

**Scope note:** Sprint 2E is documentation only. Claims below are grounded in repo structure, `package.json` scripts, routing/middleware behaviour, and public module exports — not on unverified production deployments.

---

## A. Executive summary

### Current product / codebase state

RetentionOS is still a **Next.js 15 App Router** app with **Supabase** and legacy integration scaffolding in the repo. The **intentional MVP product surface** is now a **six-route Revenue Durability Command Centre**: `/dashboard`, `/cohorts`, `/retention`, `/ltv`, `/insights`, `/data`.

Those routes are wired to a **single deterministic demo dataset** (`getDemoDataset()` in `/lib/demo`), a **pure TypeScript metric engine** (`/lib/metrics`), and a **rules-based insights layer** (`/lib/insights`). UI is anchored by **`CommandCentrePageFrame`** (`/components/mvp`) and copy/structure helpers in **`/lib/mvp/cohesion.ts`**. Legacy and prototype **page** URLs are **redirected** toward the spine or parent segment via **`getMvpContainmentRedirect()`** in **`/lib/mvp/demo-surface-guard.ts`** and **`middleware.ts`**.

### What has materially changed since the original audit

| Theme | Original audit (V1) | Current (V2) |
| ----- | ------------------- | ------------ |
| Build / CI | Lint and build **failed**; no `typecheck` script | **`npm run lint`**, **`typecheck`**, and **`build`** **pass** |
| MVP routes | `/ltv`, `/insights`, `/data` **missing**; spine favoured `/retention-ltv/*` | Six MVP routes **exist** and consume **one engine path** |
| Metric logic | Fragmented across APIs, views, pages, demo fallbacks | **Centralised** in `/lib/metrics` + view models; demo dataset is explicit |
| Insights | WIP / scattered; target engine not the spine | **`/lib/insights`** with deterministic rules + view model for `/insights` |
| Navigation / demos | Broad surface; easy to land on legacy or ambiguous data | **Focused sidebar**; **route containment**; **demo script**; dev `/` → `/dashboard` |
| Destructive dev APIs | Called out as risky; unguarded in narrative | **POST** dummy reseed endpoints **return 403 in `NODE_ENV === 'production'`** |

### Current app health (validated at audit write time)

Commands run: **`npm run lint`**, **`npm run typecheck`** (`tsc --noEmit`), **`npm run build`** — **all succeeded**.

### Current MVP readiness

**Demo-ready** for a **founder-led** walkthrough of **customer economics diagnostics** on a **transparent fixture**: cohort economics, retention/repeat constructs, cumulative net/revenue vs contribution LTV, rule-based insights, and a **Data** trust ledger. **Not** ready to claim **live merchant truth**, **CSV onboarding**, **CAC/payback**, or **production-hardened auth** across the full spine without additional work (see sections E, G, H).

---

## B. Original state vs current state

| Area | Original (V1 snapshot) | Current (V2) |
| ---- | ---------------------- | ------------ |
| **Build health** | Lint failures blocked production build; no standalone typecheck | Lint, typecheck, and production **build pass** |
| **Route surface** | Large; `/retention-ltv/*` treated as “most complete”; target spine incomplete | **Six MVP routes** active; **legacy pages still in repo** but **contained** by redirects for normal browsing |
| **Navigation** | Broad / inconsistent with target MVP | **Core + Account (Settings)** in `AppSidebar`; removed “Coming next” shortcuts that pointed at placeholder modules |
| **Metric logic** | Split across Supabase views, API routes, pages, ad hoc demo | **Pure functions** in `/lib/metrics`; **view models** per page; **`runDemoMetricSanityCheck`** for accountability |
| **Demo data** | Mixed / ambiguous (`lib/demo-data`, API fallbacks, page-local dummy) | **Canonical** `getDemoDataset()` + typed **`/lib/types`** domain shapes for engine inputs |
| **Insights** | Fragmented / placeholder on old surfaces | **`/lib/insights`**: thresholds, rules, `generateDiagnosticInsights*`, **`buildInsightsPageViewModel`** |
| **Dashboard** | RED / mixed sources | **`DashboardExecutive`** path wired to **`buildDashboardViewModel`** (metric engine) with Supabase session gate in prod |
| **Cohorts** | API / view dependent | **Client page** → **`buildCohortsPageViewModel`** → cohort table + KPIs from demo dataset |
| **Retention** | Demo fragments / API splits | **`RetentionClient`** → **`buildRetentionPageViewModel`** (journey + Month+N style constructs) |
| **LTV** | Route missing in V1 | **`/ltv`** → **`buildLTVPageViewModel`** (staircase net + contribution LTV) |
| **Data page** | Missing in V1 | **`/data`** → **`buildDataPageViewModel`** + fixture/window copy; transparency-first |
| **Route containment** | Not present; audit recommended “hide” | **`middleware`** + **`getMvpContainmentRedirect`**: non-spine routes → `/dashboard` or parent spine path |
| **Destructive dummy APIs** | Documented as dangerous (delete + reseed) | **`/api/dev/generate-dummy-data`** and **`/api/sync/dummy-data`**: **`assertDestructiveDevApiAllowed`** blocks in **production** |
| **UI/UX** | Legacy clusters dominant | **Base44-informed** command-centre polish; shared **`CommandCentrePageFrame`**; cohesive banners |
| **Founder demo readiness** | Unclear / risky exposed prototype | **`docs/RETENTIONOS_MVP_DEMO_SCRIPT.md`** + contained routes + honest “demo dataset” copy |

---

## C. Commit journey (restart — major milestones)

Approximate mapping from `git log` on branch `restart-retentionos-mvp` (newest first where listed):

| Theme | Representative commit(s) | What it signals |
| ----- | ------------------------ | -------------- |
| **Audit baseline** | `804ef25` | Original `RETENTIONOS_RESTART_AUDIT.md` anchored the pre-restart risks |
| **Pre-restart preservation** | `c2b07ae` | WIP baseline preserved before structured restart |
| **Build stabilisation** | `8dc2427`, `be08264` | Baseline build + lint warning cleanup so CI-like scripts are usable |
| **Canonical types** | `1b0b595` | `/lib/types` domain model for engine-aligned work |
| **Demo dataset** | `0075e21` | `getDemoDataset()` and fixture narrative (Lumin & River scenario per demo docs) |
| **Metric engine** | `84de355` | Core `/lib/metrics` calculations (cohorts, retention, repeat, LTV) |
| **Sanity checks** | `29cf781` | `runDemoMetricSanityCheck` — regression signal on fixture outputs |
| **MVP route wiring** | `e31feca`, `97610f5`, `0b39210`, `6037c43` | Cohorts, retention, LTV, dashboard wired to engine view models |
| **Navigation simplification** | `660cc5b` | Sidebar focused toward command centre |
| **Insights engine** | `141450d` | Deterministic `/lib/insights` |
| **Insights page** | `0f9603f` | `/insights` wired to insights view model |
| **Data page** | `4de630f` | `/data` wired to transparency / counts |
| **Command-centre cohesion** | `387159e` | `/lib/mvp/cohesion.ts` — shared copy, nav metadata, banners |
| **QA / journey** | `ae2026d` | Command-centre journey validation |
| **Base44-informed UI pass** | `d64f979` | Visual/interaction polish aligned to command-centre thesis |
| **Demo readiness polish** | `c5917d4` | Demo-facing refinements |
| **Founder demo script** | `6bc0754` | `docs/RETENTIONOS_MVP_DEMO_SCRIPT.md` |
| **Route hardening** | `6ac95d5` | `demo-surface-guard`, middleware containment, production block on dummy reseed POST |

---

## D. What is now real (precise)

The following are **implemented in code** and **used by the six MVP routes** (not aspirational bullets):

- **Canonical domain types** — `/lib/types` exports (`Customer`, `Order`, `OrderLineItem`, `Product`, `Cohort`, `RetentionPoint`, `Insight`, `MarginAssumptions`, `ScenarioInput`/`Output`, etc.) as the shared vocabulary for engine-aligned features.
- **Deterministic demo dataset** — `getDemoDataset()` from `/lib/demo` (re-exported via `lib/demo/index.ts`); includes margin assumptions and config surfaced on **Data**.
- **Pure metric engine** — `/lib/metrics`: cohort calculations, retention-by-cohort series, repeat / first-to-second constructs, LTV-by-cohort staircase; **UTC month** utilities and documented fractional rates in module copy.
- **Cohort / retention / repeat / LTV calculations** — Consumed via **view models**: `cohort-view-model`, `retention-view-model`, `ltv-view-model`, `dashboard-view-model`, `data-view-model`.
- **Contribution LTV** — Derived using **fixture margin assumptions** (`DEMO_MARGIN_ASSUMPTIONS` / demo config) wired through the engine (not live COGS feeds).
- **Deterministic insights engine** — `/lib/insights`: `evaluateRevenueDurabilityStatus`, rule thresholds, `generateDiagnosticInsights` / `buildDiagnosticInsightsBundle`, `buildInsightsPageViewModel`.
- **Command-centre MVP pages** — `app/(protected)/*/page.tsx` for dashboard, cohorts, retention, ltv, insights, data; retention uses `RetentionClient`.
- **Data / source transparency** — `/data` exposes mode, simulation window, lineage pointers, and “not live” posture consistent with the demo script.
- **Route containment** — Non-spine navigations (except `/settings` and auth paths) redirect per `getMvpContainmentRedirect`.
- **Production-blocked dummy reseed APIs** — `assertDestructiveDevApiAllowed()` returns **403** in production for the two destructive POST handlers called out in V1.

---

## E. What is still demo, mocked, missing, or future

**Still demo / fixture-only on the MVP spine**

- **Live Shopify (or other) ingestion into the six MVP routes** — **not** the data path for those pages; copy and Data page state this explicitly.
- **Multi-tenant uploaded merchant orders** replacing `getDemoDataset()` — **not built** for the spine.

**Missing or future relative to product thesis** (aligned with `RETENTIONOS_MVP_DEMO_SCRIPT.md` and V1 risks)

- **CSV upload** and **canonical onboarding** (Sprint 3A direction) — **not built**.
- **Uploaded data persistence** and **tenant isolation** for engine inputs — **not built** for MVP spine.
- **CAC / payback engine** — types may exist in `/lib/types`; **not** a live analytic module wired to spend truth.
- **Product-level customer quality engine** — not the MVP spine.
- **Acquisition / channel quality engine** — not the MVP spine ( **`/acquisition`** still exists in build output but is **contained** by redirect for browsing).
- **Scenario engine** — not the MVP spine.
- **Formal Revenue Durability Score** methodology — posture/labels in insights are **rule-based**, not a published composite score.
- **AI-generated recommendations** — explicitly **out of scope**; insights are **deterministic rules**.
- **Benchmarks / peer norms** — not present as first-class product truth.

**Legacy reality check**

- **Old pages and APIs remain in the repository**; they are **not** the demo path. **Containment is navigation-level**, not deletion.

---

## F. Current architecture

### `/lib/types`

Shared **domain types** for customers, orders, products, cohorts, metrics snapshots, insights, scenarios, and margin assumptions — export surface in `lib/types/index.ts`.

### `/lib/demo`

**Fixture builders and config** for the Lumin & River demo scenario: `getDemoDataset()`, brand strings, demo window end, margin assumptions, marketing spend placeholders, etc. **Single entry** for MVP route data provenance.

### `/lib/metrics`

**Pure calculation** layer plus **view-model builders** that call `getDemoDataset()` and assemble table/KPI shapes for each page. Exposes **`runDemoMetricSanityCheck`** and **`buildDataPageViewModel`** for the trust ledger.

### `/lib/insights`

**Context**, **thresholds**, **rules** (including revenue durability status evaluation), and **generators** that turn metric outputs into diagnostic cards; **`buildInsightsPageViewModel`** shapes the `/insights` UI.

### `/lib/mvp`

- **`cohesion.ts`** — Product naming, `MVP_NAV`, per-route copy, banner/helper strings.
- **`demo-surface-guard.ts`** — Route containment map + destructive API production guard.

### `/components/mvp`

- **`CommandCentrePageFrame.tsx`** — Shared layout, demo/metrics/insights/data banners, and command-centre chrome consistent across spine routes.

### MVP pages (App Router)

| Route | Primary implementation notes |
| ----- | ---------------------------- |
| `/dashboard` | Server `page.tsx` (Supabase session in prod) → `DashboardExecutive` |
| `/cohorts` | Client `page.tsx`, `CommandCentrePageFrame`, `buildCohortsPageViewModel` |
| `/retention` | Server shell → `RetentionClient`, `buildRetentionPageViewModel` |
| `/ltv` | Client `page.tsx`, `buildLTVPageViewModel` |
| `/insights` | Server `page.tsx`, `buildInsightsPageViewModel`, severity UI |
| `/data` | Server `page.tsx`, `buildDataPageViewModel`, `DEMO_WINDOW_END` |

### Data flow (MVP spine)

```text
getDemoDataset()  (/lib/demo)
       ↓
Metric engine     (/lib/metrics — cohorts, retention, repeat, LTV; view models)
       ↓
Insights engine   (/lib/insights — rules, bundles, insights view model)
       ↓
View models       (page-specific tables, KPIs, cards)
       ↓
UI                (CommandCentrePageFrame + route pages)
```

**Dashboard** additionally uses **server-side auth** gating in its `page.tsx`; the **metric** portion remains demo-dataset-driven per view-model design.

---

## G. Current route audit

### Active MVP routes (intended demo spine)

- `/dashboard`, `/cohorts`, `/retention`, `/ltv`, `/insights`, `/data`
- Subpaths under cohorts/retention/ltv/insights/data (if typed) **redirect to the parent** spine segment (e.g. `/cohorts/category` → `/cohorts`).

### Reachable account / auth routes (not redirected away)

- `/settings`, `/settings/*` (e.g. integrations, feedback subpages)
- `/login`, `/verify`, `/auth/*`

### Contained legacy / prototype page routes (still in build; browsing redirects)

**Typical behaviour:** requests to paths outside the spine + settings + auth **redirect** to **`/dashboard`**, except `/cohorts/*` and `/retention/*` **redirect to their parents**.

Non-exhaustive examples still listed in production build output: `/retention-ltv/*`, `/product-economics/*`, `/customer-intelligence/*`, `/financials/*`, `/guides`, `/sync`, `/connect/*`, `/integrations`, `/customers/*`, `/segments`, `/roadmap`, `/feedback`, `/reports`, `/products/*`, `/executive/*`, `/acquisition`, `/scenarios`, etc.

### API routes still present (unchanged inventory — spine does not require these for fixture demo)

Examples from build: `/api/metrics/*`, `/api/dashboard/metrics`, `/api/retention/*`, `/api/products/performance`, `/api/customers/list`, `/api/shopify/*`, `/api/sync/shopify`, `/api/integrations/status`, `/api/reports/summary`, `/api/guides/list`, `/api/settings/user`, etc.

**Important:** **Page containment does not block `fetch` to `/api/*`.** Middleware skips `/api` for the containment redirect logic.

### Destructive dummy routes and production guard

| Route | Role | Production |
| ----- | ---- | ----------- |
| `POST /api/dev/generate-dummy-data` | Deletes/reseeds tenant data (dev tooling) | **403** via `assertDestructiveDevApiAllowed` |
| `POST /api/sync/dummy-data` | Same class of risk | **403** in production |

In **development**, behaviour remains as implemented (still dangerous if misused; not surfaced as MVP product flow).

### Remaining route / auth risks

- **Middleware production auth** still only treats **`/dashboard`**, **`/sync`**, **`/connect`** as session-gated per pathname prefix check — **note:** `/sync` and `/connect` are **redirected away** before that check for normal browser navigation, but the **configured intent** is still “partial protection.”
- **Other spine routes** (`/cohorts`, `/retention`, etc.) rely on **page-level** behaviour where implemented (e.g. dashboard’s own `redirect`); **coverage is inconsistent** by design today.
- **Legacy API** surface remains **reachable** by direct call.

---

## H. Risk register

| Risk | Severity | Recommendation |
| ---- | -------- | -------------- |
| **Incomplete auth coverage across MVP spine** | High | Decide a single policy: either middleware protects all `(protected)` HTML routes in production or each page enforces session; document for founders. |
| **Direct API calls bypass route containment** | Medium | For demos, avoid exposing Network tab stories that confuse APIs with product; long-term, align or retire legacy APIs. |
| **Shopify sync / token posture (V1: plaintext concern)** | High | Do not market integrations until security + data model reviewed; keep MVP honest as fixture-only. |
| **Legacy code volume** | Medium | Contain for demos; schedule deletion/archival when CSV path replaces old UX needs. |
| **CSV / upload missing** | High — product | Sprint 3A: canonical ingest + persistence is the critical path to “real.” |
| **CAC / payback missing** | Medium | Keep out of claims; wire only when spend truth exists. |
| **Product / acquisition / scenario modules not real** | Low–Medium | Stay disciplined; use roadmap language only. |
| **Revenue Durability Score not formalised** | Medium (credibility) | Keep posture as **heuristic / rule label** until methodology is publishable. |
| **Over-polish vs functionality** | Medium | Prioritise ingest + truth path; UI is already demo-competitive for the thesis. |

---

## I. Strategic alignment check

| Principle | Assessment |
| --------- | ---------- |
| **Customer economics diagnostic** | **Aligned.** Spine emphasises cohort dispersion, repeat depth, journey vs calendar views, LTV ladders, contribution alongside revenue. |
| **Not a generic dashboard** | **Mostly aligned.** Copy and structure stress durability primitives; risk is **perception** if stakeholders fixate on charts without the narrative — demo script mitigates. |
| **Data → Metrics → Diagnosis → Decision** | **Aligned on demo path.** Data page → metric tabs → insights cards; explicit “rules, not AI.” **Action** in-product is still **operator judgment**, not automated execution. |
| **MVP focus: cohorts, retention, LTV, insights, data** | **Aligned.** |
| **Avoiding premature integrations** | **Aligned for spine.** Live Shopify is **not** positioned as powering MVP routes; **Settings** may still reference integration UX — founders should steer demos to the six routes first. |

---

## J. Recommended next 10 tasks (ordered)

1. **P0 — Sprint 3A spec** — Define canonical CSV (or file) schema, validation rules, and tenant boundary for first ingest.  
2. **P0 — Upload + parse path** — Server-side upload handler, virus/size limits, and parsed normalisation into `/lib/types` shapes.  
3. **P0 — Persistence choice** — Where fixtures land per account (Supabase vs interim store) and migration strategy without breaking demo mode.  
4. **P1 — Engine switch** — `getDemoDataset()` vs “dataset from tenant store” behind one facade consumed by view models.  
5. **P1 — Auth alignment** — Uniform production protection for all command-centre routes _or_ explicit public-demo mode with no PII.  
6. **P1 — Retire or quarantine legacy APIs** — Reduce confusion and accidental dependency from old `/api/metrics/*` consumers.  
7. **P2 — Data page evolution** — Live vs demo mode, upload status, and last-ingested metadata.  
8. **P2 — CAC / payback scoping** — Data model for spend only after ingest truth exists.  
9. **P2 — Product quality module** — SKU/bundle analytics after order line ingestion is trustworthy.  
10. **P2 — Scenario lab** — Stress assumptions on fixture/live cohorts once engine switch exists.

---

## K. Founder interpretation (plain English)

**What progress has actually been made**

You now have a **credible, coherent demo** of RetentionOS’s **thesis**: one deterministic **customer-economics engine** feeding **six screens** that tell a single story — cohort quality, retention mechanics, LTV (net and contribution), honest **rules-based** insights, and a **Data** page that refuses to fake integrations.

**What can be demoed today**

Walk a serious operator through **`/dashboard` → `/cohorts` → `/retention` → `/ltv` → `/insights` → `/data`** using the founder script. Numbers **line up across tabs** because they share **`getDemoDataset()`** and **`/lib/metrics`**. Legacy URLs **won’t derail** a Zoom demo the way they used to.

**What cannot honestly be claimed yet**

This is **not** “your Shopify data live in RetentionOS” on the MVP spine. It is **not** multi-tenant production analytics, **not** CSV onboarding, **not** CAC/payback truth, **not** product-level quality stories, and **not** AI recommendations. The **insights are transparent rules**, not omniscient models.

**The next product risk**

The **largest honest gap** is **getting real merchant data into the same canonical shapes** the engine expects **without** lying about connectivity or melting founder credibility. **Sprint 3A (CSV / onboarding)** is the hinge: until it ships, you are selling **definitions and narrative discipline** — which is valuable, but **not** the same as **deployed customer truth**.

---

*End of RetentionOS Restart Audit V2.*
