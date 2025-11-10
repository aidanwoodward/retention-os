"use client";

import { useState, useEffect } from "react";
import { Crown, AlertTriangle, Download, TrendingDown } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface SegmentData {
  customer_id: string;
  email: string;
  total_spent: number;
  order_count: number;
  last_order_date: string;
  ltv: number;
  segment: string;
}

export default function CustomerSegmentsPage() {
  const [vips, setVips] = useState<SegmentData[]>([]);
  const [atRisk, setAtRisk] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock VIP data
    setVips([
      { customer_id: '1', email: 'customer1@example.com', total_spent: 1500, order_count: 12, last_order_date: '2025-10-28', ltv: 1500, segment: 'VIP' },
      { customer_id: '2', email: 'customer2@example.com', total_spent: 1200, order_count: 10, last_order_date: '2025-10-25', ltv: 1300, segment: 'VIP' },
      { customer_id: '3', email: 'customer3@example.com', total_spent: 1100, order_count: 9, last_order_date: '2025-10-22', ltv: 1200, segment: 'VIP' },
    ]);

    // Mock At-Risk data
    setAtRisk([
      { customer_id: '4', email: 'customer4@example.com', total_spent: 250, order_count: 3, last_order_date: '2025-08-15', ltv: 250, segment: 'At-Risk' },
      { customer_id: '5', email: 'customer5@example.com', total_spent: 180, order_count: 2, last_order_date: '2025-07-20', ltv: 180, segment: 'At-Risk' },
    ]);

    setLoading(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return <div className="w-full px-4 py-8"><div className="animate-pulse h-96 bg-gray-200 rounded"></div></div>;
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* VIP Customers */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Crown className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">VIP Customers (Top 10%)</h2>
                <p className="text-sm text-gray-600">Highest value customers based on LTV</p>
              </div>
            </div>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LTV</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vips.map((customer, index) => (
                <tr key={customer.customer_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.order_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-900">{formatCurrency(customer.ltv)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.last_order_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At-Risk Customers */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">At-Risk Customers (Bottom 10%)</h2>
                <p className="text-sm text-gray-600">Customers showing signs of churn</p>
              </div>
            </div>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-red-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LTV</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {atRisk.map((customer, index) => (
                <tr key={customer.customer_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.order_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(customer.ltv)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center">
                    {customer.last_order_date} 
                    <TrendingDown className="w-4 h-4 text-red-600 ml-2" />
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

