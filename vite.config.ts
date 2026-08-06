import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { CONTENT_SECURITY_POLICY, PERMISSIONS_POLICY } from './constants/contentSecurityPolicy';

const TEST_HEADERS_PLUGIN = {
  name: 'temp-csp-header-test',
  configureServer(server: any) {
    server.middlewares.use((_req: any, res: any, next: any) => {
      res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
      next();
    });
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || env.VITE_API_URL || env.VITE_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: "localhost" 
        },
        '/auth': {
          target: env.VITE_BACKEND_URL || env.VITE_API_URL || env.VITE_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: "localhost"
        },
        '/socket.io': {
          target: env.VITE_BACKEND_URL || env.VITE_API_URL || env.VITE_API_TARGET || 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [react(), TEST_HEADERS_PLUGIN],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
