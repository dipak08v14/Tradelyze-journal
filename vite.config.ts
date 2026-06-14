import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-mid',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/ask-ai') && req.method === 'POST') {
              let bodyBuffer = '';
              req.on('data', chunk => {
                bodyBuffer += chunk;
              });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyBuffer || '{}');
                  const { question, systemPrompt } = parsed;
                  if (!question || !systemPrompt) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Question and system prompt are required' }));
                    return;
                  }
                  if (!process.env.ANTHROPIC_API_KEY) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'AI service not configured. Please add ANTHROPIC_API_KEY.' }));
                    return;
                  }

                  const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-api-key': process.env.ANTHROPIC_API_KEY,
                      'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                      model: 'claude-sonnet-4-6',
                      max_tokens: 1500,
                      system: systemPrompt,
                      messages: [{ role: 'user', content: question }]
                    })
                  });

                  const data = await response.json();
                  if (!response.ok) {
                    res.statusCode = response.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: data.error?.message || 'Claude API error' }));
                    return;
                  }

                  const answer = data.content?.[0]?.text || 'No response received.';
                  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ answer, tokensUsed }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Failed in local dev proxy: ' + err.message }));
                }
              });
            } else {
              next();
            }
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
