/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"JetBrainsMono Nerd Font"', 'ui-monospace', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#07080b',
          900: '#0d0f15',
          850: '#12151e',
          800: '#1a1e2b',
          700: '#262c3e',
          600: '#38415a',
        },
        nothing: {
          DEFAULT: '#ef4444',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        sapphire: {
          DEFAULT: '#38bdf8',
          400: '#7dd3fc',
          500: '#38bdf8',
          600: '#0284c7',
        },
      },
      boxShadow: {
        'ambient': '0 0 25px -5px rgba(255, 255, 255, 0.03)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'card-hover': '0 4px 16px 0 rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'spin-slow': 'spin 30s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
