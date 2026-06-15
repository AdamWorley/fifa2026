import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep flags as discrete, immutably-cached asset files rather than inlining
    // small ones into the JS bundle.
    assetsInlineLimit: 0,
  },
})
