// src/stores/userStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { UserInfo, LoginRequest, DocumentItem, UpdatePasswordRequest } from '../types/api';
import { showToast } from 'vant';

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);
  const documentList = ref<DocumentItem[]>([]);

  // 发送验证码
  const sendCode = async (email: string) => {
    try {
      await http.post('/user/register/send-code', { email });
      showToast('验证码已发送');
      return true;
    } catch (error) {
      console.error('发送验证码失败:', error);
      return false;
    }
  };

  // 注册
  const register = async (payload: { email: string; code: string; password?: string }) => {
    try {
      const requestBody = {
        email: payload.email,
        code: payload.code,
        userPassword: payload.password,
        checkPassword: payload.password,
        userName: `用户${payload.email.split('@')[0]}`,
        userAvatar: undefined 
      };
      await http.post('/user/register/email', requestBody);
      showToast('注册成功，请登录');
      return true;
    } catch (error) {
      console.error('注册失败:', error);
      return false;
    }
  };

  // 登录
  const login = async (payload: LoginRequest) => {
    try {
      // 这里添加类型断言，虽然这里没报错，但保持一致是个好习惯
      const res = await http.post<UserInfo>('/user/login/email', payload) as unknown as UserInfo;
      userInfo.value = res; 
      showToast('登录成功');
      return true;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  };

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      // 【修复点 1】：添加 as unknown as UserInfo 类型断言
      const res = await http.get<UserInfo>('/user/get/login') as unknown as UserInfo;
      // 现在的 res 被 TS 认为是 UserInfo 类型，拥有 id 属性
      if (res && res.id) {
        userInfo.value = res;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 退出登录
  const logout = async () => {
    try {
      await http.post('/user/logout');
    } catch (e) {
      console.error(e);
    } finally {
      userInfo.value = null;
      documentList.value = [];
      showToast('已退出登录');
      // 可以选择跳转到登录页
    }
  };

  // 上传文件
  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      // 【修复点 2】：添加 as unknown as string 类型断言
      // 假设后端返回的数据就是 url 字符串，或者是包含 url 的对象。
      // 根据你的 index.vue 报错，这里预期返回 string。
      // 如果后端返回的是 { url: '...' }，请相应修改类型。
      // 这里假设拦截器处理后直接返回了 URL 字符串。
      const res = await http.post<string>('/file/test/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }) as unknown as string;
      
      return res;
    } catch (error) {
      console.error('上传失败:', error);
      return '';
    }
  };

  // 更新个人信息
  const updateProfile = async (userName: string, userAvatar: string) => {
    try {
      await http.post('/user/update/my', { userName, userAvatar });
      showToast('更新成功');
      // 更新本地状态
      if (userInfo.value) {
        userInfo.value.userName = userName;
        if (userAvatar) {
          userInfo.value.userAvatar = userAvatar;
        }
      }
      return true;
    } catch (error) {
      console.error('更新失败:', error);
      showToast('更新失败，请重试');
      return false;
    }
  };

  // 修改密码
  const updatePassword = async (payload: UpdatePasswordRequest) => {
    try {
      const requestBody = {
        oldPassword: payload.oldPassword || '',
        newPassword: payload.newPassword || '',
        confirmPassword: payload.confirmPassword || ''
      };

      console.log('Sending update password request:', requestBody); 

      await http.post('/user/update/password', requestBody);

      showToast('密码修改成功，请重新登录');
      
      setTimeout(() => {
        logout(); 
      }, 1500);
      
      return true;
    } catch (error) {
      console.error('修改密码失败:', error);
      return false;
    }
  };

  // 获取文档列表
  const fetchDocuments = async () => {
    try {
      // 这里的 any 可以保留，或者定义更精确的类型
      const res = await http.post('/document/my', { current: 1, pageSize: 20 }) as any;
      documentList.value = res.records || [];
    } catch (error) {
      console.error('获取文档列表失败:', error);
    }
  };

  return {
    userInfo,
    documentList,
    sendCode,
    register,
    login,
    fetchUserInfo,
    logout,
    uploadFile,
    updateProfile,
    updatePassword,
    fetchDocuments
  };
});