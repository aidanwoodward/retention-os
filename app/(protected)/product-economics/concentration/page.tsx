"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Download, AlertTriangle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface ConcentrationData {
  product_id: string;
  product_name: string;
  revenue: number;
  cumulative_revenue: number;
  cumulative_percentage: number;
  rank: number;
}

export default function ConcentrationCurvePage() {
  const [data, setData] = useState<ConcentrationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock Pareto data
    const mockData = [
      { product_id: '1', product_name: 'Product A', revenue: 25000, cumulative_revenue: 25000, cumulative_percentage: 20, rank: 1 },
      { product_id: '2', product_name: 'Product B', revenue: 20000, cumulative_revenue: 45000, cumulative_percentage: 36, rank: 2 },
      { product_id: '3', product_name: 'Product C', revenue: 18000, cumulative_revenue: 63000, cumulative_percentage: 50, rank: 3 },
      { product_id: '4', product_name: 'Product D', revenue: 15000, cumulative_revenue: 78000, cumulative_percentage: 62, rank: 4 },
      { product_id: '5', product_name: 'Product E', revenue: 12000, cumulative_revenue: 90000, cumulative_percentage: 72, rank: 5 },
      { product_id: '6', product_name: 'Product F', revenue: 10000, cumulative_revenue: 100000, cumulative_percentage: 80, rank: 6 },
      { product_id: '7', product_name: 'Product G', revenue: 8000, cumulative_revenue: 108000, cumulative_percentage: 86, rank: 7 },
      { product_id: '8', product_name: 'Product H', revenue: 6000, cumulative_revenue: 114000, cumulative_percentage: 91, rank: 8 },
      { product_id: '9', product_name: 'Product I', revenue: 4500, cumulative_revenue: 118500, cumulative_percentage: 95, rank: 9 },
      { product_id: '10', product_name: 'Product J', revenue: 3000, cumulative_revenue: 121500, cumulative_percentage: 97, rank: 10 },
    ];
    setData(mockData);
    setLoading(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return <div className="w-full px-4 py-8"><div className="animate-pulse h-96 bg-gray-200 rounded"></div></div>;
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-2xl p-8 text-white">
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <TrendingUp className="w-10 h-10 mr-3" />
            Concentration Curve
          </h1>
          <p className="text-orange-100 text-lg">Pareto chart: Cumulative revenue share of top SKUs</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-8 border border-blue-200">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-blue-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-blue-900">80/20 Rule: {data[0]?.cumulative_percentage}% of revenue from top {data.filter(d => d.rank <= 3).length} products</p>
            <p className="text-xs text-blue-700 mt-1">Concentration risk: High</p>
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Pareto Chart</h2>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-orange-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.product_id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                  <span className="text-sm text-gray-600">{formatCurrency(item.revenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                  <div className="bg-orange-600 h-8 rounded-full flex items-center justify-end pr-2" style={{ width: `${item.cumulative_percentage}%` }}>
                    <span className="text-white text-xs font-medium">{item.cumulative_percentage.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Concentration Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cumulative %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={item.product_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rank}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.cumulative_percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

