/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme]'],
  theme: {
    extend: {
      colors: {
        theme: {
          primary: 'var(--theme-primary)',
          'primary-hover': 'var(--theme-primary-hover)',
          glow: 'var(--theme-glow)',
        },
        surface: {
          main: 'var(--bg-main)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          base: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
        },
        profit: {
          DEFAULT: 'var(--profit-green)',
          glow: 'var(--profit-green-glow)',
          light: 'var(--profit-green-light)',
        },
        loss: {
          DEFAULT: 'var(--loss-red)',
          glow: 'var(--loss-red-glow)',
          light: 'var(--loss-red-light)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
