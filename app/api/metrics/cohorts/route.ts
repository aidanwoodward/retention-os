import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface CohortsData {
  cohort_month: string;
  cohort_size: number;
  order_month: string;
  period_number: number;
  active_customers: number;
  total_orders: number;
  total_revenue: number;
  retention_rate_percent: number;
  calculated_at: string;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const cohortMonth = searchParams.get('cohort_month');
    
    const cookieStore = await cookies();
    
    // Get the current user's session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!session) {
      // In production, always require authentication
      if (!isDevelopment) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // In development, return dummy data with is_demo flag
      console.log("Development mode: Returning dummy cohorts data");
      const dummyCohorts = generateDummyCohorts();
      
      return NextResponse.json({
        success: true,
        data: {
          cohorts: dummyCohorts,
          total_cohorts: dummyCohorts.length,
          calculated_at: new Date().toISOString(),
          is_demo: true
        }
      });
    }

    // Get account ID for the user
    const accountId = await getAccountId(session.user.id);

    // Fetch cohorts from materialized view
    console.log("Fetching cohorts from materialized view...");
    let query = supabase
      .from('mv_cohorts')
      .select('*')
      .eq('account_id', accountId)
      .order('cohort_month', { ascending: false })
      .order('period_number', { ascending: true })
      .limit(limit);

    // Filter by specific cohort month if provided
    if (cohortMonth) {
      query = query.eq('cohort_month', cohortMonth);
    }

    const { data: cohortsData, error } = await query;

    // Handle no data or error
    if (error || !cohortsData || cohortsData.length === 0) {
      // In production, return empty state
      if (!isDevelopment) {
        return NextResponse.json({
          success: true,
          data: {
            cohorts: [],
            total_records: 0,
            latest_calculated_at: new Date().toISOString()
          }
        });
      }
      // In development, return dummy data with is_demo flag
      console.log("Development mode: No real data found, returning dummy cohorts data");
      const dummyCohorts = generateDummyCohorts();
      
      return NextResponse.json({
        success: true,
        data: {
          cohorts: dummyCohorts,
          total_records: dummyCohorts.length,
          latest_calculated_at: new Date().toISOString(),
          is_demo: true
        }
      });
    }

    // Transform data for frontend
    const cohorts: CohortsData[] = (cohortsData || []).map(record => ({
      cohort_month: record.cohort_month,
      cohort_size: record.cohort_size || 0,
      order_month: record.order_month,
      period_number: record.period_number || 0,
      active_customers: record.active_customers || 0,
      total_orders: record.total_orders || 0,
      total_revenue: parseFloat(record.total_revenue) || 0,
      retention_rate_percent: parseFloat(record.retention_rate_percent) || 0,
      calculated_at: record.calculated_at
    }));

    // Group by cohort for easier frontend consumption
    interface CohortGroup {
      cohort_month: string;
      cohort_size: number;
      periods: Array<{
        period_number: number;
        order_month: string;
        active_customers: number;
        total_orders: number;
        total_revenue: number;
        retention_rate_percent: number;
      }>;
    }

    const cohortsByMonth = cohorts.reduce((acc, cohort) => {
      if (!acc[cohort.cohort_month]) {
        acc[cohort.cohort_month] = {
          cohort_month: cohort.cohort_month,
          cohort_size: cohort.cohort_size,
          periods: []
        };
      }
      acc[cohort.cohort_month].periods.push({
        period_number: cohort.period_number,
        order_month: cohort.order_month,
        active_customers: cohort.active_customers,
        total_orders: cohort.total_orders,
        total_revenue: cohort.total_revenue,
        retention_rate_percent: cohort.retention_rate_percent
      });
      return acc;
    }, {} as Record<string, CohortGroup>);

    console.log(`Cohorts fetched successfully: ${cohorts.length} records`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        cohorts: Object.values(cohortsByMonth),
        total_records: cohorts.length,
        latest_calculated_at: cohorts[0]?.calculated_at,
        is_demo: false
      }
    });

    // Cache for 10 minutes (cohorts change less frequently)
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    
    // ETag for conditional requests
    const etag = `"cohorts-${accountId}-${cohorts[0]?.calculated_at || 'none'}"`;
    response.headers.set('ETag', etag);

    return response;

  } catch (error) {
    console.error("Cohorts API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch cohorts",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Generate realistic dummy cohorts data for development with 5-year patterns
function generateDummyCohorts() {
  const cohorts = [];
  // Set a fixed "current" date for consistent data generation
  const currentDate = new Date(2025, 9, 1); // October 1, 2025
  
  // Generate cohorts from January 2019 onwards (to test Pre-2020 grouping)
  // Calculate months from Jan 2019 to Oct 2025 = ~81 months
  const startDate = new Date(2019, 0, 1); // January 1, 2019
  const totalMonths = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - startDate.getMonth());
  
  for (let i = 0; i <= totalMonths; i++) {
    const cohortDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const cohortMonth = cohortDate.toISOString().slice(0, 7); // YYYY-MM format
    
    // Calculate growth trends over time
    // For older cohorts (pre-2020), use smaller base sizes
    const monthsFromStart = i;
    const yearsAgo = monthsFromStart / 12;
    const baseGrowthFactor = cohortDate < new Date('2020-01-01') ? 0.7 : 1.0; // Pre-2020 cohorts were smaller
    const growthFactor = baseGrowthFactor * (1 + (yearsAgo * 0.15)); // 15% YoY growth in acquisition
    const baseCohortSize = 150 + Math.random() * 200; // 150-350 base customers
    const cohortSize = Math.floor(baseCohortSize * growthFactor);
    
    // Geographic distribution
    const geoDistribution = {
      UK: Math.floor(cohortSize * 0.8), // 80% UK
      Germany: Math.floor(cohortSize * 0.07), // 7% Germany
      France: Math.floor(cohortSize * 0.07), // 7% France
      Spain: Math.floor(cohortSize * 0.06) // 6% Spain
    };
    
    const periods = [];
    
    // Calculate maximum possible periods based on current date
    // For annual cohorts, we want up to 6 years of data (72 months)
    // But only generate data up to the current date
    const monthsSinceCohort = (currentDate.getFullYear() - cohortDate.getFullYear()) * 12 + 
                               (currentDate.getMonth() - cohortDate.getMonth());
    
    // Generate periods up to the maximum possible (but cap at 72 months = 6 years for annual view)
    // This ensures older cohorts (2019) can have 6+ years of data, while newer cohorts (2025) only have what's possible
    const maxPossiblePeriods = Math.min(72, monthsSinceCohort); // Up to 6 years (72 months) of data
    
    for (let period = 0; period <= maxPossiblePeriods; period++) {
      const orderDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + period, 1);
      
      // Don't generate data beyond the current date
      if (orderDate > currentDate) {
        break;
      }
      
      // Additional safety check: Don't generate data for periods that would be in the future
      const orderDateEndOfMonth = new Date(orderDate.getFullYear(), orderDate.getMonth() + 1, 0);
      if (orderDateEndOfMonth > currentDate) {
        break;
      }
      
      const orderMonth = orderDate.toISOString().slice(0, 7);
      
      // Special case: For 2019 cohort, create a data gap at Year 3 (period 36-47 months)
      // This creates 0% retention at Year 3, then resumes at Year 4
      const is2019Cohort = cohortDate.getFullYear() === 2019;
      if (is2019Cohort && period >= 36 && period < 48) {
        // Year 3: Set to 0% to create a data gap
        const retentionRate = 0;
        const activeCustomers = 0;
        const totalRevenue = 0;
        const totalOrders = 0;
        
        periods.push({
          period_number: period,
          order_month: orderMonth,
          active_customers: activeCustomers,
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          retention_rate_percent: retentionRate,
          geographic_breakdown: {
            UK: 0,
            Germany: 0,
            France: 0,
            Spain: 0
          }
        });
        continue; // Skip the normal retention calculation for Year 3
      }
      
      // Realistic retention curve: decreases over time with some variation
      // Typical retention pattern: 100% → ~65% → ~50% → ~40% → ~32% → ~26% → ~22% → ...
      // Retention should NEVER increase - customers churn over time
      // Extended curve for up to 72 months (6 years) of data
      const retentionCurve = [
        100,   // Period 0: 100% (all customers)
        65,    // Period 1: ~65% retention (Year 1 for annual)
        50,    // Period 2: ~50% retention
        40,    // Period 3: ~40% retention
        32,    // Period 4: ~32% retention
        26,    // Period 5: ~26% retention
        22,    // Period 6: ~22% retention
        19,    // Period 7: ~19% retention
        17,    // Period 8: ~17% retention
        15,    // Period 9: ~15% retention
        13,    // Period 10: ~13% retention
        12,    // Period 11: ~12% retention
        11,    // Period 12: ~11% retention (Year 1 for monthly)
        10,    // Period 13: ~10% retention
        9.5,   // Period 14: ~9.5% retention
        9,     // Period 15: ~9% retention
        8.5,   // Period 16: ~8.5% retention
        8,     // Period 17: ~8% retention
        7.5,   // Period 18: ~7.5% retention
        7,     // Period 19: ~7% retention
        6.5,   // Period 20: ~6.5% retention
        6,     // Period 21: ~6% retention
        5.5,   // Period 22: ~5.5% retention
        5,     // Period 23: ~5% retention
        4.5,   // Period 24: ~4.5% retention
      ];
      
      // For periods beyond the curve, use a gradual decline
      // Calculate base retention based on period number
      let baseRetentionPercent: number;
      if (period < retentionCurve.length) {
        baseRetentionPercent = retentionCurve[period];
      } else {
        // For periods beyond the curve, gradually decline from the last value
        const lastCurveValue = retentionCurve[retentionCurve.length - 1];
        const periodsBeyondCurve = period - retentionCurve.length + 1;
        baseRetentionPercent = Math.max(2, lastCurveValue - (periodsBeyondCurve * 0.15));
      }
      
      // Add small random variation (±3%) but ensure it never exceeds the previous period's retention
      const previousRetention = period === 0 
        ? 100 
        : (period < retentionCurve.length 
            ? retentionCurve[period - 1] 
            : Math.max(2, retentionCurve[retentionCurve.length - 1] - ((period - retentionCurve.length) * 0.15)));
      
      const maxRetention = Math.min(previousRetention, baseRetentionPercent + 3);
      const minRetention = Math.max(1, baseRetentionPercent - 3);
      const retentionRate = Math.max(minRetention, Math.min(maxRetention, baseRetentionPercent + (Math.random() - 0.5) * 6));
      
      const activeCustomers = Math.floor((cohortSize * retentionRate) / 100);
      
      // Revenue calculation: Original period has highest revenue, subsequent periods decrease
      const revenueGrowthFactor = 1 + (yearsAgo * 0.15); // 15% YoY growth in cohort size (not retention)
      let totalRevenue: number;
      
      if (period === 0) {
        // Original Value: Revenue from new customers' first purchases
        const firstPurchaseRevenue = 250 + Math.random() * 350; // $250-$600 per customer
        totalRevenue = Math.floor(cohortSize * firstPurchaseRevenue * revenueGrowthFactor);
      } else {
        // After N periods: Revenue from returning customers' repeat purchases
        // Revenue per customer is typically lower for repeat purchases
        const repeatPurchaseRevenue = 120 + Math.random() * 180; // $120-$300 per customer (lower than first purchase)
        
        // Revenue naturally decreases as activeCustomers decreases (due to churn)
        // The revenueGrowthFactor only applies to cohort size, not to retention
        totalRevenue = Math.floor(activeCustomers * repeatPurchaseRevenue * revenueGrowthFactor);
      }
      
      // Ensure minimum revenue for visibility (but only if we have active customers)
      if (activeCustomers > 0 && totalRevenue < 5000) {
        totalRevenue = 5000 + Math.random() * 3000;
      } else if (activeCustomers === 0) {
        totalRevenue = 0; // No revenue if no active customers
      }
      
      // Order frequency improvement over time
      const orderFrequency = 1.5 + (yearsAgo * 0.1) + Math.random() * 0.5; // Improving order frequency
      const totalOrders = Math.floor(activeCustomers * orderFrequency);
      
      // Geographic revenue distribution
      const geoRevenue = {
        UK: Math.floor(totalRevenue * 0.8),
        Germany: Math.floor(totalRevenue * 0.07),
        France: Math.floor(totalRevenue * 0.07),
        Spain: Math.floor(totalRevenue * 0.06)
      };
      
      periods.push({
        period_number: period,
        order_month: orderMonth,
        active_customers: activeCustomers,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        retention_rate_percent: retentionRate,
        geographic_breakdown: geoRevenue
      });
    }
    
    cohorts.push({
      cohort_month: cohortMonth,
      cohort_size: cohortSize,
      geographic_distribution: geoDistribution,
      periods: periods
    });
  }
  
  return cohorts;
}
