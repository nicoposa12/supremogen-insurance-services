import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on current mode (e.g. development)
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true, // Allow external access in Docker
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/storage': {
          target: env.VITE_API_PROXY_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
})
