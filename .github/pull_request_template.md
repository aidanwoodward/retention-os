# RetentionOS PR Checklist

## Objective

What does this PR do?

## Product relevance

Which RetentionOS MVP area does it improve?

- [ ] Executive dashboard
- [ ] Cohorts
- [ ] Retention
- [ ] LTV
- [ ] Contribution LTV
- [ ] CAC / payback
- [ ] Product quality
- [ ] Channel quality
- [ ] Revenue Durability Score
- [ ] Insights
- [ ] CSV/demo data
- [ ] Technical stability

## Guardrails

- [ ] No unrelated UI changes
- [ ] No new dependencies
- [ ] No unnecessary migrations
- [ ] No metric logic inside React components
- [ ] No duplicated metric logic
- [ ] No fake production functionality
- [ ] Demo/uploaded data use shared metric logic where relevant

## Validation

- [ ] npm run lint passed
- [ ] npm run typecheck passed
- [ ] npm run build passed
- [ ] Relevant tests passed

## Risks / caveats

List anything that needs review.
