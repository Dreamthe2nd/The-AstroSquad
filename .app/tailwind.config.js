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
        lavender: {
          DEFAULT: '#c084fc',
          400: '#c084fc',
          500: '#a855f7',
        },
        // Backwards compatibility mappings for legacy classes
        cosmic: {
          950: '#07080b',
          900: '#0d0f15',
          850: '#12151e',
          800: '#1a1e2b',
          700: '#262c3e',
        },
        blueshift: {
          DEFAULT: '#38bdf8',
          glow: '#7dd3fc',
          dim: '#0c2438',
          dark: '#0369a1'
        },
        redshift: {
          DEFAULT: '#ef4444',
          glow: '#f87171',
          dim: '#450a0a',
          dark: '#b91c1c'
        }
      },
      boxShadow: {
        'ambient': '0 0 25px -5px rgba(255, 255, 255, 0.04), 0 0 10px -2px rgba(255, 255, 255, 0.02)',
        'crimson': '0 0 20px -3px rgba(239, 68, 68, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'doppler-blue': '0 0 20px -5px rgba(56, 189, 248, 0.25)',
        'doppler-red': '0 0 20px -5px rgba(239, 68, 68, 0.25)',
        'doppler-glow': '0 0 25px -5px rgba(255, 255, 255, 0.06)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
