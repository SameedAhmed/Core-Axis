"use client";

import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  colorClass?: string; // stroke color as a Tailwind-compatible CSS color, e.g. "#f59e0b"
}

/**
 * Tiny dependency-free SVG sparkline for inline trend visualization
 * (e.g. per-product weekly demand history in a card grid).
 */
export function Sparkline({ data, width = 100, height = 32, colorClass = "#8b5cf6" }: SparklineProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={areaPoints} fill={colorClass} fillOpacity={0.08} stroke="none" />
      <polyline points={points.join(" ")} fill="none" stroke={colorClass} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) * stepX}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
          r={2.5}
          fill={colorClass}
        />
      )}
    </svg>
  );
}
