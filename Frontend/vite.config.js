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
    // CRITICAL: Disable source maps in production to prevent source code exposure
    sourcemap: false, // Never expose source maps in production
    // Minify code in production with aggressive obfuscation
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        passes: 3, // Multiple passes for better minification
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        unsafe: true, // Enable unsafe optimizations
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        dead_code: true,
        unused: true
      },
      mangle: {
        toplevel: true, // Mangle top-level variable names
        properties: {
          regex: /^_/ // Mangle properties starting with underscore
        },
        safari10: true
      },
      format: {
        comments: false, // Remove all comments
        ascii_only: true, // Escape unicode characters
        beautify: false,
        preserve_annotations: false
      }
    },
    // Rollup options for better security
    rollupOptions: {
      output: {
        // Don't expose source file names in production - use hashes only
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        // Don't include source file paths in comments
        banner: '',
        footer: '',
        // Compact output - remove whitespace
        compact: true,
        // Generate minimal code
        generatedCode: {
          constBindings: true,
          objectShorthand: true,
          arrowFunctions: true
        },
        // Prevent source code exposure
        sourcemap: false,
        sourcemapExcludeSources: true
      },
      // Additional security: externalize nothing, bundle everything
      external: []
    },
    // Don't expose build information
    reportCompressedSize: false,
    // Ensure /src/ directory is never included in build
    emptyOutDir: true,
    // Don't expose chunk loading error details
    chunkSizeWarningLimit: 1000
  },
  // SECURITY FIX #2.8: CRITICAL - Block ALL direct /src file browsing
  // Strategy: Only allow entry point, assets, and Vite transform requests with specific query params
  // Block everything else - this prevents source code exposure
  // IMPORTANT: This middleware runs early to block before Vite processes the request
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] || ''; // Path without query params
      const fullUrl = req.url || '';
      
      // Always allow Vite's internal endpoints (HMR, module resolution)
      if (fullUrl.startsWith('/@') || fullUrl.startsWith('/node_modules/')) {
        return next();
      }
      
      // SECURITY FIX #2.8: Block direct /src/ file browsing while allowing module imports
      // Strategy: Allow module imports (app functionality) but block direct browser navigation
      if (url.startsWith('/src/')) {
        // 1. Always allow entry point (needed for app to load)
        if (url === '/src/main.jsx' || url === '/src/main.tsx') {
          return next();
        }
        
        // 2. Always allow assets folder (images, fonts, etc. - needed for app)
        if (url.startsWith('/src/assets/')) {
          return next();
        }
        
        // 3. Check if this is a module import (app functionality) vs direct browsing
        const accept = req.headers.accept || '';
        const referer = req.headers.referer || '';
        const hasViteQueryParams = fullUrl.includes('?import') || 
                                   fullUrl.includes('?t=') || 
                                   fullUrl.includes('?v=') ||
                                   fullUrl.includes('?raw') ||
                                   fullUrl.includes('?url') ||
                                   fullUrl.includes('?');
        
        // BLOCK ONLY if it's clearly direct browser navigation:
        // - Accept header starts with or prioritizes text/html
        // - AND no query params (not a Vite transform)
        // - AND no referer (not from the app)
        const acceptPrioritizesHtml = accept.startsWith('text/html') || 
                                      (accept.includes('text/html') && accept.split(',')[0].trim().startsWith('text/html'));
        const isDirectBrowse = acceptPrioritizesHtml && 
                               !hasViteQueryParams && 
                               !referer;
        
        // ALLOW everything else (module imports, Vite transforms, etc.)
        if (!isDirectBrowse) {
          // This is a legitimate module import or Vite transform - allow it
          return next();
        }
        
        // 4. BLOCK direct browsing attempts
        // This blocks: Direct URL typing like /src/components/Button.jsx
        console.warn(`[Security] BLOCKED direct source code access: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}, Accept: ${accept || 'none'}, Referer: ${referer || 'none'}`);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end('Not Found');
        return;
      }
      
      // SECURITY FIX #2.16: Block configuration files and sensitive directories
      const configFilePatterns = [
        '/package.json',
        '/package-lock.json',
        '/yarn.lock',
        '/pnpm-lock.yaml',
        '/.env',
        '/.env.local',
        '/.env.production',
        '/.env.development',
        '/vite.config.js',
        '/vite.config.ts',
        '/tsconfig.json',
        '/jsconfig.json',
        '/.eslintrc',
        '/.prettierrc',
        '/tailwind.config.js',
        '/postcss.config.js',
        '/.gitignore',
        '/.gitattributes',
        '/README.md',
        '/CHANGELOG.md',
        '/LICENSE'
      ];
      
      const urlLower = url.toLowerCase();
      for (const pattern of configFilePatterns) {
        if (urlLower === pattern.toLowerCase() || urlLower.includes(pattern.toLowerCase())) {
          console.warn(`[Security] BLOCKED configuration file access: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.end('Not Found');
          return;
        }
      }
      
      // Block configuration file extensions
      const configExtensions = ['.config.js', '.config.ts', '.config.json', '.rc', '.rc.js', '.rc.json'];
      for (const ext of configExtensions) {
        if (urlLower.endsWith(ext)) {
          console.warn(`[Security] BLOCKED configuration file access: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.end('Not Found');
          return;
        }
      }
      
      // Also block source map files explicitly
      if (url.endsWith('.map') || url.includes('.map?')) {
        console.warn(`[Security] BLOCKED source map access: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end('Not Found');
        return;
      }
      
      next();
    });
  },
  // SECURITY FIX #2.8: Preview server configuration (for production builds)
  preview: {
    port: 8001,
    host: '0.0.0.0',
    // In preview mode, we serve from /dist/ - /src/ should not be accessible
    middlewareMode: false
  },
  // SECURITY FIX #2.8 & #2.16: Configure preview server middleware to block /src/ and config files
  configurePreviewServer(server) {
    // SECURITY FIX #2.18: Set security headers for ALL responses - MUST be first middleware
    server.middlewares.use((req, res, next) => {
      // Intercept the response to ensure headers are always set
      const originalEnd = res.end.bind(res);
      const originalWriteHead = res.writeHead.bind(res);
      
      // Override writeHead to inject our headers
      res.writeHead = function(code, reason, headers) {
        if (typeof reason === 'object') {
          headers = reason;
          reason = undefined;
        }
        if (!headers) headers = {};
        
        // CRITICAL: Force set X-XSS-Protection header
        headers['X-XSS-Protection'] = '1; mode=block';
        headers['X-Content-Type-Options'] = 'nosniff';
        headers['X-Frame-Options'] = 'DENY';
        headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
        
        return originalWriteHead(code, reason, headers);
      };
      
      // Also set headers directly (for responses that don't use writeHead)
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Ensure headers persist even after other middleware
      res.on('finish', () => {
        if (!res.headersSent) {
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
        }
      });
      
      next();
    });
    
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] || '';
      const urlLower = url.toLowerCase();
      
      // Ensure security headers are set (in case they were removed)
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Prevent caching of JavaScript files to avoid source code exposure
      if (url.endsWith('.js') || url.endsWith('.jsx') || url.endsWith('.ts') || url.endsWith('.tsx')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      
      // In preview mode (production build), /src/ should NEVER be accessible
      if (url.startsWith('/src/')) {
        console.warn(`[Security] BLOCKED /src/ access in preview mode: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');
        return;
      }
      
      // SECURITY FIX #2.16: Block configuration files in preview mode
      const configFilePatterns = [
        '/package.json',
        '/package-lock.json',
        '/yarn.lock',
        '/pnpm-lock.yaml',
        '/.env',
        '/vite.config.js',
        '/vite.config.ts',
        '/tsconfig.json',
        '/jsconfig.json',
        '/.eslintrc',
        '/.prettierrc',
        '/tailwind.config.js',
        '/postcss.config.js',
        '/.gitignore',
        '/README.md',
        '/LICENSE'
      ];
      
      for (const pattern of configFilePatterns) {
        if (urlLower === pattern.toLowerCase() || urlLower.includes(pattern.toLowerCase())) {
          console.warn(`[Security] BLOCKED configuration file access in preview: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Not Found');
          return;
        }
      }
      
      // Block configuration file extensions
      const configExtensions = ['.config.js', '.config.ts', '.config.json', '.rc', '.rc.js', '.rc.json'];
      for (const ext of configExtensions) {
        if (urlLower.endsWith(ext)) {
          console.warn(`[Security] BLOCKED configuration file access in preview: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Not Found');
          return;
        }
      }
      
      // Block source maps
      if (url.endsWith('.map') || url.includes('.map?')) {
        console.warn(`[Security] BLOCKED source map access in preview: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');
        return;
      }
      
      next();
    });
  }
});