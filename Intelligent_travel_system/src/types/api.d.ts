// 通用响应结构
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 用户信息
export interface UserInfo {
  id: number;
  userName: string; // 文档返回的是 userName
  userAvatar?: string;
  email: string;
}

// 登录请求参数
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求参数 (已补全)
export interface RegisterRequest {
  email: string;
  code: string;
  userPassword?: string;  // 后端叫 userPassword
  checkPassword?: string; // 后端叫 checkPassword
  userName?: string;      // 选填
  userAvatar?: string;    // 选填
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
  shop: string; // 文档是 shop
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
  products?: ProductData[]; // 文档返回的是 products 数组
  isLoading?: boolean;
  createdAt: string | number; // 兼容后端可能返回 ISO 字符串
}

export interface ChatInitResponse {
  conversationId: number; // 文档返回的是 number
  welcomeMessage: string;
  envContext: {
    city: string;
    district: string;
    weather: string;
    temperature: number;
    outdoorSuitable: boolean;
  };
}

// 会话列表项
export interface ConversationItem {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// 历史记录响应 (直接是数组)
export type ChatHistoryResponse = ChatMessage[];

// 游览报告项
export interface DocumentItem {
  id: number;
  userId: number;
  projectId: number;
  title?: string; // 前端可能需要自己拼标题
  fileUrl: string;
  createdAt: string;
}