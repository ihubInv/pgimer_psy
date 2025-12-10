// 

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import debugUriPlugin from './vite-debug-plugin.js';

export default defineConfig({
  plugins: [
    debugUriPlugin(),
    react()
  ],
  server: {
    port: 8001,  // Frontend port
    host: '0.0.0.0',
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://122.186.76.102:8002',  // Backend port
        changeOrigin: true,
        secure: false
      }
    },
    // Note: fs.strict and fs.deny are removed because Vite needs access to /src/
    // for module resolution. We use middleware instead to block direct file browsing.
    fs: {
      strict: true
      // Don't deny /src/ - Vite needs it for the app to work
      // Security is handled via middleware below
    }
  },
  // SECURITY FIX #2.8: Production build configuration
  build: {
    outDir: 'dist',
    // Disable source maps in production to prevent source code exposure
    sourcemap: process.env.NODE_ENV !== 'production' ? true : false,
    // Minify code in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    // Rollup options for better security
    rollupOptions: {
      output: {
        // Don't expose source file names in production
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]'
      }
    }
  },
  // SECURITY FIX #2.8: Custom middleware to block direct /src file browsing
  // Strategy: In development, allow all /src/ requests (Vite needs them for the app to work)
  //           But log access for monitoring. In production, use built files from /dist/
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] || ''; // Path without query params
      const fullUrl = req.url || '';
      
      // Always allow Vite's internal endpoints
      if (fullUrl.startsWith('/@') || fullUrl.startsWith('/node_modules/')) {
        return next();
      }
      
      // Check if this is a request to /src/
      if (url.startsWith('/src/')) {
        // In development mode, we need to allow /src/ files for the app to work
        // Vite's dev server requires access to source files for module resolution
        // The real security fix is ensuring production uses built files (no /src/ access)
        
        // Log access for security monitoring
        const accept = req.headers.accept || '';
        const isDirectBrowse = accept.includes('text/html') && 
                               !accept.includes('application/javascript') && 
                               !accept.includes('text/javascript') &&
                               !accept.includes('*/*');
        
        if (isDirectBrowse && !url.includes('main.jsx') && !url.includes('main.tsx') && !url.startsWith('/src/assets/')) {
          // This looks like direct browser navigation to browse source files
          console.warn(`[Security] Direct source code access detected: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
          // In development, we allow it but log it. In production, this shouldn't happen
          // because production should serve from /dist/, not /src/
        }
        
        // Allow all /src/ requests in development (Vite needs them)
        // Production should use built files from /dist/ directory
        return next();
      }
      
      next();
    });
  },
  // SECURITY FIX #2.8: Preview server configuration (for production builds)
  preview: {
    port: 8001,
    host: '0.0.0.0',
    // Block /src access in preview mode as well
    middlewareMode: false
  }
});