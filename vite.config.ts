import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
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
