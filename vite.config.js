import { defineConfig } from 'vite';
import postcssCustomProperties from 'postcss-custom-properties';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        postcssCustomProperties(),
      ],
    },
    devSourcemap: false, // Disable CSS sourcemaps in dev for performance
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          appwrite: ['appwrite'],
          cloudinary: ['@cloudinary/react', '@cloudinary/url-gen']
        },
        // Separate CSS files for better caching
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    cssCodeSplit: true, // Split CSS by routes
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    // Enable CSS minification
    cssMinify: true
  },
  server: {
    hmr: {
      overlay: false
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'appwrite'],
    exclude: ['@cloudinary/react'] // Lazy load heavy dependencies
  }
});