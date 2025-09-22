import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
    }),
    // Bundle analyzer for production builds
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
    // Remove console logs in production
    drop: ['console', 'debugger']
  },
  
  build: {
    // Production optimizations
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            
            // Firebase
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            
            // Cloudinary
            if (id.includes('cloudinary')) {
              return 'cloudinary-vendor';
            }
            
            // Other large libraries
            if (id.includes('lodash') || id.includes('moment') || id.includes('date-fns')) {
              return 'utils-vendor';
            }
            
            return 'vendor';
          }
          
          // Admin chunks (lazy loaded)
          if (id.includes('src/components/admin') || 
              id.includes('AdminBookManagement') || 
              id.includes('AdminDashboard') ||
              id.includes('AdminOrderManagement')) {
            return 'admin';
          }
          
          // User-facing chunks
          if (id.includes('src/components') && 
              (id.includes('BookDetail') || 
               id.includes('Cart') || 
               id.includes('Search') ||
               id.includes('Profile'))) {
            return 'user';
          }
          
          // Services
          if (id.includes('src/services')) {
            return 'services';
          }
          
          // Utils and hooks
          if (id.includes('src/utils') || id.includes('src/hooks')) {
            return 'utils';
          }
        },
        
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(extType)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    
    // Build optimizations
    cssCodeSplit: true,
    cssMinify: true,
    reportCompressedSize: false, // Faster builds
    sourcemap: false, // No sourcemaps in production
    chunkSizeWarningLimit: 1000, // 1MB warning limit
    
    // Asset optimization
    assetsInlineLimit: 4096, // 4KB inline limit
  },
  
  // CSS optimizations
  css: {
    postcss: {
      plugins: [
        // Add autoprefixer and other PostCSS plugins
      ],
    },
    devSourcemap: false,
    preprocessorOptions: {
      scss: {
        // SCSS optimizations if using SCSS
      }
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/firestore',
      'firebase/auth'
    ],
    exclude: [
      '@cloudinary/react',
      '@cloudinary/url-gen'
    ]
  },
  
  // Production environment variables
  define: {
    __DEV__: JSON.stringify(false),
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.PROD': true
  },
  
  // Server configuration for preview
  preview: {
    port: 4173,
    host: true,
    strictPort: true
  },
  
  // Base URL for production
  base: '/',
  
  // Public directory
  publicDir: 'public',
  
  // Build directory
  outDir: 'dist',
  
  // Asset directory
  assetsDir: 'assets',
  
  // Clear output directory before build
  emptyOutDir: true
});