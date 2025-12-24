"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { retentionCurvesFilters, retentionCurvesSearch } from "@/lib/filters/config";
import { AIAnalysis } from "@/components/ai/AIAnalysis";
import { LoadingButton } from "@/components/ui/loading-buttons";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Download,
  Info,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterValue } from "@/lib/filters/types";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartErrorBoundary } from "@/components/charts/ChartErrorBoundary";

interface RepeatPurchaseData {
  purchaseCount: number;
  purchaseCountLabel: string;
  customersReaching: number;
  percentOfOriginal: number;
  dropOffVsPrevious: number | null; // Incremental drop-off
}

interface RepeatPurchaseResponse {
  success: boolean;
  data: {
    purchaseBreakdown: RepeatPurchaseData[];
    totalCustomers: number;
    secondPurchaseRate: number;
    medianPurchases: number;
    customersWith3PlusPurchases: number;
    medianPurchasesFor5Plus: number | null;
    calculated_at: string;
  };
  error?: string;
}

const chartConfig = {
  repeatRate: {
    label: "Customers Reaching Purchase Count",
    color: "hsl(221.2 83.2% 53.3%)", // blue-600
  },
} satisfies ChartConfig;

export default function RepeatPurchaseRatesPage() {
  const [repeatData, setRepeatData] = useState<RepeatPurchaseResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<Record<string, FilterValue>>({});
  const searchParams = useSearchParams();

  const fetchRepeatData = useCallback(async () => {
    try {
      setLoading(true);
      const queryString = searchParams.toString();
      
      // TODO: Replace with actual API endpoint when available
      const response = await fetch(`/api/metrics/repeat-purchases?${queryString}`);
      
      // If API doesn't exist yet, return null (will use dev dummy if needed)
      if (!response.ok && response.status === 404) {
        setRepeatData(null);
        setError(null);
        return;
      }
      
      const data: RepeatPurchaseResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch repeat purchase data');
      }

      // Check if we have real data
      if (data.data && data.data.purchaseBreakdown && data.data.purchaseBreakdown.length > 0) {
        setRepeatData(data.data);
        setError(null);
      } else {
        // Empty real data - will use dev dummy if in dev mode
        setRepeatData(null);
        setError(null);
      }
    } catch (err) {
      // In production, show error; in dev, will use dummy fallback
      if (process.env.NODE_ENV === 'production') {
        setError(err instanceof Error ? err.message : 'Failed to fetch repeat purchase data');
      } else {
        setRepeatData(null);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchRepeatData();
  }, [fetchRepeatData]);

  // Helper booleans for render logic
  const isDev = process.env.NODE_ENV !== 'production';
  const hasRealData = repeatData !== null && repeatData.purchaseBreakdown.length > 0;
  const useDevDummy = isDev && !hasRealData && !loading;

  // Generate dev-only dummy data fallback for QA
  const devDummyData = React.useMemo(() => {
    if (!useDevDummy) return null;
    
    const totalCustomers = 10000;
    const breakdown: RepeatPurchaseData[] = [
      {
        purchaseCount: 1,
        purchaseCountLabel: '1',
        customersReaching: totalCustomers,
        percentOfOriginal: 100,
        dropOffVsPrevious: null,
      },
      {
        purchaseCount: 2,
        purchaseCountLabel: '2',
        customersReaching: Math.floor(totalCustomers * 0.45),
        percentOfOriginal: 45,
        dropOffVsPrevious: 55,
      },
      {
        purchaseCount: 3,
        purchaseCountLabel: '3',
        customersReaching: Math.floor(totalCustomers * 0.25),
        percentOfOriginal: 25,
        dropOffVsPrevious: 20,
      },
      {
        purchaseCount: 4,
        purchaseCountLabel: '4',
        customersReaching: Math.floor(totalCustomers * 0.15),
        percentOfOriginal: 15,
        dropOffVsPrevious: 10,
      },
      {
        purchaseCount: 5,
        purchaseCountLabel: '5+',
        customersReaching: Math.floor(totalCustomers * 0.10),
        percentOfOriginal: 10,
        dropOffVsPrevious: 5,
      },
    ];

    // Calculate KPIs consistent with breakdown
    const secondPurchaseRate = breakdown[1].percentOfOriginal;
    const customersWith3PlusPurchases = breakdown[2].percentOfOriginal;
    
    // Calculate median purchases
    const purchaseDistribution: number[] = [];
    for (let i = 0; i < totalCustomers; i++) {
      const rand = Math.random();
      if (rand < 0.55) purchaseDistribution.push(1);
      else if (rand < 0.75) purchaseDistribution.push(2);
      else if (rand < 0.85) purchaseDistribution.push(3);
      else if (rand < 0.92) purchaseDistribution.push(4);
      else if (rand < 0.97) purchaseDistribution.push(5);
      else purchaseDistribution.push(6 + Math.floor(Math.random() * 5));
    }
    purchaseDistribution.sort((a, b) => a - b);
    const medianPurchases = purchaseDistribution[Math.floor(purchaseDistribution.length / 2)];

    const fivePlusCustomers = purchaseDistribution.filter(p => p >= 5);
    const medianPurchasesFor5Plus = fivePlusCustomers.length > 0
      ? fivePlusCustomers[Math.floor(fivePlusCustomers.length / 2)]
      : null;

    return {
      purchaseBreakdown: breakdown,
      totalCustomers,
      secondPurchaseRate,
      medianPurchases,
      customersWith3PlusPurchases,
      medianPurchasesFor5Plus,
      calculated_at: new Date().toISOString(),
    };
  }, [useDevDummy]);

  // Use real data or dev dummy data
  const displayData = hasRealData ? repeatData : (useDevDummy ? devDummyData : null);

  // Prepare chart data (cumulative survival-style step chart)
  // Use numeric purchaseNum for X-axis, ensure monotonicity for chart display only
  const chartData = React.useMemo(() => {
    if (!displayData) return [];
    
    let previousValue = 100; // Start at 100% for purchase 1
    
    return displayData.purchaseBreakdown.map((d, index) => {
      // Clamp to ensure monotonicity (non-increasing) for chart display only
      // This prevents visual artifacts from rounding while preserving accurate KPI/table values
      const clampedValue = Math.min(d.percentOfOriginal, previousValue);
      previousValue = clampedValue;
      
      return {
        purchaseNum: d.purchaseCount, // Numeric: 1, 2, 3, 4, 5
        purchaseCountLabel: d.purchaseCountLabel, // For display: "1", "2", "3", "4", "5+"
        value: clampedValue, // Clamped for chart (monotonic)
        rawValue: d.percentOfOriginal, // Original value for tooltip/table
        customersReaching: d.customersReaching,
      };
    });
  }, [displayData]);

  // Calculate inline insights
  const insights = React.useMemo(() => {
    if (!displayData) return [];
    
    const insightsList: string[] = [];
    const breakdown = displayData.purchaseBreakdown;
    
    // Insight 1: Never place second order
    const neverSecondOrder = 100 - breakdown[1].percentOfOriginal;
    insightsList.push(`${neverSecondOrder.toFixed(0)}% of customers never place a second order`);
    
    // Insight 2: Reach fourth purchase
    insightsList.push(`Only ${breakdown[3].percentOfOriginal.toFixed(0)}% of customers reach a fourth purchase`);
    
    // Insight 3: Median for 5+ customers (if available)
    if (displayData.medianPurchasesFor5Plus !== null) {
      insightsList.push(`Among customers with 5+ purchases, the median total purchases is ${displayData.medianPurchasesFor5Plus}`);
    }
    
    return insightsList.slice(0, 2); // Keep to 1-2 insights max
  }, [displayData]);

  // =============================================================================
  // DEV-ONLY DEBUG: Chart rendering diagnostics
  // =============================================================================
  React.useEffect(() => {
    if (isDev) {
      // Log debug info
      const firstRow = chartData[0];
      const firstRowKeys = firstRow ? Object.keys(firstRow).join(',') : 'none';
      
      console.log('🔍 Repeat Purchase Rates Debug:', {
        isDev,
        loading,
        hasRealData,
        useDevDummy,
        chartDataLength: chartData.length,
        firstRowKeys,
        firstRowSample: firstRow,
      });

      // Verify data structure
      if (chartData.length > 0) {
        const invalidRows = chartData.filter(r => 
          typeof r.purchaseNum !== 'number' || 
          typeof r.value !== 'number' ||
          isNaN(r.purchaseNum) ||
          isNaN(r.value)
        );
        
        if (invalidRows.length > 0) {
          console.error('❌ Invalid chartData rows detected:', invalidRows);
        }
      }

      // Check DOM for Recharts elements
      setTimeout(() => {
        const wrapperCount = document.querySelectorAll('.recharts-wrapper').length;
        const surfaceCount = document.querySelectorAll('.recharts-surface').length;
        const layerCount = document.querySelectorAll('.recharts-layer').length;
        
        console.log('🔍 Recharts DOM Check:', {
          wrappers: wrapperCount,
          surfaces: surfaceCount,
          layers: layerCount,
        });

        if (surfaceCount === 0 && chartData.length > 0) {
          console.error('❌ Recharts surface not found - chart may not be rendering');
        }
      }, 100);
    }
  }, [isDev, loading, hasRealData, useDevDummy, chartData]);

  // =============================================================================
  // DEV-ONLY PARITY GUARD: Ensure KPI values match chart and table values
  // =============================================================================
  React.useEffect(() => {
    if (isDev && displayData && chartData.length > 0) {
      // Log dummy mode status once
      if (useDevDummy) {
        console.log('ℹ️ Repeat Purchase Rates: using DEV dummy data for visualization QA');
      }

      // Check KPI 1: Second Purchase Rate == chart value at purchaseNum=2
      const chartValueAt2 = chartData.find(d => d.purchaseNum === 2)?.rawValue;
      if (chartValueAt2 !== undefined && displayData.secondPurchaseRate !== undefined) {
        const diff = Math.abs(displayData.secondPurchaseRate - chartValueAt2);
        if (diff > 0.1) {
          console.error('❌ PARITY MISMATCH DETECTED - Second Purchase Rate:', {
            kpiValue: displayData.secondPurchaseRate,
            chartValue: chartValueAt2,
            difference: diff,
            message: 'KPI "Second Purchase Rate" does not match chart value at purchaseNum=2',
          });
        } else if (!useDevDummy) {
          // Only log success in non-dummy mode to avoid spam
          console.log('✅ Parity check passed - Second Purchase Rate:', displayData.secondPurchaseRate);
        }
      }

      // Check KPI 3: Customers with ≥3 Purchases == chart value at purchaseNum=3
      const chartValueAt3 = chartData.find(d => d.purchaseNum === 3)?.rawValue;
      if (chartValueAt3 !== undefined && displayData.customersWith3PlusPurchases !== undefined) {
        const diff = Math.abs(displayData.customersWith3PlusPurchases - chartValueAt3);
        if (diff > 0.1) {
          console.error('❌ PARITY MISMATCH DETECTED - Customers with ≥3 Purchases:', {
            kpiValue: displayData.customersWith3PlusPurchases,
            chartValue: chartValueAt3,
            difference: diff,
            message: 'KPI "Customers with ≥3 Purchases" does not match chart value at purchaseNum=3',
          });
        } else if (!useDevDummy) {
          console.log('✅ Parity check passed - Customers with ≥3 Purchases:', displayData.customersWith3PlusPurchases);
        }
      }

      // Check table values match chart values
      displayData.purchaseBreakdown.forEach((tableRow, index) => {
        const chartRow = chartData.find(d => d.purchaseNum === tableRow.purchaseCount);
        if (chartRow) {
          const diff = Math.abs(tableRow.percentOfOriginal - chartRow.rawValue);
          if (diff > 0.1) {
            console.error(`❌ PARITY MISMATCH DETECTED - Purchase ${tableRow.purchaseCount}:`, {
              tableValue: tableRow.percentOfOriginal,
              chartValue: chartRow.rawValue,
              difference: diff,
              message: `Table % value does not match chart value at purchaseNum=${tableRow.purchaseCount}`,
            });
          }
        }
      });
    }
  }, [displayData, chartData, isDev, useDevDummy]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}m`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-5 border border-gray-200 h-36">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-3"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && process.env.NODE_ENV === 'production') {
    return (
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Repeat Purchase Rates</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <LoadingButton
            isLoading={loading}
            onClick={fetchRepeatData}
            loadingText="Retrying..."
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
      {/* Filter Bar */}
      <div className="mb-8">
        <FilterBar
          filters={retentionCurvesFilters}
          search={retentionCurvesSearch}
          onFiltersChange={(filters) => {
            setFilterState(filters);
          }}
          onSearchChange={() => {
            // URL sync handled by FilterBar
          }}
        />
      </div>

      {/* AI Analysis Section */}
      <div className="mb-8">
        <AIAnalysis 
          filters={filterState}
          cohorts={[]}
          onRegenerate={fetchRepeatData}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* KPI 1: Second Purchase Rate */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">Second Purchase Rate</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs">
                    Percentage of customers who placed at least one additional order after their first purchase.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {displayData && displayData.secondPurchaseRate >= 50 ? (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                Good
              </span>
            ) : displayData && displayData.secondPurchaseRate >= 30 ? (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                Fair
              </span>
            ) : displayData ? (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-50 text-red-500">
                Needs Improvement
              </span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 mb-3">Customer-weighted, aggregated across all cohorts</p>
          <div className="text-2xl font-bold text-gray-900">
            {displayData ? displayData.secondPurchaseRate.toFixed(1) : 'N/A'}%
          </div>
        </div>

        {/* KPI 2: Median Purchases per Customer */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">Median Purchases</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs">
                    The median number of purchases made per customer. This avoids distortion from a small number of very high-frequency buyers.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-3">Per customer</p>
          <div className="text-2xl font-bold text-gray-900">
            {displayData ? displayData.medianPurchases.toFixed(1) : 'N/A'}
          </div>
        </div>

        {/* KPI 3: Customers with ≥3 Purchases */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-gray-900">Customers with ≥3 Purchases</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs">
                    Percentage of customers who reached at least their third purchase, indicating early repeat loyalty.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-3">% of original cohort</p>
          <div className="text-2xl font-bold text-gray-900">
            {displayData ? displayData.customersWith3PlusPurchases.toFixed(1) : 'N/A'}%
          </div>
        </div>
      </div>

      {/* Core Visualization */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-cyan-600" />
              Repeat Purchase Rates
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                  <p className="text-xs mb-1">
                    Cumulative percentage of customers who reached at least each purchase count. This shows repeat engagement depth, independent of time.
                  </p>
                  <p className="text-xs text-gray-300">
                    This is a cumulative view, not a funnel.
                  </p>
                </TooltipContent>
              </Tooltip>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Shows the percentage of customers who reached at least N purchases.
            </p>
            {/* Definition Strip */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Customers:</span>
                  <span>first purchase cohorts</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Metric:</span>
                  <span>cumulative repeat purchase rate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Interpretation:</span>
                  <span>% of customers who reached at least N purchases</span>
                </span>
              </div>
            </div>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => {
                  // Export CSV
                  if (!hasRealData || !displayData) return;
                  
                  const csvHeaders = ['Purchase Count', 'Customers Reaching', '% of Original Cohort', 'Drop-off vs Previous'];
                  const csvRows = displayData.purchaseBreakdown.map(d => [
                    d.purchaseCountLabel,
                    d.customersReaching.toString(),
                    d.percentOfOriginal.toFixed(1),
                    d.dropOffVsPrevious !== null ? d.dropOffVsPrevious.toFixed(1) : '',
                  ]);
                  
                  const csvContent = [
                    csvHeaders.join(','),
                    ...csvRows.map(row => row.join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `repeat-purchase-rates-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
                disabled={!hasRealData}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  hasRealData 
                    ? 'bg-cyan-600 text-white hover:bg-cyan-700 cursor-pointer' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </TooltipTrigger>
            {!hasRealData && (
              <TooltipContent className="bg-gray-900 text-white border-0 max-w-[200px]">
                <p className="text-xs">No data to export for current filters.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* DEV Debug Banner */}
        {isDev && (
          <div className="mb-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>DEV:</strong> dummy={useDevDummy ? 'true' : 'false'} | loading={loading ? 'true' : 'false'} | 
            hasRealData={hasRealData ? 'true' : 'false'} | chartData={chartData.length} | 
            keys={chartData[0] ? Object.keys(chartData[0]).join(',') : 'none'}
            {chartData.length > 0 && (
              <span className="ml-2">
                | sample={JSON.stringify({ purchaseNum: chartData[0].purchaseNum, value: chartData[0].value })}
              </span>
            )}
          </div>
        )}

        {/* DEV: Data structure validation warning */}
        {isDev && chartData.length > 0 && (() => {
          const invalidRows = chartData.filter(r => 
            typeof r.purchaseNum !== 'number' || 
            typeof r.value !== 'number' ||
            isNaN(r.purchaseNum) ||
            isNaN(r.value)
          );
          
          if (invalidRows.length > 0) {
            return (
              <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                <strong>⚠️ Invalid chartData:</strong> {invalidRows.length} rows have invalid purchaseNum or value types
              </div>
            );
          }
          return null;
        })()}

        {/* Chart Area - Always render */}
        {loading ? (
          <div className="h-[320px] bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
            <div className="animate-pulse space-y-4 w-full px-8">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[320px] w-full">
            <ChartErrorBoundary
              onRetry={() => setError(null)}
              context={{
                chartType: 'repeat-purchase-rates',
                dataPoints: chartData.length,
              }}
            >
              {/* DEV: Smoke test SVG - remove after chart renders */}
              {isDev && chartData.length > 0 && (
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ opacity: 0.1 }}>
                  <line x1="50" y1="50" x2="450" y2="250" stroke="red" strokeWidth="2" />
                  <text x="50" y="30" fill="red" fontSize="12">Smoke Test SVG</text>
                </svg>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis
                    dataKey="purchaseNum"
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs text-gray-600"
                    domain={[0.5, 5.5]}
                    tickFormatter={(value) => {
                      // Format last tick as "5+"
                      return value === 5 ? '5+' : value.toString();
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs text-gray-600"
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="text-sm font-semibold text-gray-900">Purchase {data.purchaseCountLabel}</p>
                            <p className="text-sm text-gray-600">
                              Customers reaching: <span className="font-semibold">{data.rawValue.toFixed(1)}%</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatNumber(data.customersReaching)} customers
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="value"
                    stroke="hsl(221.2 83.2% 53.3%)"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(221.2 83.2% 53.3%)", r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                    name="Customers Reaching"
                    isAnimationActive={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
        ) : (
          <div className="h-80 bg-gray-50/50 rounded-xl flex items-center justify-center border border-dashed border-gray-200 py-10">
            <div className="text-center max-w-md px-4">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No repeat purchase data available</p>
              <p className="text-gray-500 text-sm mb-1">
                Try widening your date range or removing filters.
              </p>
              <p className="text-gray-500 text-sm">
                Repeat purchase rates require customers with at least one completed purchase.
              </p>
            </div>
          </div>
        )}

        {/* Inline Insight Callouts */}
        {insights.length > 0 && displayData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-2">What this tells you</p>
                <ul className="space-y-1.5">
                  {insights.slice(0, 2).map((insight, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      • {insight}
                    </li>
                  ))}
                </ul>
                {displayData.purchaseBreakdown[4]?.purchaseCountLabel === '5+' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Purchases beyond 5 are grouped to keep the visualization readable. Deeper behavior is summarized above.
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-0 max-w-[280px]">
                        <p className="text-xs">
                          Purchases beyond 5 are grouped to keep the visualization readable. Deeper behavior is summarized below.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supporting Table */}
      {displayData && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Repeat Purchase Breakdown</h2>
            <p className="text-sm text-gray-500 mt-1">
              Detailed breakdown by purchase count
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                    Purchase Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers Reaching
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Original Cohort
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drop-off vs Previous
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.purchaseBreakdown.map((data) => (
                  <tr key={data.purchaseCount} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 z-10">
                      {data.purchaseCountLabel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(data.customersReaching)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.percentOfOriginal.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.dropOffVsPrevious !== null ? `-${data.dropOffVsPrevious.toFixed(1)}%` : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
