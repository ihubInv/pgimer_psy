export default function debugUriPlugin() {
    return {
      name: 'debug-uri-handler',
      // Run this plugin early to block before Vite processes requests
      enforce: 'pre',
      configureServer(server) {
        // Insert middleware at the beginning to block before Vite serves files
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0] || '';
          const fullUrl = req.url || '';
          
          // SECURITY FIX #2.8: Block direct /src file browsing while allowing module imports
          // Strategy: Allow module imports (app functionality) but block direct browser navigation
          if (url && url.startsWith('/src/')) {
            // 1. Always allow entry point (needed for app to work)
            if (url === '/src/main.jsx' || url === '/src/main.tsx') {
              return next();
            }
            
            // 2. Always allow assets folder (images, fonts, etc.)
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
            console.warn(`[Security] BLOCKED direct source code browsing: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}, Accept: ${accept || 'none'}, Referer: ${referer || 'none'}`);
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
          if (url && (url.endsWith('.map') || url.includes('.map?'))) {
            console.warn(`[Security] BLOCKED source map access: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.end('Not Found');
            return;
          }
          
          console.log(`[DEBUG] Incoming request: ${url}`);
          
          try {
            decodeURIComponent(url);
            next();
          } catch (error) {
            console.error(`[ERROR] Malformed URI: ${url}`);
            console.error(`[ERROR] ${error.message}`);
            
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Bad Request: Malformed URI');
          }
        });
      }
    };
  }