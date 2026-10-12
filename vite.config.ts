import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // MUST stay absolute ('/'): with './' the built index.html references assets
  // relatively, so a deep route like /copytrade/provider/<slug> or /blog/<slug>
  // resolves them as /copytrade/provider/assets/*.js - the server answers with
  // index.html, the module fails to parse and the page renders blank.
  base: '/',
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor code so the app shell, landing page and views cache better
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('canvas-confetti')) return 'vendor-confetti';
          if (id.includes('@vercel')) return 'vendor-analytics';
          if (id.includes('scheduler') || id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\')) {
            return 'vendor-react';
          }
          return 'vendor-misc';
        }
      }
    }
  }
});
