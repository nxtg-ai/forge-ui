'use client';

// SVG connection lines for node cards to central kernel
export function ConnectionLines() {
  // Positions will be calculated dynamically based on card positions
  // For now, using estimated positions for 3 left cards, 3 right cards, center kernel

  const leftConnections = [
    { startY: 100, color: 'cyan' },
    { startY: 250, color: 'cyan' },
    { startY: 400, color: 'cyan' },
  ];

  const rightConnections = [
    { startY: 100, color: 'amber' },
    { startY: 250, color: 'cyan' },
    { startY: 400, color: 'amber' },
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid meet"
      style={{ zIndex: 1 }}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="cyanLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(6, 182, 212, 0.1)" />
          <stop offset="50%" stopColor="rgba(6, 182, 212, 0.4)" />
          <stop offset="100%" stopColor="rgba(6, 182, 212, 0.1)" />
        </linearGradient>
        <linearGradient id="amberLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(249, 115, 22, 0.1)" />
          <stop offset="50%" stopColor="rgba(249, 115, 22, 0.4)" />
          <stop offset="100%" stopColor="rgba(249, 115, 22, 0.1)" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="connectionGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Left connections (input - cyan) */}
      {leftConnections.map((conn, i) => (
        <g key={`left-${i}`}>
          <path
            d={`M 240 ${conn.startY} Q 450 ${conn.startY} 550 300`}
            className="connection-line input"
            stroke="url(#cyanLineGrad)"
            filter="url(#connectionGlow)"
          />
          <circle
            cx={240}
            cy={conn.startY}
            r={4}
            className="connection-dot cyan"
          />
        </g>
      ))}

      {/* Right connections (output - mixed) */}
      {rightConnections.map((conn, i) => (
        <g key={`right-${i}`}>
          <path
            d={`M 650 300 Q 750 ${conn.startY} 960 ${conn.startY}`}
            className="connection-line output"
            stroke={conn.color === 'amber' ? 'url(#amberLineGrad)' : 'url(#cyanLineGrad)'}
            filter="url(#connectionGlow)"
          />
          <circle
            cx={960}
            cy={conn.startY}
            r={4}
            className={`connection-dot ${conn.color}`}
          />
        </g>
      ))}
    </svg>
  );
}
