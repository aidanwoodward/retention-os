"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Download } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface LTVSummaryData {
  cohort: string;
  ltv_12mo: number;
  ltv_24mo: number;
  ltv_36mo: number;
}

export default function LTVSummaryPage() {
  const [data, setData] = useState<LTVSummaryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock LTV data
    setData([
      { cohort: '2024-01', ltv_12mo: 420, ltv_24mo: 680, ltv_36mo: 850 },
      { cohort: '2024-02', ltv_12mo: 430, ltv_24mo: 700, ltv_36mo: 880 },
      { cohort: '2024-03', ltv_12mo: 445, ltv_24mo: 720, ltv_36mo: 900 },
      { cohort: '2024-04', ltv_12mo: 450, ltv_24mo: 740, ltv_36mo: 920 },
      { cohort: '2024-05', ltv_12mo: 465, ltv_24mo: 760, ltv_36mo: 950 },
    ]);
    setLoading(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return <div className="w-full px-4 py-8"><div className="animate-pulse h-96 bg-gray-200 rounded"></div></div>;
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* LTV Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">LTV Trend by Time Horizon</h2>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-purple-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LTV (12mo)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LTV (24mo)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LTV (36mo)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={item.cohort} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.cohort}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.ltv_12mo)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.ltv_24mo)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-900">{formatCurrency(item.ltv_36mo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

