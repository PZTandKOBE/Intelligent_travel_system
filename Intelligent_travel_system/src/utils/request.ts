import axios, { type AxiosRequestConfig } from 'axios';
import { showToast } from 'vant';

// 创建 axios 实例
const instance = axios.create({
  baseURL: '/api', // 配合 vite.config.ts 的 proxy
  timeout: 10000,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // ✅ 核心修改：从 localStorage 读取 Token 并添加到 Header
    const token = localStorage.getItem('token');
    if (token) {
      // 假设后端遵循 Bearer Token 标准，如果后端不需要 'Bearer ' 前缀，请去掉
      config.headers.Authorization = `Bearer ${token}`; 
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 假设后端 code !== 0 代表业务错误
    if (res.code !== undefined && res.code !== 0) {
      showToast(res.message || '请求失败');
      return Promise.reject(new Error(res.message));
    }
    // 直接返回业务数据 data
    return res.data;
  },
  (error) => {
    // 处理 HTTP 状态码错误
    const msg = error.response?.data?.message || error.message || '网络异常';
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
};

export default http;