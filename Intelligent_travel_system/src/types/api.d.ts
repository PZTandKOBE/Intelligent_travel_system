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
  mapImageUrl?: string;
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
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  location?: LocationData;
  products?: ProductData[];
  isLoading?: boolean;
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

// ✅ 核心修改：增加 lastMessage 字段
export interface ConversationItem {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string; // 新增这一行，解决报错
}

// 历史记录响应
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