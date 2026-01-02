import { createRouter, createWebHistory } from 'vue-router';

// 路由定义
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home/index.vue'),
    meta: { requiresAuth: false } // 首页公开
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login/index.vue'),
    meta: { requiresAuth: false } // 登录页公开
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../views/Chat/index.vue'),
    meta: { requiresAuth: true } // ⚠️ 聊天页需要登录
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('../views/User/index.vue'),
    meta: { requiresAuth: true } // 个人中心必须登录
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../views/Chat/index.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/history', // ✅ 新增历史列表页
    name: 'ChatHistory',
    component: () => import('../views/Chat/History.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('../views/User/index.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/document', // ✅ 新增
    name: 'UserDocument',
    component: () => import('../views/User/Document.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 从 localStorage 获取 token
  const token = localStorage.getItem('token');
  
  // 1. 访问需要权限的页面
  if (to.meta.requiresAuth) {
    if (token) {
      next(); // 有 Token，放行
    } else {
      next('/login'); // 无 Token，重定向到登录页
    }
  } 
  // 2. 已登录状态下访问登录页 (自动跳转到 Chat)
  else if (to.path === '/login' && token) {
    next('/chat');
  } 
  // 3. 其他情况 (如访问首页)
  else {
    next();
  }
});

export default router;