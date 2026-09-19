/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"JetBrainsMono Nerd Font"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        mono: ['"JetBrainsMono Nerd Font"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        cosmic: {
          950: '#030712',
          900: '#0b0f19',
          850: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        blueshift: {
          DEFAULT: '#06b6d4',
          glow: '#22d3ee',
          dim: '#083344',
          dark: '#0e7490'
        },
        redshift: {
          DEFAULT: '#f43f5e',
          glow: '#fb7185',
          dim: '#4c0519',
          dark: '#be123c'
        }
      },
      boxShadow: {
        'doppler-blue': '0 0 25px -5px rgba(6, 182, 212, 0.5), 0 0 10px -2px rgba(34, 211, 238, 0.4)',
        'doppler-red': '0 0 25px -5px rgba(244, 63, 94, 0.5), 0 0 10px -2px rgba(251, 113, 133, 0.4)',
        'doppler-glow': '0 0 35px -5px rgba(6, 182, 212, 0.3), 0 0 20px -2px rgba(244, 63, 94, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(6, 182, 212, 0.8), 0 0 15px rgba(244, 63, 94, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
