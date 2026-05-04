"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DecisionAxis {
  name: string;
  influences: string; // What it typically influences (1 sentence)
  directionalEffect: string; // Typical directional effect (1 sentence)
  tradeoffs: string; // Tradeoffs / where it often fails (1 sentence)
}

interface DecisionAxesProps {
  axes: DecisionAxis[];
  framingCopy?: string;
}

/**
 * DecisionAxes Component
 * 
 * Displays static explanatory decision axes that frame tradeoffs without
 * prescribing actions or providing execution tooling.
 * 
 * Rules:
 * - Max 2-3 axes per diagnosis
 * - Representative, not exhaustive
 * - No prescriptive language
 * - No execution tooling (buttons, toggles, etc.)
 */
export function DecisionAxes({ 
  axes, 
  framingCopy = "Among the most commonly observed high-leverage levers for patterns like this:" 
}: DecisionAxesProps) {
  // Limit to max 3 axes
  const displayAxes = axes.slice(0, 3);
  
  // Don't render if no axes
  if (displayAxes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-8">
      <div className="flex items-start gap-2 mb-4">
        <h3 className="text-base font-semibold text-gray-900">Relevant Decision Axes</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
            <p className="text-xs">
              Representative decision surfaces that frame tradeoffs. These are not exhaustive and do not prescribe specific actions.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">{framingCopy}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayAxes.map((axis, index) => (
          <div 
            key={index}
            className="bg-gray-50 rounded-lg p-4 border border-gray-100"
          >
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              {axis.name}
            </h4>
            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <span className="font-medium text-gray-800">Influences:</span>{" "}
                <span className="text-gray-600">{axis.influences}</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">Typical effect:</span>{" "}
                <span className="text-gray-600">{axis.directionalEffect}</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">Tradeoffs:</span>{" "}
                <span className="text-gray-600">{axis.tradeoffs}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
