import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

// 定义路由表
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    // 路由懒加载：只有访问时才加载这个文件，优化首屏速度
    component: () => import('@/views/Home/index.vue') 
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router