# RetentionOS Metric Inventory & Trust Audit

**Generated:** 2025-01-27  
**Purpose:** Comprehensive audit of all metrics displayed to users across the RetentionOS platform  
**Status:** Audit-only (no code changes)

---

## Executive Summary

This document catalogs every metric displayed in RetentionOS, organized by product area, with source tracking, calculation methods, and trust flags for audit purposes.

**Total Metrics Identified:** 80+ unique metrics  
**Product Areas:** 5 (Revenue Formation, Customer Retention, Repeat Purchases, Value Growth/LTV, KPI Summary)  
**Pages Analyzed:** 15+ pages/components  
**API Routes:** 9 metric endpoints

---

## Product Area 1: Revenue Formation

### 1.1 Total Revenue
- **User-facing name:** Total Revenue
- **Internal variable:** `total_revenue`, `totalRevenue`
- **Pages:** Dashboard (`/dashboard`), REDHomePage (`/dashboard`), DashboardClient
- **Chart/KPI type:** KPI Card
- **Source:** 
  - API: `app/api/metrics/kpis/route.ts` (line 16, 180)
  - Database: `mv_kpis.total_revenue` (SQL line 16)
  - Calculation: `COALESCE(SUM(o.total_price), 0)`
- **Derived from:** Raw order data (`orders.total_price`)
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Also calculated in `app/api/dashboard/metrics/route.ts` (line 155) with different logic
- **Documentation:** ✅ Has inline SQL comments

### 1.2 Revenue (30 days)
- **User-facing name:** Revenue (30d), Revenue 30d
- **Internal variable:** `revenue_30d`
- **Pages:** Dashboard KPIs
- **Chart/KPI type:** KPI Card (implied)
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 22, 189)
  - Database: `mv_kpis.revenue_30d` (SQL line 50)
  - Calculation: `COALESCE(SUM(CASE WHEN o.source_created_at >= NOW() - INTERVAL '30 days' THEN o.total_price END), 0)`
- **Derived from:** Raw order data filtered by date
- **Issues:** None
- **Documentation:** ✅ Has SQL comment

### 1.3 Revenue (90 days)
- **User-facing name:** Revenue (90d), Revenue 90d
- **Internal variable:** `revenue_90d`
- **Pages:** Dashboard KPIs
- **Chart/KPI type:** KPI Card (implied)
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 23, 190)
  - Database: `mv_kpis.revenue_90d` (SQL line 51)
  - Calculation: `COALESCE(SUM(CASE WHEN o.source_created_at >= NOW() - INTERVAL '90 days' THEN o.total_price END), 0)`
- **Derived from:** Raw order data filtered by date
- **Issues:** None
- **Documentation:** ✅ Has SQL comment

### 1.4 Net Sales
- **User-facing name:** Net Sales
- **Internal variable:** `net_sales` (mock data only)
- **Pages:** REDHomePage (`/dashboard`)
- **Chart/KPI type:** KPI Tile
- **Source:**
  - Component: `app/(protected)/dashboard/REDHomePage.tsx` (line 206-216)
  - Calculation: Mock data only - `revenue - refunds - taxes - duties` (not implemented)
- **Derived from:** Other derived metrics (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ❌ Formula defined but not implemented

### 1.5 Average Order Value (AOV)
- **User-facing name:** Average Order Value, AOV
- **Internal variable:** `average_order_value`, `avg_order_value`, `aov`
- **Pages:** Dashboard, REDHomePage, Product Performance, Customer Segments
- **Chart/KPI type:** KPI Card, Chart Tooltip
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 14, 181)
  - Database: `mv_kpis.average_order_value` (SQL line 17)
  - Calculation: `COALESCE(AVG(o.total_price), 0)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 156, 184) - `totalRevenue / orders.length`
- **Derived from:** Raw order data
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Calculated differently in two places:
  - `mv_kpis`: Uses `AVG()` aggregate
  - `dashboard/metrics`: Uses `totalRevenue / orders.length`
  - These may differ due to NULL handling
- **Documentation:** ⚠️ Partial - formula in mock data but not in real calculation

### 1.6 Cohort Revenue (by Period)
- **User-facing name:** Revenue (in cohort matrix/table)
- **Internal variable:** `total_revenue` (cohort context)
- **Pages:** Revenue Cohorts (`/retention-ltv/revenue-cohorts`), Cohort Matrix
- **Chart/KPI type:** Cohort Matrix Cell, Chart Series
- **Source:**
  - API: `app/api/metrics/cohorts/route.ts` (line 17, 135)
  - Database: `mv_cohorts.total_revenue` (SQL line 109)
  - Calculation: `SUM(cd.revenue_in_month)` grouped by cohort and period
- **Derived from:** Raw order data aggregated by cohort month and order month
- **Issues:** None
- **Documentation:** ✅ Has SQL comments

### 1.7 Original Period Revenue (Cohort)
- **User-facing name:** Original Value (cohort matrix)
- **Internal variable:** `_originalRevenue` (cohort matrix)
- **Pages:** Cohort Matrix (`components/charts/CohortMatrix.tsx`)
- **Chart/KPI type:** Cohort Matrix Header
- **Source:**
  - Component: `components/charts/CohortMatrix.tsx` (line 115-122)
  - Calculation: `periods.find(p => p.period_number === 0).total_revenue`
- **Derived from:** Cohort period 0 revenue (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Uses cohort revenue which is already aggregated
- **Documentation:** ❌ No inline documentation

### 1.8 Revenue Retention
- **User-facing name:** Revenue Retention
- **Internal variable:** `revenue_retention`
- **Pages:** Retention Curve (`/retention/curve`)
- **Chart/KPI type:** Chart Series (Line Chart)
- **Source:**
  - API: `app/api/retention/curve/route.ts` (line 10, 50, 63, 70, 80, 90)
  - Calculation: Mock data only - percentage value
- **Derived from:** Other derived metrics (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ❌ No calculation logic

### 1.9 Geographic Revenue Breakdown
- **User-facing name:** Revenue by Geography (implied)
- **Internal variable:** `geographicBreakdown`, `geoRevenue`, `geographic_distribution`
- **Pages:** Dashboard (implied), Cohort generation
- **Chart/KPI type:** Not displayed (data exists but not shown)
- **Source:**
  - API: `app/api/dashboard/metrics/route.ts` (line 211-216, 229) - Mock only
  - Database: Not stored
  - Calculation: Mock percentages (UK: 80%, Germany: 7%, France: 7%, Spain: 6%)
- **Derived from:** Mock data
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data, not displayed
- **Documentation:** ❌ No documentation

---

## Product Area 2: Customer Retention

### 2.1 Retention Rate (Overall)
- **User-facing name:** Retention Rate
- **Internal variable:** `retention_rate_percent`, `retentionRate`
- **Pages:** Dashboard, REDHomePage, Cohort sections
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 17, 184)
  - Database: `mv_kpis.retention_rate_percent` (SQL line 22-26)
  - Calculation: `(repeat_customers * 100.0) / NULLIF(total_customers, 0)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 152, 178) - `(repeatCustomers.length / customers.length) * 100`
- **Derived from:** Customer order counts
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Calculated in two places with potentially different results
- **Documentation:** ✅ Has SQL comments

### 2.2 Cohort Retention Rate (by Period)
- **User-facing name:** Retention Rate (cohort matrix cells)
- **Internal variable:** `retention_rate_percent` (cohort context)
- **Pages:** Revenue Cohorts, Cohort Matrix, Cohort Retention Table
- **Chart/KPI type:** Cohort Matrix Cell, Table Cell, Chart Tooltip
- **Source:**
  - API: `app/api/metrics/cohorts/route.ts` (line 18, 136)
  - Database: `mv_cohorts.retention_rate_percent` (SQL line 110-113)
  - Calculation: `(active_customers * 100.0) / NULLIF(cohort_size, 0)`
- **Derived from:** Cohort active customers vs cohort size
- **Issues:** ⚠️ **INCOMPLETE COHORTS** - Recent cohorts may have incomplete periods
- **Documentation:** ✅ Has SQL comments

### 2.3 Active Customers (Cohort Period)
- **User-facing name:** Active Customers, Customers (cohort cells)
- **Internal variable:** `active_customers`
- **Pages:** Cohort Matrix, Cohort Retention Table
- **Chart/KPI type:** Cohort Matrix Cell, Table Cell
- **Source:**
  - API: `app/api/metrics/cohorts/route.ts` (line 15, 133)
  - Database: `mv_cohorts.active_customers` (SQL line 107)
  - Calculation: `COUNT(DISTINCT cd.customer_id)` grouped by cohort and period
- **Derived from:** Raw order data grouped by customer, cohort, period
- **Issues:** ⚠️ **INCOMPLETE COHORTS** - Recent cohorts may have incomplete periods
- **Documentation:** ✅ Has SQL comments

### 2.4 Cohort Size
- **User-facing name:** Cohort Size, Initial Customers
- **Internal variable:** `cohort_size`
- **Pages:** Revenue Cohorts, Cohort Matrix, Cohort Retention Table
- **Chart/KPI type:** Cohort Matrix Header, Table Header
- **Source:**
  - API: `app/api/metrics/cohorts/route.ts` (line 12, 130)
  - Database: `mv_cohorts.cohort_size` (SQL line 97)
  - Calculation: `COUNT(DISTINCT customer_id)` grouped by cohort_month
- **Derived from:** Raw customer data (first_order_at)
- **Issues:** None
- **Documentation:** ✅ Has SQL comments

### 2.5 Repeat Customers
- **User-facing name:** Repeat Customers
- **Internal variable:** `repeat_customers`, `repeatCustomers`
- **Pages:** Dashboard
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 16, 183)
  - Database: `mv_kpis.repeat_customers` (SQL line 21)
  - Calculation: `COUNT(DISTINCT CASE WHEN customer_order_counts.order_count > 1 THEN c.id END)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 151, 185) - `Object.values(customerOrders).filter(orders => orders.length > 1)`
- **Derived from:** Customer order counts
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Calculated in two places
- **Documentation:** ✅ Has SQL comments

### 2.6 At-Risk Customers
- **User-facing name:** At-Risk Customers
- **Internal variable:** `at_risk_customers`, `atRiskCustomers`
- **Pages:** Dashboard, REDHomePage
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 18, 185)
  - Database: `mv_kpis.at_risk_customers` (SQL line 29-32)
  - Calculation: `COUNT(DISTINCT CASE WHEN c.last_order_at < NOW() - INTERVAL '60 days' THEN c.id END)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 161-165, 180) - Different logic using `source_created_at`
- **Derived from:** Customer last_order_at timestamp
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Different date field used (`last_order_at` vs `source_created_at`)
- **Documentation:** ✅ Has SQL comments

### 2.7 Dormant Customers
- **User-facing name:** Dormant Customers
- **Internal variable:** `dormant_customers`, `dormantCustomers`
- **Pages:** Dashboard
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 19, 186)
  - Database: `mv_kpis.dormant_customers` (SQL line 35-38)
  - Calculation: `COUNT(DISTINCT CASE WHEN c.last_order_at < NOW() - INTERVAL '90 days' THEN c.id END)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 168-172, 181) - Different logic using `source_created_at`
- **Derived from:** Customer last_order_at timestamp
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Different date field used
- **Documentation:** ✅ Has SQL comments

### 2.8 One-Time Buyers
- **User-facing name:** One-Time Buyers
- **Internal variable:** `one_time_buyers`, `oneTimeBuyers`
- **Pages:** Dashboard
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 20, 187)
  - Database: `mv_kpis.one_time_buyers` (SQL line 41)
  - Calculation: `COUNT(DISTINCT CASE WHEN customer_order_counts.order_count = 1 THEN c.id END)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 175, 182) - `Object.values(customerOrders).filter(orders => orders.length === 1)`
- **Derived from:** Customer order counts
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Calculated in two places
- **Documentation:** ✅ Has SQL comments

### 2.9 Churn Rate
- **User-facing name:** Churn Rate
- **Internal variable:** `churn_rate`
- **Pages:** Retention Curve, Retention Analysis, Reports Summary
- **Chart/KPI type:** Chart Data (mock only)
- **Source:**
  - API: `app/api/retention/curve/route.ts` (line 11, 51, 64, 71, 81, 91) - Mock only
  - API: `app/api/retention/analysis/route.ts` (line 15, 64, 74) - Mock only
  - API: `app/api/reports/summary/route.ts` (line 18, 67) - Mock only
  - Calculation: Mock data only
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ❌ No calculation logic

### 2.10 Reactivation Rate
- **User-facing name:** Reactivation Rate
- **Internal variable:** `reactivation_rate`
- **Pages:** Retention Curve, Retention Analysis
- **Chart/KPI type:** Chart Data (mock only)
- **Source:**
  - API: `app/api/retention/curve/route.ts` (line 12, 52, 62, 72, 82, 92) - Mock only
  - API: `app/api/retention/analysis/route.ts` (line 16, 65, 75) - Mock only
  - Calculation: Mock data only
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ❌ No calculation logic

### 2.11 Churn Risk Score
- **User-facing name:** Churn Risk Score
- **Internal variable:** `churn_risk_score`
- **Pages:** Churn Risk Chart (`components/charts/ChurnRiskChart.tsx`)
- **Chart/KPI type:** Chart Series (Area Chart)
- **Source:**
  - Component: `components/charts/ChurnRiskChart.tsx` (line 17, 62-66)
  - Calculation: Mock data only - score 0-100
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ❌ No calculation logic

### 2.12 Churn Risk Distribution
- **User-facing name:** High/Medium/Low Risk (churn chart)
- **Internal variable:** `high_risk`, `medium_risk`, `low_risk` (chart series)
- **Pages:** Churn Risk Chart
- **Chart/KPI type:** Chart Series (Area Chart, stacked)
- **Source:**
  - Component: `components/charts/ChurnRiskChart.tsx` (line 56-74)
  - Calculation: Derived from churn_risk_score ranges (mock data)
- **Derived from:** Churn Risk Score (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Based on mock churn risk scores
- **Documentation:** ❌ No inline documentation

---

## Product Area 3: Repeat Purchases

### 3.1 Second Purchase Rate
- **User-facing name:** Second Purchase Rate
- **Internal variable:** `secondPurchaseRate`
- **Pages:** Repeat Purchase Rates (`/retention-ltv/repeat-rates`)
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/repeat-purchases/route.ts` (line 22, 142)
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 42, 227, 474)
  - Calculation: `breakdown[1].percentOfOriginal` (percentage reaching 2nd purchase)
- **Derived from:** Purchase breakdown (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Uses purchase breakdown percentage
- **Documentation:** ✅ Has tooltip explanation (line 452-455)

### 3.2 Median Purchases
- **User-facing name:** Median Purchases
- **Internal variable:** `medianPurchases`
- **Pages:** Repeat Purchase Rates
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/repeat-purchases/route.ts` (line 23, 146-157)
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 43, 231-242, 498)
  - Calculation: Median of purchase distribution array
- **Derived from:** Purchase distribution (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Uses purchase distribution
- **Documentation:** ✅ Has tooltip explanation (line 487-491)

### 3.3 Customers with 3+ Purchases
- **User-facing name:** Customers with ≥3 Purchases
- **Internal variable:** `customersWith3PlusPurchases`
- **Pages:** Repeat Purchase Rates
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/repeat-purchases/route.ts` (line 24, 143)
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 44, 228, 522)
  - Calculation: `breakdown[2].percentOfOriginal` (percentage reaching 3rd purchase)
- **Derived from:** Purchase breakdown (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Uses purchase breakdown percentage
- **Documentation:** ✅ Has tooltip explanation (line 511-515)

### 3.4 Median Purchases for 5+ Customers
- **User-facing name:** Median Purchases (for 5+ customers)
- **Internal variable:** `medianPurchasesFor5Plus`
- **Pages:** Repeat Purchase Rates (insights)
- **Chart/KPI type:** Inline Insight
- **Source:**
  - API: `app/api/metrics/repeat-purchases/route.ts` (line 25, 159-162)
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 45, 244-247, 358-360)
  - Calculation: Median of filtered purchase distribution (purchases >= 5)
- **Derived from:** Purchase distribution (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Uses purchase distribution
- **Documentation:** ⚠️ Partial - mentioned in insights but no tooltip

### 3.5 Purchase Breakdown (by Count)
- **User-facing name:** Customers Reaching (N purchases), % of Original Cohort
- **Internal variable:** `purchaseBreakdown`, `customersReaching`, `percentOfOriginal`, `dropOffVsPrevious`
- **Pages:** Repeat Purchase Rates
- **Chart/KPI type:** Chart Series (Line Chart), Table Rows
- **Source:**
  - API: `app/api/metrics/repeat-purchases/route.ts` (line 20, 103-139)
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 29-35, 188-224, 894-909)
  - Calculation: Counts customers reaching each purchase count (1, 2, 3, 4, 5+)
- **Derived from:** Raw order data grouped by customer purchase count
- **Issues:** ⚠️ **INCOMPLETE COHORTS** - May include customers who haven't had time to make repeat purchases
- **Documentation:** ✅ Has extensive tooltips and inline explanations

### 3.6 Cumulative Purchase Rate
- **User-facing name:** % Reaching ≥ N Purchases (cumulative view)
- **Internal variable:** `value` (cumulative chart data)
- **Pages:** Repeat Purchase Rates (cumulative view)
- **Chart/KPI type:** Chart Series (Line Chart, stepAfter)
- **Source:**
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 265-285)
  - Calculation: `percentOfOriginal` clamped for monotonicity
- **Derived from:** Purchase Breakdown (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Uses purchase breakdown, clamped for display
- **Documentation:** ✅ Has extensive tooltips explaining cumulative vs incremental

### 3.7 Incremental Purchase Rate
- **User-facing name:** % Continuing from N → N+1 Purchases (incremental view)
- **Internal variable:** `incrementalRate`, `value` (incremental chart data)
- **Pages:** Repeat Purchase Rates (incremental view)
- **Chart/KPI type:** Chart Series (Line Chart, stepAfter)
- **Source:**
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 288-338)
  - Calculation: `(next.pctReached / current.pctReached) * 100`
- **Derived from:** Purchase Breakdown (derived metric)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Uses purchase breakdown percentages
- **Documentation:** ✅ Has extensive tooltips explaining incremental view

### 3.8 Total Customers (Repeat Purchase Context)
- **User-facing name:** Total Customers
- **Internal variable:** `totalCustomers`
- **Pages:** Repeat Purchase Rates
- **Chart/KPI type:** Table Context
- **Source:**
  - API: `app/api/metrics/repeat-purchases/route.ts` (line 21, 102)
  - Component: `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` (line 41, 187)
  - Calculation: Total customers in cohort (first purchase cohorts)
- **Derived from:** Raw customer data
- **Issues:** None
- **Documentation:** ✅ Has inline comments

---

## Product Area 4: Value Growth (LTV)

### 4.1 Customer Lifetime Value (LTV)
- **User-facing name:** Customer LTV, Customer Lifetime Value
- **Internal variable:** `customer_lifetime_value`, `customerLifetimeValue`, `ltv`
- **Pages:** Dashboard, REDHomePage
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 15, 182)
  - Database: `mv_kpis.customer_lifetime_value` (SQL line 18)
  - Calculation: `COALESCE(SUM(o.total_price) / NULLIF(COUNT(DISTINCT c.id), 0), 0)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 158, 179) - `averageOrderValue * averageOrdersPerCustomer`
- **Derived from:** Total revenue / total customers
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Two different formulas:
  - `mv_kpis`: `total_revenue / total_customers` (average revenue per customer)
  - `dashboard/metrics`: `averageOrderValue * averageOrdersPerCustomer` (projected LTV)
  - These are conceptually different metrics!
- **Documentation:** ⚠️ Partial - formula in mock data but not clearly documented in real calculation

### 4.2 Average Orders per Customer
- **User-facing name:** Avg Orders per Customer (implied)
- **Internal variable:** `avg_orders_per_customer`
- **Pages:** Dashboard (implied)
- **Chart/KPI type:** Not directly displayed
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 24, 191)
  - Database: `mv_kpis.avg_orders_per_customer` (SQL line 54)
  - Calculation: `COALESCE(AVG(customer_order_counts.order_count), 0)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 157) - `orders.length / customers.length`
- **Derived from:** Customer order counts
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Calculated differently:
  - `mv_kpis`: Uses `AVG()` of order counts
  - `dashboard/metrics`: Uses `total_orders / total_customers`
  - These should be equivalent but may differ due to NULL handling
- **Documentation:** ✅ Has SQL comment

### 4.3 Revenue per Day
- **User-facing name:** Revenue per Day (implied)
- **Internal variable:** `revenue_per_day`
- **Pages:** Customer Segments (data exists but may not be displayed)
- **Chart/KPI type:** Not displayed
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 19, 102)
  - Database: `mv_customer_segments.revenue_per_day` (SQL line 180)
  - Calculation: `COALESCE(SUM(o.total_price) / NULLIF(EXTRACT(days FROM AGE(c.last_order_at, c.first_order_at)), 0), 0)`
- **Derived from:** Customer total spent / customer lifespan days
- **Issues:** ⚠️ **POTENTIAL DIVISION BY ZERO** - Handled with NULLIF but edge cases exist
- **Documentation:** ✅ Has SQL comment

### 4.4 Customer Lifespan Days
- **User-facing name:** Customer Lifespan (implied)
- **Internal variable:** `customer_lifespan_days`
- **Pages:** Customer Segments, Customer List
- **Chart/KPI type:** Table Column (implied)
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 18, 101)
  - Database: `mv_customer_segments.customer_lifespan_days` (SQL line 179)
  - Calculation: `EXTRACT(days FROM AGE(c.last_order_at, c.first_order_at))`
- **Derived from:** Raw customer timestamps
- **Issues:** ⚠️ **INCOMPLETE FOR ACTIVE CUSTOMERS** - Uses last_order_at, which may not reflect ongoing relationship
- **Documentation:** ✅ Has SQL comment

### 4.5 Days Since Last Order
- **User-facing name:** Days Since Last Order (implied)
- **Internal variable:** `days_since_last_order`
- **Pages:** Customer Segments, Customer List
- **Chart/KPI type:** Table Column (implied)
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 17, 100)
  - Database: `mv_customer_segments.days_since_last_order` (SQL line 178)
  - Calculation: `EXTRACT(days FROM AGE(NOW(), c.last_order_at))`
- **Derived from:** Raw customer timestamp vs current time
- **Issues:** None
- **Documentation:** ✅ Has SQL comment

### 4.6 Actual Total Spent
- **User-facing name:** Total Spent (customer context)
- **Internal variable:** `actual_total_spent`
- **Pages:** Customer Segments, Customer List, Customer Profile
- **Chart/KPI type:** Table Column
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 14, 97)
  - Database: `mv_customer_segments.actual_total_spent` (SQL line 175)
  - Calculation: `COALESCE(SUM(o.total_price), 0)` grouped by customer
- **Derived from:** Raw order data
- **Issues:** ⚠️ **DUPLICATE FIELD** - Also stored as `customers.total_spent` (may differ)
- **Documentation:** ✅ Has SQL comment

### 4.7 Actual Orders Count
- **User-facing name:** Orders Count (customer context)
- **Internal variable:** `actual_orders_count`
- **Pages:** Customer Segments, Customer List
- **Chart/KPI type:** Table Column
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 15, 98)
  - Database: `mv_customer_segments.actual_orders_count` (SQL line 176)
  - Calculation: `COUNT(DISTINCT o.id)` grouped by customer
- **Derived from:** Raw order data
- **Issues:** ⚠️ **DUPLICATE FIELD** - Also stored as `customers.orders_count` (may differ)
- **Documentation:** ✅ Has SQL comment

### 4.8 Value Segment Classification
- **User-facing name:** Value Segment (VIP, High Value, Medium Value, Low Value, Very Low Value)
- **Internal variable:** `value_segment`
- **Pages:** Customer Segments, Customer List
- **Chart/KPI type:** Table Column, Filter Option
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 20, 103)
  - Database: `mv_customer_segments.value_segment` (SQL line 198-204)
  - Calculation: CASE statement based on `actual_total_spent` thresholds:
    - >= 1000: VIP
    - >= 500: High Value
    - >= 200: Medium Value
    - >= 50: Low Value
    - else: Very Low Value
- **Derived from:** Actual Total Spent (derived metric)
- **Issues:** ⚠️ **HARDCODED THRESHOLDS** - Thresholds are fixed, not configurable
- **Documentation:** ✅ Has SQL comments

### 4.9 Activity Segment Classification
- **User-facing name:** Activity Segment (Active, At Risk, Dormant, Lost)
- **Internal variable:** `activity_segment`
- **Pages:** Customer Segments, Customer List
- **Chart/KPI type:** Table Column, Filter Option
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 21, 104)
  - Database: `mv_customer_segments.activity_segment` (SQL line 206-211)
  - Calculation: CASE statement based on `days_since_last_order`:
    - <= 30: Active
    - <= 60: At Risk
    - <= 90: Dormant
    - else: Lost
- **Derived from:** Days Since Last Order (derived metric)
- **Issues:** ⚠️ **HARDCODED THRESHOLDS** - Thresholds are fixed (30/60/90 days)
- **Documentation:** ✅ Has SQL comments

### 4.10 Frequency Segment Classification
- **User-facing name:** Frequency Segment (One-time Buyer, Occasional Buyer, Regular Buyer, Frequent Buyer)
- **Internal variable:** `frequency_segment`
- **Pages:** Customer Segments, Customer List
- **Chart/KPI type:** Table Column, Filter Option
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 22, 105)
  - Database: `mv_customer_segments.frequency_segment` (SQL line 213-218)
  - Calculation: CASE statement based on `actual_orders_count`:
    - = 1: One-time Buyer
    - <= 3: Occasional Buyer
    - <= 10: Regular Buyer
    - else: Frequent Buyer
- **Derived from:** Actual Orders Count (derived metric)
- **Issues:** ⚠️ **HARDCODED THRESHOLDS** - Thresholds are fixed
- **Documentation:** ✅ Has SQL comments

### 4.11 AOV Segment Classification
- **User-facing name:** AOV Segment (High AOV, Medium AOV, Low AOV)
- **Internal variable:** `aov_segment`
- **Pages:** Customer Segments, Customer List
- **Chart/KPI type:** Table Column, Filter Option
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 23, 106)
  - Database: `mv_customer_segments.aov_segment` (SQL line 220-224)
  - Calculation: CASE statement based on `avg_order_value`:
    - >= 200: High AOV
    - >= 100: Medium AOV
    - else: Low AOV
- **Derived from:** Average Order Value (derived metric)
- **Issues:** ⚠️ **HARDCODED THRESHOLDS** - Thresholds are fixed
- **Documentation:** ✅ Has SQL comments

### 4.12 Segment Summary Metrics
- **User-facing name:** Segment Count, Total Revenue (by segment), Avg Revenue per Customer (by segment)
- **Internal variable:** `count`, `total_revenue`, `avg_revenue_per_customer` (segment summary)
- **Pages:** Customer Segments (implied)
- **Chart/KPI type:** Not displayed (data exists in API response)
- **Source:**
  - API: `app/api/metrics/segments/route.ts` (line 27-32, 148-221)
  - Component: `generateSegmentSummaries()` function
  - Calculation: Aggregates by segment type (value, activity, frequency, aov)
- **Derived from:** Customer segments (derived metrics)
- **Issues:** ⚠️ **DERIVED FROM DERIVED** - Aggregates segment classifications
- **Documentation:** ⚠️ Partial - function exists but no inline documentation

---

## Product Area 5: KPI Summary / Cross-cutting

### 5.1 Total Customers
- **User-facing name:** Total Customers
- **Internal variable:** `total_customers`, `totalCustomers`
- **Pages:** Dashboard, REDHomePage, Section Cards
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 11, 178)
  - Database: `mv_kpis.total_customers` (SQL line 14)
  - Calculation: `COUNT(DISTINCT c.id)`
  - Also: `app/api/dashboard/metrics/route.ts` (line 100) - `customers.length`
- **Derived from:** Raw customer data
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Calculated in two places (should be equivalent)
- **Documentation:** ✅ Has SQL comments

### 5.2 Total Orders
- **User-facing name:** Orders, Total Orders
- **Internal variable:** `total_orders`, `totalOrders`
- **Pages:** Dashboard, REDHomePage
- **Chart/KPI type:** KPI Card
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 12, 179)
  - Database: `mv_kpis.total_orders` (SQL line 15)
  - Calculation: `COUNT(DISTINCT o.id)` where `financial_status = 'paid'`
  - Also: `app/api/dashboard/metrics/route.ts` (line 101) - `paidOrders.length`
- **Derived from:** Raw order data (paid orders only)
- **Issues:** ⚠️ **DUPLICATE CALCULATION** - Calculated in two places (should be equivalent)
- **Documentation:** ✅ Has SQL comments

### 5.3 New Customers (30 days)
- **User-facing name:** New Customers (30d)
- **Internal variable:** `new_customers_30d`
- **Pages:** Dashboard KPIs (implied)
- **Chart/KPI type:** KPI Card (implied)
- **Source:**
  - API: `app/api/metrics/kpis/route.ts` (line 21, 188)
  - Database: `mv_kpis.new_customers_30d` (SQL line 44-47)
  - Calculation: `COUNT(DISTINCT CASE WHEN c.first_order_at >= NOW() - INTERVAL '30 days' THEN c.id END)`
- **Derived from:** Raw customer data (first_order_at timestamp)
- **Issues:** None
- **Documentation:** ✅ Has SQL comment

### 5.4 Business Health Score
- **User-facing name:** Business Health Score
- **Internal variable:** `healthScore.score`
- **Pages:** REDHomePage (`/dashboard`)
- **Chart/KPI type:** Composite Score Card
- **Source:**
  - Component: `app/(protected)/dashboard/REDHomePage.tsx` (line 40-47, 289-297)
  - Calculation: Mock data only - composite score (0-100)
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ⚠️ Partial - description mentions drivers but no calculation logic

### 5.5 Business Health Score Drivers
- **User-facing name:** Retention %, Cohort Growth %, Repeat Rate %
- **Internal variable:** `healthScore.drivers.retention`, `healthScore.drivers.cohortGrowth`, `healthScore.drivers.repeatRate`
- **Pages:** REDHomePage
- **Chart/KPI type:** Sub-metrics in Health Score Card
- **Source:**
  - Component: `app/(protected)/dashboard/REDHomePage.tsx` (line 42-46, 292-295, 637-647)
  - Calculation: Mock data only
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ❌ No calculation logic

### 5.6 Orders (KPI Tile)
- **User-facing name:** Orders
- **Internal variable:** `orders` (KPI tile)
- **Pages:** REDHomePage
- **Chart/KPI type:** KPI Tile
- **Source:**
  - Component: `app/(protected)/dashboard/REDHomePage.tsx` (line 218-227)
  - Calculation: Mock data only
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ✅ Has formula definition in mock data

### 5.7 New vs Returning Revenue
- **User-facing name:** New vs Returning Revenue
- **Internal variable:** `revenue_split` (KPI tile)
- **Pages:** REDHomePage
- **Chart/KPI type:** KPI Tile
- **Source:**
  - Component: `app/(protected)/dashboard/REDHomePage.tsx` (line 265-275)
  - Calculation: Mock data only
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ✅ Has formula definition in mock data

### 5.8 New vs Retained Customers
- **User-facing name:** New vs Retained Customers
- **Internal variable:** `customer_split` (KPI tile)
- **Pages:** REDHomePage
- **Chart/KPI type:** KPI Tile
- **Source:**
  - Component: `app/(protected)/dashboard/REDHomePage.tsx` (line 277-286)
  - Calculation: Mock data only
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data
- **Documentation:** ✅ Has formula definition in mock data

### 5.9 Blended CAC
- **User-facing name:** Blended CAC
- **Internal variable:** `cac` (KPI tile)
- **Pages:** REDHomePage
- **Chart/KPI type:** KPI Tile
- **Source:**
  - Component: `app/(protected)/dashboard/REDHomePage.tsx` (line 253-263)
  - Calculation: Mock data only (value: 0)
- **Derived from:** Mock data (not implemented)
- **Issues:** ⚠️ **MOCK DATA ONLY** - Not calculated from real data, always returns 0
- **Documentation:** ✅ Has formula definition in mock data

### 5.10 Period Number (Cohort)
- **User-facing name:** Period Number, Week Number
- **Internal variable:** `period_number`
- **Pages:** Revenue Cohorts, Cohort Matrix, Cohort Retention Table
- **Chart/KPI type:** Chart Axis, Table Column Header
- **Source:**
  - API: `app/api/metrics/cohorts/route.ts` (line 14, 132)
  - Database: `mv_cohorts.period_number` (SQL line 106)
  - Calculation: `EXTRACT(month FROM AGE(cd.order_month, cd.cohort_month))`
- **Derived from:** Date difference between order month and cohort month
- **Issues:** ⚠️ **GRANULARITY MISMATCH** - Uses month extraction but may be displayed as weeks
- **Documentation:** ✅ Has SQL comment

### 5.11 Cohort Month
- **User-facing name:** Cohort Month, Acquisition Month
- **Internal variable:** `cohort_month`, `acquisition_month`
- **Pages:** Revenue Cohorts, Cohort Matrix, Cohort Retention Table
- **Chart/KPI type:** Chart Axis, Table Row Header
- **Source:**
  - API: `app/api/metrics/cohorts/route.ts` (line 11, 129)
  - Database: `mv_cohorts.cohort_month` (SQL line 85)
  - Calculation: `DATE_TRUNC('month', c.first_order_at)`
- **Derived from:** Raw customer data (first_order_at timestamp)
- **Issues:** None
- **Documentation:** ✅ Has SQL comment

### 5.12 Order Month
- **User-facing name:** Order Month
- **Internal variable:** `order_month`
- **Pages:** Revenue Cohorts, Cohort Matrix
- **Chart/KPI type:** Chart Axis, Table Context
- **Source:**
  - API: `app/api/metrics/cohorts/route.ts` (line 13, 131)
  - Database: `mv_cohorts.order_month` (SQL line 86)
  - Calculation: `DATE_TRUNC('month', o.source_created_at)`
- **Derived from:** Raw order data (source_created_at timestamp)
- **Issues:** None
- **Documentation:** ✅ Has SQL comment

### 5.13 Calculated At Timestamp
- **User-facing name:** Last Synced, Calculated At
- **Internal variable:** `calculated_at`, `lastSync`
- **Pages:** Dashboard, All metric pages (implied)
- **Chart/KPI type:** Footer Text, Metadata
- **Source:**
  - API: All metric endpoints return `calculated_at`
  - Database: All materialized views have `calculated_at` (SQL line 57, 114, 153, 226)
  - Calculation: `NOW()` at view refresh time
- **Derived from:** Database timestamp
- **Issues:** ⚠️ **STALE DATA RISK** - Materialized views may not refresh automatically
- **Documentation:** ✅ Has SQL comments and refresh function documentation

---

## Summary of Issues

### Critical Issues (Require Immediate Attention)

1. **Duplicate Calculations with Different Logic:**
   - Customer Lifetime Value: Two different formulas (average revenue vs projected LTV)
   - Average Order Value: `AVG()` vs `totalRevenue / orders.length` (may differ due to NULLs)
   - Retention Rate: Calculated in two places (may differ)
   - At-Risk/Dormant Customers: Different date fields used (`last_order_at` vs `source_created_at`)

2. **Mock Data Only (Not Implemented):**
   - Net Sales
   - Revenue Retention
   - Churn Rate
   - Reactivation Rate
   - Churn Risk Score
   - Business Health Score
   - Blended CAC
   - New vs Returning Revenue
   - New vs Retained Customers
   - Geographic Revenue Breakdown

### High Priority Issues

3. **Derived from Derived Metrics:**
   - Original Period Revenue (uses cohort revenue)
   - Churn Risk Distribution (uses churn risk scores)
   - All repeat purchase metrics (use purchase breakdown)
   - Segment summaries (use segment classifications)
   - Cumulative/Incremental purchase rates (use purchase breakdown)

4. **Incomplete Cohorts:**
   - Recent cohorts may show incomplete retention data
   - Repeat purchase rates may include customers who haven't had time to repurchase
   - Customer lifespan may be incomplete for active customers

5. **Hardcoded Thresholds:**
   - Value segments: 1000/500/200/50 thresholds
   - Activity segments: 30/60/90 day thresholds
   - Frequency segments: 1/3/10 order thresholds
   - AOV segments: 200/100 thresholds

### Medium Priority Issues

6. **Lack of Documentation:**
   - Many derived metrics lack inline calculation comments
   - Some formulas exist only in mock data definitions
   - Business Health Score calculation not documented

7. **Potential Data Staleness:**
   - Materialized views may not refresh automatically
   - No clear refresh strategy documented

8. **Granularity Mismatches:**
   - Period number uses month extraction but displayed as weeks in some views

### Low Priority Issues

9. **Duplicate Fields:**
   - `customers.total_spent` vs `mv_customer_segments.actual_total_spent`
   - `customers.orders_count` vs `mv_customer_segments.actual_orders_count`

10. **Not Displayed Metrics:**
    - Geographic revenue breakdown (data exists but not shown)
    - Segment summaries (data exists in API but may not be displayed)
    - Revenue per day (data exists but may not be displayed)

---

## Recommendations

### Immediate Actions

1. **Standardize Calculations:**
   - Choose single source of truth for each metric
   - Document calculation differences and rationale
   - Align duplicate calculations or clearly document why they differ

2. **Implement Mock Metrics:**
   - Prioritize metrics based on user value
   - Implement real calculations for high-value metrics
   - Remove or clearly label mock-only metrics

3. **Add Documentation:**
   - Document all calculation formulas inline
   - Add JSDoc comments for complex derived metrics
   - Create metric definition reference document

### Short-term Improvements

4. **Handle Incomplete Cohorts:**
   - Add visual indicators for incomplete cohorts
   - Consider excluding recent cohorts from certain analyses
   - Document cohort completeness rules

5. **Make Thresholds Configurable:**
   - Move segment thresholds to configuration
   - Allow per-account customization
   - Document threshold rationale

6. **Improve Data Freshness:**
   - Implement automatic materialized view refresh
   - Add refresh status indicators in UI
   - Document refresh strategy

### Long-term Enhancements

7. **Metric Validation:**
   - Add unit tests for metric calculations
   - Implement metric consistency checks
   - Create metric audit dashboard

8. **Performance Optimization:**
   - Review materialized view refresh frequency
   - Optimize complex derived metric calculations
   - Consider caching strategies

---

## Appendix: Metric Sources by File

### API Routes
- `app/api/metrics/kpis/route.ts` - Core KPIs (15+ metrics)
- `app/api/metrics/cohorts/route.ts` - Cohort metrics (6+ metrics)
- `app/api/metrics/repeat-purchases/route.ts` - Repeat purchase metrics (6+ metrics)
- `app/api/metrics/segments/route.ts` - Segment metrics (12+ metrics)
- `app/api/dashboard/metrics/route.ts` - Dashboard metrics (duplicate calculations)
- `app/api/retention/curve/route.ts` - Retention curve metrics (mock only)
- `app/api/retention/analysis/route.ts` - Retention analysis metrics (mock only)
- `app/api/products/performance/route.ts` - Product metrics (mock only)
- `app/api/reports/summary/route.ts` - Report metrics (mock only)

### Database Views
- `mv_kpis` - Core KPIs materialized view
- `mv_cohorts` - Cohort analysis materialized view
- `mv_retention_periods` - Retention periods materialized view
- `mv_customer_segments` - Customer segments materialized view

### Components
- `app/(protected)/dashboard/DashboardClient.tsx` - Dashboard KPIs
- `app/(protected)/dashboard/REDHomePage.tsx` - Premium dashboard KPIs
- `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx` - Repeat purchase metrics
- `components/charts/CohortMatrix.tsx` - Cohort matrix metrics
- `components/charts/CohortRetentionTable.tsx` - Cohort retention table
- `components/charts/RetentionCurveChart.tsx` - Retention curve chart
- `components/charts/ChurnRiskChart.tsx` - Churn risk chart

---

**End of Audit Document**


