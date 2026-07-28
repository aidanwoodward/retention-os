# RetentionOS Metric Contracts

- **Status:** Canonical source-to-screen contract ledger (Sprint 5U-B)
- **Architecture:** [RETENTIONOS_ARCHITECTURE.md](./RETENTIONOS_ARCHITECTURE.md)
- **Tooltip layer (UI copy only):** `lib/metrics/metric-definitions.ts`
- **Machine linkage:** `lib/metrics/metric-contract-index.ts`
- **Path:** `RetentionOSDataset` → `lib/metrics` → dataset view models → eight-route MVP UI

This document is the source of truth for KPI formulas, inputs, treatments, missing-data behaviour, and UI mapping on the retained command-centre path. Quarantined legacy SQL/API surfaces are out of scope.

**Contracted MetricId set (19):** index and tests assert this set exactly — not `ALL_METRIC_IDS` (excludes `aov`).

**UTC calendar-month cohort contract (all cohort metrics):** Cohort month = UTC `YYYY-MM` of `Customer.firstOrderAt`. M+N is a calendar-month index offset, not an elapsed 30-day window. Qualifying orders are rows present in the selected dataset (no silent paid-order filter in the TS engine).

---

## Template

Each core contract uses these 13 fields:

1. Canonical name + MetricId (or `N/A`)
2. Commercial question
3. Formula (engine-faithful)
4. Raw + transformed inputs
5. Inclusion / exclusion / financial treatment
6. Time window, cohort, identity, assumption treatment
7. Output type, unit, rounding, display behaviour
8. Missing / partial / zero-denominator behaviour
9. Caveats / known limitations
10. Engine source
11. View-model / UI locations (eight-route spine)
12. Existing tests
13. Data-quality states

---

## Supporting financial inputs

### gross_revenue

1. **Canonical name + MetricId:** Gross sales — `gross_revenue`
2. **Commercial question:** What merchandise value was sold at full line price before discounts and returns?
3. **Formula:** Per order, `order.grossRevenue` as imported/normalized (line-derived gross merchandise). Portfolio totals sum order gross where displayed.
4. **Raw + transformed inputs:** Raw CSV/Shopify export lines → `Order.grossRevenue` via import normalisers. No engine transform beyond dataset assembly.
5. **Inclusion / exclusion / financial treatment:** Merchandise line price × quantity basis. Tax and shipping are not part of this field. Compare-at price is not treated as a discount.
6. **Time / cohort / identity / assumptions:** Order-level; identity via `customerId`. No margin or spend assumptions.
7. **Output type / unit / rounding / display:** Currency (USD-like number). Engine stores unrounded floats. UI formats with money helpers; null → `"—"`.
8. **Missing / partial / zero-denominator:** Missing gross on import fails or zeros per importer rules. Not a rate — no denominator edge case in engine.
9. **Caveats:** CSV totals may diverge from Shopify Admin on parsing, test orders, or timing.
10. **Engine source:** Input field on `Order`; used by `netOrderRevenue` in `lib/metrics/utils.ts`.
11. **UI locations:** `/data` import/review; tooltip via definitions; underpinning for net revenue / LTV (not always shown as its own KPI tile).
12. **Existing tests:** `metric-definitions.test.ts`; import CSV tests.
13. **Data quality:** `actual` when imported; otherwise unavailable for contribution of this field.

### discounts

1. **Canonical name + MetricId:** Discounts — `discounts`
2. **Commercial question:** How much price reduction was applied at checkout before tax?
3. **Formula:** Per order, `order.discounts` subtracted inside `netOrderRevenue`.
4. **Raw + transformed inputs:** Import → `Order.discounts`.
5. **Inclusion / exclusion / financial treatment:** Line and order-level discounts as normalized. Compare-at markdowns are not discounts.
6. **Time / cohort / identity / assumptions:** Order-level; no assumptions.
7. **Output type / unit / rounding / display:** Currency. UI money format; null → `"—"`.
8. **Missing / partial / zero-denominator:** Absent discounts treated as 0 in net formula when field is 0; import gaps can understate discounts.
9. **Caveats:** Export allocation can diverge from Shopify Analytics Discounts.
10. **Engine source:** `Order.discounts`; `netOrderRevenue` in `utils.ts`.
11. **UI locations:** `/data`; tooltip; product-quality drag rates use discount dollars.
12. **Existing tests:** `metric-definitions.test.ts`; import tests; `product-quality.test.ts` (drag).
13. **Data quality:** `actual` when imported.

### refunds

1. **Canonical name + MetricId:** Returns / refunds — `refunds`
2. **Commercial question:** How much merchandise value was reversed after the original sale?
3. **Formula:** Per order, `order.refunds` subtracted inside `netOrderRevenue`.
4. **Raw + transformed inputs:** Import → `Order.refunds`.
5. **Inclusion / exclusion / financial treatment:** Merchandise refunds only in RetentionOS. Shipping/tax/fee reversals are not a separate engine layer.
6. **Time / cohort / identity / assumptions:** Order-level; refund timing follows CSV row values.
7. **Output type / unit / rounding / display:** Currency. UI money format.
8. **Missing / partial / zero-denominator:** Missing refunds → 0 contribution to subtraction when field is 0.
9. **Caveats:** Narrower than Shopify sales reversals.
10. **Engine source:** `Order.refunds`; `netOrderRevenue` in `utils.ts`.
11. **UI locations:** `/data`; product-quality refund drag; tooltips.
12. **Existing tests:** `metric-definitions.test.ts`; import tests; `product-quality.test.ts`.
13. **Data quality:** `actual` when imported.

### net_revenue

1. **Canonical name + MetricId:** Net merchandise revenue — `net_revenue`
2. **Commercial question:** What merchandise revenue remains after discounts and refunds for customer economics?
3. **Formula:** `netOrderRevenue(order) = max(0, grossRevenue - discounts - refunds)`.
4. **Raw + transformed inputs:** Order financial fields → floored net per order → sums in cohorts/LTV/portfolio.
5. **Inclusion / exclusion / financial treatment:** Tax and shipping excluded. Negative nets floored to zero. Not Shopify Total sales.
6. **Time / cohort / identity / assumptions:** Order timestamps drive windows; no margin/spend assumptions for net itself.
7. **Output type / unit / rounding / display:** Currency. Dashboard formats money; null → `"—"`.
8. **Missing / partial / zero-denominator:** Empty order set → 0 portfolio net. Flooring can hide negative economics at order grain.
9. **Caveats:** Floored negatives; Shopify Total sales is not the LTV/CAC base.
10. **Engine source:** `lib/metrics/utils.ts::netOrderRevenue`; consumers in `cohorts.ts`, `retention.ts`, `ltv.ts`, `product-quality.ts`.
11. **UI locations:** `/dashboard` (portfolio net tile), `/cohorts`, `/ltv`, `/data`.
12. **Existing tests:** `demo-sanity-check.test.ts`; `dashboard-view-model.test.ts`; `metric-definitions.test.ts`.
13. **Data quality:** `actual` on demo/imported orders.

---

## Non-MetricId contract section

### cohort_size

1. **Canonical name + MetricId:** Cohort size — `N/A` (no MetricId; not in contract index set)
2. **Commercial question:** How many customers were acquired in first-order month M?
3. **Formula:** Count of customers with `utcMonthKeyFromIso(firstOrderAt) = M`.
4. **Raw + transformed inputs:** `Customer.firstOrderAt` → UTC month key → count per month.
5. **Inclusion / exclusion / financial treatment:** All customers in the selected dataset. Orders without a matching customer id are ignored for that customer's cohort economics.
6. **Time / cohort / identity / assumptions:** UTC calendar month of first order. Customer id is identity. No spend/margin assumptions.
7. **Output type / unit / rounding / display:** Integer count. Shown in cohort tables/matrix; no percent rounding.
8. **Missing / partial / zero-denominator:** Empty dataset → no cohorts. Cohort with size 0 is not emitted. Denominator for retention/LTV is this count; `safeDivide` returns 0 if size were 0 (guarded in practice by skipping empty cohorts in LTV).
9. **Caveats:** Dataset-window population only; not a live CRM census.
10. **Engine source:** `lib/metrics/cohorts.ts::calculateCohorts` (`cohortSize`); also carried on retention/LTV series.
11. **UI locations:** `/cohorts` table and matrix; feeds `/retention`, `/ltv`, `/dashboard` via view models.
12. **Existing tests:** Covered indirectly by `demo-sanity-check.test.ts`, `dashboard-view-model.test.ts`; no dedicated `cohorts.test.ts` yet (5U-C).
13. **Data quality:** `actual` when customers present.

---

## Core KPIs

### repeat_purchase_rate

1. **Canonical name + MetricId:** Repeat purchase rate — `repeat_purchase_rate`
2. **Commercial question:** What share of customers placed at least two qualifying orders?
3. **Formula:** `repeatCustomers (≥2 orders) / totalCustomers`.
4. **Raw + transformed inputs:** Customer set + orders keyed by `customerId` → per-customer order counts → rate.
5. **Inclusion / exclusion / financial treatment:** All customers in dataset; orders for unknown customer ids ignored. No revenue filter in TS engine.
6. **Time / cohort / identity / assumptions:** All-time within selected snapshot. Not cohort Month+N. No assumptions.
7. **Output type / unit / rounding / display:** Fraction `[0,1]` in engine; UI percent format. Empty population → engine `0`.
8. **Missing / partial / zero-denominator:** `totalCustomers === 0` → rate `0` via early return / `safeDivide`. Presentation should not invent a healthy 0% story without customers — empty dataset is a data-source concern.
9. **Caveats:** Portfolio metric, not first-to-second windowed conversion. Engine zero on empty population (Appendix C).
10. **Engine source:** `lib/metrics/repeat-purchase.ts::calculateRepeatPurchaseRate`.
11. **UI locations:** `/dashboard`, `/retention`, `/insights` (rules), durability inputs.
12. **Existing tests:** `demo-sanity-check.test.ts`; `dashboard-view-model.test.ts`; durability tests (input).
13. **Data quality:** `actual`.

### first_to_second_conversion

1. **Canonical name + MetricId:** First-to-second conversion — `first_to_second_conversion`
2. **Commercial question:** What share of customers place a second order within 90 days of their first?
3. **Formula:** Windowed: `customersWithSecondOrderWithinWindow / totalCustomers` where `(t1-t0)/MS_PER_DAY` is in `[0, withinDays]` (default 90). Also emits unwindowed conversion and mean/median days.
4. **Raw + transformed inputs:** Per-customer chronological orders → first/second timestamps → day gaps.
5. **Inclusion / exclusion / financial treatment:** All customers in denominator. Customers with &lt;2 orders do not convert.
6. **Time / cohort / identity / assumptions:** Journey-time days from order timestamps — **not** Month+N calendar retention. Default window 90 days.
7. **Output type / unit / rounding / display:** Fraction `[0,1]`; days as number or `null`. UI percent / number; null days → `"—"`.
8. **Missing / partial / zero-denominator:** Empty customers → rates `0`, day stats `null`. Invalid timestamps skip gap stats for that customer.
9. **Caveats:** Not interchangeable with Month+N active retention.
10. **Engine source:** `lib/metrics/repeat-purchase.ts::calculateFirstToSecondOrderConversion`.
11. **UI locations:** `/dashboard`, `/retention`, `/insights`, durability, product quality (per segment).
12. **Existing tests:** `demo-sanity-check.test.ts`; `product-quality.test.ts`; durability tests.
13. **Data quality:** `actual`.

### cohort_retention

1. **Canonical name + MetricId:** Cohort retention (Month +N active) — `cohort_retention`
2. **Commercial question:** What share of a first-order cohort placed at least one order in calendar month M+N?
3. **Formula:** `activeCustomers / cohortSize` for offset `k`, where active means ≥1 order in UTC month `addMonthsToMonthKey(M, k)`.
4. **Raw + transformed inputs:** Customers + orders → cohort membership + order month sets → rates per offset.
5. **Inclusion / exclusion / financial treatment:** Denominator = full acquisition cohort size. Revenue in period uses `netOrderRevenue` but rate is activity-based.
6. **Time / cohort / identity / assumptions:** UTC calendar-month offsets. `maxOffset` optional cap. No margin/spend assumptions for the rate.
7. **Output type / unit / rounding / display:** Fraction `[0,1]`. Matrix may show `"·"` for unavailable future cells; UI percent.
8. **Missing / partial / zero-denominator:** `safeDivide` → `0` if cohortSize were 0. Offsets beyond data not emitted (implied max from latest order month). Average Month+N across cohorts returns `null` when no cohorts have that offset (`retention-view-model`).
9. **Caveats:** Calendar breadth ≠ 90-day journey metric. Fractional engine rates vs legacy SQL percents (quarantined).
10. **Engine source:** `lib/metrics/retention.ts::calculateRetentionByCohort`.
11. **UI locations:** `/retention`, `/cohorts` (matrix `retention_rate`), `/dashboard`, `/insights`.
12. **Existing tests:** `demo-sanity-check.test.ts`; dashboard/durability (Month+1 average).
13. **Data quality:** `actual` when order history supports the offset; partial when young cohorts lack mature offsets.

### cohort_revenue_contribution

1. **Canonical name + MetricId:** Acquisition cohort revenue contribution — `cohort_revenue_contribution`
2. **Commercial question:** Which acquisition cohorts generated the trusted net revenue in the selected reporting period?
3. **Formula:** For each order in `AnalysisSelection.reportingOrders`, attribute `netOrderRevenue(order)` to:
   - `unidentified_customer` when `customerId` is null;
   - `unresolved_customer` when `customerId` is non-null but no matching `Customer` exists;
   - `outside_selected_acquisition_period` when acquisition scope is bounded and the customer is outside `eligibleCustomerIds`;
   - otherwise cohort month `utcMonthKeyFromIso(customer.firstOrderAt)`.
   Denominator `totalReportingRevenue` = Σ attributed nets (includes residuals). Row shares = revenue / total when total > 0, else `null`.
   `selectedCohortRevenue` = Σ `kind === "cohort"` revenue; `selectedCohortShareOfReportingRevenue` = selected / total (or null).
   `cohortResolvedRevenue` = selected cohort revenue + `outside_selected_acquisition_period` revenue; `cohortAttributionCoverage` = resolved / total (or null). Coverage excludes unidentified and unresolved.
4. **Raw + transformed inputs:** `AnalysisSelection` from `buildAnalysisSelection` over canonical full-history `RetentionOSDataset`. Reuses `netOrderRevenue`; does not re-filter periods.
5. **Inclusion / exclusion / financial treatment:** Trusted net merchandise via `netOrderRevenue` (gross − discounts − refunds, floored ≥ 0). Tax/shipping excluded. Guests and unresolved remain in the denominator via residual rows.
6. **Time / cohort / identity / assumptions:** Reporting period half-open via selection; acquisition cohort from canonical `firstOrderAt` (never reporting order date). Invalid `firstOrderAt` throws `RangeError`. `maturityHorizonMonths` ignored. Omitted reporting period → all dataset orders as reporting population.
7. **Output type / unit / rounding / display:** Currency + fractional shares. Engine does not round. Emit rows with `orderCount > 0` (including zero-net refunded activity). Cohort rows chronological; residuals: unidentified → outside → unresolved.
8. **Missing / partial / zero-denominator:** Zero reporting orders → `status: "empty"` (no reporting activity). Orders with total net 0 → `status: "available"` with null ratio fields (never NaN / artificial zero). `outside_selected_acquisition_period` absent when acquisition scope is `all`.
9. **Caveats:** Period portfolio share — **not** cumulative cohort LTV / revenue LTV. Distinct from `calculateCohorts` all-time absolute rollups. Planned presentation destinations `/cohorts` and `/dashboard` are not wired in MET-SHARE.
10. **Engine source:** `lib/metrics/cohort-revenue-contribution.ts::calculateCohortRevenueContribution`.
11. **UI locations:** None currently (engine-only). Planned later: `/cohorts`, `/dashboard` (6B).
12. **Existing tests:** `cohort-revenue-contribution.test.ts`; golden Jan 2025 period share; `metric-contract-index.test.ts`.
13. **Data quality:** `actual` when reporting orders exist; empty when no reporting activity.

### cohort_revenue_retention

1. **Canonical name + MetricId:** Cohort revenue retention — `cohort_revenue_retention`
2. **Commercial question:** For customers acquired in cohort month C, how much trusted net revenue did that cohort generate in Month+N, and what percentage is that of Month+0 revenue?
3. **Formula:** `periodRevenue(C, N) = Σ netOrderRevenue(order)` for observed eligible cohort customers where order month equals C+N. `revenueRetention(C, N) = periodRevenue(C, N) / periodRevenue(C, 0)` when Month+0 revenue is positive and Month+N is `complete` or `partial`; otherwise `null`.
4. **Raw + transformed inputs:** `AnalysisSelection` from `buildAnalysisSelection`. Uses `fullDataset` + `eligibleCustomerIds` + `context.asOfDate` + optional `maturityHorizonMonths`. Reuses `netOrderRevenue` and `getMonthlyCohortMaturityStatus`. Does **not** read `reportingOrders`, `identifiableReportingOrders`, or `reportingOrdersForEligibleCustomers`.
5. **Inclusion / exclusion / financial treatment:** Trusted net merchandise via `netOrderRevenue`. Guests (`customerId === null`) excluded without error. Identified orders with `orderedAt < asOfDate` must resolve to a canonical customer and satisfy `orderedAt >= firstOrderAt` or throw `RangeError` **before** acquisition filtering. Eligible membership applies only after integrity validation. Customers/orders at or after `asOfDate` are excluded from observation.
6. **Time / cohort / identity / assumptions:** UTC calendar-month offsets from canonical `firstOrderAt`. `asOfDate` is an exclusive observation boundary (canonical UTC instant comparisons). A cell is `partial` only when some observation time exists between the target-period start and exclusive `asOfDate`; if `targetPeriodStart >= asOfDate`, the cell is `unavailable` with null numerics (even when uniform `maxOffset` extends a younger cohort to that column). When `maturityHorizonMonths` is set, `maxOffset` equals that inclusive cap (unavailable cells may appear). When absent, `maxOffset` ends at the latest UTC month with any instant strictly before `asOfDate` (month-start asOf uses the preceding month — no wholly future column). `reportingPeriod` is irrelevant.
7. **Output type / unit / rounding / display:** Fractional retention rates (may exceed 100%) + period currency. Engine does not round. Future matrix presentation (not wired here): complete → value; partial → observed value with subtle styling/tooltip; unavailable/future → em dash `—`; completed genuine zero → `0%` (not a dash). Do not render the words "Unavailable" or "Not yet reached" in the matrix.
8. **Missing / partial / zero-denominator:** `unavailable` → null numerics (never synthetic zero). `complete`/`partial` with no activity → revenue/order/customer counts 0; rate 0 when Month+0 > 0. Zero Month+0 → null rates. No observed eligible customers → `status: "empty"`, `rows: []`. Historical data-gap provenance is out of scope — zero revenue is not inferred as a gap.
9. **Caveats:** Period-based — **not** cumulative revenue LTV and **not** customer activity retention. Distinct from `cohort_revenue_contribution` (reporting-period portfolio share). Engine-only until 6B / 6A-MATRIX.
10. **Engine source:** `lib/metrics/cohort-revenue-retention.ts::calculateCohortRevenueRetention`.
11. **UI locations:** None currently (engine-only). Planned later: `/retention`, `/cohorts` matrices (6B).
12. **Existing tests:** `cohort-revenue-retention.test.ts`; golden as-of reconciliation; `metric-contract-index.test.ts`.
13. **Data quality:** `actual` for complete cells; `partial` when Month+N is incomplete relative to asOf; `unavailable` for not-yet-started / beyond-horizon cells.

### revenue_ltv

1. **Canonical name + MetricId:** Revenue LTV — `revenue_ltv`
2. **Commercial question:** How much net merchandise revenue has the average cohort customer generated through age M+N?
3. **Formula:** Cumulative Σ `netOrderRevenue` for cohort members with order month ≤ end of `M+offset`, divided by `cohortSize`. Stored in `LTVPoint.cumulativeAvgGrossRevenue` (**net value despite field name**).
4. **Raw + transformed inputs:** Customers + orders → cohort groups → cumulative nets by offset.
5. **Inclusion / exclusion / financial treatment:** Net merchandise only (gross − discounts − refunds, floored). Tax/shipping excluded.
6. **Time / cohort / identity / assumptions:** UTC month staircase. Terminal LTV = latest available offset for that cohort. No margin required.
7. **Output type / unit / rounding / display:** Currency per customer. UI money format; null → `"—"`.
8. **Missing / partial / zero-denominator:** Empty customers → `[]`. `safeDivide` → `0` if size 0. Young cohorts have shorter ladders (partial maturity).
9. **Caveats:** Field name `cumulativeAvgGrossRevenue` is a naming hazard (Appendix C). Not `mv_kpis` average revenue per customer.
10. **Engine source:** `lib/metrics/ltv.ts::calculateLTVByCohort`.
11. **UI locations:** `/ltv`, `/cohorts` matrix `revenue_ltv`, `/dashboard`, `/acquisition` ratios, `/insights`.
12. **Existing tests:** `demo-sanity-check.test.ts`; `dashboard-view-model.test.ts`.
13. **Data quality:** `actual` for observed staircase; treat immature tails as partial commercially.

### contribution_ltv

1. **Canonical name + MetricId:** Contribution LTV — `contribution_ltv`
2. **Commercial question:** How much contribution dollar value has the average cohort customer generated through age M+N?
3. **Formula:** Same staircase using `orderContribution`; `cumulativeAvgContribution = safeDivide(cohortContrib, cohortSize)` when `includeContribution` is true (`marginAssumptions != null` OR `cohortContrib > 0`).
4. **Raw + transformed inputs:** `order.contributionMargin` if finite; else `netOrderRevenue × (netRevenueMultiplier ?? 1) × contributionMarginPct` when margin assumptions provided; else contribution `0` per order.
5. **Inclusion / exclusion / financial treatment:** Modeled contribution, not Shopify Profit reports unless assumptions map to COGS. Floored at 0 per order.
6. **Time / cohort / identity / assumptions:** Same UTC staircase as revenue LTV. Margin assumptions are explicit session/demo inputs (observed vs assumed separation).
7. **Output type / unit / rounding / display:** Currency per customer or omitted/`null` when contribution path locked. UI `"—"` / Locked.
8. **Missing / partial / zero-denominator:** Without margin path, contribution field omitted on points. Payback/contribution ratios unavailable. Engine may still sum zeros if gated incorrectly — VMs lock UI when unavailable.
9. **Caveats:** Assumption-based contribution is estimated/partial, not observed COGS.
10. **Engine source:** `utils.ts::orderContribution`; `ltv.ts::calculateLTVByCohort`.
11. **UI locations:** `/ltv`, `/cohorts` matrix `contribution_ltv`, `/dashboard`, `/acquisition` (contribution LTV:CAC, payback), `/insights`.
12. **Existing tests:** `dashboard-view-model.test.ts` (lock paths); `demo-sanity-check.test.ts`.
13. **Data quality:** `partial` with assumptions or partial order margins; `unavailable` without contribution path.

### cac

1. **Canonical name + MetricId:** CAC (monthly) — `cac`
2. **Commercial question:** What did it cost to acquire a customer in first-order month M?
3. **Formula:** For each month with spend or acquisitions: if `acquired > 0` and `spend > 0`, `cac = spend / acquired`; else `cac = null` (no inferred spend).
4. **Raw + transformed inputs:** `MarketingSpend` rows → cohort month via `spendBucketToCohortMonthKey`; customers → first-order month counts.
5. **Inclusion / exclusion / financial treatment:** No silent spend inference. Zero spend with acquisitions → null CAC + warning.
6. **Time / cohort / identity / assumptions:** Calendar month alignment of spend bucket to acquisition month. Spend may be imported CSV (`actual`) or % of net revenue synthesis (`estimated`).
7. **Output type / unit / rounding / display:** Currency or null. UI Locked/`"—"` when unavailable.
8. **Missing / partial / zero-denominator:** Empty spend → no rows. Spend without acquisitions → null CAC + warning. Blended path separate.
9. **Caveats:** Requires overlapping spend and acquisition months for cohort CAC.
10. **Engine source:** `lib/metrics/acquisition.ts::calculateCACByMonth`.
11. **UI locations:** `/acquisition`, `/dashboard` spine, `/data` unlock path.
12. **Existing tests:** `dashboard-view-model.test.ts` (locked without spend); data-source spend/assumption tests.
13. **Data quality:** `actual` | `estimated` | `unavailable` per spend source.

### blended_cac

1. **Canonical name + MetricId:** Blended CAC — `blended_cac`
2. **Commercial question:** What is total marketing spend per customer across the whole snapshot?
3. **Formula:** `totalSpend / customerCount` when spend present and customers &gt; 0; result must be finite and &gt; 0 else null.
4. **Raw + transformed inputs:** Sum of all spend rows; count of all customers.
5. **Inclusion / exclusion / financial treatment:** Deliberately blunt; not strict cohort-month matching.
6. **Time / cohort / identity / assumptions:** Snapshot-wide. Same spend actual/estimated distinction.
7. **Output type / unit / rounding / display:** Currency or null. UI money / Locked.
8. **Missing / partial / zero-denominator:** No spend or no customers → null + warnings (not a silent zero CAC).
9. **Caveats:** Not interchangeable with monthly cohort CAC.
10. **Engine source:** `lib/metrics/acquisition.ts::calculateBlendedCAC`.
11. **UI locations:** `/acquisition`, `/dashboard` (Acquisition efficiency tile / spine).
12. **Existing tests:** `dashboard-view-model.test.ts`.
13. **Data quality:** `actual` | `estimated` | `unavailable`.

### revenue_ltv_cac

1. **Canonical name + MetricId:** Revenue LTV:CAC — `revenue_ltv_cac`
2. **Commercial question:** Does terminal revenue LTV cover what we paid to acquire the cohort?
3. **Formula:** `terminal cumulativeAvgGrossRevenue / CAC(month)` when CAC &gt; 0; else null.
4. **Raw + transformed inputs:** LTV staircase terminals + CAC map from monthly CAC rows.
5. **Inclusion / exclusion / financial treatment:** Revenue (net merchandise) lens only.
6. **Time / cohort / identity / assumptions:** Terminal = max offset present for cohort. Spend quality carries through.
7. **Output type / unit / rounding / display:** Ratio number or null. UI formats ratio; Locked when unavailable.
8. **Missing / partial / zero-denominator:** Missing CAC → null (not zero). Warnings count months without CAC.
9. **Caveats:** Uses net revenue LTV field despite “gross” property name.
10. **Engine source:** `lib/metrics/acquisition.ts::calculateLtvToCac`.
11. **UI locations:** `/acquisition`, `/dashboard`.
12. **Existing tests:** `dashboard-view-model.test.ts`.
13. **Data quality:** inherits CAC spend quality; `unavailable` without unlocked acquisition economics.

### contribution_ltv_cac

1. **Canonical name + MetricId:** Contribution LTV:CAC — `contribution_ltv_cac`
2. **Commercial question:** Does terminal contribution LTV cover acquisition cost?
3. **Formula:** `terminal cumulativeAvgContribution / CAC(month)` when both present and CAC &gt; 0; else null.
4. **Raw + transformed inputs:** Contribution staircase + CAC map.
5. **Inclusion / exclusion / financial treatment:** Requires contribution path.
6. **Time / cohort / identity / assumptions:** Same terminal/CAC month alignment as revenue ratio.
7. **Output type / unit / rounding / display:** Ratio or null; UI Locked/`"—"`.
8. **Missing / partial / zero-denominator:** Null when contribution or CAC missing — not zero.
9. **Caveats:** Dual dependency on margin path and spend.
10. **Engine source:** `lib/metrics/acquisition.ts::calculateLtvToCac`.
11. **UI locations:** `/acquisition`, `/dashboard` spine.
12. **Existing tests:** `dashboard-view-model.test.ts`.
13. **Data quality:** `partial` / `estimated` / `unavailable` per contribution and spend.

### payback

1. **Canonical name + MetricId:** Payback — `payback`
2. **Commercial question:** At what cohort age does cumulative contribution LTV first recover CAC?
3. **Formula:** First offset where `cumulativeAvgContribution >= CAC`; emit `monthsToPayback = offset`. Contribution payback only.
4. **Raw + transformed inputs:** Full contribution LTV ladder + positive CAC for acquisition month.
5. **Inclusion / exclusion / financial treatment:** No revenue-payback variant in engine.
6. **Time / cohort / identity / assumptions:** Calendar-month offsets. Requires contribution staircase.
7. **Output type / unit / rounding / display:** Integer months or null. UI Locked / not-yet-achieved messaging via VM.
8. **Missing / partial / zero-denominator:** Null CAC or no contribution → null + warnings. Ladder may end before payback (null, not zero).
9. **Caveats:** Contribution-only; assumption-based margins affect timing.
10. **Engine source:** `lib/metrics/acquisition.ts::calculatePaybackPeriod`.
11. **UI locations:** `/acquisition`, `/dashboard` (Payback pressure tile).
12. **Existing tests:** `dashboard-view-model.test.ts`.
13. **Data quality:** `partial` / `estimated` / `unavailable`.

### product_quality

1. **Canonical name + MetricId:** Product quality — `product_quality`
2. **Commercial question:** Which first products create durable, repeating, economically healthy customers?
3. **Formula:** Segment customers by first line item on chronological first order (`deriveFirstProductIdForCustomer`). Per segment: repeat rate, F2S (default 90d), third-purchase rate, avg revenue/contribution LTV, discount/refund drag. Signal `strong|watch|weak|insufficient_data` using `MIN_CUSTOMERS_FOR_SIGNAL=5`, `MATERIAL_DELTA=0.1`, `HIGH_DRAG=0.15` vs portfolio baselines.
4. **Raw + transformed inputs:** Orders with `lineItems.productId`, product catalog titles; optional margin assumptions for contribution.
5. **Inclusion / exclusion / financial treatment:** First-product attribution only — not full basket. Unassigned customers counted separately.
6. **Time / cohort / identity / assumptions:** All-time snapshot economics per segment. F2S window default 90d.
7. **Output type / unit / rounding / display:** Table of rates/currency + categorical signal. UI Locked without line items.
8. **Missing / partial / zero-denominator:** No line-item coverage → locked / insufficient. Segments &lt;5 customers → `insufficient_data` (not weak). Contribution null without path.
9. **Caveats:** Not product sales volume. Not channel quality.
10. **Engine source:** `lib/metrics/product-quality.ts::calculateFirstProductCustomerQuality` (+ `FromDataset`).
11. **UI locations:** `/products`, `/dashboard` (Entry-product signal / spine).
12. **Existing tests:** `product-quality.test.ts`; `dashboard-view-model.test.ts`.
13. **Data quality:** `partial` with line items; `unavailable` without.

### revenue_durability_posture

1. **Canonical name + MetricId:** Revenue durability posture — `revenue_durability_posture`
2. **Commercial question:** Is portfolio retention economics Healthy, Mixed, or Watch right now?
3. **Formula:** Vote heuristic on inputs: repeat rate, F2S90, avg Month+1 active (`null` skips that vote), LTV cohort spread USD (`null` skips). Thresholds in `revenue-durability-status.ts`. Returns `Healthy` | `Mixed` | `Watch`. **Not a 0–100 score.**
4. **Raw + transformed inputs:** Outputs of repeat, F2S, retention averages, terminal LTV spread from dashboard/insights builders.
5. **Inclusion / exclusion / financial treatment:** Informal posture only — not finance-grade durability.
6. **Time / cohort / identity / assumptions:** Uses portfolio snapshot metrics; spread null when not meaningful.
7. **Output type / unit / rounding / display:** Enum label string. Hero displays posture wording.
8. **Missing / partial / zero-denominator:** Null Month+1 or spread omit those votes (do not count as zero). Underlying rates may still be engine zeros on empty data.
9. **Caveats:** Not `RevenueDurabilityScore` composite. Do not invent numeric durability.
10. **Engine source:** `lib/metrics/revenue-durability-status.ts::evaluateRevenueDurabilityStatus`.
11. **UI locations:** `/dashboard` hero; `/insights` (durability notes / metricRefs).
12. **Existing tests:** `revenue-durability-status.test.ts`; `dashboard-view-model.test.ts`.
13. **Data quality:** `actual` when input metrics exist; commercially interpret empty-dataset zeros cautiously (Appendix C).

### marketing_spend_assumption

1. **Canonical name + MetricId:** Marketing spend — `marketing_spend_assumption`
2. **Commercial question:** What marketing spend (observed or assumed) unlocks CAC economics?
3. **Formula:** Imported: sum/group spend CSV by month (and optional channel label). Estimated: `% × sum(net merchandise revenue by UTC order month)` synthesized into spend rows. No silent inference inside CAC calculators themselves.
4. **Raw + transformed inputs:** Spend CSV or session % assumption via `lib/data-source` resolvers → `MarketingSpend[]` on dataset.
5. **Inclusion / exclusion / financial treatment:** Observed CSV vs assumed % clearly separated in data quality. Channel field may label spend rows but does not create channel-quality KPIs.
6. **Time / cohort / identity / assumptions:** Spend months mapped to cohort keys via `spendBucketToCohortMonthKey`. Assumption is explicit user/session input.
7. **Output type / unit / rounding / display:** Currency rows; UI banners on `/acquisition` / `/data` for locked vs estimated.
8. **Missing / partial / zero-denominator:** No spend and no assumption → acquisition metrics unavailable (Locked), not zero CAC.
9. **Caveats:** Estimated spend is not observed media cost. Net merchandise base for % assumptions (not Total sales).
10. **Engine source:** `lib/data-source/*` spend resolution; consumed by `acquisition.ts`.
11. **UI locations:** `/data` (save/unlock), `/acquisition`, dashboard acquisition locks.
12. **Existing tests:** `synthesize-marketing-spend-assumption.test.ts`; `marketing-spend-assumption-session.test.ts`; `resolve-marketing-spend.test.ts`.
13. **Data quality:** `actual` | `estimated` | `unavailable`.

---

## Appendix A — Non-implemented / deferred (not contracted KPIs)

| Item | Status | Why not a full contract |
|------|--------|-------------------------|
| `aov` | MetricId exists; tooltip says not computed; MVP does not display AOV | Do not invent engine behaviour |
| Channel quality | No `calculateChannelCustomerQuality`; spend may list `channel` labels only | Do not invent a quality module |
| `RevenueDurabilityScore` (0–100) | Type exists in `lib/types/metrics.ts`; unused by engine | Posture enum is the retained concept |
| Legacy SQL/API KPI names (`mv_kpis.customer_lifetime_value`, etc.) | Quarantined dual ecosystem | Not oracles for contracts |

---

## Appendix B — Executive dashboard tile crosswalk

Mapping only — not a 13-field KPI contract.

| Dashboard surface | Binds to contract(s) |
|-------------------|----------------------|
| Hero — Revenue durability posture | `revenue_durability_posture` |
| Hero signal — Repeat quality | `repeat_purchase_rate` |
| Hero signal — Acquisition efficiency | `blended_cac` and/or `revenue_ltv_cac` (VM chooses by unlock/estimate state) |
| Hero signal — Payback pressure | `payback` |
| Hero signal — Entry-product signal | `product_quality` |
| Summary — Repeat purchase rate | `repeat_purchase_rate` |
| Summary — First-to-second (90d) | `first_to_second_conversion` |
| Summary — Revenue LTV | `revenue_ltv` |
| Summary — Contribution LTV | `contribution_ltv` |
| Summary — Net merchandise revenue | `net_revenue` |
| Spine — Blended CAC | `blended_cac` |
| Spine — Revenue LTV:CAC | `revenue_ltv_cac` |
| Spine — Contribution LTV:CAC | `contribution_ltv_cac` |
| Spine — Payback | `payback` |
| Spine — Product quality highlights | `product_quality` |
| Completeness / Locked banners | `marketing_spend_assumption`, `contribution_ltv`, line-item coverage for `product_quality` |

Primary builders: `buildDashboardExecutiveViewModelFromDataset`, `dashboard-executive-spine.ts`. Components: `DashboardExecutive.tsx`, `DashboardCommandCentreHero.tsx`, `DashboardSpinePanels.tsx`.

---

## Appendix C — Known engine / presentation hazards

| Hazard | Evidence | Contract implication |
|--------|----------|----------------------|
| `cumulativeAvgGrossRevenue` holds net | `ltv.ts` comment | Contracts and UI copy say revenue/net LTV; do not read the property name as gross |
| `safeDivide` → `0` on zero denominator | `utils.ts` | Engine may emit 0 rates; UI must use VM null/Locked/`"—"` for unavailable economics — do not treat engine 0 as trusted commercial zero when inputs are absent |
| `orderContribution` → `0` without margin | `utils.ts` | Contribution path gated by `includeContribution`; UI locks when unavailable |
| Duplicated terminal-LTV helpers | `dashboard-view-model.ts`, `ltv-view-model.ts`, `generate-diagnostic-insights.ts` | Documented duplication; **not** deduped in 5U-B |
| Channel quality absent | No engine module | Appendix A only |

---

## Maintenance

When calculator behaviour changes in a later sprint, update the matching section here and verify `metric-contract-index.ts` linkage. Do not duplicate full formula prose into TypeScript.

**Product backlog / sequencing (not formula contracts):** founder-approved analysis reconciliation and MET/6A/6B/6C sequencing live in [`PRODUCT_RECONCILIATION_BACKLOG.md`](PRODUCT_RECONCILIATION_BACKLOG.md) (Sprint 5X-B).
