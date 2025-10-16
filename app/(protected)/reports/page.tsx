"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FilterDemo } from "@/components/ui/filter-demo";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
} from "lucide-react";

interface WeeklySummary {
  period: string;
  key_metrics: {
    revenue: number;
    revenue_change: number;
    retention_rate: number;
    retention_change: number;
    new_customers: number;
    new_customers_change: number;
    repeat_rate: number;
    repeat_rate_change: number;
  };
  insights: string[];
  recommendations: string[];
  generated_at: string;
}

interface ExecutiveReport {
  id: string;
  title: string;
  period: string;
  status: 'draft' | 'ready' | 'generated';
  created_at: string;
  sections: string[];
}

interface ReportsResponse {
  success: boolean;
  data: {
    weekly_summary: WeeklySummary;
    executive_reports: ExecutiveReport[];
    total_reports: number;
    latest_generated: string;
  };
  error?: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'executive'>('weekly');
  const [reports, setReports] = useState<ReportsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/summary');
      const data = await response.json();

      if (data.success) {
        setReports(data.data);
      } else {
        setError(data.error || 'Failed to fetch reports data');
      }
    } catch (err) {
      setError('Failed to fetch reports data');
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (type: 'weekly' | 'executive') => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      
      if (response.ok) {
        await fetchReports(); // Refresh data
      }
    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/download/${reportId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `retention-report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-50';
      case 'generated': return 'text-blue-600 bg-blue-50';
      case 'draft': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'generated': return <Download className="w-4 h-4" />;
      case 'draft': return <Clock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Reports</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchReports}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">No Reports Available</h3>
              <p className="text-yellow-600">Please sync your Shopify data to generate reports.</p>
              <Link
                href="/sync"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Go to Sync
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">AI-generated insights and executive reports for retention analysis</p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Reports</h3>
            <span className="text-sm text-gray-500">Filter by date range, report type, and status</span>
          </div>
          <FilterDemo />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-semibold text-gray-900">{reports.total_reports}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Latest Generated</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Date(reports.latest_generated).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Insights</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.weekly_summary.insights.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recommendations</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.weekly_summary.recommendations.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'weekly', name: 'Weekly Summary', icon: FileText },
              { id: 'executive', name: 'Executive Reports', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'weekly' | 'executive')}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {/* Weekly Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Weekly Summary</h3>
                  <p className="text-sm text-gray-600">AI-generated insights for {reports.weekly_summary.period}</p>
                </div>
                <button
                  onClick={() => generateReport('weekly')}
                  disabled={generating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {generating ? 'Generating...' : 'Regenerate'}
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">${reports.weekly_summary.key_metrics.revenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Revenue</div>
                  <div className={`text-sm ${reports.weekly_summary.key_metrics.revenue_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reports.weekly_summary.key_metrics.revenue_change >= 0 ? '+' : ''}{reports.weekly_summary.key_metrics.revenue_change.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{reports.weekly_summary.key_metrics.retention_rate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Retention Rate</div>
                  <div className={`text-sm ${reports.weekly_summary.key_metrics.retention_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reports.weekly_summary.key_metrics.retention_change >= 0 ? '+' : ''}{reports.weekly_summary.key_metrics.retention_change.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{reports.weekly_summary.key_metrics.new_customers.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">New Customers</div>
                  <div className={`text-sm ${reports.weekly_summary.key_metrics.new_customers_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reports.weekly_summary.key_metrics.new_customers_change >= 0 ? '+' : ''}{reports.weekly_summary.key_metrics.new_customers_change.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{reports.weekly_summary.key_metrics.repeat_rate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Repeat Rate</div>
                  <div className={`text-sm ${reports.weekly_summary.key_metrics.repeat_rate_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reports.weekly_summary.key_metrics.repeat_rate_change >= 0 ? '+' : ''}{reports.weekly_summary.key_metrics.repeat_rate_change.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h4>
                  <div className="space-y-3">
                    {reports.weekly_summary.insights.map((insight, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <p className="text-sm text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h4>
                  <div className="space-y-3">
                    {reports.weekly_summary.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-green-600">{index + 1}</span>
                        </div>
                        <p className="text-sm text-gray-700">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'executive' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Executive Reports</h3>
                <p className="text-sm text-gray-600">Downloadable reports for leadership meetings</p>
              </div>
              <button
                onClick={() => generateReport('executive')}
                disabled={generating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {generating ? 'Generating...' : 'Create New Report'}
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.executive_reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{report.title}</div>
                          <div className="text-sm text-gray-500">{report.sections.length} sections</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1">{report.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {report.status === 'generated' && (
                        <button
                          onClick={() => downloadReport(report.id)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      )}
                      {report.status === 'ready' && (
                        <span className="text-gray-500">Ready for download</span>
                      )}
                      {report.status === 'draft' && (
                        <span className="text-yellow-600">In progress...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Last updated: {new Date(reports.weekly_summary.generated_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
