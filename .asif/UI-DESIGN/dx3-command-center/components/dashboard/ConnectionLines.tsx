'use client';

import { motion } from 'framer-motion';

interface ConnectionLinesProps {
  className?: string;
}

export function ConnectionLines({ className = '' }: ConnectionLinesProps) {
  // Define connection points (relative to the SVG viewBox)
  const centerX = 500;
  const centerY = 250;

  const leftConnections = [
    { startX: 240, startY: 100, label: 'intent' },
    { startX: 240, startY: 250, label: 'artifacts-left' },
    { startX: 240, startY: 400, label: 'entities' },
  ];

  const rightConnections = [
    { startX: 760, startY: 100, label: 'timeline' },
    { startX: 760, startY: 250, label: 'artifacts-right' },
    { startX: 760, startY: 400, label: 'provenance' },
  ];

  const generatePath = (startX: number, startY: number, endX: number, endY: number) => {
    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  };

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Cyan gradient for left connections */}
        <linearGradient id="lineGradientCyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00ffff" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#00ffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#00ffff" stopOpacity="0.1" />
        </linearGradient>

        {/* Gold gradient for gold connections */}
        <linearGradient id="lineGradientGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff8c00" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#ff8c00" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff8c00" stopOpacity="0.1" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Left connections */}
      {leftConnections.map((conn, index) => (
        <g key={conn.label}>
          <motion.path
            d={generatePath(conn.startX, conn.startY, centerX - 80, centerY)}
            stroke="url(#lineGradientGold)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="8 4"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
            style={{ animation: 'dash 2s linear infinite' }}
          />
          {/* Connection dot at card side */}
          <motion.circle
            cx={conn.startX}
            cy={conn.startY}
            r="4"
            fill="#ff8c00"
            filter="url(#glow)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1 }}
          />
        </g>
      ))}

      {/* Right connections */}
      {rightConnections.map((conn, index) => (
        <g key={conn.label}>
          <motion.path
            d={generatePath(centerX + 80, centerY, conn.startX, conn.startY)}
            stroke={index === 2 ? 'url(#lineGradientGold)' : 'url(#lineGradientCyan)'}
            strokeWidth="2"
            fill="none"
            strokeDasharray="8 4"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
            style={{ animation: 'dash 2s linear infinite reverse' }}
          />
          {/* Connection dot at card side */}
          <motion.circle
            cx={conn.startX}
            cy={conn.startY}
            r="4"
            fill={index === 2 ? '#ff8c00' : '#00ffff'}
            filter="url(#glow)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1 }}
          />
        </g>
      ))}

      {/* Center connection ring */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r="60"
        fill="none"
        stroke="url(#lineGradientCyan)"
        strokeWidth="1"
        strokeDasharray="4 4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.5 }}
        transition={{ delay: 1, duration: 0.5 }}
      />
    </svg>
  );
}
