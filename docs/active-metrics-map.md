# RetentionOS Active Metrics Map

**Generated:** 2025-01-27  
**Purpose:** Phase 0 Step 0 - Complete inventory of all user-facing metrics organized by page  
**Status:** Audit-only (no code changes)

---

## Navigation Structure

Based on `components/app-sidebar.tsx`, active pages reachable from sidebar:

### Executive
- `/executive` → redirects to `/dashboard`
- `/executive/reconciliation` (Data Health)
- `/executive/exports`

### Revenue Formation
- `/retention-ltv/revenue-cohorts` (Revenue Cohorts)

### Customer Retention
- `/retention-ltv/curves` (Retention Curves)
- `/retention-ltv/repeat-rates` (Repeat Purchase Rates)

### Value Growth
- `/retention-ltv/ltv-cohorts` (LTV Curves)

### Customer Intelligence
- `/customer-intelligence/composition` (comingSoon)
- `/customer-intelligence/segments` (comingSoon)
- `/customer-intelligence/profiles` (comingSoon)

### Product Insights
- `/product-economics/performance` (comingSoon)
- `/product-economics/concentration` (comingSoon)
- `/product-economics/discounts` (comingSoon)

### Platform
- `/settings/integrations`
- `/settings`
- `/settings/feedback`
- `/roadmap` (internal)

---

## Metrics by Page

### 1. Dashboard (`/dashboard`)

**Component:** `app/(protected)/dashboard/REDHomePage.tsx`  
**API Route:** `/api/dashboard/metrics`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Net Sales | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Falls back to mock if no data |
| Orders | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Falls back to mock if no data |
| Average Order Value (AOV) | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Falls back to mock if no data |
| Customer Lifetime Value (LTV) | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Falls back to mock if no data |
| Blended CAC | REDHomePage.tsx | `/api/dashboard/metrics` | Mock data | ACTIVE+MOCK | Always returns 0 (not implemented) |
| New vs Returning Revenue | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Falls back to mock if no data |
| New vs Retained Customers | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Falls back to mock if no data |
| Business Health Score | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Composite score (retention + cohort growth + repeat rate) |
| Retention Driver | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Component of health score |
| Cohort Growth Driver | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Component of health score |
| Repeat Rate Driver | REDHomePage.tsx | `/api/dashboard/metrics` | Computed in API | ACTIVE+MOCK | Component of health score |

**Legacy Component:** `app/(protected)/dashboard/DashboardClient.tsx` (may still be referenced)
- Uses `/api/metrics/kpis` (from `mv_kpis` materialized view)
- Metrics: totalCustomers, totalOrders, retentionRate, customerLifetimeValue, atRiskCustomers, dormantCustomers, oneTimeBuyers, totalRevenue, averageOrderValue, repeatCustomers

---

### 2. Revenue Cohorts (`/retention-ltv/revenue-cohorts`)

**Component:** `app/(protected)/retention-ltv/revenue-cohorts/page.tsx`  
**API Route:** `/api/metrics/cohorts`  
**Data Source:** `mv_cohorts` materialized view

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Revenue (Current Period) | page.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Aggregated from cohort periods |
| Revenue (Previous Period) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Calculated from cohort data |
| Revenue Trend (Current) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Chart series from cohort periods |
| Revenue Trend (Previous) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Chart series from cohort periods |
| Customers (Current Period) | page.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Aggregated from cohort periods |
| Customers (Previous Period) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Calculated from cohort data |
| Customers Trend (Current) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Chart series from cohort periods |
| Customers Trend (Previous) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Chart series from cohort periods |
| Active Cohorts Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count of cohorts with revenue > 0 |
| Top Cohort Revenue Share | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Percentage of total revenue |
| Top Cohort Revenue | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Absolute value |
| Top 3 Cohorts Revenue Share | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Percentage of total revenue |
| Top 3 Cohorts Revenue | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Absolute value |
| Top 10 Cohorts Revenue Share | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Percentage of total revenue |
| Top 10 Cohorts Revenue | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Absolute value |
| Others Revenue Share | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Percentage of total revenue |
| Others Revenue | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Absolute value |
| Top Cohorts Leaderboard | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Top 5 cohorts by revenue in current period |
| Cohort Revenue (by period) | RevenueCohortsChart.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Chart series |
| Cohort Size | RevenueCohortsChart.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Chart tooltip |
| Retention Rate % | CohortMatrix.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Table cell values |
| Active Customers | CohortMatrix.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Table cell values |
| Total Orders | CohortMatrix.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Table cell values |
| Total Revenue | CohortMatrix.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Table cell values |

**Flags:**
- Revenue/Customers comparison logic differs based on dateRange presence (dateRange vs previous period vs same period last year)
- Falls back to dummy data if no cohorts returned

---

### 3. Repeat Purchase Rates (`/retention-ltv/repeat-rates`)

**Component:** `app/(protected)/retention-ltv/repeat-rates/RepeatPurchaseRatesContent.tsx`  
**API Route:** `/api/metrics/repeat-purchases`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Second Purchase Rate | RepeatPurchaseRatesContent.tsx | `/api/metrics/repeat-purchases` | Computed in API | ACTIVE+REAL | Percentage of customers with 2+ purchases |
| Median Purchases | RepeatPurchaseRatesContent.tsx | `/api/metrics/repeat-purchases` | Computed in API | ACTIVE+REAL | Median purchase count per customer |
| Customers with ≥3 Purchases | RepeatPurchaseRatesContent.tsx | `/api/metrics/repeat-purchases` | Computed in API | ACTIVE+REAL | Percentage of original cohort |
| Purchase Breakdown (1-5+) | RepeatPurchaseRatesContent.tsx | `/api/metrics/repeat-purchases` | Computed in API | ACTIVE+REAL | Chart series: customers reaching N purchases |
| % of Original Cohort | RepeatPurchaseRatesContent.tsx | `/api/metrics/repeat-purchases` | Computed in API | ACTIVE+REAL | Cumulative percentage |
| Drop-off vs Previous | RepeatPurchaseRatesContent.tsx | `/api/metrics/repeat-purchases` | Computed in API | ACTIVE+REAL | Incremental drop-off percentage |
| Median Purchases for 5+ Customers | RepeatPurchaseRatesContent.tsx | `/api/metrics/repeat-purchases` | Computed in API | ACTIVE+REAL | Conditional metric (may be null) |
| Incremental Continuation Rate | RepeatPurchaseRatesContent.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Calculated from cumulative data (advanced view) |

**Flags:**
- Falls back to dev dummy data if API fails (dev mode only)
- Incremental view computed in frontend from cumulative data

---

### 4. Retention Curves (`/retention-ltv/curves`)

**Component:** `app/(protected)/retention-ltv/curves/page.tsx`  
**API Route:** `/api/metrics/cohorts` (same as revenue cohorts)

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Retention Rate by Period | RetentionCurveChart.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Chart series from cohort periods |
| Cohort Size | RetentionCurveChart.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Chart tooltip |
| Active Customers | RetentionCurveChart.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Chart tooltip |
| Total Orders | RetentionCurveChart.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Chart tooltip |
| Total Revenue | RetentionCurveChart.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Chart tooltip |

**Note:** This page uses the same cohort data as Revenue Cohorts but displays retention-focused visualizations.

---

### 5. LTV Cohorts (`/retention-ltv/ltv-cohorts`)

**Component:** `app/(protected)/retention-ltv/ltv-cohorts/page.tsx`  
**API Route:** `/api/metrics/cohorts`  
**Data Source:** `mv_cohorts` materialized view

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Avg CLR (Cohort Lifetime Revenue) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Weighted average from normalized cohort LTV data |
| Avg LTV (at midpoint bucket) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | From aggregated LTV data |
| Avg LTV (at last observed bucket) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | From aggregated LTV data |
| Active Cohorts | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count of cohorts with data |
| LTV by Time Bucket (Aggregated) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Chart series: weighted average across cohorts |
| LTV by Time Bucket (Cohort-by-Cohort) | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Chart series: individual cohort lines |
| CLR per Cohort | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Table column: LTV at last fully observed bucket |
| Cohort Size | page.tsx | `/api/metrics/cohorts` | mv_cohorts (real) | ACTIVE+REAL | Table column |
| LTV per Bucket | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Table cells: cumulative revenue per customer |

**Flags:**
- LTV normalization enforces monotonicity (non-decreasing cumulative LTV)
- Falls back to dev dummy data if API fails (dev mode only)
- Midpoint and last bucket horizons calculated dynamically from available data

---

### 6. Customer List (`/customers/list`)

**Component:** `app/(protected)/customers/list/page.tsx`  
**API Route:** `/api/customers/list`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total Customers | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Count from API response |
| VIP Customers Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered from customer list |
| Active Customers Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered from customer list |
| At Risk Customers Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered from customer list |
| Total Spent | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.total_spent |
| Total Orders | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.total_orders |
| Avg Order Value | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.avg_order_value |
| Days Since Last Order | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.days_since_last_order |
| Value Segment | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.value_segment |
| Activity Segment | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.activity_segment |
| Lifetime Value | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.lifetime_value |
| Repeat Rate | page.tsx | `/api/customers/list` | Computed in API | ACTIVE+REAL | Table column: customer.repeat_rate |

---

### 7. Customer Segments (`/customers/segments`)

**Component:** `app/(protected)/customers/segments/page.tsx`  
**API Route:** `/api/customers/segments`  
**Data Source:** `mv_customer_segments` materialized view

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total Segments | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count from segments array |
| Total Revenue | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Sum of segment.total_revenue |
| Best Segment Name | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Segment with highest retention_rate |
| Avg Retention Rate | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Average across all segments |
| Customer Count | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.customer_count |
| Total Revenue | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.total_revenue |
| Avg Revenue per Customer | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.avg_revenue_per_customer |
| Avg Orders per Customer | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.avg_orders_per_customer |
| Retention Rate | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.retention_rate |
| Churn Rate | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.churn_rate |
| Avg Lifetime Value | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.avg_lifetime_value |
| Growth Rate | page.tsx | `/api/customers/segments` | mv_customer_segments (real) | ACTIVE+REAL | Table column: segment.growth_rate |

---

### 8. Customer Composition (`/cohorts/composition`)

**Component:** `app/(protected)/cohorts/composition/page.tsx`  
**API Route:** `/api/metrics/composition`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total Customers | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Sum of composition.count |
| New Customers Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered from compositions |
| Returning Customers Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered from compositions |
| VIP Customers Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered from compositions |
| Segment Count | page.tsx | `/api/metrics/composition` | Computed in API | ACTIVE+REAL | Table column: composition.count |
| Segment Percentage | page.tsx | `/api/metrics/composition` | Computed in API | ACTIVE+REAL | Table column: composition.percentage |
| Avg Order Value | page.tsx | `/api/metrics/composition` | Computed in API | ACTIVE+REAL | Table column: composition.avg_order_value |
| Total Revenue | page.tsx | `/api/metrics/composition` | Computed in API | ACTIVE+REAL | Table column: composition.total_revenue |
| Repeat Rate | page.tsx | `/api/metrics/composition` | Computed in API | ACTIVE+REAL | Table column: composition.repeat_rate |
| Avg Orders per Customer | page.tsx | `/api/metrics/composition` | Computed in API | ACTIVE+REAL | Table column: composition.avg_orders_per_customer |

---

### 9. Category Cohorts (`/cohorts/category`)

**Component:** `app/(protected)/cohorts/category/page.tsx`  
**API Route:** `/api/metrics/category-cohorts`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total Categories | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count from cohorts array |
| Best Category Name | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Category with highest retention_rate |
| Avg Retention Rate | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Average across all categories |
| Total Revenue | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Sum of cohort.total_revenue |
| Customers | page.tsx | `/api/metrics/category-cohorts` | Computed in API | ACTIVE+REAL | Table column: cohort.customers |
| Total Revenue | page.tsx | `/api/metrics/category-cohorts` | Computed in API | ACTIVE+REAL | Table column: cohort.total_revenue |
| Avg Order Value | page.tsx | `/api/metrics/category-cohorts` | Computed in API | ACTIVE+REAL | Table column: cohort.avg_order_value |
| Retention Rate | page.tsx | `/api/metrics/category-cohorts` | Computed in API | ACTIVE+REAL | Table column: cohort.retention_rate |
| Repeat Customers | page.tsx | `/api/metrics/category-cohorts` | Computed in API | ACTIVE+REAL | Table column: cohort.repeat_customers |
| Avg Orders per Customer | page.tsx | `/api/metrics/category-cohorts` | Computed in API | ACTIVE+REAL | Table column: cohort.avg_orders_per_customer |
| Cross-sell Rate | page.tsx | `/api/metrics/category-cohorts` | Computed in API | ACTIVE+REAL | Table column: cohort.cross_sell_rate |

---

### 10. Retention Curve (`/retention/curve`)

**Component:** `app/(protected)/retention/curve/page.tsx`  
**API Route:** `/api/retention/curve`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total Cohorts | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count from curves array |
| Avg Retention Rate | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Average across all periods |
| Best Period Name | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Period with highest retention_rate |
| Avg Revenue Retention | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Average across all periods |
| Cohort Size | page.tsx | `/api/retention/curve` | Computed in API | ACTIVE+REAL | Table column: curve.cohort_size |
| Retention Rate | page.tsx | `/api/retention/curve` | Computed in API | ACTIVE+REAL | Table column: curve.retention_rate |
| Revenue Retention | page.tsx | `/api/retention/curve` | Computed in API | ACTIVE+REAL | Table column: curve.revenue_retention |
| Churn Rate | page.tsx | `/api/retention/curve` | Computed in API | ACTIVE+REAL | Table column: curve.churn_rate |
| Reactivation Rate | page.tsx | `/api/retention/curve` | Computed in API | ACTIVE+REAL | Table column: curve.reactivation_rate |
| Avg Order Value | page.tsx | `/api/retention/curve` | Computed in API | ACTIVE+REAL | Table column: curve.avg_order_value |
| Customer Satisfaction | page.tsx | `/api/retention/curve` | Computed in API | ACTIVE+REAL | Table column: curve.customer_satisfaction |

---

### 11. Churn Risk (`/retention/churn`)

**Component:** `app/(protected)/retention/churn/page.tsx`  
**API Route:** `/api/retention/churn`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total At Risk | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count from churnRisks array |
| High Risk Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered: churn_risk_score > 80 |
| Medium Risk Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered: 40 < score <= 80 |
| Low Risk Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered: score <= 40 |
| Churn Risk Score | page.tsx | `/api/retention/churn` | Computed in API | ACTIVE+REAL | Table column: churnRisk.churn_risk_score |
| Days Since Last Order | page.tsx | `/api/retention/churn` | Computed in API | ACTIVE+REAL | Table column: churnRisk.days_since_last_order |
| Order Frequency Decline | page.tsx | `/api/retention/churn` | Computed in API | ACTIVE+REAL | Table column: churnRisk.order_frequency_decline |
| Spending Decline | page.tsx | `/api/retention/churn` | Computed in API | ACTIVE+REAL | Table column: churnRisk.spending_decline |
| Engagement Score | page.tsx | `/api/retention/churn` | Computed in API | ACTIVE+REAL | Table column: churnRisk.engagement_score |
| Customer Value | page.tsx | `/api/retention/churn` | Computed in API | ACTIVE+REAL | Table column: churnRisk.customer_value |
| Intervention Priority | page.tsx | `/api/retention/churn` | Computed in API | ACTIVE+REAL | Table column: churnRisk.intervention_priority |

---

### 12. Product Performance (`/products/performance`)

**Component:** `app/(protected)/products/performance/page.tsx`  
**API Route:** `/api/products/performance`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total Products | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count from products array |
| Total Revenue | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Sum of product.total_revenue |
| Best Product Name | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Product with highest total_revenue |
| Avg Conversion Rate | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Average across all products |
| Total Orders | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.total_orders |
| Total Revenue | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.total_revenue |
| Avg Order Value | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.avg_order_value |
| Units Sold | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.units_sold |
| Conversion Rate | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.conversion_rate |
| Return Rate | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.return_rate |
| Customer Satisfaction | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.customer_satisfaction |
| Inventory Turnover | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.inventory_turnover |
| Profit Margin | page.tsx | `/api/products/performance` | Computed in API | ACTIVE+REAL | Table column: product.profit_margin |

---

### 13. Replenishment Metrics (`/products/replenishment`)

**Component:** `app/(protected)/products/replenishment/page.tsx`  
**API Route:** `/api/products/replenishment`

| Metric Name | Component File | API Route | Data Source Type | Category | Notes |
|------------|----------------|-----------|------------------|----------|-------|
| Total Products | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Count from replenishments array |
| At Risk Products Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered: stockout_risk > 40 |
| Overstocked Products Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered: overstock_risk > 60 |
| Optimal Stock Count | page.tsx | Frontend computed | Computed in frontend | ACTIVE+REAL | Filtered: stockout_risk <= 40 && overstock_risk <= 60 |
| Current Stock | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.current_stock |
| Reorder Point | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.reorder_point |
| Reorder Quantity | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.reorder_quantity |
| Lead Time Days | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.lead_time_days |
| Stock Turnover | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.stock_turnover |
| Stockout Risk | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.stockout_risk |
| Overstock Risk | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.overstock_risk |
| Supplier Performance | page.tsx | `/api/products/replenishment` | Computed in API | ACTIVE+REAL | Table column: replenishment.supplier_performance |

---

## Data Source Summary

### Materialized Views (mv_*)
- `mv_kpis` - Core KPIs (used by `/api/metrics/kpis`)
- `mv_cohorts` - Cohort data (used by `/api/metrics/cohorts`)
- `mv_customer_segments` - Customer segments (used by `/api/customers/segments`)

### API-Computed Metrics
- `/api/dashboard/metrics` - Dashboard KPIs (may use mv_kpis or compute from raw tables)
- `/api/metrics/repeat-purchases` - Repeat purchase breakdown
- `/api/metrics/composition` - Customer composition
- `/api/metrics/category-cohorts` - Category cohorts
- `/api/retention/curve` - Retention curves
- `/api/retention/churn` - Churn risk analysis
- `/api/products/performance` - Product performance
- `/api/products/replenishment` - Replenishment metrics
- `/api/customers/list` - Customer list with segments

### Frontend-Computed Metrics
- Revenue/Customer trends (from cohort periods)
- Cohort coverage percentages
- Top cohorts leaderboard
- LTV normalization and aggregation
- Incremental continuation rates (from cumulative data)
- Summary statistics (averages, sums, counts) from API responses

### Mock Data
- Dashboard KPIs fallback (when no real data)
- Repeat purchase rates dev fallback (dev mode only)
- LTV cohorts dev fallback (dev mode only)

---

## Duplicate Calculations Flagged

### 1. Customer Lifetime Value (LTV)
- **Location 1:** Dashboard (`/api/dashboard/metrics`) - Formula: `avg_order_value × purchase_frequency × customer_lifespan`
- **Location 2:** Dashboard (`/api/metrics/kpis` via `mv_kpis`) - Formula: `total_revenue / total_customers`
- **Status:** Different formulas, different purposes (predicted vs actual)

### 2. Average Order Value (AOV)
- **Location 1:** Dashboard (`/api/dashboard/metrics`) - Computed from orders
- **Location 2:** `mv_kpis` - Formula: `AVG(o.total_price)`
- **Status:** Should be consistent, verify calculation

### 3. Retention Rate
- **Location 1:** Dashboard (`/api/dashboard/metrics`) - Component of health score
- **Location 2:** `mv_kpis` - Formula: `(repeat_customers * 100.0) / total_customers`
- **Location 3:** Revenue Cohorts - From `mv_cohorts.retention_rate_percent`
- **Status:** Different definitions (overall vs cohort-specific)

### 4. At-Risk / Dormant Customers
- **Location 1:** `mv_kpis` - Uses `last_order_at < NOW() - INTERVAL '60 days'`
- **Location 2:** Customer List - Uses `days_since_last_order` from API
- **Status:** Verify date field consistency (last_order_at vs days_since_last_order)

---

## Inactive/Legacy Pages

### Coming Soon (not rendered)
- `/customer-intelligence/composition` (comingSoon: true)
- `/customer-intelligence/segments` (comingSoon: true)
- `/customer-intelligence/profiles` (comingSoon: true)
- `/product-economics/performance` (comingSoon: true)
- `/product-economics/concentration` (comingSoon: true)
- `/product-economics/discounts` (comingSoon: true)

### Legacy Components
- `app/(protected)/dashboard/DashboardClient.tsx` - May still be referenced but superseded by REDHomePage
- `app/(protected)/_archive/segments/SegmentsClient.tsx` - Archived
- `app/(protected)/_archive/financials/FinancialsClient.tsx` - Archived

---

## Summary Statistics

- **Total Active Pages:** 13
- **Total Metrics Identified:** 150+
- **Metrics from mv_* (real):** ~40
- **Metrics Computed in API:** ~60
- **Metrics Computed in Frontend:** ~50
- **Metrics with Mock Fallback:** ~15
- **Duplicate Calculations:** 4 flagged
- **Coming Soon Pages:** 6

---

## Next Steps for Trust Audit

1. Verify all `mv_*` materialized views are refreshed regularly
2. Audit API-computed metrics for consistency
3. Review frontend-computed metrics for accuracy
4. Resolve duplicate calculation discrepancies
5. Document calculation formulas for all metrics
6. Add inline documentation to metric calculations
7. Create test cases for metric calculations
8. Establish single source of truth for each metric


