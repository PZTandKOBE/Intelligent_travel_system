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
        // 注册时头像留空，让后端处理或显示默认图
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

  // 3. 登录
  const login = async (req: LoginRequest) => {
    try {
      const res = await http.post<UserInfo>('/user/login/email', req);
      // 兼容后端可能直接返回 data 或者是嵌套结构
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

  // 4. 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const res = await http.get<UserInfo>('/user/get/login');
      // 只有成功获取到数据才更新，防止网络波动导致这里置空
      if (res && res.id) {
        userInfo.value = res;
      }
    } catch (error: any) {
      // 只有 401 才是真的未登录，其他错误不要轻易置空 userInfo
      // request.ts 拦截器已经处理了 401 跳转，这里主要处理数据同步
      console.error('获取用户信息失败', error);
      // 如果确认是未登录，可以在这里置空，但要谨慎
      // userInfo.value = null; 
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
      // 可以选择跳转到登录页
      window.location.href = '/login';
    }
  };

  // ✅ 新增：文件上传
  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 注意：根据后端文档，接口是 /file/test/upload
      // 如果 request.ts 自动处理了 Content-Type，这里不需要手动设置 multipart/form-data，
      // 但显式声明更安全。
      const res = await http.post<string>('/file/test/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // 假设后端返回的是图片路径字符串
      return res; 
    } catch (error) {
      console.error('文件上传失败:', error);
      showToast('图片上传失败');
      return null;
    }
  };

  // 6. 更新用户信息 (修复状态丢失问题)
  const updateProfile = async (userName: string, userAvatar?: string) => {
    try {
      await http.post('/user/update/my', { userName, userAvatar });
      showToast('更新成功');
      
      // ✅ 乐观更新：直接修改本地数据，不等待 fetchUserInfo
      // 这样可以避免 fetchUserInfo 失败或延迟导致的“未登录”闪烁
      if (userInfo.value) {
        userInfo.value.userName = userName;
        if (userAvatar) {
          userInfo.value.userAvatar = userAvatar;
        }
      }
      
      // 延时一点再拉取最新数据，确保后端已落库
      setTimeout(() => {
        fetchUserInfo();
      }, 500);

      return true;
    } catch (error) {
      console.error('更新失败:', error);
      showToast('更新失败，请重试');
      return false;
    }
  };

  // 7. 获取我的游览报告
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
    fetchDocuments
  };
});