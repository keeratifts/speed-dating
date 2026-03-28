/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        void: '#080810',
        ink: '#0d0d1a',
        surface: '#12121f',
        card: '#17172b',
        border: '#252540',
        muted: '#3a3a60',
        dim: '#6b6b99',
        soft: '#9898bb',
        text: '#e8e8f4',
        bright: '#ffffff',
        rose: '#ff4d8d',
        'rose-dim': '#cc2d6a',
        'rose-glow': '#ff4d8d33',
        teal: '#00e5cc',
        'teal-dim': '#00b3a0',
        'teal-glow': '#00e5cc22',
        amber: '#ffb347',
        purple: '#a855f7',
        'purple-glow': '#a855f733',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px var(--tw-shadow-color)' },
          '50%': { boxShadow: '0 0 40px var(--tw-shadow-color)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
