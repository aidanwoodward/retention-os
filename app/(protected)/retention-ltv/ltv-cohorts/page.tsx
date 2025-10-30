"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, Download, BarChart3, LineChart, AlertTriangle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface LTVData {
  cohort_month: string;
  cohort_size: number;
  cumulative_revenue: number;
  clr: number; // Cumulative Revenue per customer
  ltv_12mo: number;
  ltv_24mo: number;
  ltv_36mo: number;
}

export default function CLRLTVCohortsPage() {
  const [ltvData, setLtvData] = useState<LTVData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock data
    setLtvData([
      { cohort_month: '2024-01', cohort_size: 150, cumulative_revenue: 67500, clr: 450, ltv_12mo: 420, ltv_24mo: 680, ltv_36mo: 850 },
      { cohort_month: '2024-02', cohort_size: 175, cumulative_revenue: 78750, clr: 450, ltv_12mo: 430, ltv_24mo: 700, ltv_36mo: 880 },
      { cohort_month: '2024-03', cohort_size: 200, cumulative_revenue: 92000, clr: 460, ltv_12mo: 445, ltv_24mo: 720, ltv_36mo: 900 },
      { cohort_month: '2024-04', cohort_size: 180, cumulative_revenue: 82800, clr: 460, ltv_12mo: 450, ltv_24mo: 740, ltv_36mo: 920 },
      { cohort_month: '2024-05', cohort_size: 220, cumulative_revenue: 105600, clr: 480, ltv_12mo: 465, ltv_24mo: 760, ltv_36mo: 950 },
    ]);
    setLoading(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <LineChart className="w-10 h-10 mr-3" />
                CLR & LTV Cohorts
              </h1>
              <p className="text-purple-100 text-lg">Cumulative revenue per customer and lifetime value by cohort</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Avg CLR</p>
              <p className="text-3xl font-bold text-purple-900">
                {formatCurrency(ltvData.reduce((sum, c) => sum + c.clr, 0) / ltvData.length)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Avg LTV (12mo)</p>
              <p className="text-3xl font-bold text-blue-900">
                {formatCurrency(ltvData.reduce((sum, c) => sum + c.ltv_12mo, 0) / ltvData.length)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-600 text-sm font-medium">Avg LTV (24mo)</p>
              <p className="text-3xl font-bold text-indigo-900">
                {formatCurrency(ltvData.reduce((sum, c) => sum + c.ltv_24mo, 0) / ltvData.length)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-600 text-sm font-medium">Total Cohorts</p>
              <p className="text-3xl font-bold text-pink-900">{ltvData.length}</p>
            </div>
            <Users className="w-8 h-8 text-pink-600" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">LTV Cohort Comparison</h2>
            <div className="flex items-center space-x-4">
              <LoadingButton
                isLoading={false}
                onClick={() => console.log('Export')}
                loadingText="Exporting..."
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Export Data
              </LoadingButton>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cohort
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cumulative Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CLR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LTV (12mo)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LTV (24mo)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LTV (36mo)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ltvData.map((item, index) => (
                <tr key={item.cohort_month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.cohort_month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.cohort_size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.cumulative_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-900">
                    {formatCurrency(item.clr)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.ltv_12mo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.ltv_24mo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.ltv_36mo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

