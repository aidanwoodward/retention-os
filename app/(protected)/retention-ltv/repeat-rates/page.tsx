"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, TrendingUp, Users, Download, BarChart3, AlertTriangle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface RepeatRateData {
  purchase_number: number;
  customer_count: number;
  conversion_rate: number;
  drop_off: number;
}

export default function RepeatPurchaseRatesPage() {
  const [repeatData, setRepeatData] = useState<RepeatRateData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock data
    setRepeatData([
      { purchase_number: 1, customer_count: 1000, conversion_rate: 100, drop_off: 0 },
      { purchase_number: 2, customer_count: 450, conversion_rate: 45, drop_off: 55 },
      { purchase_number: 3, customer_count: 250, conversion_rate: 25, drop_off: 20 },
      { purchase_number: 4, customer_count: 150, conversion_rate: 15, drop_off: 10 },
      { purchase_number: 5, customer_count: 100, conversion_rate: 10, drop_off: 5 },
    ]);
    setLoading(false);
  }, []);

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

  const getBarWidth = (percentage: number) => {
    return `${percentage}%`;
  };

  const getBarColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">1st → 2nd Purchase</p>
              <p className="text-3xl font-bold text-green-900">
                {repeatData.find(d => d.purchase_number === 2)?.conversion_rate}%
              </p>
              <p className="text-sm text-green-700 mt-1">
                {repeatData.find(d => d.purchase_number === 2)?.customer_count} customers
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">2nd → 3rd Purchase</p>
              <p className="text-3xl font-bold text-blue-900">
                {repeatData.find(d => d.purchase_number === 3)?.conversion_rate}%
              </p>
              <p className="text-sm text-blue-700 mt-1">
                {repeatData.find(d => d.purchase_number === 3)?.customer_count} customers
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">3rd → 4th Purchase</p>
              <p className="text-3xl font-bold text-purple-900">
                {repeatData.find(d => d.purchase_number === 4)?.conversion_rate}%
              </p>
              <p className="text-sm text-purple-700 mt-1">
                {repeatData.find(d => d.purchase_number === 4)?.customer_count} customers
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Purchase Funnel Visualization</h2>
            <LoadingButton
              isLoading={false}
              onClick={() => console.log('Export')}
              loadingText="Exporting..."
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2 inline" />
              Export Data
            </LoadingButton>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {repeatData.map((item, index) => (
              <div key={item.purchase_number} className="flex items-center">
                <div className="w-32 text-sm font-medium text-gray-700">
                  {item.purchase_number === 1 ? 'Starting' : `${item.purchase_number - 1}st → ${item.purchase_number}nd`}
                </div>
                <div className="flex-1 mx-4">
                  <div className="relative w-full bg-gray-200 rounded-full h-12 overflow-hidden">
                    <div 
                      className={`${getBarColor(index)} h-full flex items-center justify-end pr-4 transition-all duration-500`}
                      style={{ width: getBarWidth(item.conversion_rate) }}
                    >
                      <span className="text-white font-bold text-sm">{item.conversion_rate}%</span>
                    </div>
                  </div>
                </div>
                <div className="w-32 text-sm text-gray-600 text-right">
                  {item.customer_count.toLocaleString()} customers
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Repeat Purchase Summary</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drop-off
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {repeatData.map((item, index) => (
                <tr key={item.purchase_number} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.purchase_number === 1 ? 'Initial' : `${item.purchase_number}nd Purchase`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.customer_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {item.conversion_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.purchase_number !== 1 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        -{item.drop_off}%
                      </span>
                    )}
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

