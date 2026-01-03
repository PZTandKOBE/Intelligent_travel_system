// src/stores/userStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { UserInfo, LoginRequest, DocumentItem, UpdatePasswordRequest } from '../types/api';
import { showToast } from 'vant';

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);
  const documentList = ref<DocumentItem[]>([]);

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

  const register = async (payload: { email: string; code: string; password?: string }) => {
    try {
      const requestBody = {
        email: payload.email,
        code: payload.code,
        userPassword: payload.password,
        confirmPassword: payload.password,
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

  const login = async (req: LoginRequest) => {
    try {
      const res = await http.post<UserInfo>('/user/login/email', req);
      const userData = (res as any).data || res;
      if (userData && userData.id) {
        userInfo.value = userData;
        showToast('登录成功');
        return true;
      } else {
        showToast('登录失败：数据异常');
        return false;
      }
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  };

  const fetchUserInfo = async () => {
    try {
      const res = await http.get<UserInfo>('/user/get/login');
      if (res && res.id) {
        userInfo.value = res;
      }
    } catch (error: any) {
      console.error('获取用户信息失败', error);
    }
  };

  const logout = async () => {
    try {
      await http.post('/user/logout');
    } catch (e) {
      // ignore
    } finally {
      userInfo.value = null;
      showToast('已退出登录');
      window.location.href = '/login';
    }
  };

  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await http.post<string>('/file/test/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res; 
    } catch (error) {
      console.error('文件上传失败:', error);
      showToast('图片上传失败');
      return null;
    }
  };

  const updateProfile = async (userName: string, userAvatar?: string) => {
    try {
      await http.post('/user/update/my', { userName, userAvatar });
      showToast('更新成功');
      
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

  // ✅ 核心修复：修改为 Form Data 格式提交
const updatePassword = async (payload: UpdatePasswordRequest) => {
    try {
      // ✅ 再次修正：尝试回退到文档标准
      // 后端报“参数不能为空”，极大概率是因为没找到它要的 checkPassword 字段
      const requestBody = {
        oldPassword: payload.oldPassword,
        newPassword: payload.newPassword,
        checkPassword: payload.confirmPassword // ⚠️ 这里强行把前端的 confirmPassword 映射给后端的 checkPassword
      };

      console.log('正在发送修改密码请求:', requestBody); // 方便你调试看参数

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
  const fetchDocuments = async () => {
    try {
      const res: any = await http.post('/document/my', { current: 1, pageSize: 20 });
      documentList.value = res.records || [];
    } catch (error) {
      console.error('获取文档列表失败:', error);
      documentList.value = [];
    }
  };

  return {
    userInfo,
    documentList,
    sendCode,
    login,
    register,
    logout,
    uploadFile, 
    fetchUserInfo,
    updateProfile,
    fetchDocuments,
    updatePassword
  };
});