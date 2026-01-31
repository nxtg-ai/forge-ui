/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand Colors (Purple/Blue gradient)
        brand: {
          primary: '#8b5cf6',    // Purple-500
          secondary: '#3b82f6',  // Blue-500
          accent: '#ec4899',     // Pink-500
        },
        // Semantic Colors
        semantic: {
          success: '#10b981',    // Green-500
          warning: '#f59e0b',    // Amber-500
          error: '#ef4444',      // Red-500
          info: '#3b82f6',       // Blue-500
        },
        // Surface Colors (Dark theme)
        surface: {
          background: '#09090b',           // Gray-950
          card: 'rgba(17, 24, 39, 0.5)',   // Gray-900/50
          border: '#27272a',                // Gray-800
          1: '#09090b',                     // Gray-950
          2: 'rgba(17, 24, 39, 0.5)',      // Gray-900/50
          3: 'rgba(31, 41, 55, 0.5)',      // Gray-800/50
          4: 'rgba(55, 65, 81, 0.5)',      // Gray-700/50
        },
        // Legacy NXTG colors (for backward compatibility)
        nxtg: {
          purple: {
            500: '#a855f7',
            600: '#9333ea',
          },
          blue: {
            500: '#3b82f6',
            600: '#2563eb',
          },
        },
      },
      // Typography Scale with Line Heights
      fontSize: {
        // Headings
        'heading-1': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],      // 48px
        'heading-2': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],  // 30px
        'heading-3': ['1.25rem', { lineHeight: '1.4', fontWeight: '500' }],   // 20px
        // Body
        'body-large': ['1.125rem', { lineHeight: '1.6' }],  // 18px
        'body-base': ['1rem', { lineHeight: '1.6' }],       // 16px
        'body-small': ['0.875rem', { lineHeight: '1.5' }],  // 14px
        'caption': ['0.75rem', { lineHeight: '1.4' }],      // 12px
      },
      // Spacing System (4px Grid)
      spacing: {
        'xs': '0.5rem',   // 8px
        'sm': '0.75rem',  // 12px
        'md': '1rem',     // 16px
        'lg': '1.5rem',   // 24px
        'xl': '2rem',     // 32px
        '2xl': '3rem',    // 48px
        // Existing spacing
        '100': '25rem',
        '120': '30rem',
        '140': '35rem',
      },
      // Elevation/Shadow System
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'elevation-2': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'elevation-3': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'elevation-4': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'elevation-5': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-brand': '0 0 20px rgba(139, 92, 246, 0.5)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      maxHeight: {
        '100': '25rem',
        '120': '30rem',
        '140': '35rem',
      },
      width: {
        '1/10': '10%',
        '2/10': '20%',
        '3/10': '30%',
        '4/10': '40%',
        '5/10': '50%',
        '6/10': '60%',
        '7/10': '70%',
        '8/10': '80%',
        '9/10': '90%',
      },
      // Animation System
      animation: {
        // Spring animations for natural feel
        'spring-in': 'springIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-bounce': 'springBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'smooth 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        // Existing animations
        'fade-up': 'fadeUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 30s linear infinite',
        // New animations
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        springIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        springBounce: {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        smooth: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // Transition Timing Functions
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      inset: {
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      translate: {
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      // Border Radius System
      borderRadius: {
        'sm': '0.25rem',   // 4px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
      },
      // Backdrop Blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
    },
  },
  plugins: [],
};
