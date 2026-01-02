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

// 登录请求参数
export interface LoginRequest {
  email: string;
  password?: string;
}

// 注册请求参数 (适配验证码流程)
export interface RegisterRequest {
  email: string;
  password?: string;
  code: string; // 必填：验证码
}

// ... 之前的 Chat 消息类型保持不变
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
  shopName: string;
  price: string;
  imageUrl: string;
  jumpUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  location?: LocationData;
  product?: ProductData;
  isLoading?: boolean;
  createdAt: number;
}

export interface ChatInitResponse {
  welcomeMessage: string;
  weather: string;
  bgStyle?: string;
}

// 会话列表项 (对应 POST /chat/conversations 的返回项)
export interface ConversationItem {
  id: string;          // 会话ID
  title: string;       // 会话标题 (通常是第一句话的摘要)
  lastMessage?: string; // 最后一条消息预览
  createdAt: number;   // 创建时间
  updatedAt: number;   // 更新时间
}

// 历史记录详情响应 (对应 GET /chat/history/{id})
export interface ChatHistoryResponse {
  id: string;
  title: string;
  messages: ChatMessage[]; // 复用之前的 ChatMessage 类型
}

// 游览报告项
export interface DocumentItem {
  id: string;
  title: string;       // 报告标题，如 "2023-10-01 姑苏非遗之旅"
  summary?: string;    // 简短描述
  pdfUrl: string;      // PDF 文件地址
  coverUrl?: string;   // 封面图 (可选)
  createdAt: number;   // 生成时间
}

// 游览报告请求 (如果 /document/my 需要参数，比如分页)
export interface DocumentListRequest {
  page?: number;
  size?: number;
}