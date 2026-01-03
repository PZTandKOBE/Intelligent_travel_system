import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // ✅ 更新为新的后端地址 (注意：如果后端是 http://123.57.85.75/api，这里通常填 IP 即可，Vite 会自动拼接 /api)
        target: 'http://14.103.124.109:8080', 
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // 保持注释，保留 /api 前缀
      },
    },
  },
});