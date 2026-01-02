import axios, { type AxiosRequestConfig } from 'axios';
import { showToast } from 'vant';

// 创建 axios 实例
const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 假设后端 code !== 0 是错误
    if (res.code && res.code !== 0) {
      showToast(res.message || '请求失败');
      return Promise.reject(new Error(res.message));
    }
    // 关键点：这里我们返回了 res.data，也就是实际的业务数据
    // 注意：根据你的后端接口文档，成功时返回的是 ApiResponse<T> 还是直接是 T ?
    // 如果后端返回 { code: 0, data: {...} }，这里通常返回 res.data
    return res.data;
  },
  (error) => {
    showToast(error.message || '网络异常');
    return Promise.reject(error);
  }
);

// 导出封装后的 http 对象，解决 TypeScript 类型推断问题
const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return instance.get(url, config);
  },
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.post(url, data, config);
  },
};

export default http;