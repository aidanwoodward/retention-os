"use client";

import { useState } from "react";
import { Download, FileText, Database, Calendar, Download as DownloadIcon } from "lucide-react";

interface ExportOption {
  id: string;
  title: string;
  description: string;
  formats: string[];
  lastExported?: string;
}

export default function ExportsPage() {
  const [exports, setExports] = useState<ExportOption[]>([
    {
      id: 'executive_summary',
      title: 'Executive Summary',
      description: 'High-level KPIs and business health metrics',
      formats: ['PDF', 'CSV', 'PPTX'],
      lastExported: '2025-10-29'
    },
    {
      id: 'cohort_data',
      title: 'Cohort Analysis Data',
      description: 'Revenue and retention cohort data',
      formats: ['CSV', 'XLSX'],
      lastExported: '2025-10-30'
    },
    {
      id: 'customer_list',
      title: 'Customer List',
      description: 'Complete customer database with segments',
      formats: ['CSV', 'XLSX'],
      lastExported: '2025-10-28'
    },
    {
      id: 'product_performance',
      title: 'Product Performance',
      description: 'SKU-level performance metrics',
      formats: ['CSV', 'XLSX'],
      lastExported: '2025-10-30'
    },
    {
      id: 'financial_report',
      title: 'Financial Report',
      description: 'Revenue intelligence and LTV summary',
      formats: ['PDF', 'CSV'],
      lastExported: '2025-10-29'
    },
    {
      id: 'retention_analysis',
      title: 'Retention Analysis',
      description: 'Retention curves and churn analysis',
      formats: ['CSV', 'PPTX'],
      lastExported: '2025-10-27'
    }
  ]);

  const handleExport = (exportId: string, format: string) => {
    console.log(`Exporting ${exportId} as ${format}`);
    // TODO: Implement actual export functionality
  };

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <DownloadIcon className="w-10 h-10 mr-3" />
                Exports
              </h1>
              <p className="text-indigo-100 text-lg">Export your analytics data in multiple formats</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exports.map((exportOption) => (
          <div key={exportOption.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <FileText className="w-8 h-8 text-indigo-600" />
              <span className="text-xs text-gray-500">
                Last: {exportOption.lastExported}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {exportOption.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {exportOption.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {exportOption.formats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(exportOption.id, format)}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {format}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Export History */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Recent Exports</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {exports.slice(0, 3).map((exportOption) => (
              <div key={exportOption.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Database className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">{exportOption.title}</div>
                    <div className="text-sm text-gray-600">Exported on {exportOption.lastExported}</div>
                  </div>
                </div>
                <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                  Re-download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

