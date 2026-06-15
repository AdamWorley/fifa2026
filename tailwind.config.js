/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Netwealth brand palette (extracted from netwealth.com/css/main.css)
        navy: {
          DEFAULT: '#112e51',
          light: '#1c4474',
          dark: '#0b1f38',
        },
        brand: {
          cyan: '#00a2c5',
          bright: '#00c5f0',
          violet: '#1d006f',
        },
        ink: '#17191c',
        'slate-muted': '#525860',
        mist: '#f8f9fa',
        line: '#dae0e5',
      },
      fontFamily: {
        sans: ['Lato', 'Arial', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(17, 46, 81, 0.08), 0 8px 24px rgba(17, 46, 81, 0.06)',
      },
    },
  },
  plugins: [],
}
