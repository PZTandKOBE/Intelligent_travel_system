// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import Login from '../views/Login/index.vue';
import Home from '../views/Home/index.vue';
import Chat from '../views/Chat/index.vue';
import User from '../views/User/index.vue';
import Document from '../views/User/Document.vue'; 
import History from '../views/Chat/History.vue';
import Password from '../views/User/Password.vue'; // ✅ 新增引入

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
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
    path: '/user/documents',
    name: 'UserDocument',
    component: Document,
    meta: { title: '游览报告', requiresAuth: true }
  },
  // ✅ 新增路由：修改密码
  {
    path: '/user/password',
    name: 'UserPassword',
    component: Password,
    meta: { title: '修改密码', requiresAuth: true }
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