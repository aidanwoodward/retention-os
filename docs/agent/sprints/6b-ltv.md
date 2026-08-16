# Sprint 6B-LTV — LTV production ↔ Golden presentation migration



## Status



`IMPLEMENTING` (closeout revision applied — ready for commit after validation)



## Final plan and scope



### Objective



Upgrade production `/ltv` toward the approved Golden Reference hierarchy using only canonical Revenue LTV and Contribution LTV staircases already in the LTV engine.



### Commercial reason



Operators should see how cumulative customer value builds across calendar cohort months, with net merchandise LTV and contribution LTV kept distinct and with Month+N maturity honesty — without inventing elapsed-day windows, CAC/payback heroes, or copying Golden fixture values.



### In scope



- Four essential `MetricStat` tiles: avg completed Month +1 / Month +3 Revenue LTV and Contribution LTV

- Compact how-to-read disclosure (Month+N ≠ elapsed days; contribution path; latest observed ≠ mature; payback on Acquisition)

- Split Revenue LTV and Contribution LTV `AnalyticalPanel` tables with canonical maturity styling

- VM grouping of completed-offset averages plus contribution source path (`order_level` | `margin_assumption` | `mixed` | `partial_order_level` | `none`)

- LTV cohesion hook as a neutral question

- `DiagnosisContinueSection` destinations: Cohorts, Acquisition economics, Diagnostic Insights

- This sprint record



### Out of scope



- CAC, LTV:CAC, payback heroes/tables/charts (Sprint 4B)

- Elapsed-day 30 / 60 / 90 / 180 LTV

- DiagnosisHero, value bridge, Recharts

- `lib/metrics/ltv.ts`, `acquisition.ts`, `METRIC_CONTRACTS.md`

- Presentation mapper / `LockedAnalysisCard`

- Dashboard / insights terminal-LTV rollups



### Acceptance criteria



- [x] Canonical Revenue / Contribution LTV formulas unchanged

- [x] Four executive stats only, completed-offset grouping only

- [x] Partial cells keep observed values; unavailable renders `—` from VM status

- [x] Contribution path none → `—`, not fabricated zero

- [x] Contribution provenance truthful for mixed / partial order-level datasets

- [x] No Golden fixture literals

- [x] Validation suite: lint, typecheck, npm test, build, `git diff --check`

- [x] Independent closeout review before commit

- [x] Closeout provenance revision applied



### Files expected to change



Modify:



- `app/(protected)/ltv/page.tsx`

- `lib/metrics/ltv-view-model.ts`

- `lib/mvp/cohesion.ts`



Create:



- `lib/metrics/ltv-view-model.test.ts`

- `docs/agent/sprints/6b-ltv.md`



### Allowlist expansion (founder-approved)



Original Gate 1 allowlist did **not** include:



- `package.json`

- `tsconfig.test.json`



Founder explicitly approves this narrow exception **only** to register `lib/metrics/ltv-view-model.test.ts` in the explicit `npm test` runner and `tsconfig.test.json` compile list. No other dependency, script, or compiler changes permitted.



### Stop conditions



- New metric files or elapsed-day LTV

- CAC / payback / chart work

- Golden runtime imports

- Allowlist expansion without founder approval (exception recorded above)



## Plan-review verdict



- verdict: `APPROVE_WITH_LOCKS`

- reviewer_mode: `founder_gate_1`

- builder_context_used: true

- automation_sla_met: true

- notes: Founder Gate 1 approved with locks (no payback/CAC heroes/charts; Month +1 / +3 completed averages; cohesion question specified).



## Founder plan approval



- Recorded after: Founder Gate 1 APPROVED WITH LOCKS; EXECUTION MODE Sprint 6B-LTV

- Date/time: 2026-08-16

- Base SHA: `c30d4b51f476d73029c9bdb1a5e6d4bd1aeb0e6a`



## Approved-plan identity



- Plan section hash: 6b-ltv-sprint-4-locks

- Base branch: `restart-retentionos-mvp`

- Base SHA: `c30d4b51f476d73029c9bdb1a5e6d4bd1aeb0e6a`



## Implementation summary



- Feature branch `sprint-6b-ltv` from `restart-retentionos-mvp` @ `c30d4b51f476d73029c9bdb1a5e6d4bd1aeb0e6a`

- VM: completed Month +1 / +3 unweighted averages, per-cell maturity, contribution source path with coverage-aware classification

- `/ltv`: four tiles, how-to-read, split Revenue / Contribution tables, latest observed offset cue, Next Investigation Cohorts / Acquisition / Insights

- Cohesion hook: “How does customer value build across cohort months?”

- Allowlist exception: `package.json` + `tsconfig.test.json` for `ltv-view-model.test.ts` registration (founder-approved)



## Independent implementation review (2026-08-16)



- verdict: `REVISE BEFORE CLOSURE`

- reviewer_mode: independent read-only

- builder_context_used: false

- notes: Canonical LTV engine correct. Dataset-level first-match `order_level` classifier overstated contribution evidence for mixed / partial datasets. Demo copy used “imported” without import provenance.



## Closeout revision (2026-08-16)



- Replaced first-match classifier with coverage-aware provenance: `order_level` | `margin_assumption` | `mixed` | `partial_order_level` | `none`

- Output availability gated on canonical `cumulativeAvgContribution` emission (not input alone)

- Contribution UI copy rewritten without “imported” / overstated observed coverage

- Added provenance tests A–F (full order-level, pure assumption, mixed, partial order-level, 0% assumption, all-zero omitted output)

- Latest observed column shows canonical tail Month+N offset per row

- Canonical engine files unchanged (`lib/metrics/ltv.ts`, `acquisition.ts`, `METRIC_CONTRACTS.md`)



## Implementation-review verdict



- verdict: pending re-review after closeout

- reviewer_mode:

- builder_context_used: false

- automation_sla_met:

- notes:



## Validation and PR/check evidence



### Local validation



- Commands run: `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`; `git status`

- Result: pass (559 tests; 73 app routes compiled; `/ltv` 4.06 kB)



### PR



Not applicable yet — do not commit in this pass.



- URL: (none)

- Base: `restart-retentionos-mvp`

- Head SHA: (none — not committed)



### Checks



Not applicable — no PR.



## Notes



Gate 2 approval and DONE are **not** written here after PR freeze.

