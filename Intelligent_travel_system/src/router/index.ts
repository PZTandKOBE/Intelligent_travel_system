import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// 引入页面组件
// 请确保路径正确，如果不正确请修正为你的实际路径
import Login from '../views/Login/index.vue';
import Chat from '../views/Chat/index.vue';
import User from '../views/User/index.vue';
import Document from '../views/User/Document.vue'; 
import History from '../views/Chat/History.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat', // 默认跳到对话页
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录' }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat,
    meta: { title: '智能伴游', requiresAuth: true }
  },
  {
    path: '/chat/history',
    name: 'ChatHistory',
    component: History,
    meta: { title: '历史会话', requiresAuth: true }
  },
  {
    path: '/user',
    name: 'User',
    component: User,
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/user/document',
    name: 'UserDocument',
    component: Document,
    meta: { title: '游览报告', requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = (to.meta.title as string) || '非遗伴游';
  
  // ✅ 核心修改：移除所有 Token 检查逻辑！
  // 直接放行，认证交给接口状态码控制
  next(); 
});

export default router;