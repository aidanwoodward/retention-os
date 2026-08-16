# Sprint 6B-SHARED-PRESENTATION-FOUNDATION — Shared analytical presentation primitives

## Status

`AWAITING_FOUNDER_MERGE_APPROVAL`

## Final plan and scope

### Objective

Introduce the minimum shared presentation primitives required for the next two production route migrations (`/retention`, `/ltv`): neutral analytical panel chrome and metric stat tiles, without moving metric or commercial logic into React components.

### Commercial reason

Retention and LTV share KPI grids and analytical table framing; extracting dumb shells now makes the upcoming 6B-RETENTION and 6B-LTV Golden migrations faster and visually coherent without duplicating zinc panel markup.

### In scope

- `AnalyticalPanel` — title/description/header action/body/footer shell
- `MetricStat` — label/value/sub with optional `KpiMetricLabel` wiring
- `components/analytical/index.ts` exports only the above
- Thin wiring on `/retention` and `/ltv` (replace local `Kpi` tiles; wrap cohort tables in `AnalyticalPanel`)
- UTF-8 without BOM on all Sprint 2 files
- This sprint record

### Out of scope

- `BlockedAnalysisCard` (deferred — not required by Retention/LTV migrations)
- `/acquisition`, `/products`, `/dashboard`, `/data`, `/insights` changes
- DiagnosisHero, ChartCard-as-chart, trust pills, Explain provider, sortable tables
- Metric / view-model / formula changes
- `globals.css`, `lib/ui-tokens.ts`, dependencies, test config changes

### Acceptance criteria

- [x] `AnalyticalPanel` and `MetricStat` are presentation-only (no formulas, thresholds, Signal logic)
- [x] Retention and LTV use shared primitives; local `Kpi` removed
- [x] Cohort tables wrapped in `AnalyticalPanel`; table behaviour unchanged
- [x] `components/analytical/` contains only `AnalyticalPanel.tsx`, `MetricStat.tsx`, `index.ts`
- [x] No Lovable/Golden runtime imports
- [x] Validation suite green; `git diff --check` clean
- [x] UTF-8 BOM stripped from five Sprint 2 files
- [x] Independent closeout review: APPROVE FOR CLOSURE

### Files expected to change

Create:

- `components/analytical/AnalyticalPanel.tsx`
- `components/analytical/MetricStat.tsx`
- `components/analytical/index.ts`
- `docs/agent/sprints/6b-shared-presentation-foundation.md`

Modify:

- `app/(protected)/retention/RetentionClient.tsx`
- `app/(protected)/ltv/page.tsx`

### Stop conditions

- Allowlist expansion without founder approval
- Business logic in `components/analytical/*`
- Resurrecting `agent/6b-dashboard` analytical files

## Plan-review verdict

- verdict: `APPROVE`
- reviewer_mode: `planning_session`
- builder_context_used: true
- automation_sla_met: true
- notes: Founder Gate 1 approved with scope reduction (no BlockedAnalysisCard, no acquisition/products wiring).

## Founder plan approval

- Recorded after: Founder Gate 1 APPROVED with scope reduction; EXECUTION MODE Sprint 2
- Date/time: 2026-08-16
- Base SHA: `4e1a1a0b74c133f79ffdc4cf748a8716ec9db40b`

## Approved-plan identity

- Plan section hash: shared-presentation-foundation-sprint-2-reduced
- Base branch: `restart-retentionos-mvp`
- Base SHA: `4e1a1a0b74c133f79ffdc4cf748a8716ec9db40b`

## Implementation summary

- Added dumb `AnalyticalPanel` and `MetricStat`; barrel export in `components/analytical/index.ts`
- Retention: 8× `MetricStat`; cohort table in `AnalyticalPanel`; removed local `Kpi` and duplicate table border wrapper
- LTV: 7× `MetricStat`; ladder table in `AnalyticalPanel`; removed local `Kpi` and duplicate table border wrapper
- Closeout: stripped UTF-8 BOM from five Sprint 2 files (UTF-8 without BOM)
- No VM, metric, Insights, acquisition, or products changes

## Implementation-review verdict

- verdict: `APPROVE`
- reviewer_mode: `independent_closeout`
- builder_context_used: false
- automation_sla_met: true
- notes: Closeout verdict APPROVE FOR CLOSURE; BOM cleanup only in closeout pass.

## Validation and PR/check evidence

### Local validation

- Commands run: `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`; `git status`
- Result: pass (529 tests)

### PR

- URL:
- Base: `restart-retentionos-mvp`
- Head SHA:

### Checks

- `gh pr checks --watch`:
- CI validate:
- Vercel:

## Notes

Gate 2 approval and DONE are **not** written here after PR freeze.
