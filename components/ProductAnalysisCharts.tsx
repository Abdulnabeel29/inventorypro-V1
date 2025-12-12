
import React from 'react';

// Simple SVG Sparkline
export const Sparkline: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({ 
  data, 
  color = "#0ea5e9", 
  width = 100, 
  height = 30 
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-slate-50 rounded flex items-center justify-center text-[10px] text-slate-400">No Data</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * height; // Invert Y for SVG
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Fill Area */}
      <path 
        d={`M 0 ${height} L ${points} L ${width} ${height} Z`} 
        fill={`url(#grad-${color})`} 
        stroke="none" 
      />
      {/* Line */}
      <polyline 
        points={points} 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};

// Simple Donut/Pie Chart
export const MiniDonut: React.FC<{ 
  segments: { value: number; color: string }[]; 
  size?: number; 
  thickness?: number 
}> = ({ segments, size = 60, thickness = 8 }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let startAngle = 0;
  const radius = size / 2;
  const innerRadius = radius - thickness;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <svg width={size} height={size} viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
      {total === 0 ? (
        <circle cx="0" cy="0" r="0.8" fill="none" stroke="#e2e8f0" strokeWidth={0.25} />
      ) : (
        segments.map((segment, i) => {
          const percent = segment.value / total;
          const [startX, startY] = getCoordinatesForPercent(startAngle);
          startAngle += percent;
          const [endX, endY] = getCoordinatesForPercent(startAngle);
          const largeArcFlag = percent > 0.5 ? 1 : 0;

          // If it's a full circle
          if (percent === 1) {
            return (
              <circle key={i} cx="0" cy="0" r="0.8" fill="none" stroke={segment.color} strokeWidth="0.25" />
            );
          }

          const pathData = [
            `M ${startX * 0.8} ${startY * 0.8}`, // Move to outer start
            `A 0.8 0.8 0 0 1 ${endX * 0.8} ${endY * 0.8}`, // Arc to outer end
          ].join(' ');

          return (
            <path key={i} d={pathData} fill="none" stroke={segment.color} strokeWidth="0.25" />
          );
        })
      )}
    </svg>
  );
};
