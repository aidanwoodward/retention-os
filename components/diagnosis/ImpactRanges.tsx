"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ImpactRange {
  label: string;
  low: number;
  base: number;
  high: number;
  unit: 'currency' | 'percentage' | 'count';
  description?: string;
}

interface ImpactRangesProps {
  ranges: ImpactRange[];
}

/**
 * Impact Ranges Component
 * 
 * Displays counterfactual impact ranges based on historical cohort comparisons.
 * Shows economic stakes using loss avoided or durability delta framing.
 * 
 * Rules:
 * - Shows Low / Base / High confidence bounds
 * - Derived from historical cohort comparisons at matched lifecycle periods
 * - No forecasts, predictions, or execution guidance
 * - Suppresses if no clean comparator exists
 */
export function ImpactRanges({ ranges }: ImpactRangesProps) {
  if (!ranges || ranges.length === 0) {
    return null;
  }

  const formatValue = (value: number, unit: ImpactRange['unit']): string => {
    switch (unit) {
      case 'currency':
        return value.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD', 
          maximumFractionDigits: 0 
        });
      case 'percentage':
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
      case 'count':
        return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
      default:
        return value.toFixed(1);
    }
  };

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
      <div className="flex items-start gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900">Impact Ranges (Counterfactual)</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
            <p className="text-xs">
              Counterfactual analysis based on historical cohort comparisons at matched lifecycle periods. Ranges reflect historical variation, not a forecast.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Estimated using historical differences between comparable cohorts at equivalent lifecycle stages
      </p>

      <div className="space-y-4">
        {ranges.map((range, index) => (
          <div key={index} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">{range.label}</span>
            </div>
            {range.description && (
              <p className="text-xs text-gray-500 mb-3">{range.description}</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Low Bound</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatValue(range.low, range.unit)}
                </div>
              </div>
              <div className="bg-blue-50 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Base Bound</div>
                <div className="text-sm font-semibold text-blue-900">
                  {formatValue(range.base, range.unit)}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">High Bound</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatValue(range.high, range.unit)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 italic">
        Bounds reflect historical variation, not a forecast.
      </p>
    </div>
  );
}
