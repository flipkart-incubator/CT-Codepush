import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_CDN_URL,
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://${domain}',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        headers: {
          'Origin': 'https://${domain}'
        }
      },
      '/auth': {
        target: 'https://${domain}',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        headers: {
          'Origin': 'https://${domain}'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}) 