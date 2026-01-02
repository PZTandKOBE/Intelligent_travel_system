import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { UserInfo, LoginRequest, RegisterRequest, DocumentItem } from '../types/api';
import { showToast } from 'vant';

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);
  const documentList = ref<DocumentItem[]>([]);

  // 1. 发送验证码
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

  // 2. 注册
  const register = async (payload: { email: string; code: string; password?: string }) => {
    try {
      const requestBody = {
        email: payload.email,
        code: payload.code,
        userPassword: payload.password,
        checkPassword: payload.password,
        userName: `用户${payload.email.split('@')[0]}`,
        userAvatar: "" 
      };
      await http.post('/user/register/email', requestBody);
      showToast('注册成功，请登录');
      return true;
    } catch (error) {
      console.error('注册失败:', error);
      return false;
    }
  };

  // 3. 登录
  const login = async (req: LoginRequest) => {
    try {
      const res = await http.post<UserInfo>('/user/login/email', req);
      if (res && res.id) {
        userInfo.value = res; 
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

  // 4. 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const res = await http.get<UserInfo>('/user/get/login');
      userInfo.value = res;
    } catch (error) {
      userInfo.value = null;
    }
  };

  // 5. 退出登录
  const logout = async () => {
    try {
      await http.post('/user/logout');
    } catch (e) {
      // ignore
    } finally {
      userInfo.value = null;
      showToast('已退出登录');
    }
  };

  // 6. 更新用户信息 (已修复：界面不更新问题)
  const updateProfile = async (userName: string, userAvatar?: string) => {
    try {
      await http.post('/user/update/my', { userName, userAvatar });
      showToast('更新成功');
      
      // ✅ 核心修复：后端可能有延迟，前端先手动更新本地数据，确保界面立刻变化
      if (userInfo.value) {
        userInfo.value.userName = userName;
        if (userAvatar) userInfo.value.userAvatar = userAvatar;
      }
      
      // 后台默默再拉一次最新数据
      fetchUserInfo();
      return true;
    } catch (error) {
      console.error('更新失败:', error);
      return false;
    }
  };

  // 7. 获取我的游览报告 (已修复：报错问题)
  const fetchDocuments = async () => {
    try {
      // 这里的 API 返回结构包含 records
      const res: any = await http.post('/document/my', { current: 1, pageSize: 20 });
      documentList.value = res.records || [];
    } catch (error) {
      console.error('获取文档列表失败:', error);
      // 如果后端挂了，置为空数组，防止页面无限 loading 或报错
      documentList.value = [];
      // 可以在这里提示用户
      // showToast('游览报告服务暂不可用');
    }
  };

  return {
    userInfo,
    documentList,
    sendCode,
    login,
    register,
    logout,
    fetchUserInfo,
    updateProfile,
    fetchDocuments
  };
});