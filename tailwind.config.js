/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // NXTG Brand Colors - Purple to Blue Gradient Scale
        nxtg: {
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7', // Primary purple
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764',
          },
          blue: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6', // Primary blue
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554',
          },
          gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
            950: '#030712',
          },
          success: {
            light: '#10b981',
            DEFAULT: '#059669',
            dark: '#047857',
          },
          warning: {
            light: '#f59e0b',
            DEFAULT: '#d97706',
            dark: '#b45309',
          },
          error: {
            light: '#ef4444',
            DEFAULT: '#dc2626',
            dark: '#b91c1c',
          },
          info: {
            light: '#3b82f6',
            DEFAULT: '#2563eb',
            dark: '#1d4ed8',
          }
        },
        // Surface colors for layering
        surface: {
          0: '#030712', // Background
          1: '#111827', // Cards, panels
          2: '#1f2937', // Elevated surfaces
          3: '#374151', // Active/hover states
          4: '#4b5563', // Borders
        }
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xs': ['0.5rem', { lineHeight: '0.75rem' }]
      },
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      animation: {
        // Spring animations
        'spring-in': 'spring-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-out': 'spring-out 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-bounce': 'spring-bounce 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        // Fade animations
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-down': 'fade-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        // Slide animations
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-up': 'slide-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-down': 'slide-in-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        // Special effects
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        'spring-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'spring-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
        'spring-bounce': {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
          '75%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        skeleton: {
          '0%': { backgroundColor: 'rgba(156, 163, 175, 0.1)' },
          '50%': { backgroundColor: 'rgba(156, 163, 175, 0.3)' },
          '100%': { backgroundColor: 'rgba(156, 163, 175, 0.1)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        ping: {
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-shine': 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)'
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'elevation-4': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'elevation-5': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'glow-purple': '0 0 30px rgba(168, 85, 247, 0.3)',
        'glow-blue': '0 0 30px rgba(59, 130, 246, 0.3)'
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      scale: {
        '98': '0.98',
        '102': '1.02'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ]
}