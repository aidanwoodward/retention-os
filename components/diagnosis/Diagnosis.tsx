"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Diagnosis Component
 * 
 * Displays a single consulting-grade action title that synthesizes
 * the top deterministic findings from visible metrics.
 * 
 * Rules:
 * - Single sentence, 30-50 words
 * - Follows Situation → Impact → Structural implication flow
 * - Uses assertive, active language (not prescriptive)
 * - References concrete cohorts, periods, and evidence locations
 * - No prescriptive language, forecasts, or evaluative wording
 * - Suppressed if confidence is insufficient
 */
interface DiagnosisProps {
  sentence: string | null;
  title?: string;
}

interface DiagnosisProps {
  sentence: string | null;
  title?: string;
  showEmptyState?: boolean; // Show subtle placeholder when suppressed
}

export function Diagnosis({ sentence, title = "Diagnosis", showEmptyState = false }: DiagnosisProps) {
  // If no sentence and empty state not requested, don't render anything
  if (!sentence || sentence.trim().length === 0) {
    if (!showEmptyState) {
      return null;
    }
    
    // Show subtle empty state placeholder
    return (
      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0 mt-0.5" />
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
              <p className="text-xs">
                Deterministic analysis synthesizing top findings from visible metrics. Updates with filter changes, stable across view toggles.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <p className="text-sm text-gray-500 italic">
          Not shown for current filters due to insufficient comparable cohorts
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
      <div className="flex items-start gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
            <p className="text-xs">
              Deterministic analysis synthesizing top findings from visible metrics. Updates with filter changes, stable across view toggles.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <p className="text-base text-gray-900 leading-relaxed font-medium">
        {sentence}
      </p>
    </div>
  );
}

