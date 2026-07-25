# RetentionOS Agent Instructions

## Product context

RetentionOS is a customer economics operating system for ecommerce and SMB/mid-market brands.

It helps brands understand whether growth is real, repeatable, and profitable by analysing:
- customer cohorts
- retention
- LTV
- contribution LTV
- CAC
- LTV/CAC
- payback
- product-level customer quality
- channel-level acquisition quality
- revenue durability

RetentionOS is not a generic dashboard, CRM, attribution platform, finance system, or email marketing tool.

The product thesis:
Most brands know their revenue, but they do not know whether their customers are getting better or worse. RetentionOS reveals the truth behind growth.

The operating model:
Data ? Metrics ? Diagnosis ? Decision ? Action.

## MVP priorities

Prioritise:
1. Executive dashboard
2. Cohort retention analysis
3. Revenue LTV and contribution LTV
4. CAC, LTV/CAC, and payback
5. First-to-second purchase behaviour
6. Product-level customer quality
7. Channel-level acquisition quality
8. Revenue Durability Score
9. Rules-based / AI-assisted insight cards
10. Simple scenario modelling
11. Demo mode and CSV upload before API overbuild

## Avoid

Do not build:
- generic CRM features
- generic dashboards
- email marketing workflows
- attribution modelling overbuild
- premature Shopify API complexity
- advanced AI chat features
- complex onboarding flows
- unnecessary UI polish before metric correctness
- new database migrations unless explicitly requested
- new dependencies unless explicitly approved

## Technical architecture rules

- Keep metric calculations out of React components.
- Put pure calculation logic in /lib/metrics.
- Put shared types in /lib/types.
- Put demo data logic in /lib/demo.
- Put insight rules in /lib/insights.
- Demo mode and uploaded CSV data should flow through the same metric engine where possible.
- Prefer small, testable TypeScript functions.
- Do not duplicate metric logic across pages, API handlers, and components.
- Do not introduce fake production functionality.
- Do not silently fall back to mock data on production routes.
- Do not touch Supabase auth, RLS, or migrations unless the task explicitly requires it.

## Validation rules

After meaningful code changes, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Do not claim completion unless validation passes or you clearly explain the blocker.

## Branching rules

Never work directly on main.

Use branch names like:
- agent/sprint-5a-acquisition-tests
- agent/sprint-5b-product-quality-view-model
- fix/typecheck-dashboard
- chore/agent-operating-system

## Ops-01 sprint workflow

Canonical sprint operating system: [docs/agent/OPS_01.md](docs/agent/OPS_01.md).

- Use Ops-01 for planning and execution (`Plan Sprint X using Ops-01.`, `Approve the plan and execute it.`, `Approve the merge and close the sprint.`).
- Two founder gates are hard stops: no implementation before plan approval; no merge before merge approval.
- One sprint record per sprint under `docs/agent/sprints/` (template: [docs/agent/SPRINT_RECORD.md](docs/agent/SPRINT_RECORD.md)).
- PRs target `restart-retentionos-mvp` only. Do not self-merge. Do not invent Gate 2 / DONE by editing the sprint record after PR freeze.

## Output format

At the end of every task, report:

1. Objective
2. Files changed
3. What changed
4. Validation results
5. Product impact
6. Risks / caveats
7. Suggested next sprint

## RetentionOS decision rule

If a feature does not directly help a brand understand customer economics, retention, LTV/CAC, payback, product quality, channel quality, or revenue durability, pause it.
