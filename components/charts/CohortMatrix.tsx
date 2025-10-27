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
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Share2,
  Palette,
  Target,
  CalendarIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CohortMatrixProps {
  cohorts: unknown[];
  viewMode: 'monthly' | 'quarterly' | 'annual';
  onCellClick?: (cohort: string, period: number, data: MatrixCell) => void;
}

interface MatrixCell {
  revenue: number;
  retention: number;
  period: number;
  cohort: string;
  percentile?: number;
  deltaFromTarget?: number;
  color?: string;
}

type ColorMode = 'relative' | 'goal-based';

interface ColorThresholds {
  red: number;
  amber: number;
  green: number;
}

export function CohortMatrix({ cohorts, viewMode, onCellClick }: CohortMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('relative');

  // Advanced adaptive color calculation functions
  const calculateQuantiles = (values: number[]): ColorThresholds => {
    if (values.length === 0) {
      return { red: 0, amber: 0, green: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;
    
    // Use more sophisticated quantile calculation
    const getQuantile = (p: number) => {
      const index = (len - 1) * p;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      
      if (upper >= len) return sorted[len - 1];
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };
    
    return {
      red: getQuantile(0.25),    // 25th percentile
      amber: getQuantile(0.5),   // 50th percentile (median)
      green: getQuantile(0.75)   // 75th percentile
    };
  };

  // Convert RGB to HCL for perceptually uniform color interpolation
  const rgbToHcl = (r: number, g: number, b: number) => {
    // Convert RGB to XYZ
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    // Apply gamma correction
    const rLin = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
    const gLin = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
    const bLin = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;
    
    // Convert to XYZ
    const x = rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375;
    const y = rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750;
    const z = rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041;
    
    // Convert XYZ to LAB
    const xn = x / 0.95047;
    const yn = y / 1.00000;
    const zn = z / 1.08883;
    
    const fx = xn > 0.008856 ? Math.pow(xn, 1/3) : (7.787 * xn + 16/116);
    const fy = yn > 0.008856 ? Math.pow(yn, 1/3) : (7.787 * yn + 16/116);
    const fz = zn > 0.008856 ? Math.pow(zn, 1/3) : (7.787 * zn + 16/116);
    
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bLab = 200 * (fy - fz);
    
    // Convert LAB to HCL
    const C = Math.sqrt(a * a + bLab * bLab);
    let H = Math.atan2(bLab, a) * 180 / Math.PI;
    if (H < 0) H += 360;
    
    return { H, C, L };
  };

  // Convert HCL back to RGB
  const hclToRgb = (H: number, C: number, L: number) => {
    // Convert HCL to LAB
    const aLab = C * Math.cos(H * Math.PI / 180);
    const bLab = C * Math.sin(H * Math.PI / 180);
    
    // Convert LAB to XYZ
    const fy = (L + 16) / 116;
    const fx = aLab / 500 + fy;
    const fz = fy - bLab / 200;
    
    const xn = fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787;
    const yn = fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787;
    const zn = fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787;
    
    const x = xn * 0.95047;
    const y = yn * 1.00000;
    const z = zn * 1.08883;
    
    // Convert XYZ to RGB
    const rLin = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    const gLin = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    const bLin = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    
    // Apply gamma correction
    const r = rLin > 0.0031308 ? 1.055 * Math.pow(rLin, 1/2.4) - 0.055 : 12.92 * rLin;
    const g = gLin > 0.0031308 ? 1.055 * Math.pow(gLin, 1/2.4) - 0.055 : 12.92 * gLin;
    const b = bLin > 0.0031308 ? 1.055 * Math.pow(bLin, 1/2.4) - 0.055 : 12.92 * bLin;
    
    return {
      r: Math.max(0, Math.min(255, Math.round(r * 255))),
      g: Math.max(0, Math.min(255, Math.round(g * 255))),
      b: Math.max(0, Math.min(255, Math.round(b * 255)))
    };
  };

  const interpolateColor = (value: number, thresholds: ColorThresholds): string => {
    const { red, amber, green } = thresholds;
    
    // Define color stops in HCL space for perceptually uniform interpolation
    const redHcl = rgbToHcl(220, 38, 38);    // #DC2626
    const amberHcl = rgbToHcl(245, 158, 11); // #F59E0B
    const greenHcl = rgbToHcl(22, 163, 74);  // #16A34A
    
    let color;
    
    if (value <= red) {
      // Below 25th percentile - pure red
      color = { r: 220, g: 38, b: 38 };
    } else if (value <= amber) {
      // Between 25th and 50th percentile - interpolate red to amber
      const ratio = (value - red) / (amber - red);
      const interpolatedHcl = {
        H: redHcl.H + (amberHcl.H - redHcl.H) * ratio,
        C: redHcl.C + (amberHcl.C - redHcl.C) * ratio,
        L: redHcl.L + (amberHcl.L - redHcl.L) * ratio
      };
      color = hclToRgb(interpolatedHcl.H, interpolatedHcl.C, interpolatedHcl.L);
    } else if (value <= green) {
      // Between 50th and 75th percentile - interpolate amber to green
      const ratio = (value - amber) / (green - amber);
      const interpolatedHcl = {
        H: amberHcl.H + (greenHcl.H - amberHcl.H) * ratio,
        C: amberHcl.C + (greenHcl.C - amberHcl.C) * ratio,
        L: amberHcl.L + (greenHcl.L - amberHcl.L) * ratio
      };
      color = hclToRgb(interpolatedHcl.H, interpolatedHcl.C, interpolatedHcl.L);
    } else {
      // Above 75th percentile - pure green
      color = { r: 22, g: 163, b: 74 };
    }
    
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  };

  const calculatePercentile = (value: number, values: number[]): number => {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 100;
    if (index === 0) return 0;
    
    // More accurate percentile calculation
    const lowerIndex = index - 1;
    const upperIndex = index;
    const lowerValue = sorted[lowerIndex];
    const upperValue = sorted[upperIndex];
    
    if (lowerValue === upperValue) {
      return (lowerIndex / sorted.length) * 100;
    }
    
    // Linear interpolation between adjacent values
    const ratio = (value - lowerValue) / (upperValue - lowerValue);
    const interpolatedIndex = lowerIndex + ratio;
    
    return (interpolatedIndex / sorted.length) * 100;
  };

  const getTargetRetention = (period: number): number => {
    // Industry-standard retention curve (can be customized per client)
    // This is a typical SaaS/subscription retention curve
    const targets = {
      0: 100,   // Original value
      1: 80,    // After 1 period
      2: 65,    // After 2 periods
      3: 55,    // After 3 periods
      4: 48,    // After 4 periods
      5: 42,    // After 5 periods
      6: 38,    // After 6 periods
      7: 35,    // After 7 periods
      8: 32,    // After 8 periods
      9: 30,    // After 9 periods
      10: 28,   // After 10 periods
      11: 26,   // After 11 periods
      12: 24    // After 12 periods
    };
    return targets[period as keyof typeof targets] || 20;
  };

  // Generate matrix data from cohorts
  const generateMatrixData = () => {
    const matrix: Record<string, Record<number, MatrixCell>> = {};
    
    // Define the years we want to show in annual view
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    const maxPeriods = viewMode === 'annual' ? years.length : viewMode === 'quarterly' ? 20 : 24;

    // Process each cohort individually
    cohorts.forEach((cohort) => {
      const cohortData = cohort as Record<string, unknown>;
      const cohortMonth = cohortData.cohort_month as string;
      const periods = cohortData.periods as Array<Record<string, unknown>>;
      
      // Create cohort key based on view mode
      let cohortKey: string;
      if (viewMode === 'annual') {
        const cohortYear = new Date(cohortMonth).getFullYear();
        cohortKey = `${cohortYear} Cohort`;
      } else if (viewMode === 'quarterly') {
        const cohortYear = new Date(cohortMonth).getFullYear();
        const cohortQuarter = Math.floor(new Date(cohortMonth).getMonth() / 3) + 1;
        cohortKey = `${cohortYear}-Q${cohortQuarter} Cohort`;
      } else {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = new Date(cohortMonth).getMonth();
        const year = new Date(cohortMonth).getFullYear();
        cohortKey = `${monthNames[month]}-${year}`;
      }
      
      matrix[cohortKey] = {};
      
      // Process each period for this cohort
      for (let periodIndex = 0; periodIndex < maxPeriods; periodIndex++) {
        let totalRevenue = 0;
        let originalRevenue = 0;
        
        if (viewMode === 'annual') {
          // For annual view, find periods that fall within the target year
          const targetYear = years[periodIndex];
          if (!targetYear) continue;
          
          // Find all periods for this cohort that fall within the target year
          const periodsInYear = periods.filter(period => {
            const orderMonth = period.order_month as string;
            return orderMonth.startsWith(targetYear);
          });
          
          // Sum up revenue for all periods in this year
          periodsInYear.forEach(period => {
            totalRevenue += period.total_revenue as number;
          });
          
          // Get original revenue (period 0) for retention calculation
          const originalPeriod = periods.find(p => (p.period_number as number) === 0);
          if (originalPeriod) {
            originalRevenue = originalPeriod.total_revenue as number;
          }
          
        } else if (viewMode === 'quarterly') {
          // For quarterly view, find the period that corresponds to periodIndex quarters after the cohort start
          const targetPeriod = periods.find(period => {
            const periodNumber = period.period_number as number;
            return periodNumber === periodIndex;
          });
          
          if (targetPeriod) {
            totalRevenue = targetPeriod.total_revenue as number;
          }
          
          // Get original revenue (period 0) for retention calculation
          const originalPeriod = periods.find(p => (p.period_number as number) === 0);
          if (originalPeriod) {
            originalRevenue = originalPeriod.total_revenue as number;
          }
          
        } else {
          // For monthly view, find the period that corresponds to periodIndex months after the cohort start
          const targetPeriod = periods.find(period => {
            const periodNumber = period.period_number as number;
            return periodNumber === periodIndex;
          });
          
          if (targetPeriod) {
            totalRevenue = targetPeriod.total_revenue as number;
          }
          
          // Get original revenue (period 0) for retention calculation
          const originalPeriod = periods.find(p => (p.period_number as number) === 0);
          if (originalPeriod) {
            originalRevenue = originalPeriod.total_revenue as number;
          }
        }
        
        // Store the data if we have revenue
        if (totalRevenue > 0 || periodIndex === 0) { // Always show Original Value (period 0)
          const retentionRate = originalRevenue > 0 ? (totalRevenue / originalRevenue) * 100 : 0;
          
          matrix[cohortKey][periodIndex] = {
            revenue: totalRevenue,
            retention: retentionRate,
            period: periodIndex,
            cohort: cohortKey
          };
        }
      }
    });

    // Calculate colors based on the selected mode
    if (colorMode === 'relative') {
      // Calculate quantiles for each period
      const periodQuantiles: Record<number, ColorThresholds> = {};
      
      // Collect all retention values for each period
      const periodValues: Record<number, number[]> = {};
      Object.values(matrix).forEach(cohortData => {
        Object.entries(cohortData).forEach(([periodStr, cell]) => {
          const period = parseInt(periodStr);
          if (!periodValues[period]) periodValues[period] = [];
          periodValues[period].push(cell.retention);
        });
      });
      
      // Calculate quantiles for each period
      Object.entries(periodValues).forEach(([periodStr, values]) => {
        const period = parseInt(periodStr);
        periodQuantiles[period] = calculateQuantiles(values);
      });
      
      // Apply colors based on quantiles
      Object.values(matrix).forEach(cohortData => {
        Object.entries(cohortData).forEach(([periodStr, cell]) => {
          const period = parseInt(periodStr);
          const thresholds = periodQuantiles[period];
          if (thresholds) {
            const percentile = calculatePercentile(cell.retention, periodValues[period]);
            cell.percentile = percentile;
            cell.color = interpolateColor(cell.retention, thresholds);
          }
        });
      });
    } else {
      // Goal-based mode
      Object.values(matrix).forEach(cohortData => {
        Object.entries(cohortData).forEach(([periodStr, cell]) => {
          const period = parseInt(periodStr);
          const target = getTargetRetention(period);
          const delta = cell.retention - target;
          cell.deltaFromTarget = delta;
          
          // Color based on delta from target
          const thresholds: ColorThresholds = {
            red: target - 10,    // More than 10% below target
            amber: target,       // At target
            green: target + 10   // More than 10% above target
          };
          cell.color = interpolateColor(cell.retention, thresholds);
        });
      });
    }

    return matrix;
  };

  const matrixData = generateMatrixData();
  const cohortMonths = Object.keys(matrixData).sort();
  const maxPeriods = Math.max(...cohortMonths.map(month => 
    Object.keys(matrixData[month]).length
  ));

  // Calculate actual periods with data to avoid empty trailing columns
  const getActualMaxPeriods = () => {
    let maxPeriodsWithData = 0;
    cohortMonths.forEach(cohort => {
      const cohortData = matrixData[cohort];
      if (cohortData) {
        // Find the highest period index that has data
        const periodsWithData = Object.keys(cohortData)
          .map(Number)
          .filter(period => cohortData[period] && cohortData[period].revenue > 0)
          .sort((a, b) => b - a);
        
        if (periodsWithData.length > 0) {
          maxPeriodsWithData = Math.max(maxPeriodsWithData, periodsWithData[0] + 1);
        }
      }
    });
    return Math.min(maxPeriodsWithData, maxPeriods);
  };

  const actualMaxPeriods = getActualMaxPeriods();

  const getRetentionColor = (cell: MatrixCell) => {
    if (!cell.color) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    // Determine text color based on background brightness
    const rgb = cell.color.match(/\d+/g);
    if (!rgb) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const [r, g, b] = rgb.map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 128 ? 'text-gray-900' : 'text-white';
    
    return `border-2 ${textColor}`;
  };

  const getRetentionIcon = (cell: MatrixCell) => {
    if (cell.percentile !== undefined) {
      if (cell.percentile >= 75) return <TrendingUp className="w-3 h-3" />;
      if (cell.percentile >= 25) return <Minus className="w-3 h-3" />;
      return <TrendingDown className="w-3 h-3" />;
    }
    
    if (cell.deltaFromTarget !== undefined) {
      if (cell.deltaFromTarget > 5) return <TrendingUp className="w-3 h-3" />;
      if (cell.deltaFromTarget > -5) return <Minus className="w-3 h-3" />;
      return <TrendingDown className="w-3 h-3" />;
    }
    
    return <Minus className="w-3 h-3" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCohortLabel = (cohortKey: string) => {
    if (viewMode === 'annual') {
      // cohortKey is already the year (e.g., "2020")
      return `${cohortKey} Cohort`;
    } else if (viewMode === 'quarterly') {
      // cohortKey is already in format "2020-Q1"
      return `${cohortKey} Cohort`;
    } else {
      // For monthly, cohortKey is "YYYY-MM", convert to "Month-YYYY"
      const [year, month] = cohortKey.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month) - 1;
      return `${monthNames[monthIndex]}-${year}`;
    }
  };

  const formatPeriod = (period: number) => {
    const currentYear = new Date().getFullYear();
    if (viewMode === 'annual') {
      return `${currentYear - maxPeriods + period + 1}`;
    } else if (viewMode === 'quarterly') {
      return `After ${period + 1} quarter${period + 1 === 1 ? '' : 's'}`;
    } else {
      return `After ${period + 1} month${period + 1 === 1 ? '' : 's'}`;
    }
  };

  const handleCellClick = (cohort: string, period: number, data: MatrixCell) => {
    setSelectedCell(data);
    setShowDetails(true);
    onCellClick?.(cohort, period, data);
  };

  const exportMatrix = () => {
    const csvData = [];
    
    // Header row
    const header = ['Cohort', 'Original Value', ...Array.from({ length: actualMaxPeriods }, (_, i) => formatPeriod(i))];
    csvData.push(header);
    
    // Data rows
    cohortMonths.forEach(cohort => {
      const row = [cohort];
      // Add original value
      const originalValue = matrixData[cohort][0] ? formatCurrency(matrixData[cohort][0].revenue) : '';
      row.push(originalValue);
      
      for (let i = 0; i < actualMaxPeriods; i++) {
        const cell = matrixData[cohort][i + 1]; // Start from period 1, not period 0
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

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cohort Revenue Matrix</CardTitle>
              <CardDescription>
                {colorMode === 'relative' 
                  ? "🎨 Adaptive Quantile Scaling: Colors represent performance relative to this account's own cohort distribution. Green = top 25% performers, Amber = middle 50%, Red = bottom 25%. This ensures fair visualization across all industries - low-retention industries (camera gear) and high-retention industries (vitamins) both show meaningful variation."
                  : "🎯 Goal-Based Scaling: Colors reflect variance from industry-standard retention targets. Green = +10% above target, Amber = ±5% of target, Red = -10% below target. Based on typical SaaS/subscription retention curves."
                }
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant={colorMode === 'relative' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setColorMode('relative')}
                  className="flex items-center"
                >
                  <Palette className="w-4 h-4 mr-1" />
                  Relative
                </Button>
                <Button
                  variant={colorMode === 'goal-based' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setColorMode('goal-based')}
                  className="flex items-center"
                >
                  <Target className="w-4 h-4 mr-1" />
                  Goal-Based
                </Button>
              </div>
              <button
                onClick={exportMatrix}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header */}
              <div className="flex gap-1 mb-3">
                <div className="w-24 font-semibold text-gray-700 flex-shrink-0 text-sm sticky left-0 bg-white z-10 px-1">Cohort</div>
                <div className="w-20 font-semibold text-gray-700 flex-shrink-0 text-xs text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help hover:text-blue-600 transition-colors">
                          Original Value
                          <Info className="w-3 h-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                            <h4 className="text-sm font-semibold">Original Value</h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            {viewMode === 'annual' 
                              ? "Period 0 represents the same year as the cohort's first purchase. This is the initial revenue generated by new customers in their acquisition year."
                              : viewMode === 'quarterly'
                              ? "Period 0 represents the same quarter as the cohort's first purchase. This is the initial revenue generated by new customers in their acquisition quarter."
                              : "Period 0 represents the same month as the cohort's first purchase. This is the initial revenue generated by new customers in their acquisition month."
                            }
                          </p>
                          <div className="text-xs text-gray-500">
                            All subsequent periods show retention revenue from returning customers.
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {Array.from({ length: actualMaxPeriods }, (_, i) => (
                  <div key={i} className="w-20 text-center font-semibold text-gray-700 text-xs flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1 cursor-help hover:text-blue-600 transition-colors">
                            {formatPeriod(i)}
                            <Info className="w-3 h-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-blue-600" />
                              <h4 className="text-sm font-semibold">{formatPeriod(i)}</h4>
                            </div>
                            <p className="text-sm text-gray-600">
                              {viewMode === 'annual' 
                                ? `Revenue generated by returning customers ${i + 1} year${i + 1 > 1 ? 's' : ''} after their first purchase. Shows how well the cohort retains and generates repeat revenue over time.`
                                : viewMode === 'quarterly'
                                ? `Revenue generated by returning customers ${i + 1} quarter${i + 1 > 1 ? 's' : ''} after their first purchase. Shows how well the cohort retains and generates repeat revenue over time.`
                                : `Revenue generated by returning customers ${i + 1} month${i + 1 > 1 ? 's' : ''} after their first purchase. Shows how well the cohort retains and generates repeat revenue over time.`
                              }
                            </p>
                            <div className="text-xs text-gray-500">
                              Higher values indicate better customer retention and repeat purchase behavior.
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
              
              {/* Matrix Rows */}
              <div className="space-y-1">
                {cohortMonths.map((cohort) => (
                  <div key={cohort} className="flex gap-1">
                    <div className="w-24 text-xs font-medium text-gray-900 py-1 flex-shrink-0 sticky left-0 bg-white z-10 px-1">
                      {formatCohortLabel(cohort)}
                    </div>
                    {/* Original Value Column */}
                    <div className="w-20 text-center py-1 text-gray-900 flex-shrink-0 text-xs font-semibold">
                      {matrixData[cohort][0] ? formatCurrency(matrixData[cohort][0].revenue) : '-'}
                    </div>
                    {Array.from({ length: actualMaxPeriods }, (_, i) => {
                      const cell = matrixData[cohort][i + 1]; // Start from period 1, not period 0
                      if (!cell) {
                        return (
                          <div key={i} className="w-20 text-center py-1 text-gray-400 flex-shrink-0 text-xs">
                            -
                          </div>
                        );
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => handleCellClick(cohort, i + 1, cell)}
                          className={`w-20 p-1 rounded text-center hover:shadow-md transition-all flex-shrink-0 ${getRetentionColor(cell)}`}
                          style={{ backgroundColor: cell.color }}
                          title={
                            colorMode === 'relative' 
                              ? `${cell.retention.toFixed(1)}% retention at Period ${i + 1}\n${cell.percentile?.toFixed(0)}th percentile of all cohorts at this period\nAdaptive scaling based on account's data distribution`
                              : `${cell.retention.toFixed(1)}% retention at Period ${i + 1}\n${cell.deltaFromTarget && cell.deltaFromTarget > 0 ? '+' : ''}${cell.deltaFromTarget?.toFixed(1)}% vs industry target\nGoal-based scaling mode`
                          }
                        >
                          <div className="font-bold text-xs">
                            {formatCurrency(cell.revenue)}
                          </div>
                          <div className="text-xs flex items-center justify-center mt-0.5">
                            {getRetentionIcon(cell)}
                            <span className="ml-0.5">
                              {cell.retention.toFixed(0)}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
                
                {/* Total Revenue Row */}
                <div className="flex gap-1 border-t-2 border-gray-300 pt-2 mt-2">
                  <div className="w-24 text-xs font-bold text-gray-900 py-1 flex-shrink-0 sticky left-0 bg-white z-10 px-1">
                    Total Revenue
                  </div>
                  {/* Original Value Total */}
                  <div className="w-20 text-center py-1 text-gray-900 flex-shrink-0 text-xs font-bold">
                    {formatCurrency(
                      cohortMonths.reduce((sum, cohort) => {
                        const originalValue = matrixData[cohort][0]?.revenue || 0;
                        return sum + originalValue;
                      }, 0)
                    )}
                  </div>
                  {/* Period Totals */}
                  {Array.from({ length: actualMaxPeriods }, (_, i) => {
                    const totalRevenue = cohortMonths.reduce((sum, cohort) => {
                      const cell = matrixData[cohort][i + 1];
                      return sum + (cell?.revenue || 0);
                    }, 0);
                    
                    return (
                      <div key={i} className="w-20 text-center py-1 text-gray-900 flex-shrink-0 text-xs font-bold bg-gray-100 rounded">
                        {formatCurrency(totalRevenue)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Legend */}
      <Card className="bg-gradient-to-r from-red-50 via-amber-50 to-green-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-gray-700">
                {colorMode === 'relative' ? 'Adaptive Quantile Scale' : 'Goal-Based Scale'}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#DC2626' }}></div>
                <span className="text-xs text-gray-600">
                  {colorMode === 'relative' ? 'Bottom 25%' : 'Below Target'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
                <span className="text-xs text-gray-600">
                  {colorMode === 'relative' ? 'Middle 50%' : 'At Target'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#16A34A' }}></div>
                <span className="text-xs text-gray-600">
                  {colorMode === 'relative' ? 'Top 25%' : 'Above Target'}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {colorMode === 'relative' 
                ? '🎨 Smooth HCL interpolation ensures perceptually uniform color transitions'
                : '🎯 Based on industry-standard retention curves'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {showDetails && selectedCell && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Cohort {selectedCell.cohort} - {formatPeriod(selectedCell.period)}
                </CardTitle>
                <CardDescription>
                  Detailed breakdown for this cohort period
                </CardDescription>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Revenue</div>
                <div className="text-xl font-bold">{formatCurrency(selectedCell.revenue)}</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Retention</div>
                <div className="text-xl font-bold">{selectedCell.retention.toFixed(1)}%</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Top Products</div>
                <div className="text-sm font-medium">Skincare (32%)</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Top Geography</div>
                <div className="text-sm font-medium">UK (68%)</div>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                View Products Analysis
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                View Retention Curve
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                Generate Report
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
