import axios, { type AxiosRequestConfig } from 'axios';
import { showToast } from 'vant';

// 创建 axios 实例
const instance = axios.create({
  baseURL: '/api', // 配合 vite.config.ts 的 proxy
  timeout: 10000,
  withCredentials: true, // ✅ 必须开启，否则无法维持登录状态
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    
    // 如果后端用 200 返回业务错误 (例如 code=401 代表未登录)
    if (res.code !== undefined && res.code !== 0) {
      // 特殊处理业务层面的未登录
      if (res.code === 401) {
        showToast('登录已过期');
        setTimeout(() => window.location.href = '/login', 1500);
        return Promise.reject(new Error(res.message));
      }

      showToast(res.message || '请求失败');
      return Promise.reject(new Error(res.message));
    }
    
    // 成功，直接返回 data 里的实际数据模型
    return res.data;
  },
  (error) => {
    // 处理 HTTP 状态码错误
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message || '网络异常';

    // ✅ 核心修改：捕获 401 Unauthorized 错误
    if (status === 401) {
      showToast('登录已过期，请重新登录');
      // 使用 window.location.href 强制跳转，确保清理状态
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return Promise.reject(error);
    }

    showToast(msg);
    return Promise.reject(error);
  }
);

// 导出封装后的 http 对象
const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return instance.get(url, config);
  },
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.post(url, data, config);
  },
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.put(url, data, config);
  },
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return instance.delete(url, config);
  },
};

export default http;