/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        'sf-bg': {
          900: '#0d1117',  // Main background
          800: '#161b22',  // Panel background
          700: '#21262d',  // Elevated surfaces
          600: '#30363d',  // Borders, dividers
        },
        'sf-text': {
          100: '#f0f6fc',  // Primary text
          200: '#c9d1d9',  // Secondary text
          300: '#8b949e',  // Muted text
          400: '#6e7681',  // Disabled text
        },
        'sf-accent': {
          500: '#58a6ff',  // Primary accent (links, buttons)
          600: '#1f6feb',  // Hover state
          700: '#388bfd',  // Active state
        },
        'sf-success': '#3fb950',
        'sf-warning': '#d29922',
        'sf-error': '#f85149',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
