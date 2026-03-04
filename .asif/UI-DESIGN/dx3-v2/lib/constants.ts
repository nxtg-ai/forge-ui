// Design Tokens - Dx3 Command Center v2
// Based on pixel-perfect spec

export const colors = {
  // Primary Cyan Spectrum
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',  // PRIMARY
    600: '#0891b2',
    700: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.6)',
    glowSoft: 'rgba(6, 182, 212, 0.2)',
  },

  // Amber/Orange Spectrum
  amber: {
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    orange: '#f97316',  // PRIMARY ACCENT
    glow: 'rgba(249, 115, 22, 0.5)',
  },

  // Background Layers (darkest to lightest)
  bg: {
    base: '#050810',      // Deepest background
    primary: '#0a0f1a',   // Main background
    secondary: '#0f172a', // Elevated surfaces
    tertiary: '#1e293b',  // Cards/panels
    card: 'rgba(15, 23, 42, 0.6)',  // Glassmorphism base
    cardHover: 'rgba(30, 41, 59, 0.7)',
  },

  // Borders
  border: {
    default: 'rgba(51, 65, 85, 0.5)',
    subtle: 'rgba(71, 85, 105, 0.3)',
    glow: 'rgba(6, 182, 212, 0.4)',
    glowAmber: 'rgba(249, 115, 22, 0.3)',
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#cbd5e1',   // slate-300
    muted: '#94a3b8',       // slate-400
    subtle: '#64748b',      // slate-500
  }
} as const;

export const typography = {
  fontFamily: {
    display: '"Inter", "SF Pro Display", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  fontSize: {
    xs: '0.625rem',    // 10px - descriptions
    sm: '0.75rem',     // 12px - labels
    base: '0.875rem',  // 14px - body
    lg: '1rem',        // 16px - subheadings
    xl: '1.25rem',     // 20px - headings
    '2xl': '1.5rem',   // 24px - section titles
    '3xl': '1.875rem', // 30px - main title
    '4xl': '2rem',     // 32px - orchestrator title
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  }
} as const;

export const spacing = {
  sidebarWidth: '200px',
  topNavHeight: '64px',
  cardPadding: '16px',
  cardGap: '12px',
  sectionGap: '24px',
} as const;

export const effects = {
  glassmorphism: {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    borderRadius: '12px',
  },

  glowCyan: {
    boxShadow: '0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)',
  },

  glowAmber: {
    boxShadow: '0 0 15px rgba(249, 115, 22, 0.3)',
  },

  cardShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
} as const;

// Torus Kernel Configuration
export const torusConfig = {
  radius: 1.5,           // Main radius
  tube: 0.5,             // Tube thickness
  radialSegments: 64,    // Smoothness around tube
  tubularSegments: 128,  // Smoothness around torus

  // Inner spiral
  spiralTurns: 3,
  spiralRadius: 0.8,

  // Particle field
  particleCount: 200,
  particleSpread: 3,
} as const;
