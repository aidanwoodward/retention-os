"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Download, ArrowRight } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface RevenueMetrics {
  gross_revenue: number;
  net_revenue: number;
  refunds: number;
  refund_rate: number;
  discounts: number;
  discount_rate: number;
  taxes: number;
}

export default function RevenueIntelligencePage() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setMetrics({
      gross_revenue: 150000,
      net_revenue: 135000,
      refunds: 5000,
      refund_rate: 3.3,
      discounts: 10000,
      discount_rate: 6.7,
      taxes: 0,
    });
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
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-8 text-white">
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <DollarSign className="w-10 h-10 mr-3" />
            Revenue Intelligence
          </h1>
          <p className="text-green-100 text-lg">Gross revenue, net revenue, refunds, and discount analysis</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-green-600 text-sm font-medium">Gross Revenue</p>
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{formatCurrency(metrics.gross_revenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-600 text-sm font-medium">Net Revenue</p>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{formatCurrency(metrics.net_revenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-red-600 text-sm font-medium">Refund Rate</p>
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{metrics.refund_rate.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-yellow-600 text-sm font-medium">Discount Rate</p>
            <Tag className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-900">{metrics.discount_rate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Revenue Bridge */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Revenue Bridge</h2>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-green-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <span className="text-sm font-medium text-green-900">Gross Revenue</span>
              <span className="text-lg font-bold text-green-900">{formatCurrency(metrics.gross_revenue)}</span>
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <span className="text-sm font-medium text-red-900">- Refunds</span>
              <span className="text-lg font-bold text-red-900">-{formatCurrency(metrics.refunds)}</span>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <span className="text-sm font-medium text-yellow-900">- Discounts</span>
              <span className="text-lg font-bold text-yellow-900">-{formatCurrency(metrics.discounts)}</span>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">Net Revenue</span>
              <span className="text-2xl font-bold text-blue-900">{formatCurrency(metrics.net_revenue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
}

