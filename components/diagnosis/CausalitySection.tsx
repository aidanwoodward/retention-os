"use client";

import React from "react";
import { Info, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CausalityFactor {
  factor: string;
  explanation: string;
  evidence?: string;
}

interface CausalitySectionProps {
  factors: CausalityFactor[];
  title?: string;
  framingCopy?: string;
}

export function CausalitySection({ 
  factors, 
  title = "Why This Is Happening",
  framingCopy = "Based on the patterns observed, these are the likely structural drivers:"
}: CausalitySectionProps) {
  if (!factors || factors.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
      <div className="flex items-start gap-2 mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
            <p className="text-xs">
              Structural drivers that explain why these patterns occur. These are deterministic relationships, not forecasts.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">{framingCopy}</p>
      
      <div className="space-y-4">
        {factors.map((factor, index) => (
          <div key={index} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {factor.factor}
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                  {factor.explanation}
                </p>
                {factor.evidence && (
                  <p className="text-xs text-gray-500 italic">
                    Evidence: {factor.evidence}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
