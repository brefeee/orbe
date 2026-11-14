import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// En développement, /api est relayé vers le serveur ORBE local : le client et le serveur partagent la même origine.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: {
    port: 5180, strictPort: true, host: '127.0.0.1',
    proxy: { '/api': { target: process.env.ORBE_DEV_SERVER ?? 'http://127.0.0.1:4780', ws: true } },
  },
  build: { target: 'es2022', outDir: 'dist', sourcemap: false },
});
