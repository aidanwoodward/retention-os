"use client";

import React, { useState, useRef } from "react";

interface EnhancedTrendChartProps {
  currentData: number[];
  previousData: number[];
  currentColor?: string;
  previousColor?: string;
  height?: number;
  xAxisLabels?: { start: string; end: string };
  formatValue?: (value: number) => string;
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
  cohortType?: 'monthly' | 'quarterly' | 'half-year' | 'annual';
  periodLabels?: string[]; // Optional: actual period labels matching data points
}

export function EnhancedTrendChart({
  currentData,
  previousData,
  currentColor = "#3b82f6",
  previousColor = "#9ca3af",
  height = 120,
  xAxisLabels,
  formatValue = (v) => `$${v.toLocaleString()}`,
  currentPeriodLabel = "This period",
  previousPeriodLabel = "Previous period",
  cohortType = 'monthly',
  periodLabels,
}: EnhancedTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxValue = Math.max(
    ...currentData,
    ...previousData,
    1
  );

  const normalize = (value: number) => (value / maxValue) * height;

  const points = currentData.map((value, index) => ({
    x: (index / (currentData.length - 1 || 1)) * 100,
    y: height - normalize(value),
    value,
  }));

  const previousPoints = previousData.map((value, index) => ({
    x: (index / (previousData.length - 1 || 1)) * 100,
    y: height - normalize(value),
    value,
  }));

  // Create area paths
  const currentAreaPath = points.length > 0
    ? `M 0 ${height} L ${points.map(p => `${p.x} ${p.y}`).join(" L ")} L 100 ${height} Z`
    : "";

  const previousAreaPath = previousPoints.length > 0
    ? `M 0 ${height} L ${previousPoints.map(p => `${p.x} ${p.y}`).join(" L ")} L 100 ${height} Z`
    : "";

  // Create line paths
  const currentPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const previousPath = previousPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentX = (x / rect.width) * 100;

    // Find the closest data point
    let closestIndex = 0;
    let minDistance = Infinity;

    points.forEach((point, index) => {
      const distance = Math.abs(point.x - percentX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setHoverIndex(closestIndex);
    // Position tooltip relative to container
    setTooltipPosition({ 
      x: e.clientX - containerRect.left, 
      y: e.clientY - containerRect.top 
    });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setTooltipPosition(null);
  };

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverPreviousPoint = hoverIndex !== null && previousPoints[hoverIndex] ? previousPoints[hoverIndex] : null;

  // Calculate period label based on hover index
  // If periodLabels array is provided, use it directly (most accurate)
  // Otherwise, interpolate from start/end labels
  const getPeriodLabel = (index: number): string => {
    if (currentData.length === 0) return '';
    
    // Use actual period labels if provided (matches data points exactly)
    if (periodLabels && periodLabels.length > 0 && index >= 0 && index < periodLabels.length) {
      return periodLabels[index];
    }
    
    // Fallback to interpolation if no period labels provided
    if (!xAxisLabels) return '';
    
    const totalPoints = currentData.length;
    const progress = index / (totalPoints - 1 || 1);
    
    if (cohortType === 'annual') {
      const startYear = parseInt(xAxisLabels.start) || new Date().getFullYear() - 1;
      const endYear = parseInt(xAxisLabels.end) || new Date().getFullYear();
      const yearRange = endYear - startYear;
      const currentYear = Math.round(startYear + progress * yearRange);
      return `${currentYear}`;
    } else if (cohortType === 'quarterly') {
      // Parse quarter format like "Q1 24"
      const startMatch = xAxisLabels.start.match(/Q(\d+)\s+(\d+)/);
      const endMatch = xAxisLabels.end.match(/Q(\d+)\s+(\d+)/);
      if (startMatch && endMatch) {
        const startQ = parseInt(startMatch[1]);
        const startYear = parseInt('20' + startMatch[2]);
        const endQ = parseInt(endMatch[1]);
        const endYear = parseInt('20' + endMatch[2]);
        
        const totalQuarters = (endYear - startYear) * 4 + (endQ - startQ) + 1;
        const quarterIndex = Math.round(progress * (totalQuarters - 1));
        const quartersFromStart = startQ - 1 + quarterIndex;
        const currentQuarter = (quartersFromStart % 4) + 1;
        const currentYear = startYear + Math.floor(quartersFromStart / 4);
        return `Q${currentQuarter} ${String(currentYear).substring(2)}`;
      }
      return xAxisLabels.start;
    } else if (cohortType === 'half-year') {
      // Parse half-year format like "2024 H1"
      const startMatch = xAxisLabels.start.match(/(\d+)\s+(H[12])/);
      const endMatch = xAxisLabels.end.match(/(\d+)\s+(H[12])/);
      if (startMatch && endMatch) {
        const startYear = parseInt(startMatch[1]);
        const startHalf = startMatch[2];
        const endYear = parseInt(endMatch[1]);
        const endHalf = endMatch[2];
        
        const totalHalfYears = (endYear - startYear) * 2 + (endHalf === 'H2' ? 2 : 1) - (startHalf === 'H1' ? 0 : 1);
        const halfYearIndex = Math.round(progress * (totalHalfYears - 1));
        const halfYearsFromStart = (startHalf === 'H1' ? 0 : 1) + halfYearIndex;
        const currentHalf = (halfYearsFromStart % 2 === 0) ? 'H1' : 'H2';
        const currentYear = startYear + Math.floor(halfYearsFromStart / 2);
        return `${currentYear} ${currentHalf}`;
      }
      return xAxisLabels.start;
    } else {
      // Monthly - parse format like "Jan 24"
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startMatch = xAxisLabels.start.match(/(\w+)\s+(\d+)/);
      const endMatch = xAxisLabels.end.match(/(\w+)\s+(\d+)/);
      if (startMatch && endMatch) {
        const startMonthIndex = monthNames.indexOf(startMatch[1]);
        const startYear = parseInt('20' + startMatch[2]);
        const endMonthIndex = monthNames.indexOf(endMatch[1]);
        const endYear = parseInt('20' + endMatch[2]);
        
        const totalMonths = (endYear - startYear) * 12 + (endMonthIndex - startMonthIndex) + 1;
        const monthIndex = Math.round(progress * (totalMonths - 1));
        const currentMonth = (startMonthIndex + monthIndex) % 12;
        const currentYear = startYear + Math.floor((startMonthIndex + monthIndex) / 12);
        return `${monthNames[currentMonth]} ${String(currentYear).substring(2)}`;
      }
      return xAxisLabels.start;
    }
  };

  const hoverPeriodLabel = hoverIndex !== null ? getPeriodLabel(hoverIndex) : '';

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Main chart SVG */}
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="overflow-visible cursor-crosshair"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Previous period area */}
        {previousAreaPath && (
          <path
            d={previousAreaPath}
            fill={previousColor}
            opacity={0.2}
          />
        )}
        {/* Current period area */}
        {currentAreaPath && (
          <path
            d={currentAreaPath}
            fill={currentColor}
            opacity={0.2}
          />
        )}
        {/* Previous period line */}
        {previousPath && (
          <path
            d={previousPath}
            fill="none"
            stroke={previousColor}
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="miter"
            opacity={0.6}
          />
        )}
        {/* Current period line - straight lines with sharp corners */}
        {currentPath && (
          <path
            d={currentPath}
            fill="none"
            stroke={currentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="miter"
          />
        )}
        {/* Hover indicator line */}
        {hoverIndex !== null && hoverPoint && (
          <line
            x1={hoverPoint.x}
            y1="0"
            x2={hoverPoint.x}
            y2={height}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity={0.5}
          />
        )}
      </svg>
      
      {/* Circles rendered as HTML divs to maintain perfect circular shape */}
      {hoverIndex !== null && hoverPoint && svgRef.current && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${(hoverPoint.x / 100) * svgRef.current.clientWidth}px`,
            top: `${(hoverPoint.y / height) * svgRef.current.clientHeight}px`,
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: currentColor,
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
          }}
        />
      )}
      {hoverIndex !== null && hoverPreviousPoint && svgRef.current && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${(hoverPreviousPoint.x / 100) * svgRef.current.clientWidth}px`,
            top: `${(hoverPreviousPoint.y / height) * svgRef.current.clientHeight}px`,
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: previousColor,
            border: '1.5px solid white',
            boxShadow: '0 0 0 0.5px rgba(0,0,0,0.1)',
          }}
        />
      )}

      {/* X-axis labels */}
      {xAxisLabels && (
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{xAxisLabels.start}</span>
          <span>{xAxisLabels.end}</span>
        </div>
      )}

      {/* Tooltip */}
      {tooltipPosition && hoverIndex !== null && hoverPoint && (
        <div
          className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 pointer-events-none"
          style={{
            left: `${Math.min(Math.max(tooltipPosition.x, 70), (containerRef.current?.offsetWidth || 300) - 150)}px`,
            top: `${tooltipPosition.y - 120}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {hoverPeriodLabel && (
            <div className="text-xs text-gray-600 mb-2">{hoverPeriodLabel}</div>
          )}
          <div className="border-t border-gray-200 pt-2 mt-2">
            {hoverPoint && (
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentColor }}></div>
                  <span className="text-xs text-gray-600">This year</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatValue(hoverPoint.value)}</span>
              </div>
            )}
            {hoverPreviousPoint && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: previousColor }}></div>
                  <span className="text-xs text-gray-500">Last year</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatValue(hoverPreviousPoint.value)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

