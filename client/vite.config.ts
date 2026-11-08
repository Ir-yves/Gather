import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const backendPortFile = fileURLToPath(new URL('../.runtime/backend-port', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'backend-port-discovery',
      configureServer(server) {
        server.middlewares.use('/__backend', (_request, response) => {
          response.setHeader('Cache-Control', 'no-store');
          try {
            const port = Number(readFileSync(backendPortFile, 'utf8').trim());
            if (!Number.isInteger(port) || port < 1 || port > 65535) {
              response.statusCode = 503;
              response.end();
              return;
            }
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ port }));
          } catch {
            response.statusCode = 503;
            response.end();
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
    strictPort: false
  }
});
