// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { showDialog } from 'vant'; // 引入 Vant 弹窗组件
import { useUserStore } from '../stores/userStore'; // 引入 UserStore

import Login from '../views/Login/index.vue';
import Home from '../views/Home/index.vue';
import Chat from '../views/Chat/index.vue';
import User from '../views/User/index.vue';
import Document from '../views/User/Document.vue'; 
import History from '../views/Chat/History.vue';
import Password from '../views/User/Password.vue'; 
import Game from '../views/Game/index.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '非遗伴游' } // 首页通常不需要登录，保留游客访问
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
    meta: { title: '智能伴游', requiresAuth: true } // 需要登录
  },
  {
    path: '/chat/history',
    name: 'ChatHistory',
    component: History,
    meta: { title: '历史会话', requiresAuth: true } // 需要登录
  },
  {
    path: '/user',
    name: 'User',
    component: User,
    meta: { title: '个人中心', requiresAuth: true } // 需要登录
  },
  {
    path: '/user/documents',
    name: 'UserDocument',
    component: Document,
    meta: { title: '游览报告', requiresAuth: true } // 需要登录
  },
  {
    path: '/user/password',
    name: 'UserPassword',
    component: Password,
    meta: { title: '修改密码', requiresAuth: true } // 需要登录
  },
  {
    path: '/game',
    name: 'Game',
    component: Game,
    meta: { title: '非遗知识闯关', requiresAuth: true } // 需要登录
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 🌟 全局前置守卫：核心修改逻辑
router.beforeEach(async (to, from, next) => {
  // 1. 设置标题
  document.title = (to.meta.title as string) || '非遗伴游';

  // 2. 获取 UserStore (注意：必须在 guard 内部获取，确保 Pinia 已初始化)
  const userStore = useUserStore();

  // 3. 检查路由是否需要登录权限
  if (to.meta.requiresAuth) {
    // 检查是否有用户信息 (或者使用 userStore.token 判断)
    if (!userStore.userInfo) {
      try {
        // 4. 弹窗提示
        await showDialog({
          title: '温馨提示',
          message: '您尚未登录，为了提供更好的伴游和定位服务，请先登录账号。',
          confirmButtonText: '去登录',
          theme: 'round-button',
          width: '85%', // 稍微调宽一点，移动端更好看
        });
        
        // 5. 用户点击确定后，跳转登录页
        // 将目标页面作为 redirect 参数传过去，登录成功后可以跳回来
        next({ 
          path: '/login', 
          query: { redirect: to.fullPath } 
        });
      } catch (e) {
        // 如果用户怎么操作取消了(虽然 alert 模式通常只有确定)，则阻止跳转
        next(false);
      }
      return;
    }
  }

  // 放行
  next(); 
});

export default router;