import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Set the base path for GitHub Pages deployment
  base: '/Piano_Helper/', 
  plugins: [react()],
})
