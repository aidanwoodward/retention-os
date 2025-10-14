"use client";

import { useState } from "react";
import Link from "next/link";

interface SyncResult {
  customers: {
    ingested: number;
    updated: number;
    skipped: number;
    shopifyCount: number;
    localCount: number;
  };
  orders: {
    ingested: number;
    updated: number;
    skipped: number;
    shopifyCount: number;
    localCount: number;
  };
  sync_id: string;
}

export default function SyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/sync/shopify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Sync failed');
        console.error('Sync API error:', data);
      } else if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Sync</h1>
            <p className="text-gray-600">
              Sync your Shopify data to Retention OS analytics database
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Sync Card */}
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Shopify Sync</h2>
            <button
              onClick={handleSync}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Syncing...
                </div>
              ) : (
                'Start Sync'
              )}
            </button>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>• Syncs customers and orders from your Shopify store</p>
            <p>• Uses incremental updates (only changed data)</p>
            <p>• Protects customer privacy with email hashing</p>
            <p>• Tracks sync health and reconciliation</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Sync Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <p className="text-xs text-red-600 mt-2">
                  Check the browser console for more details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="space-y-6">
            <div className="rounded-xl bg-green-50 border border-green-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-green-400 text-xl">✅</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Sync Completed Successfully</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Sync ID: {result.sync_id}
                  </p>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Customers Results */}
              <div className="rounded-xl bg-white p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customers</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shopify Count:</span>
                    <span className="font-medium">{result.customers.shopifyCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Local Count:</span>
                    <span className="font-medium">{result.customers.localCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ingested:</span>
                    <span className="font-medium text-green-600">{result.customers.ingested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium text-blue-600">{result.customers.updated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Skipped:</span>
                    <span className="font-medium text-gray-600">{result.customers.skipped}</span>
                  </div>
                </div>
              </div>

              {/* Orders Results */}
              <div className="rounded-xl bg-white p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shopify Count:</span>
                    <span className="font-medium">{result.orders.shopifyCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Local Count:</span>
                    <span className="font-medium">{result.orders.localCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ingested:</span>
                    <span className="font-medium text-green-600">{result.orders.ingested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium text-blue-600">{result.orders.updated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Skipped:</span>
                    <span className="font-medium text-gray-600">{result.orders.skipped}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Next Steps</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Your data is now available for analytics</p>
                <p>• Visit the dashboard to see retention metrics</p>
                <p>• Set up automated syncs for regular updates</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
