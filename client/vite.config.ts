import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors out of the app bundle for better caching + smaller chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react'
          // Recharts must be bundled with reselect/redux. Splitting them can cause `createSelector is not a function` due to module init order.
          if (/node_modules\/(@reduxjs|react-redux|redux|immer|reselect|recharts|victory-vendor|d3-[a-z]+|decimal\.js-light|es-toolkit|eventemitter3|use-sync-external-store|tiny-invariant)\//.test(id)) return 'redux'
          if (/node_modules\/(react-hook-form|@hookform|zod)\//.test(id)) return 'forms'
          if (/node_modules\/(@radix-ui|lucide-react|class-variance-authority|tailwind-merge|clsx)\//.test(id)) return 'ui'
          return 'vendor'
        },
      },
    },
  },
})
