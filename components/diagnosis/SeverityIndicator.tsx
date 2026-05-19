"use client";

import React from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | null;

export interface SeverityInfo {
  level: SeverityLevel;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

interface SeverityIndicatorProps {
  severity: SeverityInfo | null;
  title?: string;
}

const severityConfig: Record<NonNullable<SeverityLevel>, SeverityInfo> = {
  critical: {
    level: 'critical',
    label: 'Critical',
    description: 'Immediate action required - significant impact on business outcomes',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
  },
  high: {
    level: 'high',
    label: 'High',
    description: 'Significant concern - requires attention and decision-making',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: <AlertCircle className="w-4 h-4 text-orange-600" />,
  },
  medium: {
    level: 'medium',
    label: 'Medium',
    description: 'Moderate concern - worth monitoring and understanding',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: <Info className="w-4 h-4 text-yellow-600" />,
  },
  low: {
    level: 'low',
    label: 'Low',
    description: 'Minor concern - monitor for trends',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Info className="w-4 h-4 text-blue-600" />,
  },
};

export function SeverityIndicator({ severity, title = "Severity" }: SeverityIndicatorProps) {
  if (!severity || !severity.level) {
    return null;
  }

  const config = severityConfig[severity.level];

  return (
    <div className={`rounded-lg p-4 border ${config.bgColor} mb-6`}>
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-shrink-0 mt-0.5">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-semibold ${config.color}`}>
              {title}: {severity.label}
            </h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-0 max-w-[300px]">
                <p className="text-xs">
                  {severity.description}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${config.color} leading-relaxed`}>
            {severity.description}
          </p>
        </div>
      </div>
    </div>
  );
}
