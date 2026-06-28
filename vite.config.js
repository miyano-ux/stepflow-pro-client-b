import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // GAS URLからパスを取り出す
  // 例: https://script.google.com/macros/s/AKfyc.../exec
  //  → /macros/s/AKfyc.../exec
  const gasPath    = new URL(env.VITE_GAS_URL).pathname             // /macros/s/.../exec
  const masterPath = new URL(env.VITE_MASTER_WHITELIST_API).pathname // /macros/s/.../exec

  return {
    plugins: [react()],
    server: {
      proxy: {
        // /api/gas?... → https://script.google.com/macros/s/.../exec?...
        '/api/gas': {
          target: 'https://script.google.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gas/, gasPath),
        },
        // /api/master?... → https://script.google.com/macros/s/.../exec?...
        '/api/master': {
          target: 'https://script.google.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/master/, masterPath),
        },
      },
    },
  }
})