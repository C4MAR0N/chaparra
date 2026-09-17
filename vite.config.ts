import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // En GitHub Pages la app cuelga de /<repo>/; en local se sirve desde la raíz.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5180,
    strictPort: true
  },
  preview: { port: 5180, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (id.includes('recharts')) return 'charts';
          return 'vendor';
        }
      }
    }
  }
});
