// src/utils/request.ts
import axios from 'axios';
import { showToast } from 'vant';

// ✅ 核心修复：如果环境变量未定义，默认使用 '/api' 触发 Vite 代理
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const service = axios.create({
  baseURL: baseURL,
  timeout: 10000, // 请求超时时间
  withCredentials: true, // ✅ 必须开启，后端使用 Session Cookie 认证
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 逻辑，目前使用 Cookie 认证，无需手动添加 Header
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data;
    
    // 根据 API 文档，code === 0 代表成功
    if (res.code === 0) {
      return res.data; // 直接返回 data 部分
    } else {
      // 业务错误处理
      showToast(res.message || '请求失败');
      return Promise.reject(new Error(res.message || 'Error'));
    }
  },
  (error) => {
    console.error('Request Error:', error);
    const msg = error.response?.data?.message || '网络请求异常，请稍后重试';
    showToast(msg);
    return Promise.reject(error);
  }
);

export default service;