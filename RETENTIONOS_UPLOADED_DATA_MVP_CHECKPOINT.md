# RetentionOS — Uploaded-Data MVP Checkpoint

> **Supporting historical milestone.** This document remains the detailed record of session CSV ingestion, but its six-route references predate Acquisition and Products joining the retained spine. Use [`docs/RETENTIONOS_ARCHITECTURE.md`](docs/RETENTIONOS_ARCHITECTURE.md) for the current eight-route architecture, inventories, and dispositions.

**Purpose:** Single accountability snapshot for the **post-upload** command-centre MVP (branch `restart-retentionos-mvp`, after demo-script sprint `f38ff0e` / `a125e33`). This document **supplements** `RETENTIONOS_RESTART_AUDIT_V2.md` (historical comparison to pre-restart) and aligns with `docs/RETENTIONOS_MVP_DEMO_SCRIPT.md`.

**Scope:** Repo-grounded claims from `lib/import`, `lib/data-source`, `(protected)` command-centre pages, and `components/data`. Not a statement about any particular production deployment.

---

## A. Executive summary

- The **Revenue Durability Command Centre** spine (`/dashboard`, `/cohorts`, `/retention`, `/ltv`, `/insights`, `/data`) can run from **either** the **canonical demo dataset** (`getDemoDataset()` / `buildDemoRetentionOSDataset()`) **or** an **uploaded CSV** that has been **validated, normalised, and saved to this browser tab’s session**.
- **Uploaded data is session-only:** it is stored under `sessionStorage` (key `retentionos:uploadedDataset:v1`), not written to **Supabase** or other server persistence for this MVP path.
- **Live Shopify (or other connectors) does not power** the six-route KPI spine; legacy APIs and integration UI may still exist elsewhere in the repo.
- **Honest gaps** remain: multi-tenant dataset storage, CAC/payback, product/channel quality modules, scenario lab, a **formal scored** Revenue Durability composite, and AI-generated recommendations.

---

## B. Current data flows

### Demo dataset flow

```text
/lib/demo  →  getDemoDataset()  →  buildDemoRetentionOSDataset()
       →  RetentionOSDataset (meta: demo)
       →  /lib/metrics view-model builders (*FromDataset)
       →  /lib/insights (*FromDataset where applicable)
       →  Command-centre UI
```

- **Server / pre-hydration:** Where `window` is unavailable, dataset selection is **demo** (see `resolveCommandCentreDatasetSource` in `lib/data-source/client-selected-source.ts`).
- **`/data` transparency:** Server-rendered `buildDataPageViewModel()` continues to expose **canonical demo** fixture counts and sanity lineage as a **fixed audit trail** beside the client-side upload controls (`app/(protected)/data/page.tsx` + `components/data/DataPageBody.tsx`).

### Uploaded CSV flow

```text
CSV file (browser)
       →  parseCombinedOrderCsvText / importCombinedOrderCsvFromText  (/lib/import)
       →  Customer[] / Order[] / Product[] (+ import issues)
       →  buildImportedRetentionOSDataset  (/lib/data-source/imported-source.ts)
       →  RetentionOSDataset (meta: uploaded_csv, errorCount === 0)
       →  [optional UI] buildImportedCsvMetricPreview  (/lib/import/metric-preview.ts)
       →  saveUploadedRetentionOSDataset  →  sessionStorage JSON
       →  resolveCommandCentreDatasetSource()  →  loadUploadedRetentionOSDataset()
       →  same *FromDataset view models + insights as demo path
```

- **Fail-closed:** Imports with errors do not build a savable `RetentionOSDataset` (`buildImportedRetentionOSDataset` returns `ok: false` when `importResult.errors.length > 0`).
- **Revert:** `clearUploadedRetentionOSDataset()` removes the session key; KPI routes resolve back to demo on subsequent client resolution.

---

## C. Route source matrix

| Route | Active metric/insight source | Role |
| ----- | ---------------------------- | ---- |
| `/dashboard` | **Demo** or **uploaded** (per tab) | Executive KPIs, posture, dashboard insights bundle from selected `RetentionOSDataset`. |
| `/cohorts` | **Demo** or **uploaded** | Cohort economics table from selected dataset. |
| `/retention` | **Demo** or **uploaded** | Retention / repeat view model from selected dataset. |
| `/ltv` | **Demo** or **uploaded** | LTV ladder view model from selected dataset. |
| `/insights` | **Demo** or **uploaded** | Diagnostic cards from `/lib/insights` on metrics from selected dataset. |
| `/data` | **Control** + **preview** | Source hero (demo vs session upload), CSV validation UI, metric preview, route coverage, revert; fixture counts remain **demo-anchored** for audit. |

**Implementation note:** KPI routes (`DashboardExecutive`, cohorts/retention/ltv/insights clients) call `resolveCommandCentreDatasetSource()` after mount (`useLayoutEffect`) and render `MetricSourceBanner` + page copy keyed off `selection.isUploaded`.

---

## D. What is now real (Sprints 3A–3K and related wiring)

The following are **implemented and used** on the upload-capable MVP path (not roadmap bullets):

- **CSV schema** — Combined order + line-item contract documented in `lib/import/csv-schema.ts` (`COMBINED_ORDER_CSV_*`).
- **CSV validation** — Parsing and business rules in `lib/import/validate-csv.ts` and `lib/import/normalise-orders.ts` (consistent order-level fields per `order_id`, typed money/quantity cells, etc.).
- **Canonical normalisation** — `importCombinedOrderCsvFromText` / `normaliseCombinedOrderCsv` produce shapes compatible with `/lib/types` and `/lib/metrics`.
- **Metric preview** — `buildImportedCsvMetricPreview` runs imported shapes through core metric calculators for **UI preview** (`lib/import/metric-preview.ts`); explicitly preview-oriented, not a second truth path.
- **Session storage** — `saveUploadedRetentionOSDataset` / `loadUploadedRetentionOSDataset` / `clearUploadedRetentionOSDataset` (`lib/data-source/browser-session.ts`) with structural validation on load.
- **Selected-source resolver** — `resolveCommandCentreDatasetSource` + `CommandCentreDatasetSelection` (`lib/data-source/client-selected-source.ts`).
- **Selected-source command-centre pages** — Client pages build view models from `selection.dataset` instead of hard-wiring demo only.
- **Source-aware banners and copy** — `components/mvp/MetricSourceBanner.tsx`, `CommandCentrePageFrame` props, `getMvpPageCopyForActiveSource` in `lib/mvp/cohesion.ts`, and `components/data/*` trust copy.
- **Updated demo script** — `docs/RETENTIONOS_MVP_DEMO_SCRIPT.md` describes dual-source operation and the **Uploaded CSV demo flow** + QA table.

---

## E. What is still not real

- **Supabase (or server) persistence** for uploaded datasets; **multi-account / multi-tenant** dataset storage keyed to auth.
- **Live Shopify** powering the six-route MVP spine (ingest → same view models).
- **CAC / payback** engine and spend truth models tied to cohorts.
- **Product-level customer quality** analytics on the spine.
- **Acquisition / channel quality** module on the spine.
- **Scenario modelling** workspace wired to command-centre datasets.
- **Formal scored Revenue Durability Score** (published composite methodology); posture labels remain **rule-based / heuristic**, not that index.
- **AI-generated recommendations**; insights stay deterministic rules in `/lib/insights`.

---

## F. Manual QA checklist

Run in **one browser tab**; use an intentionally small valid file (e.g. `docs/sample-retentionos-orders.csv` referenced from the Data page UI).

| # | Action | Pass criteria |
|---|--------|----------------|
| 1 | On `/data`, **revert / clear** any upload | Hero shows **canonical demo**; chip **Demo fixture**; `MetricSourceBanner` on KPI routes shows **Demo dataset**. |
| 2 | Visit `/dashboard`, `/cohorts`, `/retention`, `/ltv`, `/insights` | All show **demo** as active source; numbers match demo expectation (cross-route consistency). |
| 3 | On `/data`, **upload** a valid combined-order CSV | Validation passes (no blocking errors); preview metrics render if applicable. |
| 4 | **Save** session dataset | No storage error; hero switches to **Uploaded CSV session dataset**. |
| 5 | Revisit `/dashboard` … `/insights` | Each shows **Uploaded CSV session dataset**; KPIs/tables/cards reflect upload (not demo fixture). |
| 6 | On `/data`, open **route coverage** | Describes KPI routes using upload while session active. |
| 7 | **Revert to demo** from `/data` | Session key cleared hero returns to demo. |
| 8 | Re-check KPI routes | All show **Demo dataset** again; behaviour matches step 2. |

---

## G. Known limitations

- **sessionStorage is tab-scoped** — New tab = no upload unless saved again; private browsing / blocked storage can prevent saves (see error handling in `saveUploadedRetentionOSDataset`).
- **First paint / hydration** — Initial client state may render **demo** selection until `useLayoutEffect` runs `resolveCommandCentreDatasetSource()`; expect a brief possible mismatch vs post-hydration uploaded state.
- **No server persistence** — Refresh keeps upload only while the **same tab + sessionStorage** remains available; not durable across devices or users.
- **Sample CSV is small** — Intended for contract demonstration; not a stress test.
- **No large-file streaming** — Whole file read/parsed in-browser; very large CSVs may hit memory or quota limits.
- **Contribution LTV on uploads** depends on **order-level `contribution_margin`** coverage (`hasContributionMarginCoverage` / `metric-preview` caveats); importer does **not** fabricate margin assumptions for CSV (`imported-source.ts` docstring).
- **Legacy routes** still exist in the build but are **contained** (redirects) for normal browsing (`middleware` + `getMvpContainmentRedirect`).
- **`/api/*` surface** remains in the repo — not required for the fixture/upload spine; direct API calls bypass page-level “containment” semantics.

---

## H. Recommended next phase

Ordered product-development themes (not commitments):

1. **Margin assumptions for uploaded data** — Explicit, merchant-editable assumptions when CSV omits contribution dollars (without silently inventing per-order margin on ingest).
2. **Marketing spend CSV / CAC contract** — Schema + validation that can join to cohort windows.
3. **CAC, LTV:CAC, payback engine** — Once spend data is trustworthy and scoped.
4. **Product-level customer quality** — SKU/bundle / concentration signals tied to ladder durability.
5. **Channel / acquisition quality** — Responsible bridging of channel labels to dispersion (privacy and data quality guardrails).
6. **Scenario modelling** — Stress LTV and posture under explicit assumptions.
7. **Supabase persistence / account datasets** — Tenant-isolated storage and optional sync.
8. **Shopify integration revisit** — When security, data model, and MVP honesty requirements are met; **after** account-scoped truth is credible.

---

## Related documents

- `RETENTIONOS_RESTART_AUDIT_V2.md` — Restart comparison vs historical V1 snapshot (some rows pre-date session CSV; see pointer at top of that file).
- `docs/RETENTIONOS_MVP_DEMO_SCRIPT.md` — Founder-facing demo narrative and **Uploaded CSV demo flow**.

*End of uploaded-data MVP checkpoint.*
