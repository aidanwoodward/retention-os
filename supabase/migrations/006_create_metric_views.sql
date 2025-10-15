-- =============================================================================
-- M3 - METRIC LAYER: Materialized Views for Analytics
-- =============================================================================
-- This migration creates materialized views that pre-calculate complex
-- retention analytics queries for fast dashboard performance.

-- =============================================================================
-- VIEW 1: Core KPIs (Key Performance Indicators)
-- =============================================================================

CREATE MATERIALIZED VIEW mv_kpis AS
SELECT 
  c.account_id,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_price), 0) as total_revenue,
  COALESCE(AVG(o.total_price), 0) as average_order_value,
  COALESCE(SUM(o.total_price) / NULLIF(COUNT(DISTINCT c.id), 0), 0) as customer_lifetime_value,
  
  -- Retention metrics
  COUNT(DISTINCT CASE WHEN customer_order_counts.order_count > 1 THEN c.id END) as repeat_customers,
  ROUND(
    (COUNT(DISTINCT CASE WHEN customer_order_counts.order_count > 1 THEN c.id END) * 100.0) / 
    NULLIF(COUNT(DISTINCT c.id), 0), 
    1
  ) as retention_rate_percent,
  
  -- At-risk customers (no purchase in 60+ days)
  COUNT(DISTINCT CASE 
    WHEN c.last_order_at < NOW() - INTERVAL '60 days' 
    THEN c.id 
  END) as at_risk_customers,
  
  -- Dormant customers (no purchase in 90+ days)
  COUNT(DISTINCT CASE 
    WHEN c.last_order_at < NOW() - INTERVAL '90 days' 
    THEN c.id 
  END) as dormant_customers,
  
  -- One-time buyers
  COUNT(DISTINCT CASE WHEN customer_order_counts.order_count = 1 THEN c.id END) as one_time_buyers,
  
  -- New customers (first order in last 30 days)
  COUNT(DISTINCT CASE 
    WHEN c.first_order_at >= NOW() - INTERVAL '30 days' 
    THEN c.id 
  END) as new_customers_30d,
  
  -- Revenue metrics
  COALESCE(SUM(CASE WHEN o.source_created_at >= NOW() - INTERVAL '30 days' THEN o.total_price END), 0) as revenue_30d,
  COALESCE(SUM(CASE WHEN o.source_created_at >= NOW() - INTERVAL '90 days' THEN o.total_price END), 0) as revenue_90d,
  
  -- Order frequency
  COALESCE(AVG(customer_order_counts.order_count), 0) as avg_orders_per_customer,
  
  -- Data freshness
  NOW() as calculated_at

FROM customers c
LEFT JOIN orders o ON c.account_id = o.account_id AND o.financial_status = 'paid'
LEFT JOIN (
  SELECT 
    account_id,
    customer_id,
    COUNT(*) as order_count
  FROM orders 
  WHERE financial_status = 'paid'
  GROUP BY account_id, customer_id
) customer_order_counts ON c.id = customer_order_counts.customer_id AND c.account_id = customer_order_counts.account_id

GROUP BY c.account_id;

-- Create index on the materialized view
CREATE UNIQUE INDEX idx_mv_kpis_account_id ON mv_kpis (account_id);

-- =============================================================================
-- VIEW 2: Customer Cohorts by Acquisition Month
-- =============================================================================

CREATE MATERIALIZED VIEW mv_cohorts AS
WITH cohort_data AS (
  SELECT 
    c.account_id,
    c.id as customer_id,
    DATE_TRUNC('month', c.first_order_at) as cohort_month,
    DATE_TRUNC('month', o.source_created_at) as order_month,
    COUNT(DISTINCT o.id) as orders_in_month,
    COALESCE(SUM(o.total_price), 0) as revenue_in_month
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id AND o.financial_status = 'paid'
  GROUP BY c.account_id, c.id, DATE_TRUNC('month', c.first_order_at), DATE_TRUNC('month', o.source_created_at)
),
cohort_sizes AS (
  SELECT 
    account_id,
    cohort_month,
    COUNT(DISTINCT customer_id) as cohort_size
  FROM cohort_data
  GROUP BY account_id, cohort_month
)
SELECT 
  cd.account_id,
  cd.cohort_month,
  cs.cohort_size,
  cd.order_month,
  EXTRACT(month FROM AGE(cd.order_month, cd.cohort_month)) as period_number,
  COUNT(DISTINCT cd.customer_id) as active_customers,
  SUM(cd.orders_in_month) as total_orders,
  SUM(cd.revenue_in_month) as total_revenue,
  ROUND(
    (COUNT(DISTINCT cd.customer_id) * 100.0) / NULLIF(cs.cohort_size, 0), 
    2
  ) as retention_rate_percent,
  NOW() as calculated_at
FROM cohort_data cd
JOIN cohort_sizes cs ON cd.account_id = cs.account_id AND cd.cohort_month = cs.cohort_month
GROUP BY cd.account_id, cd.cohort_month, cs.cohort_size, cd.order_month
ORDER BY cd.cohort_month DESC, cd.order_month DESC;

-- Create index on the materialized view
CREATE INDEX idx_mv_cohorts_account_cohort ON mv_cohorts (account_id, cohort_month);

-- =============================================================================
-- VIEW 3: Retention Periods Analysis
-- =============================================================================

CREATE MATERIALIZED VIEW mv_retention_periods AS
WITH customer_periods AS (
  SELECT 
    c.account_id,
    c.id as customer_id,
    c.first_order_at,
    c.last_order_at,
    DATE_TRUNC('month', c.first_order_at) as acquisition_month,
    DATE_TRUNC('month', o.source_created_at) as order_month,
    EXTRACT(month FROM AGE(DATE_TRUNC('month', o.source_created_at), DATE_TRUNC('month', c.first_order_at))) as months_since_acquisition,
    COUNT(DISTINCT o.id) as orders_count,
    COALESCE(SUM(o.total_price), 0) as revenue
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id AND o.financial_status = 'paid'
  GROUP BY c.account_id, c.id, c.first_order_at, c.last_order_at, 
           DATE_TRUNC('month', c.first_order_at), DATE_TRUNC('month', o.source_created_at)
)
SELECT 
  account_id,
  acquisition_month,
  months_since_acquisition,
  COUNT(DISTINCT customer_id) as active_customers,
  SUM(orders_count) as total_orders,
  SUM(revenue) as total_revenue,
  AVG(orders_count) as avg_orders_per_customer,
  AVG(revenue) as avg_revenue_per_customer,
  NOW() as calculated_at
FROM customer_periods
WHERE months_since_acquisition >= 0
GROUP BY account_id, acquisition_month, months_since_acquisition
ORDER BY acquisition_month DESC, months_since_acquisition;

-- Create index on the materialized view
CREATE INDEX idx_mv_retention_periods_account_month ON mv_retention_periods (account_id, acquisition_month);

-- =============================================================================
-- VIEW 4: Customer Segments
-- =============================================================================

CREATE MATERIALIZED VIEW mv_customer_segments AS
WITH customer_metrics AS (
  SELECT 
    c.account_id,
    c.id as customer_id,
    c.first_order_at,
    c.last_order_at,
    c.total_spent,
    c.orders_count,
    COALESCE(SUM(o.total_price), 0) as actual_total_spent,
    COUNT(DISTINCT o.id) as actual_orders_count,
    COALESCE(AVG(o.total_price), 0) as avg_order_value,
    EXTRACT(days FROM AGE(NOW(), c.last_order_at)) as days_since_last_order,
    EXTRACT(days FROM AGE(c.last_order_at, c.first_order_at)) as customer_lifespan_days,
    COALESCE(SUM(o.total_price) / NULLIF(EXTRACT(days FROM AGE(c.last_order_at, c.first_order_at)), 0), 0) as revenue_per_day
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id AND o.financial_status = 'paid'
  GROUP BY c.account_id, c.id, c.first_order_at, c.last_order_at, c.total_spent, c.orders_count
)
SELECT 
  account_id,
  customer_id,
  first_order_at,
  last_order_at,
  actual_total_spent,
  actual_orders_count,
  avg_order_value,
  days_since_last_order,
  customer_lifespan_days,
  revenue_per_day,
  
  -- Segment classifications
  CASE 
    WHEN actual_total_spent >= 1000 THEN 'VIP'
    WHEN actual_total_spent >= 500 THEN 'High Value'
    WHEN actual_total_spent >= 200 THEN 'Medium Value'
    WHEN actual_total_spent >= 50 THEN 'Low Value'
    ELSE 'Very Low Value'
  END as value_segment,
  
  CASE 
    WHEN days_since_last_order <= 30 THEN 'Active'
    WHEN days_since_last_order <= 60 THEN 'At Risk'
    WHEN days_since_last_order <= 90 THEN 'Dormant'
    ELSE 'Lost'
  END as activity_segment,
  
  CASE 
    WHEN actual_orders_count = 1 THEN 'One-time Buyer'
    WHEN actual_orders_count <= 3 THEN 'Occasional Buyer'
    WHEN actual_orders_count <= 10 THEN 'Regular Buyer'
    ELSE 'Frequent Buyer'
  END as frequency_segment,
  
  CASE 
    WHEN avg_order_value >= 200 THEN 'High AOV'
    WHEN avg_order_value >= 100 THEN 'Medium AOV'
    ELSE 'Low AOV'
  END as aov_segment,
  
  NOW() as calculated_at

FROM customer_metrics;

-- Create index on the materialized view
CREATE INDEX idx_mv_customer_segments_account_id ON mv_customer_segments (account_id);
CREATE INDEX idx_mv_customer_segments_value_segment ON mv_customer_segments (account_id, value_segment);
CREATE INDEX idx_mv_customer_segments_activity_segment ON mv_customer_segments (account_id, activity_segment);

-- =============================================================================
-- REFRESH FUNCTION AND TRIGGERS
-- =============================================================================

-- Function to refresh all metric views
CREATE OR REPLACE FUNCTION refresh_metric_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_kpis;
  REFRESH MATERIALIZED VIEW mv_cohorts;
  REFRESH MATERIALIZED VIEW mv_retention_periods;
  REFRESH MATERIALIZED VIEW mv_customer_segments;
  
  RAISE NOTICE 'All metric views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger function to refresh views when data changes
CREATE OR REPLACE FUNCTION trigger_refresh_metric_views()
RETURNS trigger AS $$
BEGIN
  -- Refresh views asynchronously to avoid blocking the main transaction
  PERFORM pg_notify('refresh_metric_views', '');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on orders and customers tables
CREATE TRIGGER refresh_metric_views_on_orders_change
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_metric_views();

CREATE TRIGGER refresh_metric_views_on_customers_change
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_metric_views();

-- =============================================================================
-- SECURITY NOTE FOR METRIC VIEWS
-- =============================================================================
-- Materialized views don't support RLS directly. Security is handled at the API level
-- by filtering results based on the user's account_id in the application code.

-- =============================================================================
-- INITIAL REFRESH
-- =============================================================================

-- Refresh all views with initial data
SELECT refresh_metric_views();

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON MATERIALIZED VIEW mv_kpis IS 'Core KPIs including total customers, orders, revenue, retention rates, and customer segments';
COMMENT ON MATERIALIZED VIEW mv_cohorts IS 'Customer cohorts grouped by acquisition month with retention analysis';
COMMENT ON MATERIALIZED VIEW mv_retention_periods IS 'Retention analysis by periods showing customer behavior over time';
COMMENT ON MATERIALIZED VIEW mv_customer_segments IS 'Customer segmentation based on value, activity, frequency, and AOV';

COMMENT ON FUNCTION refresh_metric_views() IS 'Refreshes all materialized views with latest data';
COMMENT ON FUNCTION trigger_refresh_metric_views() IS 'Trigger function to refresh views when underlying data changes';

-- =============================================================================
-- USAGE NOTES
-- =============================================================================
-- These materialized views provide pre-calculated analytics for fast dashboard performance.
-- Security is enforced at the API level by filtering on account_id.
-- Views are automatically refreshed when underlying data changes.
-- 
-- Example queries:
-- SELECT * FROM mv_kpis WHERE account_id = 'your-account-id';
-- SELECT * FROM mv_cohorts WHERE account_id = 'your-account-id' ORDER BY cohort_month DESC;
-- SELECT * FROM mv_customer_segments WHERE account_id = 'your-account-id' AND value_segment = 'VIP';
