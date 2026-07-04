import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        bg: {
          base: '#080b12',
          surface: '#0d1117',
          elevated: '#131929',
        },
        accent: {
          cyan: '#06b6d4',
          amber: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'grid-flow': 'gridFlow 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        gridFlow: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '40px 40px' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
