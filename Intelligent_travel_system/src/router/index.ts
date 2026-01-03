// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import Login from '../views/Login/index.vue';
import Home from '../views/Home/index.vue'; // ✅ 引入 Home 组件
import Chat from '../views/Chat/index.vue';
import User from '../views/User/index.vue';
import Document from '../views/User/Document.vue'; 
import History from '../views/Chat/History.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home, // ✅ 首页改为 Home
    meta: { title: '非遗伴游' }
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
    path: '/user/documents', // ✅ 修正路径拼写 (原为 /user/document)
    name: 'UserDocument',
    component: Document,
    meta: { title: '游览报告', requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  document.title = (to.meta.title as string) || '非遗伴游';
  next(); 
});

export default router;