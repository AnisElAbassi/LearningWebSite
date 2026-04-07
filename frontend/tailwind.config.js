/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // PixelGate dark backgrounds
        'pg-black': '#0a0a0f',
        'pg-dark': '#13131a',
        'pg-dark2': '#1c1c26',
        'pg-card': '#1c1c26',
        'pg-border': '#252532',
        // PixelGate brand accents
        'pg-purple': '#a855f7',
        'pg-yellow': '#fbbf24',
        // Utility colors
        'neon-green': '#22c55e',
        'neon-red': '#ef4444',
        'neon-orange': '#f59e0b',
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 15px rgba(168, 85, 247, 0.3), 0 0 30px rgba(168, 85, 247, 0.1)',
        'glow-yellow': '0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'pg-gradient': 'linear-gradient(135deg, #a855f7, #fbbf24)',
        'pg-gradient-r': 'linear-gradient(135deg, #fbbf24, #a855f7)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
