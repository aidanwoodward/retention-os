"use client";

import { AlertTriangle } from "lucide-react";

interface DemoBannerProps {
  reason: string;
  className?: string;
}

/**
 * Reusable demo data banner component
 * Shows a consistent amber warning banner when demo data is displayed
 */
export function DemoBanner({ reason, className = "" }: DemoBannerProps) {
  return (
    <div className={`mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900 mb-1">Demo data — {reason}</p>
        <p className="text-xs text-amber-700">
          No real data is available. This page is showing demo data for development purposes only. 
          All metrics are simulated and should not be used for decision-making.
        </p>
      </div>
    </div>
  );
}

