"use client";

import { LineChart } from "lucide-react";

export default function ForecastsScenariosPage() {
  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Placeholder */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
        <LineChart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Forecast Engine Coming Soon</h3>
        <p className="text-gray-600 mb-6">Projection and scenario modeling features will be available in a future release.</p>
        <div className="bg-indigo-50 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-sm text-indigo-900 font-medium mb-2">Expected Features:</p>
          <ul className="text-sm text-indigo-700 text-left space-y-1">
            <li>• LTV +10% YoY projections</li>
            <li>• Scenario modeling</li>
            <li>• Probability-weighted forecasts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

