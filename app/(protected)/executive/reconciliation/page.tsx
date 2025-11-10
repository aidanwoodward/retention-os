"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Download, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface ReconciliationData {
  metric: string;
  shopify_total: number;
  internal_total: number;
  variance: number;
  variance_percent: number;
  status: 'match' | 'warning' | 'error';
}

export default function DataReconciliationPage() {
  const [data, setData] = useState<ReconciliationData[]>([]);

  useEffect(() => {
    // Mock data for MVP
    setData([
      {
        metric: 'Total Revenue',
        shopify_total: 125000,
        internal_total: 124500,
        variance: 500,
        variance_percent: 0.4,
        status: 'match'
      },
      {
        metric: 'Total Orders',
        shopify_total: 1250,
        internal_total: 1248,
        variance: 2,
        variance_percent: 0.16,
        status: 'match'
      },
      {
        metric: 'Total Customers',
        shopify_total: 850,
        internal_total: 840,
        variance: 10,
        variance_percent: 1.18,
        status: 'warning'
      },
      {
        metric: 'Refunds',
        shopify_total: 5000,
        internal_total: 4500,
        variance: 500,
        variance_percent: 10,
        status: 'error'
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'match': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'match': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return AlertTriangle;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Reconciliation Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Reconciliation Results</h2>
            <LoadingButton
              isLoading={false}
              onClick={() => console.log('Export')}
              loadingText="Exporting..."
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2 inline" />
              Export CSV
            </LoadingButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shopify Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Internal Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => {
                const StatusIcon = getStatusIcon(item.status);
                return (
                  <tr key={item.metric} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.metric}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.shopify_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.internal_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.variance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center ${
                        item.variance_percent > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.variance_percent > 0 ? (
                          <TrendingUp className="w-4 h-4 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 mr-1" />
                        )}
                        {Math.abs(item.variance_percent).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Status Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-blue-700">Match - Variance &lt;1%</span>
          </div>
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-blue-700">Warning - Variance 1-5%</span>
          </div>
          <div className="flex items-center">
            <XCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-blue-700">Error - Variance &gt;5%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

