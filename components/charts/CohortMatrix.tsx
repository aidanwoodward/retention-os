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
} from "lucide-react";

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
}

export function CohortMatrix({ cohorts, viewMode, onCellClick }: CohortMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Generate matrix data from cohorts
  const generateMatrixData = () => {
    const matrix: Record<string, Record<number, MatrixCell>> = {};
    const maxPeriods = viewMode === 'annual' ? 5 : viewMode === 'quarterly' ? 8 : 12;

    // Group cohorts by year/quarter based on view mode
    const groupedCohorts: Record<string, Record<string, unknown>[]> = {};
    
    cohorts.forEach((cohort) => {
      const cohortData = cohort as Record<string, unknown>;
      const cohortMonth = cohortData.cohort_month as string;
      const date = new Date(cohortMonth);
      
      let groupKey: string;
      if (viewMode === 'annual') {
        groupKey = date.getFullYear().toString();
      } else if (viewMode === 'quarterly') {
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        groupKey = `${year}-Q${quarter}`;
      } else {
        groupKey = cohortMonth;
      }
      
      if (!groupedCohorts[groupKey]) {
        groupedCohorts[groupKey] = [];
      }
      groupedCohorts[groupKey].push(cohortData);
    });

    // Process grouped cohorts
    Object.entries(groupedCohorts).forEach(([groupKey, groupCohorts]) => {
      matrix[groupKey] = {};
      
      // Aggregate data across all cohorts in this group
      for (let periodIndex = 0; periodIndex < maxPeriods; periodIndex++) {
        let totalRevenue = 0;
        let totalPreviousRevenue = 0;
        let cohortCount = 0;
        
        groupCohorts.forEach((cohortData) => {
          const periods = cohortData.periods as Array<Record<string, unknown>>;
          if (periods[periodIndex]) {
            totalRevenue += periods[periodIndex].total_revenue as number;
            if (periodIndex > 0 && periods[periodIndex - 1]) {
              totalPreviousRevenue += periods[periodIndex - 1].total_revenue as number;
            }
            cohortCount++;
          }
        });
        
        if (cohortCount > 0) {
          const avgRevenue = totalRevenue / cohortCount;
          const avgPreviousRevenue = totalPreviousRevenue / cohortCount;
          const retentionRate = avgPreviousRevenue > 0 ? (avgRevenue / avgPreviousRevenue) * 100 : 100;
          
          matrix[groupKey][periodIndex] = {
            revenue: totalRevenue,
            retention: retentionRate,
            period: periodIndex,
            cohort: groupKey
          };
        }
      }
    });

    return matrix;
  };

  const matrixData = generateMatrixData();
  const cohortMonths = Object.keys(matrixData).sort();
  const maxPeriods = Math.max(...cohortMonths.map(month => 
    Object.keys(matrixData[month]).length
  ));

  const getRetentionColor = (retention: number) => {
    if (retention >= 75) return 'bg-green-100 text-green-800 border-green-200';
    if (retention >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getRetentionIcon = (retention: number) => {
    if (retention >= 75) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (retention >= 50) return <Minus className="w-3 h-3 text-yellow-600" />;
    return <TrendingDown className="w-3 h-3 text-red-600" />;
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
      return `Q${period + 1}`;
    } else {
      return `Month ${period + 1}`;
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
    const header = ['Cohort', ...Array.from({ length: maxPeriods }, (_, i) => formatPeriod(i))];
    csvData.push(header);
    
    // Data rows
    cohortMonths.forEach(cohort => {
      const row = [cohort];
      for (let i = 0; i < maxPeriods; i++) {
        const cell = matrixData[cohort][i];
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cohort Revenue Matrix</CardTitle>
              <CardDescription>
                Revenue retention by cohort and elapsed period. Green ≥75%, Yellow 50-75%, Red &lt;50%
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
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
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header */}
              <div className="flex gap-2 mb-4">
                <div className="w-32 font-semibold text-gray-700 flex-shrink-0">Cohort</div>
                {Array.from({ length: maxPeriods }, (_, i) => (
                  <div key={i} className="w-24 text-center font-semibold text-gray-700 text-sm flex-shrink-0">
                    {formatPeriod(i)}
                  </div>
                ))}
              </div>
              
              {/* Matrix Rows */}
              <div className="space-y-2">
                {cohortMonths.map((cohort) => (
                  <div key={cohort} className="flex gap-2">
                    <div className="w-32 text-sm font-medium text-gray-900 py-2 flex-shrink-0">
                      {formatCohortLabel(cohort)}
                    </div>
                    {Array.from({ length: maxPeriods }, (_, i) => {
                      const cell = matrixData[cohort][i];
                      if (!cell) {
                        return (
                          <div key={i} className="w-24 text-center py-2 text-gray-400 flex-shrink-0">
                            -
                          </div>
                        );
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => handleCellClick(cohort, i, cell)}
                          className={`w-24 p-2 rounded-lg border text-center hover:shadow-md transition-all flex-shrink-0 ${getRetentionColor(cell.retention)}`}
                        >
                          <div className="font-bold text-sm">
                            {formatCurrency(cell.revenue)}
                          </div>
                          <div className="text-xs flex items-center justify-center mt-1">
                            {getRetentionIcon(cell.retention)}
                            <span className="ml-1">
                              {cell.retention.toFixed(0)}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
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
