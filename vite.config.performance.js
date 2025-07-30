import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Bundle splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['react-helmet-async'],
          
          // Feature chunks
          'admin-features': [
            './src/components/AdminDashboard.jsx',
            './src/components/AdminBookManagement.jsx',
            './src/components/AdminAuthorManagement.jsx',
            './src/components/AdminGenreManagement.jsx'
          ],
          
          // Utils chunk
          'utils': [
            './src/utils/slugUtils.js',
            './src/utils/toastUtils.js',
            './src/utils/transliteration.js'
          ]
        }
      }
    },
    
    // Performance optimizations
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // CSS code splitting
    cssCodeSplit: true
  },
  
  // Development optimizations
  server: {
    hmr: {
      overlay: false // Disable error overlay for better performance
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ],
    exclude: [
      // Exclude large dependencies that should be loaded on demand
    ]
  }
});