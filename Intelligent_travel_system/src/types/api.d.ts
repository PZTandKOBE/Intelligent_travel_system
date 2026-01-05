// src/types/api.d.ts

// 通用响应结构
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 用户信息
export interface UserInfo {
  id: number;
  userName: string;
  userAvatar?: string;
  email: string;
}

// 登录请求参数
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求参数
export interface RegisterRequest {
  email: string;
  code: string;
  userPassword?: string;
  checkPassword?: string;
  userName?: string;
  userAvatar?: string;
}

// 消息类型
export type MessageType = 'text' | 'location' | 'product';

export interface LocationData {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  rating?: number;
  distance?: string;
  images?: string[];
  mapImageUrl?: string; // 前端展示用的地图图片字段
}

export interface ProductData {
  name: string;
  shop: string;
  price?: string;
  imageUrl?: string;
  shopLat?: number;
  shopLng?: number;
}

export interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  location?: LocationData; // 兼容单个地点（旧逻辑）
  locations?: LocationData[]; // ✅ 新增：支持后端返回的地点列表
  products?: ProductData[];
  isLoading?: boolean;
  isThinking?: boolean;
  createdAt: string | number;
}

export interface ChatInitResponse {
  conversationId: number;
  welcomeMessage: string;
  envContext: {
    city: string;
    district: string;
    weather: string;
    temperature: number;
    outdoorSuitable: boolean;
  };
}

export interface ConversationItem {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export type ChatHistoryItem = ConversationItem;
export type ChatHistoryResponse = ChatMessage[];

// 游览报告项
export interface DocumentItem {
  id: number;
  userId: number;
  projectId: number;
  title?: string;
  fileUrl: string;
  createdAt: string;
}

// 修改密码请求参数
export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}