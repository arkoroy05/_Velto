/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#1a1f3a',
        card: '#2d3561',
        accent: {
          DEFAULT: '#6366f1',
          bright: '#8b5cf6',
        },
        gray: {
          50: '#f8fafc',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#0f1419',
        },
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        info: '#3b82f6',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'monospace',
        ],
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.3)',
      },
      transitionTimingFunction: {
        smooth: 'ease-in-out',
      },
      transitionDuration: {
        150: '150ms',
      },
      width: {
        popup: '380px',
      },
      height: {
        popup: '600px',
      },
    },
  },
  plugins: [],
}
