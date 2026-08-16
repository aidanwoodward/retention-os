# Sprint 6B-COHORTS — Cohorts Golden presentation migration

## Status

`CLOSEOUT READY — UNCOMMITTED`

## Founder Gate 1

- Decision: **APPROVE WITH LOCKS**
- Base SHA: `b3a2dcc7c499575f77ad5e67bfeebd4b0dc3e469`
- Feature branch: `sprint-6b-cohorts`
- Micro-approval §4: shared `completed-cohort-ltv.ts` helper — **APPROVED**

## Locked page question

> How do acquisition cohorts compare on value and durability at the same age?

No trend / improvement / deterioration language.

## Page ownership

| Route | Owns |
|-------|------|
| `/cohorts` | Cross-vintage comparison at the same cohort age |
| `/retention` | Customer return behaviour and Month+N active-rate deep dive |
| `/ltv` | Revenue / Contribution LTV build-over-age deep dive |

## Implementation summary

- Extracted `averageCompletedCohortLtvAtOffset` to `lib/metrics/completed-cohort-ltv.ts`; `ltv-view-model.ts` delegates (parity with prior private helper).
- Rebuilt `/cohorts` with 3 `MetricStat` cards + one `AnalyticalPanel` same-age comparison table + how-to-read + `DiagnosisContinueSection`.
- Extended `cohort-view-model.ts` with maturity-aware M+1/M+3 active + Revenue LTV fields and completed-only executive summaries.
- Preserved legacy terminal VM fields (`latestAvgNetRevenueLtv`, `latestAvgContributionLtv`, deprecated aliases) — no other production consumers; not rendered on `/cohorts`.
- Updated cohesion copy for neutral same-age question.
- Removed matrix toggle, economics table, F2S/repeat heroes from `/cohorts` UI.

## Independent review (closeout)

- Verdict: **REVISE BEFORE CLOSURE**
- Shared helper extraction: passed semantic-parity review; `completed-cohort-ltv.ts` unchanged in closeout.
- Live browser QA: performed by **independent reviewer**, not the builder.
- Reviewer `/cohorts` QA: passed at 1440, 1024, 768, 390.
- Reviewer regression: `/retention`, `/ltv`, `/products`, `/insights` rendered successfully.
- Reviewer finding: M+3 Revenue LTV executive card attached `metricId="revenue_ltv"` — tooltip contract mismatch (same class as prior `/products` fix).
- Closeout fix: removed `metricId` from Card 2; no tooltip preferred over misleading staircase definition.
- Builder Gate 2 packet originally did **not** include live browser QA.

## Closeout revision

- Removed `metricId="revenue_ltv"` from "Avg completed M+3 Revenue LTV" card.
- Replaced conditional completed-zero VM test with deterministic fixture asserting complete M+1 zero vs unavailable M+3 null.

## Explicitly OUT of scope (NEXT / DEFER)

- `cohort_revenue_contribution` (MET-SHARE) — unwired
- `cohort_revenue_retention` — unwired
- Contribution LTV on Cohorts
- Heatmap, charts, DiagnosisHero, trend/strongest-weakest claims
- Reporting-period chrome
- `lib/insights/matrix.ts` changes

## Maturity semantics

`complete` / `partial` / `unavailable` via `getMonthlyCohortMaturityStatus` + inferred asOf. Partial excluded from completed-only averages. Completed zero renders as 0% / $0.

## Month+N semantics

UTC calendar cohort-month offset — not elapsed 30/60/90/180 days.

## Files changed

Modify:

- `app/(protected)/cohorts/page.tsx`
- `lib/metrics/cohort-view-model.ts`
- `lib/metrics/ltv-view-model.ts`
- `lib/metrics/index.ts`
- `lib/mvp/cohesion.ts`
- `package.json` (test registration)
- `tsconfig.test.json` (test registration)

Add:

- `lib/metrics/completed-cohort-ltv.ts`
- `lib/metrics/cohort-view-model.test.ts`
- `docs/agent/sprints/6b-cohorts.md`

## Validation evidence

- `npm run lint` — pass (closeout)
- `npm run typecheck` — pass (closeout)
- `npm test` — 594/594 pass (closeout)
- `npm run build` — pass (closeout)
- `git diff --check` — pass (closeout)

## Gate 2 / closeout

Not committed per instruction. Awaiting founder commit/merge decision.
