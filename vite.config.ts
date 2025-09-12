import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs'
          ],
          'charts': ['recharts'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    },
    // Warn if chunk exceeds 300KB
    chunkSizeWarningLimit: 300,
    // Use terser for better minification
    minify: 'esbuild',
    // Enable source maps for production debugging
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
    // Asset inlining threshold
    assetsInlineLimit: 4096
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    exclude: ['lucide-react']
  },
  // Server configuration
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: true
    }
  }
})
