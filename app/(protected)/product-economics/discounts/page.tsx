"use client";

import { useState, useEffect } from "react";
import { Download, BarChart } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface DiscountData {
  code: string;
  usage_count: number;
  discount_amount: number;
  total_orders: number;
  avg_discount: number;
}

export default function DiscountUsagePage() {
  const [data, setData] = useState<DiscountData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock discount data
    setData([
      { code: 'WELCOME10', usage_count: 450, discount_amount: 4500, total_orders: 500, avg_discount: 10 },
      { code: 'SAVE20', usage_count: 320, discount_amount: 6400, total_orders: 400, avg_discount: 20 },
      { code: 'HOLIDAY15', usage_count: 280, discount_amount: 4200, total_orders: 350, avg_discount: 15 },
      { code: 'FREESHIP', usage_count: 550, discount_amount: 2750, total_orders: 550, avg_discount: 5 },
      { code: 'BULK30', usage_count: 120, discount_amount: 3600, total_orders: 150, avg_discount: 30 },
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
      {/* Visualization */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart className="w-6 h-6 mr-2 text-yellow-600" />
              Discount Code Performance
            </h2>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {data.map((item) => {
              const maxUsage = Math.max(...data.map(d => d.usage_count));
              const percentage = (item.usage_count / maxUsage) * 100;
              return (
                <div key={item.code}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{item.code}</span>
                    <span className="text-sm text-gray-600">{item.usage_count} uses</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8">
                    <div className="bg-yellow-600 h-8 rounded-full flex items-center justify-end pr-2" style={{ width: `${percentage}%` }}>
                      <span className="text-white text-xs font-medium">{item.usage_count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Discount Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Discount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={item.code} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.usage_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.discount_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.avg_discount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

