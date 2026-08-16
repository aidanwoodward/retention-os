# Sprint 6B-ACQUISITION — Acquisition Golden presentation migration

## Status

`CLOSEOUT READY — UNCOMMITTED`

## Founder Gate 1

- Decision: **APPROVE WITH LOCKS**
- Base SHA: `c138c5eed71b03677c8921297be5d673d327f3ce`
- Feature branch: `sprint-6b-acquisition`

## Locked page question

> How much does it cost to acquire customers, and when does contribution recover that spend?

## Page ownership

| Route | Owns |
|-------|------|
| `/acquisition` | Cost to acquire + monthly acquisition economics + contribution payback + spend trust |
| `/ltv` | Customer value build |
| `/cohorts` | Same-age cross-vintage performance |
| `/dashboard` | Executive spine |
| `/data` | Spend and margin unlocks |

## Founder locks (binding)

1. Exactly three `MetricStat` cards: Marketing spend supplied; Months with calculable CAC; Cohorts reaching payback
2. Primary evidence: one narrow acquisition-month table (month, new customers, spend, monthly CAC, payback)
3. **Do not render terminal LTV:CAC** anywhere on `/acquisition`
4. No Revenue/Contribution LTV columns, channel economics, charts, trends, benchmarks, DiagnosisHero, Insights cards, Period/Compare controls
5. Payback achieved: `Pays back by M+N`; unreached: `Not reached through M+K observed` (K from canonical staircase tail)
6. No invented payback maturity classification; no fractional payback
7. Missing CAC or contribution → unavailable/locked (never not-reached)
8. `AcquisitionEconomicsPanel` untouched
9. No engine/contract/dashboard/insights/Golden changes

## Implementation summary

- Extended `acquisition-view-model.ts` with month rows, payback display states, coverage counts, M+K tail lookup via `calculateLTVByCohort` grouping (no formula changes)
- Rebuilt `/acquisition` with 3 `MetricStat` cards + one `AnalyticalPanel` month table + how-to-read + `DiagnosisContinueSection`
- Updated cohesion copy for neutral founder question
- Added `acquisition-view-model.test.ts` (cases A–T)
- Registered test in `package.json` / `tsconfig.test.json`

## Monthly vs blended CAC

- **Monthly CAC** is the primary contract (unchanged engine)
- **Blended CAC** omitted from page surface (legacy VM field retained for dashboard compatibility)

## Terminal LTV:CAC

Deliberately not rendered on `/acquisition` because terminal ratios use different cohort ages and are not same-age comparable. `preview.ltvCac` preserved in VM for compatibility.

## Payback semantics

- Integer Month+N only (`Pays back by M+N`)
- Unreached: `Not reached through M+K observed` where K is max observed contribution offset from canonical staircase
- No immature/mature-never-paid-back invented states

## Marketing spend provenance

- `fixture` | `assumption` | `actual_csv` surfaced on spend card
- Assumption-backed spend visibly estimated

## Channel economics

Unsupported — no channel table or channel CAC on page.

## Golden modules rejected/deferred

Charts, DiagnosisHero, source-quality table, channel economics, fractional payback, Golden literals, trend deltas, benchmarks.

## Files changed

Modify:

- `app/(protected)/acquisition/page.tsx`
- `lib/metrics/acquisition-view-model.ts`
- `lib/mvp/cohesion.ts`
- `package.json` (test registration)
- `tsconfig.test.json` (test registration)

Add:

- `lib/metrics/acquisition-view-model.test.ts`
- `docs/agent/sprints/6b-acquisition.md`

## Validation evidence

- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm test` — 614 pass / 0 fail
- `npm run build` — pass
- `git diff --check` — pass

## Explicitly OUT of scope

- `lib/metrics/acquisition.ts`, `lib/metrics/ltv.ts`, `METRIC_CONTRACTS.md`
- Dashboard acquisition spine
- `lib/insights/matrix.ts`
- `components/acquisition/AcquisitionEconomicsPanel.tsx`
- Same-offset LTV:CAC contract (NEXT)
