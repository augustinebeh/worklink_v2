import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/admin/', // Set base path for production builds
  server: {
    port: 3002,
    host: '127.0.0.1',
    strictPort: true, // Force the port, don't try alternatives
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
