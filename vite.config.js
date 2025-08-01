import { defineConfig } from 'vite';
import postcssCustomProperties from 'postcss-custom-properties';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const plugins = [react()];
  
  // Note: Bundle analyzer requires separate installation
  // Run: npm install rollup-plugin-visualizer --save-dev
  // Then use: npm run build:analyze
  
  return {
    plugins,
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
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              if (id.includes('appwrite')) {
                return 'appwrite-vendor';
              }
              if (id.includes('cloudinary')) {
                return 'cloudinary-vendor';
              }
              return 'vendor';
            }
            
            // Admin chunks
            if (id.includes('src/components/admin') || id.includes('AdminBookManagement') || id.includes('AdminDashboard')) {
              return 'admin';
            }
            
            // User chunks
            if (id.includes('src/components') && (id.includes('BookDetail') || id.includes('Cart') || id.includes('Search'))) {
              return 'user';
            }
          },
          // Optimize asset naming
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/css/i.test(extType)) {
              return `css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js'
        }
      },
      cssCodeSplit: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          passes: 2
        },
        mangle: {
          safari10: true
        }
      },
      chunkSizeWarningLimit: 800,
      cssMinify: true,
      reportCompressedSize: false, // Faster builds
      sourcemap: false // Disable sourcemaps for production
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
  };
});