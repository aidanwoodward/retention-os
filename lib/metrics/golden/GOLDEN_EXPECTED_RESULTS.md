# Sprint 5U-C — Golden expected results (human audit)

**Rule:** Values in this document are derived by hand from the fixture rows below and
`docs/METRIC_CONTRACTS.md`. TypeScript constants in `golden-expected.ts` are transcribed
from this file. **Do not** regenerate them by calling production calculators.

## Treatments

| Topic | Treatment |
|-------|-----------|
| Tax | Not on `Order` — excluded |
| Shipping | Not on `Order` — excluded |
| Net merchandise | `max(0, gross − discounts − refunds)` |
| Contribution | `net × 0.4` via MarginAssumptions (`netRevenueMultiplier = 1`); no order-level `contributionMargin` |
| Marketing spend | Actual month rows (not % synthesis) |
| Clock | Fixed ISO timestamps only |

## Fixture rows

### Customers

| id | firstOrderAt (UTC) | Cohort |
|----|--------------------|--------|
| c1 | 2024-12-05T12:00:00.000Z | 2024-12 |
| c2 | 2024-12-15T12:00:00.000Z | 2024-12 |
| c3 | 2024-12-20T12:00:00.000Z | 2024-12 |
| c4 | 2025-01-05T12:00:00.000Z | 2025-01 |
| c5 | 2025-01-10T12:00:00.000Z | 2025-01 |
| c6 | 2025-01-12T12:00:00.000Z | 2025-01 |

Cohort sizes: `2024-12` → 3; `2025-01` → 3.

### Products

| id | title |
|----|-------|
| prod_a | Serum A |
| prod_b | Oil B |

### Orders

| id | customer | orderedAt (UTC) | gross | disc | refund | net | first-product note |
|----|----------|-----------------|------:|-----:|-------:|----:|--------------------|
| o1 | c1 | 2024-12-05T12:00:00.000Z | 100 | 10 | 0 | 90 | first line prod_a |
| o2 | c1 | 2025-01-10T12:00:00.000Z | 80 | 0 | 0 | 80 | repeat |
| o3 | c2 | 2024-12-15T12:00:00.000Z | 120 | 20 | 0 | 100 | first line prod_b |
| o4 | c2 | 2025-04-20T12:00:00.000Z | 50 | 0 | 0 | 50 | repeat (outside 90d) |
| o5 | c3 | 2024-12-20T12:00:00.000Z | 200 | 0 | 50 | 150 | first line prod_a; one-time |
| o6 | c4 | 2025-01-05T12:00:00.000Z | 100 | 0 | 0 | 100 | first line prod_a |
| o7 | c4 | 2025-01-25T12:00:00.000Z | 100 | 0 | 0 | 100 | repeat |
| o8 | c5 | 2025-01-10T12:00:00.000Z | 60 | 10 | 0 | 50 | first line prod_b; one-time |
| o9 | c6 | 2025-01-12T12:00:00.000Z | 80 | 0 | 0 | 80 | first line prod_a |
| o10 | c6 | 2025-02-15T12:00:00.000Z | 40 | 0 | 0 | 40 | repeat |

Portfolio net sum = 90+80+100+50+150+100+100+50+80+40 = **840**.

### Marketing spend

| month | spend |
|-------|------:|
| 2024-12 | 150 |
| 2025-01 | 180 |

Total spend = **330**.

### Margin assumptions

`contributionMarginPct = 0.4`, `netRevenueMultiplier = 1`.

---

## Portfolio metrics

### Repeat purchase rate

Customers with ≥2 orders: c1, c2, c4, c6 → 4.  
Rate = 4/6 = **2/3**.

### First-to-second within 90 days

Day gaps (second − first):

| customer | days | ≤90? |
|----------|-----:|:----:|
| c1 | 36 | yes |
| c2 | 126 | no |
| c3 | — | no |
| c4 | 20 | yes |
| c5 | — | no |
| c6 | 34 | yes |

Windowed converters = 3. Rate = 3/6 = **1/2**.

---

## Cohort retention (active Month+N)

Latest order month = 2025-04 → Dec max offset 4; Jan max offset 3.

### Cohort 2024-12 (size 3)

| offset | target month | active | rate |
|-------:|--------------|--------|------|
| 0 | 2024-12 | c1,c2,c3 | 3/3 = 1 |
| 1 | 2025-01 | c1 | 1/3 |
| 2 | 2025-02 | — | 0 |
| 3 | 2025-03 | — | 0 |
| 4 | 2025-04 | c2 | 1/3 |

### Cohort 2025-01 (size 3)

| offset | target month | active | rate |
|-------:|--------------|--------|------|
| 0 | 2025-01 | c4,c5,c6 | 1 |
| 1 | 2025-02 | c6 | 1/3 |
| 2 | 2025-03 | — | 0 |
| 3 | 2025-04 | — | 0 |

---

## Revenue LTV (cumulative avg net ÷ cohort size)

### Cohort 2024-12 — member cumulative nets by end of offset month

| member | M+0 | M+1..M+3 | M+4 |
|--------|----:|---------:|----:|
| c1 | 90 | 170 | 170 |
| c2 | 100 | 100 | 150 |
| c3 | 150 | 150 | 150 |
| **sum** | **340** | **420** | **470** |
| **avg** | **340/3** | **140** | **470/3** |

Staircase: `[340/3, 140, 140, 140, 470/3]`.

### Cohort 2025-01

| member | M+0 | M+1..M+3 |
|--------|----:|---------:|
| c4 | 200 | 200 |
| c5 | 50 | 50 |
| c6 | 80 | 120 |
| **sum** | **330** | **370** |
| **avg** | **110** | **370/3** |

Staircase: `[110, 370/3, 370/3, 370/3]`.

### Contribution LTV

At each point: `0.4 × revenue LTV`.

- 2024-12: `[136/3, 56, 56, 56, 188/3]`
- 2025-01: `[44, 148/3, 148/3, 148/3]`

---

## CAC / LTV:CAC / payback

| cohort | spend | acquired | CAC |
|--------|------:|---------:|----:|
| 2024-12 | 150 | 3 | 50 |
| 2025-01 | 180 | 3 | 60 |

Blended CAC = 330 / 6 = **55**.

| cohort | terminal rev LTV | terminal contrib LTV | rev LTV:CAC | contrib LTV:CAC |
|--------|-----------------:|---------------------:|------------:|----------------:|
| 2024-12 | 470/3 | 188/3 | 470/150 | 188/150 |
| 2025-01 | 370/3 | 148/3 | 370/180 | 148/180 |

### Payback (first offset where contrib LTV ≥ CAC)

**2024-12 (CAC 50):** M+0 = 136/3 ≈ 45.333 < 50; M+1 = 56 ≥ 50 → **monthsToPayback = 1**.

**2025-01 (CAC 60):** M+0 = 44; M+1..M+3 = 148/3 ≈ 49.333 — all < 60 → **null**.

---

## Product quality (first product)

First products: c1→A, c2→B, c3→A, c4→A, c5→B, c6→A.

### Segment prod_a (c1,c3,c4,c6 — n=4)

- Orders: o1,o2,o5,o6,o7,o9,o10
- Gross = 700; discounts = 10; refunds = 50
- discountDrag = 10/700; refundDrag = 50/700
- Net total = 640; avgRevenueLtv = 160
- Repeat = 3/4; F2S90 = 3/4
- Signal = `insufficient_data` (n < 5)

### Segment prod_b (c2,c5 — n=2)

- Orders: o3,o4,o8
- Gross = 230; discounts = 30; refunds = 0
- discountDrag = 30/230; refundDrag = 0
- Net total = 200; avgRevenueLtv = 100
- Repeat = 1/2; F2S90 = 0
- Signal = `insufficient_data`

---

## CSV preview expected subset

Preview does **not** apply MarginAssumptions (no order `contributionMargin`).

| Field | Expected |
|-------|----------|
| customerCount | 6 |
| orderCount | 10 |
| productCount | 2 |
| cohortCount | 2 |
| firstCohort | 2024-12 |
| lastCohort | 2025-01 |
| totalRepeatPurchaseRate | 2/3 |
| firstToSecondWithin90DaysRate | 1/2 |
| averageMonth1ActiveRate | (1/3 + 1/3) / 2 = 1/3 |
| averageMonth2ActiveRate | (0 + 0) / 2 = 0 |
| averageMonth3ActiveRate | (0 + 0) / 2 = 0 |
| latestAverageNetRevenueLTV | ((470/3) + (370/3)) / 2 = 140 |
| contributionLTVAvailable | false |
| latestAverageContributionLTV | null |

---

## Acquisition VM

Unlocked path: `summary.blendedCac === 55`.

## Missing-data mutations

| Mutation | Expected commercial behaviour |
|----------|-------------------------------|
| No marginAssumptions | Contribution points omitted; payback null |
| No marketingSpend | CAC rows empty / blended null (not 0) |
| No lineItems | Product quality hasLineItemCoverage false / empty rows |
