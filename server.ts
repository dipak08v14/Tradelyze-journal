import express from "express";
import path from "path";
import { pathToFileURL } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON and urlencoded body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const allowedEndpoints = [
    'ask-ai',
    'create-razorpay-order',
    'verify-payment',
    'scan-chart',
    'dhan-connect',
    'dhan-disconnect',
    'dhan-open-positions',
    'dhan-sync',
    'generate-sync-key',
    'sync-trades',
    'dhan-repair-options',
    'chart-data'
  ];

  // API Route Handler
  app.all("/api/:endpoint", async (req, res, next) => {
    const endpoint = req.params.endpoint;
    if (!allowedEndpoints.includes(endpoint)) {
      return next();
    }

    // Set CORS headers for all API routes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      const filePath = path.join(process.cwd(), 'api', `${endpoint}.js`);
      const fileUrl = pathToFileURL(filePath).toString();
      const handlerModule = await import(fileUrl);
      
      // Make sure response object has standard helper methods if they are not there
      const anyRes = res as any;
      if (!anyRes.status) {
        anyRes.status = function(code: number) {
          this.statusCode = code;
          return this;
        };
      }
      if (!anyRes.json) {
        anyRes.json = function(data: any) {
          this.setHeader('Content-Type', 'application/json');
          this.end(JSON.stringify(data));
          return this;
        };
      }

      await handlerModule.default(req, res);
    } catch (err: any) {
      console.error(`Error executing API endpoint ${endpoint}:`, err);
      res.status(500).json({ error: 'Failed inside server API proxy: ' + err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For SPA routing fallback:
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
