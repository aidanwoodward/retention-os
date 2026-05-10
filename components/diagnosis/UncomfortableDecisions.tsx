"use client";

import React from "react";
import { AlertTriangle, ArrowRight, TrendingDown, Users, Tag, Target } from "lucide-react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UncomfortableDecision } from "@/lib/diagnosis/decisions";

interface UncomfortableDecisionsProps {
  decisions: UncomfortableDecision[];
  title?: string;
  framingCopy?: string;
}

const categoryIcons = {
  acquisition: Users,
  onboarding: Target,
  promotional: Tag,
  'customer-focus': TrendingDown,
};

const categoryLabels = {
  acquisition: 'Acquisition',
  onboarding: 'Onboarding',
  promotional: 'Promotions',
  'customer-focus': 'Customer Focus',
};

const urgencyColors = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-orange-200 bg-orange-50',
  low: 'border-yellow-200 bg-yellow-50',
};

const impactColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-yellow-100 text-yellow-700',
};

export function UncomfortableDecisions({ 
  decisions, 
  title = "Uncomfortable Decisions",
  framingCopy = "Here are the uncomfortable decisions you now have to make:"
}: UncomfortableDecisionsProps) {
  if (!decisions || decisions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-6 border-2 border-gray-300 shadow-[0_4px_12px_rgba(0,0,0,0.1)] mb-8">
      <div className="flex items-start gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-1">{framingCopy}</p>
          <p className="text-xs text-gray-500 italic">
            Each decision requires tradeoffs and may be uncomfortable, but they&apos;re necessary for sustainable growth.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
            <p className="text-xs">
              Decisions synthesized from findings across all pages. Prioritized by urgency and impact.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="space-y-4 mt-6">
        {decisions.map((decision) => {
          const CategoryIcon = categoryIcons[decision.category];
          
          return (
            <div 
              key={decision.id}
              className={`rounded-lg p-5 border-2 ${urgencyColors[decision.urgency]} transition-shadow hover:shadow-md`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                    <CategoryIcon className="w-4 h-4 text-gray-700" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="text-base font-bold text-gray-900">
                      {decision.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${impactColors[decision.impact]}`}>
                      {decision.impact.toUpperCase()} IMPACT
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${urgencyColors[decision.urgency].replace('bg-', 'bg-').replace('border-', 'border-')} border text-gray-700`}>
                      {decision.urgency.toUpperCase()} URGENCY
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                      {categoryLabels[decision.category]}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {decision.description}
                  </p>
                  
                  {decision.evidence.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">Evidence:</p>
                      <ul className="space-y-1">
                        {decision.evidence.map((evidence, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span>{evidence}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Tradeoffs:</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {decision.tradeoffs}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 italic text-center">
          These decisions are based on deterministic analysis of your cohort data. They may be uncomfortable, but addressing them is necessary for sustainable, durable growth.
        </p>
      </div>
    </div>
  );
}
