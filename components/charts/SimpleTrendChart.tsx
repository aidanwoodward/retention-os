"use client";

import React from "react";

interface SimpleTrendChartProps {
  currentData: number[];
  previousData: number[];
  currentColor?: string;
  previousColor?: string;
  height?: number;
}

export function SimpleTrendChart({
  currentData,
  previousData,
  currentColor = "#3b82f6",
  previousColor = "#9ca3af",
  height = 40,
}: SimpleTrendChartProps) {
  const maxValue = Math.max(
    ...currentData,
    ...previousData,
    1 // Ensure we don't divide by zero
  );

  const normalize = (value: number) => (value / maxValue) * height;

  const points = currentData.map((value, index) => ({
    x: (index / (currentData.length - 1 || 1)) * 100,
    y: height - normalize(value),
  }));

  const previousPoints = previousData.map((value, index) => ({
    x: (index / (previousData.length - 1 || 1)) * 100,
    y: height - normalize(value),
  }));

  const currentPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const previousPath = previousPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <svg
        width="100%"
        height={height}
        className="overflow-visible"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        {/* Previous period line */}
        <path
          d={previousPath}
          fill="none"
          stroke={previousColor}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity={0.6}
        />
        {/* Current period line */}
        <path
          d={currentPath}
          fill="none"
          stroke={currentColor}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

