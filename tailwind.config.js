/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // Brand-neutral finance palette (NOT BPI/GCash brand colors)
        ink: {
          DEFAULT: '#0f172a',
          soft: '#334155',
          faint: '#64748b',
        },
        bpi: '#b3261e', // subtle red account accent
        gcash: '#1f6feb', // subtle blue account accent
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
}
