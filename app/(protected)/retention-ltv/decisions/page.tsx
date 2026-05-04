"use client";

import React, { Suspense } from "react";
import { UncomfortableDecisions } from "@/components/diagnosis/UncomfortableDecisions";
import { synthesizeDecisions } from "@/lib/diagnosis/decisions";
import { diagnoseRevenueCohortsEnhanced } from "@/lib/diagnosis/revenue-cohorts";
import { diagnoseRetentionCurvesEnhanced } from "@/lib/diagnosis/retention-curves";
import { diagnoseLTVCohortsEnhanced } from "@/lib/diagnosis/ltv-curves";
import { diagnoseRepeatRatesEnhanced } from "@/lib/diagnosis/repeat-rates";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

interface CohortData {
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

function DecisionsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [decisions, setDecisions] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchAllDiagnoses() {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from all pages
        const queryString = searchParams.toString();
        
        // Fetch revenue cohorts data
        const revenueCohortsResponse = await fetch(`/api/metrics/cohorts?${queryString}`);
        const revenueCohortsData = await revenueCohortsResponse.json();
        
        // Fetch retention curves data
        const retentionCurvesResponse = await fetch(`/api/metrics/cohorts?${queryString}`);
        const retentionCurvesData = await retentionCurvesResponse.json();
        
        // Fetch LTV cohorts data
        const ltvCohortsResponse = await fetch(`/api/metrics/cohorts?${queryString}`);
        const ltvCohortsData = await ltvCohortsResponse.json();
        
        // Fetch repeat rates data
        const repeatRatesResponse = await fetch(`/api/metrics/repeat-purchases?${queryString}`);
        const repeatRatesData = await repeatRatesResponse.json();

        // Process diagnoses
        const diagnoses: any = {};

        if (revenueCohortsData.success && revenueCohortsData.data?.cohorts) {
          const cohorts = revenueCohortsData.data.cohorts as CohortData[];
          
          // Calculate metrics for revenue cohorts
          const totalRevenue = cohorts.reduce((sum, c) => 
            sum + c.periods.reduce((pSum, p) => pSum + p.total_revenue, 0), 0
          );
          const totalCustomers = cohorts.reduce((sum, c) => 
            sum + c.periods.reduce((pSum, p) => pSum + p.active_customers, 0), 0
          );
          
          // Calculate previous period metrics (simplified)
          const previousRevenue = totalRevenue * 0.9; // Placeholder
          const previousCustomers = totalCustomers * 0.95; // Placeholder
          
          const cohortCoverage = {
            activeCount: cohorts.length,
            topCohortShare: 0.4, // Placeholder
          };

          diagnoses.revenueCohorts = diagnoseRevenueCohortsEnhanced({
            cohorts,
            totalRevenue,
            previousRevenue,
            totalCustomers,
            previousCustomers,
            cohortCoverage,
          });
        }

        if (retentionCurvesData.success && retentionCurvesData.data?.cohorts) {
          const cohorts = retentionCurvesData.data.cohorts as CohortData[];
          
          // Transform to retention curve format (simplified)
          const retentionCurveData = cohorts[0]?.periods.map((p, idx) => ({
            period: idx + 1,
            periodLabel: `Period ${idx + 1}`,
            cohortSize: cohorts[0].cohort_size,
            activeCustomers: p.active_customers,
            retentionRate: p.retention_rate_percent,
            revenue: p.total_revenue,
            revenueRetention: p.retention_rate_percent, // Simplified
          })) || [];

          const cohortCurvesData = cohorts.slice(0, 4).map(c => ({
            cohortLabel: c.cohort_month,
            cohortMonth: c.cohort_month,
            cohortSize: c.cohort_size,
            periods: c.periods.map((p, idx) => ({
              period: idx + 1,
              periodLabel: `Period ${idx + 1}`,
              customerRetention: p.retention_rate_percent,
              revenueRetention: p.retention_rate_percent,
            })),
          }));

          diagnoses.retentionCurves = diagnoseRetentionCurvesEnhanced({
            cohorts,
            retentionCurveData,
            cohortCurvesData,
            retentionType: 'customer',
          });
        }

        if (ltvCohortsData.success && ltvCohortsData.data?.cohorts) {
          const cohorts = ltvCohortsData.data.cohorts as CohortData[];
          
          // Transform to LTV format (simplified)
          const aggregatedLTVData = cohorts[0]?.periods.map((p, idx) => ({
            bucket: idx + 1,
            bucketLabel: `${idx + 1}M`,
            ltv: p.total_revenue / (cohorts[0].cohort_size || 1),
            cohortSize: cohorts[0].cohort_size,
          })) || [];

          const cohortLTVData = cohorts.slice(0, 4).map(c => ({
            cohortLabel: c.cohort_month,
            cohortMonth: c.cohort_month,
            cohortSize: c.cohort_size,
            clr: c.periods.reduce((sum, p) => sum + p.total_revenue, 0),
            clrBucket: null,
            clrBucketLabel: null,
            maxObservedBucket: c.periods.length,
            buckets: c.periods.map((p, idx) => ({
              bucket: idx + 1,
              bucketLabel: `${idx + 1}M`,
              ltv: p.total_revenue / (c.cohort_size || 1),
            })),
          }));

          diagnoses.ltvCohorts = diagnoseLTVCohortsEnhanced({
            cohorts,
            cohortLTVData,
            aggregatedLTVData,
          });
        }

        if (repeatRatesData.success && repeatRatesData.data) {
          const repeatData = repeatRatesData.data.purchaseBreakdown || [];
          const secondPurchaseRate = repeatRatesData.data.secondPurchaseRate || 0;
          const medianPurchases = repeatRatesData.data.medianPurchases || 0;
          const customersWith3PlusPurchases = repeatRatesData.data.customersWith3PlusPurchases || 0;
          const totalCustomers = repeatRatesData.data.totalCustomers || 0;

          diagnoses.repeatRates = diagnoseRepeatRatesEnhanced({
            repeatData,
            secondPurchaseRate,
            medianPurchases,
            customersWith3PlusPurchases,
            totalCustomers,
          });
        }

        // Synthesize decisions
        const synthesizedDecisions = synthesizeDecisions(diagnoses);
        setDecisions(synthesizedDecisions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load decisions');
      } finally {
        setLoading(false);
      }
    }

    fetchAllDiagnoses();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Decisions</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Uncomfortable Decisions</h1>
        <p className="text-gray-600">
          Based on insights from Revenue Cohorts, Retention Curves, LTV Cohorts, and Repeat Purchase Rates
        </p>
      </div>

      <UncomfortableDecisions 
        decisions={decisions}
        framingCopy="Here are the uncomfortable decisions you now have to make:"
      />
    </div>
  );
}

export default function DecisionsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <DecisionsContent />
    </Suspense>
  );
}
