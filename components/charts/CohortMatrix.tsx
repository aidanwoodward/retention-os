"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CohortMatrixProps {
  cohorts: unknown[];
  viewMode: 'monthly' | 'quarterly' | 'half-year' | 'annual';
  onCellClick?: (cohort: string, period: number, data: MatrixCell) => void;
}

interface MatrixCell {
  revenue: number;
  retention: number;
  period: number;
  cohort: string;
  percentile?: number;
}

export function CohortMatrix({ cohorts, viewMode, onCellClick }: CohortMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Premium blue scale for retention visualization - 10-step smooth scale
  const BLUE_SCALE = [
    'bg-blue-900',   // 90-100% retention
    'bg-blue-800',   // 80-90% retention
    'bg-blue-700',   // 70-80% retention
    'bg-blue-600',   // 60-70% retention
    'bg-blue-500',   // 50-60% retention
    'bg-blue-400',   // 40-50% retention
    'bg-blue-300',   // 30-40% retention
    'bg-blue-200',   // 20-30% retention
    'bg-blue-100',   // 10-20% retention
    'bg-blue-50',    // 0-10% retention
  ];

  const calculatePercentile = (value: number, values: number[]): number => {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 100;
    if (index === 0) return 0;
    
    const lowerIndex = index - 1;
    const upperIndex = index;
    const lowerValue = sorted[lowerIndex];
    const upperValue = sorted[upperIndex];
    
    if (lowerValue === upperValue) {
      return (lowerIndex / sorted.length) * 100;
    }
    
    const ratio = (value - lowerValue) / (upperValue - lowerValue);
    const interpolatedIndex = lowerIndex + ratio;
    
    return (interpolatedIndex / sorted.length) * 100;
  };

  // Generate matrix data from cohorts
  const generateMatrixData = () => {
    const matrix: Record<string, Record<number, MatrixCell>> = {};
    
    const maxPeriods = viewMode === 'annual' ? 10 : viewMode === 'quarterly' ? 20 : viewMode === 'half-year' ? 10 : 24;

    cohorts.forEach((cohort) => {
      const cohortData = cohort as Record<string, unknown>;
      const cohortMonth = cohortData.cohort_month as string;
      const periods = cohortData.periods as Array<Record<string, unknown>>;
      
      let cohortKey: string;
      const cohortYear = new Date(cohortMonth).getFullYear();
      
      if (cohortYear < 2020) {
        cohortKey = 'Pre-2020';
      } else if (viewMode === 'annual') {
        cohortKey = `${cohortYear}`;
      } else if (viewMode === 'quarterly') {
        const cohortQuarter = Math.floor(new Date(cohortMonth).getMonth() / 3) + 1;
        cohortKey = `${cohortYear}-Q${cohortQuarter}`;
      } else if (viewMode === 'half-year') {
        const cohortHalf = new Date(cohortMonth).getMonth() < 6 ? 'H1' : 'H2';
        cohortKey = `${cohortYear} ${cohortHalf}`;
      } else {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = new Date(cohortMonth).getMonth();
        cohortKey = `${monthNames[month]}-${cohortYear}`;
      }
      
      if (!matrix[cohortKey]) {
        matrix[cohortKey] = {};
      }
      
      const originalPeriod = periods.find(p => (p.period_number as number) === 0);
      const originalRevenue = originalPeriod ? (originalPeriod.total_revenue as number) : 0;
      
      const cohortDataForOriginal = matrix[cohortKey] as Record<number, MatrixCell> & { _originalRevenue?: number };
      if (!cohortDataForOriginal._originalRevenue) {
        cohortDataForOriginal._originalRevenue = originalRevenue;
      } else {
        cohortDataForOriginal._originalRevenue += originalRevenue;
      }
      
      const currentDate = new Date();
      const cohortDate = new Date(cohortMonth);
      let maxPossiblePeriods = maxPeriods;
      
      if (viewMode === 'annual') {
        const yearsSinceAcquisition = currentDate.getFullYear() - cohortDate.getFullYear();
        maxPossiblePeriods = Math.min(maxPeriods, Math.max(0, yearsSinceAcquisition));
      } else if (viewMode === 'quarterly') {
        const monthsSinceAcquisition = (currentDate.getFullYear() - cohortDate.getFullYear()) * 12 + 
                                       (currentDate.getMonth() - cohortDate.getMonth());
        const quartersSinceAcquisition = Math.floor(monthsSinceAcquisition / 3);
        maxPossiblePeriods = Math.min(maxPeriods, Math.max(0, quartersSinceAcquisition));
      } else if (viewMode === 'half-year') {
        const monthsSinceAcquisition = (currentDate.getFullYear() - cohortDate.getFullYear()) * 12 + 
                                       (currentDate.getMonth() - cohortDate.getMonth());
        const halfYearsSinceAcquisition = Math.floor(monthsSinceAcquisition / 6);
        maxPossiblePeriods = Math.min(maxPeriods, Math.max(0, halfYearsSinceAcquisition));
      } else {
        const monthsSinceAcquisition = (currentDate.getFullYear() - cohortDate.getFullYear()) * 12 + 
                                       (currentDate.getMonth() - cohortDate.getMonth());
        maxPossiblePeriods = Math.min(maxPeriods, Math.max(0, monthsSinceAcquisition));
      }
      
      for (let periodIndex = 0; periodIndex <= maxPossiblePeriods; periodIndex++) {
        let totalRevenue = 0;
        
        const targetPeriod = periods.find(period => {
          const periodNumber = period.period_number as number;
          return periodNumber === periodIndex;
        });
        
        if (targetPeriod) {
          totalRevenue = targetPeriod.total_revenue as number;
        }
        
        if (periodIndex === 0 || totalRevenue > 0) {
          const cohortData = matrix[cohortKey] as Record<number, MatrixCell> & { _originalRevenue?: number };
          const aggregatedOriginalRevenue = cohortData._originalRevenue || originalRevenue;
          const retentionRate = periodIndex === 0 ? 100 : (aggregatedOriginalRevenue > 0 ? (totalRevenue / aggregatedOriginalRevenue) * 100 : 0);
          
          const cellData = cohortData[periodIndex];
          if (cellData) {
            cellData.revenue += totalRevenue;
            if (periodIndex === 0) {
              cellData.retention = 100;
            } else {
              const updatedRetention = aggregatedOriginalRevenue > 0 ? (cellData.revenue / aggregatedOriginalRevenue) * 100 : 0;
              cellData.retention = updatedRetention;
            }
          } else {
            cohortData[periodIndex] = {
              revenue: totalRevenue,
              retention: retentionRate,
              period: periodIndex,
              cohort: cohortKey
            };
          }
        }
      }
    });

    // Calculate percentile for each cell (for color mapping)
    const periodValues: Record<number, number[]> = {};
    Object.values(matrix).forEach(cohortData => {
      Object.entries(cohortData).forEach(([periodStr, cell]) => {
        if (periodStr === '_originalRevenue') return;
        const period = parseInt(periodStr);
        if (isNaN(period)) return;
        if (!periodValues[period]) periodValues[period] = [];
        periodValues[period].push(cell.retention);
      });
    });
    
    Object.values(matrix).forEach(cohortData => {
      Object.entries(cohortData).forEach(([periodStr, cell]) => {
        if (periodStr === '_originalRevenue') return;
        const period = parseInt(periodStr);
        if (isNaN(period)) return;
        if (periodValues[period]) {
          cell.percentile = calculatePercentile(cell.retention, periodValues[period]);
        }
      });
    });
    
    Object.keys(matrix).forEach(cohortKey => {
      const cohortData = matrix[cohortKey] as Record<number, MatrixCell> & { _originalRevenue?: number };
      delete cohortData._originalRevenue;
    });

    return matrix;
  };

  const matrixData = generateMatrixData();
  
  // Sort cohorts chronologically
  const cohortMonths = Object.keys(matrixData).sort((a, b) => {
    if (a.includes('Pre-2020') || a.startsWith('≤')) return -1;
    if (b.includes('Pre-2020') || b.startsWith('≤')) return 1;
    
    const extractYear = (key: string): number => {
      const annualMatch = key.match(/^(\d{4})$/);
      if (annualMatch) return parseInt(annualMatch[1]);
      
      const quarterlyMatch = key.match(/^(\d{4})-Q\d+$/);
      if (quarterlyMatch) return parseInt(quarterlyMatch[1]);
      
      const halfYearMatch = key.match(/^(\d{4})\s+H[12]$/);
      if (halfYearMatch) return parseInt(halfYearMatch[1]);
      
      const monthlyMatch = key.match(/(\d{4})/);
      if (monthlyMatch) return parseInt(monthlyMatch[1]);
      
      return 0;
    };
    
    const yearA = extractYear(a);
    const yearB = extractYear(b);
    
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    
    if (viewMode === 'quarterly') {
      const quarterA = parseInt(a.match(/-Q(\d+)/)?.[1] || '0');
      const quarterB = parseInt(b.match(/-Q(\d+)/)?.[1] || '0');
      return quarterA - quarterB;
    } else if (viewMode === 'half-year') {
      const halfA = a.includes('H1') ? 1 : 2;
      const halfB = b.includes('H1') ? 1 : 2;
      return halfA - halfB;
    } else if (viewMode === 'monthly') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthA = monthNames.findIndex(m => a.startsWith(m));
      const monthB = monthNames.findIndex(m => b.startsWith(m));
      if (monthA !== -1 && monthB !== -1) return monthA - monthB;
    }
    
    return a.localeCompare(b);
  });

  const maxPeriods = Math.max(...cohortMonths.map(month => 
    Object.keys(matrixData[month]).filter(k => k !== '_originalRevenue').length
  ));

  const getActualMaxPeriods = () => {
    let maxPeriodsWithData = 0;
    cohortMonths.forEach(cohort => {
      const cohortData = matrixData[cohort];
      if (cohortData) {
        const periodsWithData = Object.keys(cohortData)
          .filter(k => k !== '_originalRevenue')
          .map(Number)
          .filter(period => !isNaN(period) && cohortData[period] && cohortData[period].revenue > 0)
          .sort((a, b) => b - a);
        
        if (periodsWithData.length > 0) {
          maxPeriodsWithData = Math.max(maxPeriodsWithData, periodsWithData[0] + 1);
        }
      }
    });
    return Math.max(1, Math.min(maxPeriodsWithData, maxPeriods));
  };

  const actualMaxPeriods = getActualMaxPeriods();

  /**
   * Maps retention ratio (0-1) directly to blue scale color class
   * Higher retention ratio → darker blue
   * Lower retention ratio → lighter blue
   * 
   * Uses absolute mapping:
   * - retentionRatio >= 0.9 (90%+) → darkest blues (blue-900, blue-800)
   * - retentionRatio <= 0.2 (20%-) → lightest blues (blue-100, blue-50)
   * - retentionRatio ~0.4-0.6 (40-60%) → mid blues (blue-500, blue-400)
   * 
   * @param retentionRatio - Retention percentage / 100 (e.g., 0.5 for 50%)
   * @returns Tailwind color class from BLUE_SCALE
   */
  const getColorForRetention = (retentionRatio: number): string => {
    // Clamp retentionRatio to [0, 1]
    const clampedRatio = Math.max(0, Math.min(1, retentionRatio));
    
    // Map retention ratio directly to blue scale index (0-9)
    // Higher retention = darker blue (lower index)
    // Lower retention = lighter blue (higher index)
    
    let scaleIndex: number;
    
    if (clampedRatio >= 0.9) {
      // 90-100% retention → darkest blues (blue-900, blue-800)
      scaleIndex = clampedRatio >= 0.95 ? 0 : 1;
    } else if (clampedRatio >= 0.7) {
      // 70-90% retention → dark blues (blue-700, blue-600)
      scaleIndex = clampedRatio >= 0.8 ? 2 : 3;
    } else if (clampedRatio >= 0.5) {
      // 50-70% retention → medium blues (blue-500, blue-400)
      scaleIndex = clampedRatio >= 0.6 ? 4 : 5;
    } else if (clampedRatio >= 0.3) {
      // 30-50% retention → medium-light blues (blue-300, blue-200)
      scaleIndex = clampedRatio >= 0.4 ? 6 : 7;
    } else if (clampedRatio >= 0.1) {
      // 10-30% retention → light blues (blue-100)
      scaleIndex = 8;
    } else {
      // 0-10% retention → lightest blue (blue-50)
      scaleIndex = 9;
    }
    
    return BLUE_SCALE[scaleIndex];
  };

  // Map retention to blue scale using retention ratio
  const getBlueColorClass = (retention: number): string => {
    // retentionRatio = retention percentage / 100
    const retentionRatio = retention / 100;
    return getColorForRetention(retentionRatio);
  };

  // Determine text color based on retention ratio
  const getTextColor = (retention: number): string => {
    const retentionRatio = retention / 100;
    
    // Use white text for darker shades (retentionRatio >= 0.7, i.e., 70%+ retention)
    if (retentionRatio >= 0.7) {
      return 'text-white';
    }
    return 'text-foreground';
  };

  const formatCurrency = (amount: number) => {
    // Abbreviate large numbers for better readability in matrix cells
    if (amount >= 1000000) {
      const millions = amount / 1000000;
      // Show 1 decimal place for millions, but only if needed
      if (millions >= 10) {
        return `$${millions.toFixed(0)}m`;
      }
      return `$${millions.toFixed(1)}m`;
    } else if (amount >= 1000) {
      const thousands = amount / 1000;
      // Show 1 decimal place for thousands, but only if needed
      if (thousands >= 10) {
        return `$${thousands.toFixed(0)}k`;
      }
      return `$${thousands.toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCohortLabel = (cohortKey: string): string => {
    if (cohortKey.includes('Pre-2020') || cohortKey.startsWith('≤')) {
      return 'Pre-2020';
    }
    
    // For annual view, just return the year
    if (viewMode === 'annual' && cohortKey.match(/^\d{4}$/)) {
      return cohortKey;
    }
    
    // For other views, return as-is (already formatted)
    return cohortKey;
  };

  const formatPeriodHeader = (period: number): { line1: string; line2: string } => {
    if (period === 0) {
      return { line1: 'Original', line2: 'Value' };
    }
    
    if (viewMode === 'annual') {
      return { line1: 'Year', line2: period.toString() };
    } else {
      // For monthly, quarterly, and half-year: show as "After X months"
      let months: number;
      if (viewMode === 'quarterly') {
        months = period * 3; // Each quarter = 3 months
      } else if (viewMode === 'half-year') {
        months = period * 6; // Each half-year = 6 months
      } else {
        months = period; // Monthly view
      }
      return { line1: 'After', line2: `${months} month${months === 1 ? '' : 's'}` };
    }
  };

  const formatPeriodTooltip = (period: number): string => {
    if (period === 0) {
      return 'Revenue from new customers in their acquisition period';
    }
    
    if (viewMode === 'annual') {
      return `Revenue after ${period} year${period === 1 ? '' : 's'}`;
    } else if (viewMode === 'quarterly') {
      return `Revenue after ${period} quarter${period === 1 ? '' : 's'}`;
    } else if (viewMode === 'half-year') {
      return `Revenue after ${period} half-year${period === 1 ? '' : 's'}`;
    } else {
      return `Revenue after ${period} month${period === 1 ? '' : 's'}`;
    }
  };

  const handleCellClick = (cohort: string, period: number, data: MatrixCell) => {
    setSelectedCell(data);
    setShowDetails(true);
    onCellClick?.(cohort, period, data);
  };

  const exportMatrix = () => {
    const csvData = [];
    
    const header = ['Cohort', 'Original Value', ...Array.from({ length: actualMaxPeriods - 1 }, (_, i) => {
      const headerObj = formatPeriodHeader(i + 1);
      return `${headerObj.line1} ${headerObj.line2}`;
    })];
    csvData.push(header);
    
    cohortMonths.forEach(cohort => {
      const row = [cohort];
      const originalValue = matrixData[cohort][0] ? formatCurrency(matrixData[cohort][0].revenue) : '';
      row.push(originalValue);
      
      for (let i = 0; i < actualMaxPeriods - 1; i++) {
        const cell = matrixData[cohort][i + 1];
        if (cell) {
          row.push(`${formatCurrency(cell.revenue)} (${cell.retention.toFixed(1)}%)`);
        } else {
          row.push('');
        }
      }
      csvData.push(row);
    });
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohort-matrix-${viewMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Empty cell pattern style - wider stripes for subtlety
  const emptyCellPattern = {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.01) 6px, rgba(0,0,0,0.01) 12px)',
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-base md:text-lg font-semibold">Cohort Revenue Matrix</CardTitle>
              <CardDescription className="text-xs md:text-sm text-muted-foreground mt-1">
                Colors represent performance relative to this account's own cohort distribution. Darker blues = top performers, lighter blues = weaker performance.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportMatrix}
                className="flex items-center gap-2"
                aria-label="Export matrix data to CSV"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 overflow-hidden">
          <div className="overflow-x-auto w-full" style={{ scrollBehavior: 'smooth' }}>
            <div className="min-w-max pl-4 md:pl-6 pr-4 md:pr-6">
              {/* Sticky Header Row */}
              <div className="sticky top-0 z-[40] bg-white border-b-2 border-gray-200">
                <div className="flex gap-2">
                  <div className="w-28 font-medium text-xs md:text-sm text-foreground flex-shrink-0 sticky left-0 bg-white z-[50] px-3 py-4 border-r-2 border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    Cohort
                  </div>
                  <div className="w-28 font-medium text-xs md:text-sm text-foreground flex-shrink-0 text-center px-3 py-4 bg-gray-50">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center gap-0.5 cursor-help" role="button" tabIndex={0} aria-label="Original Value column">
                            <div className="flex items-center gap-0.5 text-xs md:text-sm">
                              <span>Original</span>
                              <Info className="w-3 h-3 text-gray-600 opacity-80" />
                            </div>
                            <div className="text-xs md:text-sm">Value</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{formatPeriodTooltip(0)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {Array.from({ length: actualMaxPeriods - 1 }, (_, i) => {
                    const periodIndex = i + 1;
                    const header = formatPeriodHeader(periodIndex);
                    return (
                      <div key={periodIndex} className="w-28 font-medium text-xs md:text-sm text-foreground flex-shrink-0 text-center px-3 py-4 bg-gray-50">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-0.5 cursor-help" role="button" tabIndex={0} aria-label={`Period ${periodIndex} column`}>
                                <div className="flex items-center gap-0.5 text-xs md:text-sm">
                                  <span>{header.line1}</span>
                                  <Info className="w-3 h-3 text-gray-600 opacity-80" />
                                </div>
                                <div className="text-xs md:text-sm">{header.line2}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{formatPeriodTooltip(periodIndex)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Matrix Rows with Alternating Striping */}
              <div className="divide-y divide-gray-200">
                {cohortMonths.map((cohort, cohortIndex) => (
                  <div 
                    key={cohort} 
                    className={cn(
                      "flex gap-2 transition-colors",
                      cohortIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                    )}
                    role="row"
                    aria-label={`Cohort ${formatCohortLabel(cohort)}`}
                  >
                    <div className="w-28 text-xs md:text-sm font-medium text-foreground py-4 flex-shrink-0 sticky left-0 z-[30] px-3 border-r-2 border-gray-200 bg-white shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="leading-tight">
                        <div>{formatCohortLabel(cohort)}</div>
                        <div className="text-[11px] text-muted-foreground font-normal">Cohort</div>
                      </div>
                    </div>
                    {/* Original Value Column */}
                    <div className="w-28 flex-shrink-0 relative z-0">
                      {matrixData[cohort][0] ? (
                        <div className={cn(
                          "w-28 rounded-lg md:rounded-xl border-2 border-gray-200 px-3 py-4 text-center transition-all duration-150 hover:shadow-md hover:ring-2 hover:ring-blue-400/20 flex flex-col justify-center items-center min-h-[64px] relative z-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                          getBlueColorClass(matrixData[cohort][0].retention),
                          getTextColor(matrixData[cohort][0].retention)
                        )}
                        tabIndex={0}
                        role="cell"
                        aria-label={`Original value: ${formatCurrency(matrixData[cohort][0].revenue)}, Retention: ${matrixData[cohort][0].retention.toFixed(1)}%`}
                        >
                          <div className="text-xs font-semibold leading-tight break-words max-w-full px-1">
                            {formatCurrency(matrixData[cohort][0].revenue)}
                          </div>
                          <div className={cn(
                            "text-[10px] font-normal mt-1",
                            getTextColor(matrixData[cohort][0].retention) === 'text-white' 
                              ? 'text-blue-100' 
                              : 'text-muted-foreground'
                          )}>
                            {matrixData[cohort][0].retention.toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="w-28 rounded-lg md:rounded-xl border-2 border-gray-200 px-3 py-4 text-center flex flex-col justify-center items-center min-h-[64px] relative z-0"
                          style={emptyCellPattern}
                          role="cell"
                          aria-label="No data"
                        >
                          <div className="text-xs font-semibold leading-tight opacity-0">$0</div>
                          <div className="text-[10px] font-normal mt-1 opacity-0">0%</div>
                        </div>
                      )}
                    </div>
                    {/* Period Columns */}
                    {Array.from({ length: actualMaxPeriods - 1 }, (_, i) => {
                      const periodIndex = i + 1;
                      const cell = matrixData[cohort][periodIndex];
                      
                      if (!cell) {
                        return (
                          <div key={periodIndex} className="w-28 flex-shrink-0 relative z-0">
                            <div 
                              className="w-28 rounded-lg md:rounded-xl border-2 border-gray-200 px-3 py-4 text-center flex flex-col justify-center items-center min-h-[64px] relative z-0"
                              style={emptyCellPattern}
                              role="cell"
                              aria-label="No data"
                            >
                              <div className="text-xs font-semibold leading-tight opacity-0">$0</div>
                              <div className="text-[10px] font-normal mt-1 opacity-0">0%</div>
                            </div>
                          </div>
                        );
                      }
                      
                      const blueColorClass = getBlueColorClass(cell.retention);
                      const textColor = getTextColor(cell.retention);
                      
                      return (
                        <TooltipProvider key={periodIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCellClick(cohort, periodIndex, cell)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleCellClick(cohort, periodIndex, cell);
                                  }
                                }}
                                className={cn(
                                  "w-28 rounded-lg md:rounded-xl border-2 border-gray-200 px-3 py-4 text-center transition-all duration-150 hover:shadow-md hover:ring-1 hover:ring-blue-300/20 flex-shrink-0 flex flex-col justify-center items-center min-h-[64px] relative z-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                  blueColorClass,
                                  textColor
                                )}
                                role="cell"
                                aria-label={`Period ${periodIndex}: Revenue ${formatCurrency(cell.revenue)}, Retention ${cell.retention.toFixed(1)}%`}
                              >
                                <div className="text-xs font-semibold leading-tight break-words max-w-full px-1">
                                  {formatCurrency(cell.revenue)}
                                </div>
                                <div className={cn(
                                  "text-[10px] font-normal mt-1",
                                  textColor === 'text-white' 
                                    ? 'text-blue-100' 
                                    : 'text-muted-foreground'
                                )}>
                                  {cell.retention.toFixed(1)}%
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-popover text-popover-foreground border border-border max-w-xs">
                              <div className="space-y-1">
                                <div className="font-semibold text-sm">
                                  {formatCohortLabel(cohort)} – {formatPeriodTooltip(periodIndex)}
                                </div>
                                <div className="text-sm space-y-0.5">
                                  <div>Revenue: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cell.revenue)}</div>
                                  <div>Retention: {cell.retention.toFixed(1)}% of original revenue</div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              {/* Sticky Total Revenue Row */}
              <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-gray-200 pt-4 bg-gray-50 shadow-[0_-1px_2px_rgba(0,0,0,0.03)] z-[35]">
                <div className="w-28 text-xs md:text-sm font-semibold text-foreground py-4 flex-shrink-0 sticky left-0 bg-gray-50 z-[50] px-3 border-r-2 border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                  Total Revenue
                </div>
                <div className="w-28 py-4 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-semibold text-gray-900">
                    {formatCurrency(
                      cohortMonths.reduce((sum, cohort) => {
                        const originalValue = matrixData[cohort][0]?.revenue || 0;
                        return sum + originalValue;
                      }, 0)
                    )}
                  </div>
                </div>
                {Array.from({ length: actualMaxPeriods - 1 }, (_, i) => {
                  const periodIndex = i + 1;
                  const totalRevenue = cohortMonths.reduce((sum, cohort) => {
                    const cell = matrixData[cohort][periodIndex];
                    return sum + (cell?.revenue || 0);
                  }, 0);
                  
                  return (
                    <div key={periodIndex} className="w-28 py-4 flex-shrink-0 flex items-center justify-center">
                      <div className="text-xs font-semibold text-gray-900">
                        {formatCurrency(totalRevenue)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {showDetails && selectedCell && (
        <Card className="border-border bg-muted/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {formatCohortLabel(selectedCell.cohort)} – {formatPeriodTooltip(selectedCell.period)}
                </CardTitle>
                <CardDescription>
                  Detailed breakdown for this cohort period
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">Revenue</div>
                <div className="text-xl font-bold">{formatCurrency(selectedCell.revenue)}</div>
              </div>
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">Retention</div>
                <div className="text-xl font-bold">{selectedCell.retention.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
