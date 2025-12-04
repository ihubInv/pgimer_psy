export default function debugUriPlugin() {
    return {
      name: 'debug-uri-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url;
          
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