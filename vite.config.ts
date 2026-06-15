import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {pathToFileURL} from 'url';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-mid',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              const urlPath = req.url.split('?')[0];
              const endpoint = urlPath.replace('/api/', '');
              const allowedEndpoints = ['ask-ai', 'create-razorpay-order', 'verify-payment', 'scan-chart'];

              if (allowedEndpoints.includes(endpoint)) {
                let bodyBuffer = '';
                req.on('data', chunk => {
                  bodyBuffer += chunk;
                });
                req.on('end', async () => {
                  try {
                    let parsedBody = {};
                    if (bodyBuffer) {
                      try {
                        parsedBody = JSON.parse(bodyBuffer);
                      } catch (e) {
                        // ignore JSON parse error
                      }
                    }

                    // Enrich request with parsed body
                    const anyReq = req as any;
                    anyReq.body = parsedBody;

                    // Enrich response with Vercel/Express helper functions
                    const anyRes = res as any;
                    anyRes.status = function(code: number) {
                      this.statusCode = code;
                      return this;
                    };
                    anyRes.json = function(data: any) {
                      this.setHeader('Content-Type', 'application/json');
                      this.end(JSON.stringify(data));
                      return this;
                    };

                    const filePath = path.join(process.cwd(), 'api', `${endpoint}.js`);
                    const fileUrl = pathToFileURL(filePath).toString();
                    const handlerModule = await import(fileUrl);
                    await handlerModule.default(anyReq, anyRes);
                  } catch (err: any) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Failed in local dev proxy: ' + err.message }));
                  }
                });
                return;
              }
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      exclude: ['@xenova/transformers']
    },
    worker: {
      format: 'es'
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
