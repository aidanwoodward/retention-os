# RetentionOS Agent Sprint Template

## Sprint name

Sprint X � [Name]

## Objective

[One clear engineering objective]

## Commercial reason

[Why this matters for customer economics, demoability, retention insight, LTV/CAC, payback, or revenue durability]

## Scope

Likely files:
- /lib/metrics/...
- /lib/types/...
- /lib/demo/...
- /components/...
- /app/(protected)/...

Do not touch:
- Supabase migrations
- auth
- unrelated routes
- unrelated UI
- dependencies

## Validation commands

For **metric-engine** or `/lib/metrics` changes, include tests:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

For other code sprints:

```bash
npm run lint
npm run typecheck
npm run build
```

## Acceptance criteria

- [ ] Behaviour 1
- [ ] Behaviour 2
- [ ] Existing routes still work
- [ ] No duplicated metric logic
- [ ] No fake production functionality
- [ ] `npm test` passes (when `/lib/metrics` or test files change)
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] npm run build passes

## Stop conditions

Stop and report if:
- implementation requires new dependencies
- implementation requires database migration
- build fails after two fix attempts
- existing metric formulas appear inconsistent
- task scope is larger than expected

## Required final output

1. Files changed
2. What changed
3. Validation results
4. Product impact
5. Risks / caveats
6. Suggested next sprint
