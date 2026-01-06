// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173,
    proxy: {
      // ✅ 核心配置：将 /api 开头的请求代理到新的后端 IP
      '/api': {
        target: 'http://123.57.85.75:8080',
        changeOrigin: true, // 允许跨域
        // 如果后端接口本身包含 /api 前缀，则不需要 rewrite
        // 如果后端接口不包含 /api，需要取消注释下面这行来重写路径
        // rewrite: (path) => path.replace(/^\/api/, '') 
      }
    }
  }
})