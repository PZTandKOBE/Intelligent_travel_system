// 通用响应结构
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 用户信息
export interface UserInfo {
  id: number;
  email: string;
  nickname?: string;
  avatar?: string;
}

// 消息类型枚举
export type MessageType = 'text' | 'location' | 'product';

// 地点/商户数据结构 (对应后端 LocationData)
export interface LocationData {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  rating?: number;
  distance?: string;
  images?: string[]; // 后端返回的图片列表
  mapImageUrl?: string; // 前端生成的静态地图URL
}

// 商品数据结构
export interface ProductData {
  name: string;
  shopName: string;
  price: string;
  imageUrl: string;
  jumpUrl?: string; // 跳转详情页
}

// 聊天消息结构
export interface ChatMessage {
  id: string; // uuid
  role: 'user' | 'assistant';
  content: string; // 如果是卡片类型，这里可能是空或者JSON字符串
  type: MessageType;
  location?: LocationData;
  product?: ProductData;
  isLoading?: boolean; // 用于前端显示 loading 状态
  createdAt: number;
}

// 初始化会话请求
export interface ChatInitRequest {
  lat?: number;
  lng?: number;
  city?: string;
}

// 初始化响应
export interface ChatInitResponse {
  welcomeMessage: string;
  weather: string; // e.g., "晴 25℃"
  bgStyle?: string; // e.g., "rainy" | "sunny"
}