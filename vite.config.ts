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
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
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
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) return;
            const staffPortal =
              id.includes('lib/api/staff-path')
              || id.includes('/routes/staff-lazy')
              || id.includes('/pages/Staff')
              || id.includes('/pages/LoanQueuePage')
              || id.includes('/pages/LoanDetailsPage')
              || id.includes('/pages/CustomersPage')
              || id.includes('/pages/UsersPage')
              || id.includes('/pages/CustomerDetailsPage')
              || id.includes('/pages/ReportsPage')
              || id.includes('/pages/SettingsPage')
              || id.includes('/pages/CbaMigrationPage')
              || id.includes('/pages/PayrollUploadPage')
              || id.includes('/pages/TimelineReportPage')
              || id.includes('/pages/DemographyReportPage')
              || id.includes('/pages/AuditTrailPage')
              || id.includes('/pages/ProductsPage')
              || id.includes('/components/Staff')
              || id.includes('/components/settings/AgentCommission')
              || id.includes('/components/investments/AgentCommission')
              || id.includes('/components/transfers/')
              || id.includes('/components/loans/LoanCrc')
              || id.includes('/components/loans/LoanBankStatement');
            if (staffPortal) return 'staff-portal';
          },
        },
      },
    },
  };
});
