import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // GitHub Pages serves this app from /Smiley-web/; the Docker/nginx deployment
  // serves it from root. VITE_BASE_PATH lets the GH Pages workflow override it.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: [
      {
        // Only alias the bare 'leaflet' import, not 'leaflet/dist/...' subpaths
        find: /^leaflet$/,
        replacement: path.resolve(__dirname, 'node_modules/leaflet/dist/leaflet-src.esm.js'),
      },
    ],
  },
})
