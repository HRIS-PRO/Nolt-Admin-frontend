import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const TEST_HEADERS_PLUGIN = {
  name: 'temp-csp-header-test',
  configureServer(server: any) {
    server.middlewares.use((_req: any, res: any, next: any) => {
      res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://www.googletagmanager.com https://js.paystack.co https://paystack.co https://*.paystack.co https://paystack.com https://*.paystack.com https://esm.sh https://static.zdassets.com https://ekr.zdassets.com https://zendesk.com https://*.zendesk.com https://connect.facebook.net https://doubleclick.net https://*.doubleclick.net https://googleadservices.com https://*.googleadservices.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://zdassets.com https://*.zdassets.com https://paystack.com https://*.paystack.com https://paystack.co https://*.paystack.co; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.dojah.io https://identity.dojah.io https://nolt-admin-backend-production-7761.up.railway.app wss://nolt-admin-backend-production-7761.up.railway.app https://api.paystack.co https://paystack.co https://*.paystack.co https://paystack.com https://*.paystack.com https://api.ng.termii.com https://api.usezeeh.com https://google-analytics.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://doubleclick.net https://*.doubleclick.net https://googleadservices.com https://*.googleadservices.com https://facebook.com https://*.facebook.com https://google.com https://www.google.com https://esm.sh https://zdassets.com https://*.zdassets.com https://zendesk.com https://*.zendesk.com https://*.a.run.app https://*.on.aws; frame-src https://identity.dojah.io https://www.openstreetmap.org https://www.googletagmanager.com https://zendesk.com https://*.zendesk.com https://zdassets.com https://*.zdassets.com https://paystack.com https://*.paystack.com https://paystack.co https://*.paystack.co; frame-ancestors 'self'; form-action 'self'");
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(self "https://identity.dojah.io"), microphone=(self "https://identity.dojah.io"), camera=(self "https://identity.dojah.io")');
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
