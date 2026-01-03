import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // ✅ 确保这里是你的后端真实地址
        target: 'http://14.103.124.109:8080', 
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''), // 如果后端接口不需要 /api 前缀，请取消注释这行
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
});