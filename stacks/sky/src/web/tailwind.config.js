/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Use .dark class on <html>
  theme: {
    extend: {
      colors: {
        sky: {
          bg: 'var(--sky-bg)',
          surface: 'var(--sky-surface)',
          card: 'var(--sky-card)',
          text: 'var(--sky-text)',
          muted: 'var(--sky-muted)',
          border: 'var(--sky-border)',
          hover: 'var(--sky-hover)',
          divider: 'var(--sky-divider)',
          accent: 'var(--sky-accent)',
        },
      },
    },
  },
  plugins: [],
};
