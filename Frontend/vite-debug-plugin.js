export default function debugUriPlugin() {
    return {
      name: 'debug-uri-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url;
          
          // SECURITY FIX #2.8: Monitor /src access (allow in dev, log for security)
          // In development, Vite needs /src/ access for the app to work
          // Production should serve built files from /dist/, not /src/
          if (url && url.startsWith('/src/')) {
            const accept = req.headers.accept || '';
            const isDirectBrowse = accept.includes('text/html') && 
                                   !accept.includes('application/javascript') && 
                                   !accept.includes('text/javascript') &&
                                   !accept.includes('*/*');
            
            if (isDirectBrowse && !url.includes('main.jsx') && !url.includes('main.tsx') && !url.startsWith('/src/assets/')) {
              // Log direct browsing attempts for security monitoring
              console.warn(`[Security] Direct source code browsing detected: ${url} from IP: ${req.socket?.remoteAddress || 'unknown'}`);
              // Note: In development we allow it (Vite needs it), but log it
              // In production, ensure built files are served from /dist/
            }
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