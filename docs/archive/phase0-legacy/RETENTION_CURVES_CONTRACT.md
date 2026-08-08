> **Historical evidence � archived Phase 0 legacy route audits.** Not authoritative for the eight-route MVP spine. Current architecture: [RETENTIONOS_ARCHITECTURE.md](../../RETENTIONOS_ARCHITECTURE.md). Current metrics: [METRIC_CONTRACTS.md](../../METRIC_CONTRACTS.md).

# Retention Curves Contract / Definition of Done

This document defines the invariants that must be maintained for the Retention Curves visualization to ensure chart/table parity and data correctness.

## Core Invariants

### 1. Single Source of Truth
- **Chart and table derive from the same `normalizedCohortCurvesData`**
- Both use identical lookup: `cohort.points.find(p => p.periodNum === periodNum)`
- No recomputation or re-parsing between chart and table
- Violation: Chart and table showing different values for the same cohort/period

### 2. Canonical Period Mapping
- **Year N === periodNum N** (e.g., Year 0 = periodNum 0, Year 4 = periodNum 4)
- Period range uses `0..maxPossiblePeriod` (inclusive)
- Chart and table must use the **same period list**: `Array.from({ length: maxPossiblePeriod + 1 }, (_, i) => i)`
- Violation: Chart showing periods [0,1,2,3,5] while table shows [0,1,2,3,4,5]

### 3. Missing vs Zero Distinction
- **Missing values** (`—`, `-`, empty string, `null`, `undefined`, non-finite) → `retention: null`, `kind: "missing"`
- **True zeros** → `retention: 0`, `kind: "zero"` (must not be treated as missing)
- Missing values are excluded from normalized points (filtered out)
- True zeros are included as valid data points
- Violation: Missing value showing as 0% in chart, or true zero not showing X marker

### 4. Revenue Retention Expansion Support
- **Revenue retention can exceed 100%** (expansion/upsell scenarios)
- Y-axis domain must NOT clamp to 100% for revenue retention
- Customer retention: `domain={[0, 100]}`
- Revenue retention: `domain={[0, (dataMax) => Math.ceil((dataMax + 5) / 10) * 10]}`
- Violation: Revenue retention values >100% being clipped or causing errors

### 5. Revival/Dashed Bridge Safety
- **Revival/dashed bridges NEVER mutate solid series values**
- Only write to keys with `__dash` suffix: `${cohortKey}__dash`
- Solid series keys (`${cohortKey}`) must remain unchanged from normalized data
- Bridge endpoints must be finite numbers; skip bridge if either endpoint is invalid
- Violation: Dashed bridge logic overwriting solid series values

### 6. Period List Consistency
- **Chart and table must never filter periods differently**
- Both use the same `sortedPeriods` array (0 to maxPossiblePeriod)
- Missing periods show as `null` in chart (line break) and `—` in table
- Violation: Table showing period 4 but chart skipping it

## Example Assertion Snippet

```typescript
// Example: How to detect parity drift
function assertChartTableParity(
  normalizedCohortCurvesData: NormalizedCohort[],
  chartData: ChartDataRow[],
  periodNum: number
) {
  normalizedCohortCurvesData.forEach(cohort => {
    const normalizedPoint = cohort.points.find(p => p.periodNum === periodNum);
    const normalizedValue = normalizedPoint ? normalizedPoint.retention : null;
    
    const chartRow = chartData.find(r => r.periodNum === periodNum);
    const chartValue = chartRow ? (chartRow[cohort.cohortKey] as number | null) : null;
    
    if (normalizedValue !== chartValue) {
      const diff = normalizedValue !== null && chartValue !== null 
        ? Math.abs(normalizedValue - chartValue)
        : (normalizedValue === null && chartValue === null ? 0 : Infinity);
      
      if (diff > 0.1) {
        throw new Error(
          `Parity mismatch: Cohort ${cohort.cohortKey}, Period ${periodNum}. ` +
          `Normalized: ${normalizedValue}, Chart: ${chartValue}`
        );
      }
    }
  });
}
```

## Changes That Would Break Parity

❌ **Filtering periods differently:**
```typescript
// BAD: Chart only includes periods with data
const chartPeriods = allPeriodNums.filter(p => hasData(p));

// GOOD: Chart includes all periods 0..maxPossiblePeriod
const chartPeriods = Array.from({ length: maxPossiblePeriod + 1 }, (_, i) => i);
```

❌ **Re-parsing values in chart:**
```typescript
// BAD: Chart re-parses raw values
const chartValue = parseValue(rawRevenueRetention);

// GOOD: Chart uses normalized value directly
const chartValue = normalizedPoint.retention;
```

❌ **Mutating solid series in revival logic:**
```typescript
// BAD: Overwriting solid series
chartData[rowIdx][cohortKey] = bridgeValue;

// GOOD: Only writing to dash key
chartData[rowIdx][`${cohortKey}__dash`] = bridgeValue;
```

## Maintenance Notes

- When modifying normalization logic, verify both chart and table still match
- When adding new period filtering, ensure it applies to both chart and table
- When changing value parsing, ensure it's done once in normalization, not separately in chart/table
- Run parity guard in development mode to catch regressions early


