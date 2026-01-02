import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { UserInfo, LoginRequest, RegisterRequest, DocumentItem} from '../types/api';
import { showToast } from 'vant';

export const useUserStore = defineStore('user', () => {
  // 持久化 token
  const token = ref(localStorage.getItem('token') || '');
  const userInfo = ref<UserInfo | null>(null);
  const documentList = ref<DocumentItem[]>([]);
  // 设置 Token
  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  };

  // 1. 发送验证码 Action
  const sendCode = async (email: string) => {
    try {
      // 对应接口: POST /user/register/send-code
      await http.post('/user/register/send-code', { email });
      showToast('验证码已发送，请查收邮箱');
      return true;
    } catch (error) {
      console.error('发送验证码失败:', error);
      return false;
    }
  };

  // 2. 注册 Action (带验证码)
  const register = async (req: RegisterRequest) => {
    try {
      // 对应接口: POST /user/register/email
      await http.post('/user/register/email', req);
      showToast('注册成功，请登录');
      return true;
    } catch (error) {
      console.error('注册失败:', error);
      return false;
    }
  };

  // 3. 登录 Action
  const login = async (req: LoginRequest) => {
    try {
      // 对应接口: POST /user/login/email
      // 注意：根据之前的分析，后端可能直接返回 token 字符串，也可能返回对象
      // 这里做了兼容处理
      const res = await http.post<string | { token: string }>('/user/login/email', req);
      
      const tokenStr = typeof res === 'string' ? res : res.token;
      
      if (tokenStr) {
        setToken(tokenStr);
        showToast('登录成功');
        // 登录成功后，顺便获取一下用户信息
        await fetchUserInfo();
        return true;
      } else {
        showToast('登录异常：未获取到Token');
        return false;
      }
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  };

  // 4. 获取用户信息
  const fetchUserInfo = async () => {
    if (!token.value) return;
    try {
      // 对应接口: GET /user/get/login
      const res = await http.get<UserInfo>('/user/get/login');
      userInfo.value = res;
    } catch (error) {
      // 如果获取信息失败（比如 Token 过期），则执行登出
      logout();
    }
  };

  // 5. 退出登录
  const logout = async () => {
    try {
      // 尝试调用后端登出接口 (可选)
      await http.post('/user/logout');
    } catch (e) {
      // 忽略网络错误
    } finally {
      token.value = '';
      userInfo.value = null;
      localStorage.removeItem('token');
      showToast('已退出登录');
    }
  };
  // 6. 更新用户信息 (新增)
  const updateProfile = async (nickname: string, avatar?: string) => {
    try {
      // 对应前端文档接口: POST /user/update/my
      await http.post('/user/update/my', { nickname, avatar });
      showToast('更新成功');
      // 更新成功后，刷新本地用户信息
      await fetchUserInfo();
      return true;
    } catch (error) {
      console.error('更新失败:', error);
      return false;
    }
  };
  // 7. 获取我的游览报告 (新增)
  const fetchDocuments = async () => {
    try {
      // 对应接口: POST /document/my
      // 假设接口返回的是 DocumentItem[] 数组
      const res = await http.post<DocumentItem[]>('/document/my', {});
      documentList.value = res || [];
    } catch (error) {
      console.error('获取文档列表失败:', error);
      // 模拟数据 (开发阶段用，防止空页面不好看)
      // 如果后端还没好，这段代码会让你看到效果
      /* documentList.value = [
        {
          id: '1',
          title: '姑苏城外寒山寺 - 非遗深度游',
          summary: '包含苏绣体验、评弹欣赏及特色素斋推荐。',
          pdfUrl: 'https://example.com/report1.pdf',
          createdAt: Date.now() - 86400000
        },
        {
          id: '2',
          title: '岭南醒狮文化探秘',
          summary: '佛山祖庙、黄飞鸿纪念馆及狮头扎作体验。',
          pdfUrl: 'https://example.com/report2.pdf',
          createdAt: Date.now() - 172800000
        }
      ];
      */
    }
  };

  return {
    token,
    userInfo,
    sendCode,
    login,
    register,
    logout,
    fetchUserInfo,
    updateProfile,
    documentList,
    fetchDocuments
  };
});