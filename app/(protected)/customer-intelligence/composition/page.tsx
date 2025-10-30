"use client";

import { useState, useEffect } from "react";
import { Users, Globe, TrendingUp, Download, PieChart, BarChart, MapPin } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-buttons";

interface CompositionData {
  segment: string;
  count: number;
  percentage: number;
  ltv_avg: number;
}

interface GeoData {
  country: string;
  revenue: number;
  customers: number;
}

interface ChannelData {
  channel: string;
  ltv_avg: number;
  customers: number;
}

export default function CustomerCompositionPage() {
  const [lifecycleData, setLifecycleData] = useState<CompositionData[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock lifecycle data
    setLifecycleData([
      { segment: 'New', count: 250, percentage: 25, ltv_avg: 125 },
      { segment: 'Active', count: 400, percentage: 40, ltv_avg: 350 },
      { segment: 'Churned', count: 350, percentage: 35, ltv_avg: 180 },
    ]);

    // Mock geo data
    setGeoData([
      { country: 'United States', revenue: 75000, customers: 450 },
      { country: 'United Kingdom', revenue: 35000, customers: 280 },
      { country: 'Canada', revenue: 15000, customers: 120 },
    ]);

    // Mock channel data
    setChannelData([
      { channel: 'Direct', ltv_avg: 450, customers: 250 },
      { channel: 'Organic Search', ltv_avg: 380, customers: 200 },
      { channel: 'Social Media', ltv_avg: 320, customers: 180 },
      { channel: 'Email Marketing', ltv_avg: 420, customers: 170 },
      { channel: 'Paid Ads', ltv_avg: 290, customers: 200 },
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
    return <div className="w-full px-4 py-8"><div className="animate-pulse h-96 bg-gray-200 rounded"></div></div>;
  }

  const getColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white">
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Users className="w-10 h-10 mr-3" />
            Customer Composition
          </h1>
          <p className="text-emerald-100 text-lg">Lifecycle stages, geography, and acquisition channel mix</p>
        </div>
      </div>

      {/* Lifecycle Pie Chart */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <PieChart className="w-6 h-6 mr-2 text-emerald-600" />
              Lifecycle Stage Distribution
            </h2>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lifecycleData.map((item, index) => (
              <div key={item.segment} className="text-center">
                <div className={`${getColor(index)} w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center`}>
                  <span className="text-white text-3xl font-bold">{item.percentage}%</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.segment}</h3>
                <p className="text-sm text-gray-600">{item.count} customers</p>
                <p className="text-sm font-medium text-emerald-600">{formatCurrency(item.ltv_avg)} avg LTV</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geographic Revenue */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Globe className="w-6 h-6 mr-2 text-teal-600" />
              Revenue by Geography
            </h2>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-teal-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {geoData.map((item) => {
              const totalRevenue = geoData.reduce((sum, d) => sum + d.revenue, 0);
              const percentage = (item.revenue / totalRevenue) * 100;
              return (
                <div key={item.country}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">{item.country}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(item.revenue)}</span>
                      <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div className="bg-teal-600 h-6 rounded-full flex items-center justify-end pr-2" style={{ width: `${percentage}%` }}>
                      <span className="text-white text-xs font-medium">{item.customers} customers</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Channel Performance */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart className="w-6 h-6 mr-2 text-cyan-600" />
              LTV by Acquisition Channel
            </h2>
            <LoadingButton isLoading={false} onClick={() => {}} className="px-4 py-2 bg-cyan-600 text-white rounded-lg">
              <Download className="w-4 h-4 mr-2 inline" /> Export
            </LoadingButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg LTV</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {channelData.map((item, index) => (
                <tr key={item.channel} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.channel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.ltv_avg)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.customers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

