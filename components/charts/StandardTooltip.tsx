"use client";

import React from "react";

export interface TooltipRow {
  label: string;
  value: string;
  meta?: string;
  colorDot?: string; // Hex color for optional color dot indicator
}

interface StandardTooltipProps {
  title: string;
  rows: TooltipRow[];
  footerRows?: TooltipRow[];
  showTotal?: boolean;
  totalValue?: string;
  maxWidth?: string;
}

/**
 * StandardTooltip - Reusable chart tooltip component
 * 
 * Standardizes tooltip styling across charts to match Revenue Cohorts tooltip.
 * Provides clean, readable layout with proper spacing and hierarchy.
 */
export function StandardTooltip({
  title,
  rows,
  footerRows,
  showTotal = false,
  totalValue,
  maxWidth = "260px",
}: StandardTooltipProps) {
  if (rows.length === 0) return null;

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-3"
      style={{ maxWidth }}
    >
      {/* Title */}
      <p className="text-sm font-medium text-gray-900 mb-2">{title}</p>
      
      {/* Rows */}
      <div className="space-y-1.5">
        {rows.map((row, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between gap-3 leading-5"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {row.colorDot && (
                <div 
                  className="w-3 h-3 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: row.colorDot }}
                />
              )}
              <span className="text-sm text-gray-600 truncate">
                {row.label}
              </span>
            </div>
            <div className="text-right ml-4 whitespace-nowrap">
              <span className="text-sm font-medium text-gray-900 tabular-nums">
                {row.value}
              </span>
              {row.meta && (
                <span className="text-xs text-gray-500 ml-1">
                  {row.meta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer rows (if provided) */}
      {footerRows && footerRows.length > 0 && (
        <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-200">
          {footerRows.map((row, index) => (
            <div 
              key={`footer-${index}`} 
              className="flex items-center justify-between gap-3 leading-5"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {row.colorDot && (
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: row.colorDot }}
                  />
                )}
                <span className="text-sm text-gray-600 truncate">
                  {row.label}
                </span>
              </div>
              <div className="text-right ml-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900 tabular-nums">
                  {row.value}
                </span>
                {row.meta && (
                  <span className="text-xs text-gray-500 ml-1">
                    {row.meta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total row (if enabled) */}
      {showTotal && totalValue && (
        <div className="border-t border-gray-200 pt-1.5 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {totalValue}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

