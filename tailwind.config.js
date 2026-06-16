/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core brand palette (navy + cyan) paired with a World Cup gold accent
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
        gold: {
          DEFAULT: '#f5c542',
          light: '#fde68a',
          dark: '#c8941a',
        },
        pitch: {
          DEFAULT: '#1f7a3d',
          light: '#2f8a45',
          dark: '#134d27',
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
