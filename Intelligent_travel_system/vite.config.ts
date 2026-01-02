import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173, // 前端开发端口，保持默认即可
    proxy: {
      '/api': {
        // ✅ 修改这里：指向你的远程后端 IP 和端口
        target: 'http://14.103.124.109:8080', 
        changeOrigin: true,
        // ⚠️ 注意：通常后端接口如果是 http://...:8080/api/user/...
        // 前端请求 /api/user/... 时，不需要 rewrite 去掉 /api
        // 如果你的后端接口路径里本身就包含 /api，请注释掉下面这行 rewrite
        // rewrite: (path) => path.replace(/^\/api/, '') 
      }
    }
  }
})